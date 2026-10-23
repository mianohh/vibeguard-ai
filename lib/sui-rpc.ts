/**
 * Sui network access layer (server-side only).
 *
 * Public Sui JSON-RPC was decommissioned in October 2026. All chain access now
 * goes through Sui GraphQL (browser-safe reads) and Sui gRPC (server-only
 * transaction build / execution / simulation).
 *
 * `suiRpcAdapter` implements the JSON-RPC method surface expected by
 * Transaction.build({ client }) in @mysten/sui 1.45.x, backed by gRPC + GraphQL,
 * so existing transaction-building code keeps working unchanged.
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import type { SuiClient } from '@mysten/sui/client';

export type SuiNetworkName = 'mainnet' | 'testnet' | 'devnet';

export const DEFAULT_SUI_NETWORK: SuiNetworkName =
  process.env.SUI_NETWORK === 'mainnet' || process.env.SUI_NETWORK === 'devnet'
    ? process.env.SUI_NETWORK
    : 'testnet';

const GRAPHQL_ENDPOINTS: Record<SuiNetworkName, string> = {
  mainnet: process.env.SUI_GRAPHQL_URL_MAINNET || 'https://graphql.mainnet.sui.io/graphql',
  testnet: process.env.SUI_GRAPHQL_URL || 'https://graphql.testnet.sui.io/graphql',
  devnet: process.env.SUI_GRAPHQL_URL_DEVNET || 'https://graphql.devnet.sui.io/graphql',
};

const GRPC_ENDPOINTS: Record<SuiNetworkName, string> = {
  mainnet: process.env.SUI_GRPC_URL_MAINNET || 'https://fullnode.mainnet.sui.io:443',
  testnet: process.env.SUI_GRPC_URL || 'https://fullnode.testnet.sui.io:443',
  devnet: process.env.SUI_GRPC_URL_DEVNET || 'https://fullnode.devnet.sui.io:443',
};

export function resolveNetwork(network?: string | null): SuiNetworkName {
  if (network === 'mainnet' || network === 'testnet' || network === 'devnet') return network;
  return DEFAULT_SUI_NETWORK;
}

export async function graphqlQuery<T = any>(
  query: string,
  variables?: Record<string, unknown>,
  network?: SuiNetworkName,
): Promise<T> {
  const net = resolveNetwork(network);
  const response = await fetch(GRAPHQL_ENDPOINTS[net], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Sui GraphQL (${net}) returned HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`Sui GraphQL (${net}): ${payload.errors.map((e: any) => e.message).join('; ')}`);
  }
  return payload.data as T;
}

const grpcClients = new Map<SuiNetworkName, SuiGrpcClient>();

export function getGrpcClient(network?: SuiNetworkName): SuiGrpcClient {
  const net = resolveNetwork(network);
  let client = grpcClients.get(net);
  if (!client) {
    client = new SuiGrpcClient({ network: net, baseUrl: GRPC_ENDPOINTS[net] });
    grpcClients.set(net, client);
  }
  return client;
}

export async function getEpochId(network?: SuiNetworkName): Promise<number> {
  const data = await graphqlQuery<{ epoch: { epochId: number } | null }>(
    '{ epoch { epochId } }',
    undefined,
    network,
  );
  const epochId = data?.epoch?.epochId;
  if (typeof epochId !== 'number') {
    throw new Error(`Sui GraphQL (${resolveNetwork(network)}) did not return an epoch`);
  }
  return epochId;
}

export async function getCheckpointSequenceNumber(network?: SuiNetworkName): Promise<number> {
  const data = await graphqlQuery<{ checkpoint: { sequenceNumber: number } | null }>(
    '{ checkpoint { sequenceNumber } }',
    undefined,
    network,
  );
  const sequenceNumber = data?.checkpoint?.sequenceNumber;
  if (typeof sequenceNumber !== 'number') {
    throw new Error(`Sui GraphQL (${resolveNetwork(network)}) did not return a checkpoint`);
  }
  return sequenceNumber;
}

const GET_OBJECTS_QUERY = `
  query($keys: [ObjectKey!]) {
    multiGetObjects(keys: $keys) {
      address
      digest
      version
      owner {
        __typename
        ... on Shared { initialSharedVersion }
        ... on AddressOwner { address { address } }
        ... on ObjectOwner { address { address } }
        ... on ConsensusAddressOwner { address { address } startVersion }
      }
    }
  }
`;

interface GraphqlObjectEntry {
  address: string | null;
  digest: string | null;
  version: string | number | null;
  owner: {
    __typename: string;
    initialSharedVersion?: string | number;
    address?: { address: string } | string | null;
    startVersion?: string | number;
  } | null;
}

function ownerAddressString(
  ownerAddress: { address?: { address: string } | string | null } | string | null | undefined,
): string | undefined {
  if (typeof ownerAddress === 'string') return ownerAddress;
  const nested = ownerAddress?.address;
  if (typeof nested === 'string') return nested;
  return nested?.address;
}

function graphqlOwnerToJsonRpc(owner: GraphqlObjectEntry['owner']): any {
  if (!owner) return undefined;
  switch (owner.__typename) {
    case 'AddressOwner':
      return { AddressOwner: ownerAddressString(owner.address) };
    case 'ObjectOwner':
      return { ObjectOwner: ownerAddressString(owner.address) };
    case 'Shared':
      return { Shared: { initial_shared_version: String(owner.initialSharedVersion ?? 0) } };
    case 'ConsensusAddressOwner':
      return {
        ConsensusAddressOwner: {
          owner: ownerAddressString(owner.address),
          start_version: String(owner.startVersion ?? 0),
        },
      };
    case 'Immutable':
      return { Immutable: true };
    default:
      return undefined;
  }
}

async function multiGetObjectsGraphql(
  ids: string[],
  network?: SuiNetworkName,
): Promise<Array<{ data?: any; error?: any }>> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
  const results: Array<{ data?: any; error?: any }> = [];
  for (const chunk of chunks) {
    const data = await graphqlQuery<{ multiGetObjects: Array<GraphqlObjectEntry | null> }>(
      GET_OBJECTS_QUERY,
      { keys: chunk.map((address) => ({ address })) },
      network,
    );
    for (const entry of data?.multiGetObjects ?? []) {
      const objectId = entry?.address;
      if (!objectId) {
        results.push({ error: { code: 'notFound', message: 'Object not found' } });
        continue;
      }
      results.push({
        data: {
          objectId,
          digest: entry.digest,
          version: entry.version == null ? undefined : String(entry.version),
          owner: graphqlOwnerToJsonRpc(entry.owner),
        },
      });
    }
  }
  return results;
}

const GET_OBJECT_JSON_QUERY = `
  query($id: String!) {
    object(address: $id) {
      digest
      version
      owner {
        __typename
        ... on Shared { initialSharedVersion }
        ... on AddressOwner { address { address } }
        ... on ObjectOwner { address { address } }
        ... on ConsensusAddressOwner { address { address } startVersion }
      }
      asMoveObject { contents { json } }
    }
  }
`;

export async function getObjectSnapshot(
  objectId: string,
  network?: SuiNetworkName,
): Promise<{
  digest: string;
  version: string;
  owner: any;
  json: any;
} | null> {
  const data = await graphqlQuery<{ object: any }>(GET_OBJECT_JSON_QUERY, { id: objectId }, network);
  const object = data?.object;
  if (!object) return null;
  return {
    digest: object.digest,
    version: String(object.version),
    owner: graphqlOwnerToJsonRpc(object.owner),
    json: object.asMoveObject?.contents?.json ?? null,
  };
}

export function addressToBcsBase64(address: string): string {
  const hex = address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return toBase64(bytes);
}

function bytesEqual(a: Uint8Array | undefined, b: Uint8Array): boolean {
  if (!a || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Find the field object id for a dynamic field name under a parent (e.g. a
 * sui::table::Table). GraphQL cannot resolve Table wrapper objects directly,
 * so this scans stateService.listDynamicFields and matches the BCS-encoded
 * name. Returns null when the field does not exist.
 */
export async function findDynamicFieldId(
  parentId: string,
  nameBcsBase64: string,
  network?: SuiNetworkName,
): Promise<string | null> {
  const target = fromBase64(nameBcsBase64);
  const client = getGrpcClient(network);
  let pageToken: Uint8Array | undefined;
  do {
    const response = await client.stateService.listDynamicFields({
      parent: parentId,
      pageToken,
      readMask: { paths: ['field_id', 'name'] },
    });
    for (const field of response.response.dynamicFields) {
      if (bytesEqual(field.name?.value, target)) return field.fieldId ?? null;
    }
    pageToken = response.response.nextPageToken;
  } while (pageToken);
  return null;
}

const GET_EVENTS_QUERY = `
  query($filter: EventFilter, $first: Int, $after: String, $last: Int) {
    events(filter: $filter, first: $first, after: $after, last: $last) {
      edges {
        cursor
        node {
          sequenceNumber
          timestamp
          transaction { digest }
          contents { json }
        }
      }
    }
  }
`;

export interface ChainEvent {
  cursor: string;
  sequenceNumber: string;
  timestampMs: number;
  txDigest: string;
  parsedJson: any;
}

export interface EventPage {
  events: ChainEvent[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export async function queryEventsPage(
  params: {
    eventType: string;
    cursor?: string | null;
    limit?: number;
    direction?: 'ascending' | 'descending';
  },
  network?: SuiNetworkName,
): Promise<EventPage> {
  const limit = params.limit ?? 10;
  const descending = params.direction === 'descending';
  const variables: Record<string, unknown> = {
    filter: { type: params.eventType },
    [descending ? 'last' : 'first']: limit,
  };
  if (params.cursor && !descending) variables.after = params.cursor;
  const data = await graphqlQuery<{
    events: { edges: Array<{ cursor: string; node: any }> } | null;
  }>(GET_EVENTS_QUERY, variables, network);
  const edges = data?.events?.edges ?? [];
  return {
    events: edges.map((edge) => ({
      cursor: edge.cursor,
      sequenceNumber: String(edge.node.sequenceNumber),
      timestampMs: Date.parse(edge.node.timestamp ?? '') || 0,
      txDigest: edge.node.transaction?.digest ?? '',
      parsedJson: edge.node.contents?.json ?? {},
    })),
    nextCursor: edges.length ? edges[edges.length - 1].cursor : null,
    hasNextPage: edges.length === limit,
  };
}

function enumNumber(value: any): number {
  if (typeof value === 'number') return value;
  return -1;
}

function grpcOwnerToJsonRpc(owner: any): any {
  if (!owner || owner.kind == null) return undefined;
  switch (enumNumber(owner.kind)) {
    case 1:
      return { AddressOwner: owner.address };
    case 2:
      return { ObjectOwner: owner.address };
    case 3:
      return { Shared: { initial_shared_version: String(owner.version ?? 0) } };
    case 4:
      return { Immutable: true };
    case 5:
      return {
        ConsensusAddressOwner: { owner: owner.address, start_version: String(owner.version ?? 0) },
      };
    default:
      return undefined;
  }
}

function grpcStatusToJsonRpc(status: any): { status: 'success' | 'failure'; error?: string } {
  if (status?.success === true) return { status: 'success' };
  const description = status?.error?.description;
  return {
    status: 'failure',
    error: typeof description === 'string' && description ? description : 'Transaction execution failed',
  };
}

function grpcEffectsToJsonRpc(effects: any): any {
  if (!effects) return undefined;
  return {
    status: grpcStatusToJsonRpc(effects.status),
    gasUsed: {
      computationCost: String(effects.gasUsed?.computationCost ?? 0),
      storageCost: String(effects.gasUsed?.storageCost ?? 0),
      storageRebate: String(effects.gasUsed?.storageRebate ?? 0),
      nonRefundableStorageFee: String(effects.gasUsed?.nonRefundableStorageFee ?? 0),
    },
  };
}

function grpcBalanceChangesToJsonRpc(balanceChanges: any[] | undefined): any[] {
  return (balanceChanges ?? []).map((change) => ({
    coinType: change.coinType,
    amount: String(change.amount ?? 0),
    owner: change.address ? { AddressOwner: change.address } : undefined,
  }));
}

function grpcObjectChangesToJsonRpc(effects: any): any[] {
  return (effects?.changedObjects ?? []).map((change: any) => {
    const idOperation = enumNumber(change.idOperation);
    const outputState = enumNumber(change.outputState);
    let type: string;
    if (idOperation === 2) type = 'created';
    else if (idOperation === 3 || outputState === 1) type = 'deleted';
    else type = 'mutated';
    return {
      type,
      objectId: change.objectId,
      objectType: change.objectType,
      version: change.outputVersion != null ? String(change.outputVersion) : undefined,
      digest: change.outputDigest,
      owner: grpcOwnerToJsonRpc(change.outputOwner ?? change.inputOwner),
    };
  });
}

const SIMULATE_READ_MASK = [
  'transaction.digest',
  'transaction.effects.digest',
  'transaction.effects.status',
  'transaction.effects.gas_used',
  'transaction.effects.gas_object',
  'transaction.effects.changed_objects',
  'transaction.balance_changes',
];

const EXECUTE_READ_MASK = [
  'digest',
  'effects.digest',
  'effects.status',
  'effects.gas_used',
  'balance_changes',
];

function toTransactionBytes(transactionBlock: Uint8Array | string): Uint8Array {
  return typeof transactionBlock === 'string' ? fromBase64(transactionBlock) : transactionBlock;
}

export async function simulateTransactionRaw(
  transactionBlock: Uint8Array | string,
  network?: SuiNetworkName,
): Promise<any> {
  const client = getGrpcClient(network);
  const bytes = toTransactionBytes(transactionBlock);
  const { response } = await client.transactionExecutionService.simulateTransaction({
    transaction: { bcs: { value: bytes } },
    doGasSelection: true,
    readMask: { paths: SIMULATE_READ_MASK },
  });
  const executed = response.transaction;
  return {
    digest: executed?.digest,
    effects: grpcEffectsToJsonRpc(executed?.effects),
    balanceChanges: grpcBalanceChangesToJsonRpc(executed?.balanceChanges),
    objectChanges: grpcObjectChangesToJsonRpc(executed?.effects),
  };
}

export async function executeTransactionBlock(params: {
  transactionBlock: Uint8Array | string;
  signature: string | string[];
  network?: SuiNetworkName;
}): Promise<{ digest: string; effects: any; balanceChanges: any[] }> {
  const client = getGrpcClient(params.network);
  const bytes = toTransactionBytes(params.transactionBlock);
  const signatures = Array.isArray(params.signature) ? params.signature : [params.signature];
  const { response } = await client.transactionExecutionService.executeTransaction({
    transaction: { bcs: { value: bytes } },
    signatures: signatures.map((signature) => ({
      bcs: { value: fromBase64(signature) },
      signature: { oneofKind: undefined as undefined },
    })),
    readMask: { paths: EXECUTE_READ_MASK },
  });
  const executed = response.transaction;
  return {
    digest: executed?.digest ?? '',
    effects: grpcEffectsToJsonRpc(executed?.effects),
    balanceChanges: grpcBalanceChangesToJsonRpc(executed?.balanceChanges),
  };
}

export async function fetchTransactionBytes(
  digest: string,
  network?: SuiNetworkName,
): Promise<string> {
  const client = getGrpcClient(network);
  try {
    const { response } = await client.ledgerService.getTransaction({
      digest,
      readMask: { paths: ['digest', 'transaction.bcs'] },
    });
    const raw = response.transaction?.transaction?.bcs?.value;
    if (!raw) throw new Error('Transaction bytes not found in response');
    const bytes = raw instanceof Uint8Array ? raw : Uint8Array.from(Object.values(raw as any));
    return toBase64(bytes);
  } catch (error: any) {
    throw new Error(`Failed to fetch transaction: ${error?.message ?? error}`);
  }
}

const GET_MOVE_FUNCTION_QUERY = `
  query($package: String!, $module: String!, $function: String!) {
    package(address: $package) {
      module(name: $module) {
        function(name: $function) {
          parameters { signature }
        }
      }
    }
  }
`;

const NORMALIZED_PRIMITIVES: Record<string, string> = {
  address: 'Address',
  bool: 'Bool',
  u8: 'U8',
  u16: 'U16',
  u32: 'U32',
  u64: 'U64',
  u128: 'U128',
  u256: 'U256',
};

function openBodyToNormalized(body: any): any {
  if (typeof body === 'string') return NORMALIZED_PRIMITIVES[body] ?? body;
  if (body && typeof body === 'object') {
    if ('vector' in body) return { Vector: openBodyToNormalized(body.vector) };
    if ('datatype' in body) {
      return {
        Struct: {
          address: body.datatype.package,
          module: body.datatype.module,
          name: body.datatype.type,
          typeArguments: (body.datatype.typeParameters ?? []).map(openBodyToNormalized),
        },
      };
    }
    if ('typeParameter' in body) return { TypeParameter: body.typeParameter };
  }
  return body;
}

function openSignatureToNormalized(signature: { ref?: string | null; body: any }): any {
  const body = openBodyToNormalized(signature?.body);
  if (signature?.ref === '&') return { Reference: body };
  if (signature?.ref === '&mut') return { MutableReference: body };
  return body;
}

async function getNormalizedMoveFunction(
  params: { package: string; module: string; function: string },
  network?: SuiNetworkName,
): Promise<{ parameters: any[] }> {
  const data = await graphqlQuery<{
    package: { module: { function: { parameters: Array<{ signature: { ref?: string | null; body: any } }> } | null } | null } | null;
  }>(GET_MOVE_FUNCTION_QUERY, {
    package: params.package,
    module: params.module,
    function: params.function,
  }, network);
  const fn = data?.package?.module?.function;
  if (!fn) {
    throw new Error(`Move function not found: ${params.package}::${params.module}::${params.function}`);
  }
  return {
    parameters: fn.parameters.map((parameter) => openSignatureToNormalized(parameter.signature)),
  };
}

async function getSuiCoinsJsonRpc(
  owner: string,
  coinType: string,
  network?: SuiNetworkName,
): Promise<{ data: any[]; nextCursor: string | null }> {
  const client = getGrpcClient(network);
  const response = await client.core.getCoins({ address: owner, coinType });
  return {
    data: response.objects.map((coin) => ({
      coinObjectId: coin.id,
      version: coin.version,
      digest: coin.digest,
      balance: coin.balance,
      owner: coin.owner,
    })),
    nextCursor: response.cursor,
  };
}

async function getReferenceGasPriceJsonRpc(network?: SuiNetworkName): Promise<string> {
  const client = getGrpcClient(network);
  const response = await client.core.getReferenceGasPrice();
  return response.referenceGasPrice;
}

export function makeSuiRpcAdapter(network?: SuiNetworkName): SuiClient {
  const boundNetwork = resolveNetwork(network);
  const adapter = {
    async getReferenceGasPrice() {
      return getReferenceGasPriceJsonRpc(boundNetwork);
    },
    async getCoins(params: { owner: string; coinType: string }) {
      return getSuiCoinsJsonRpc(params.owner, params.coinType, boundNetwork);
    },
    async multiGetObjects(params: { ids: string[] }) {
      return multiGetObjectsGraphql(params.ids, boundNetwork);
    },
    async getNormalizedMoveFunction(params: { package: string; module: string; function: string }) {
      return getNormalizedMoveFunction(params, boundNetwork);
    },
    async dryRunTransactionBlock(params: { transactionBlock: Uint8Array | string }) {
      return simulateTransactionRaw(params.transactionBlock, boundNetwork);
    },
  };
  return adapter as unknown as SuiClient;
}

export const suiRpcAdapter = makeSuiRpcAdapter(DEFAULT_SUI_NETWORK);

export interface SuiJsonRpcLikeObjectRef {
  objectId: string;
  version: string;
  digest: string;
  balance?: string;
}

export async function getSuiCoins(
  owner: string,
  options?: { coinType?: string; network?: SuiNetworkName },
): Promise<SuiJsonRpcLikeObjectRef[]> {
  const result = await getSuiCoinsJsonRpc(
    owner,
    options?.coinType ?? '0x2::sui::SUI',
    options?.network,
  );
  return result.data.map((coin) => ({
    objectId: coin.coinObjectId,
    version: String(coin.version),
    digest: coin.digest,
    balance: coin.balance,
  }));
}
