/**
 * VibeGuard AI — pre-signature transaction security SDK for Sui.
 *
 * Analyzes unsigned transaction bytes before a user signs, retrieves
 * on-chain threat evidence, and streams verified threat events.
 *
 * @packageDocumentation
 */

/** Sui network the transaction targets. */
export type Network = 'mainnet' | 'testnet' | 'devnet';

/** Risk verdict returned by the threat engine. */
export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';

/** Threat categories used by the on-chain registry. */
export type ThreatCategory =
  | 'Honeypot'
  | 'Phishing'
  | 'Rug Pull'
  | 'Intent Mismatch'
  | 'Unknown';

/** Severity levels used by the on-chain registry. */
export type ThreatSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

/** Optional editorial metadata attached to a stored threat report. */
export interface ThreatReportMetadata {
  title: string;
  publisher: string;
  category: ThreatCategory;
  tags?: string[];
  severity: ThreatSeverity;
  timestamp: string;
}

/** Threat evidence stored on Walrus and retrievable by blob ID. */
export interface ThreatReport {
  packageId: string;
  transactionBytes?: string;
  userIntent?: string;
  riskLevel: string;
  reasons: string[];
  headline: string;
  plainEnglish: string;
  recommendedAction: string;
  reportedAt: string;
  reportedBy: string;
  endEpoch?: number;
  metadata?: ThreatReportMetadata;
}

/** A single Move call discovered by static analysis. */
export interface MoveCallTarget {
  packageId: string;
  moduleName: string;
  functionName: string;
}

/** Static (byte-level) analysis of the unsigned transaction. */
export interface StaticAnalysis {
  moveCalls: MoveCallTarget[];
  gasBudget?: string;
  isHighGas: boolean;
  containsDirectTransfer: boolean;
  chainId?: string;
  networkMismatch: boolean;
}

/** Options for {@link VibeGuard.analyzeTransaction}. */
export interface AnalysisOptions {
  /** Base64/base64url transaction bytes, or a transaction digest. */
  transactionBytes: string;
  network: Network;
  userAddress?: string;
  userIntent?: string;
  /** Invoked when the engine returns a `RED` verdict. */
  onThreatDetected?: (result: AnalysisResult) => void;
}

/** Result of a pre-signature analysis. */
export interface AnalysisResult {
  simulation: {
    rawDryRun?: unknown;
    effectsSummary: unknown;
    staticAnalysis: StaticAnalysis;
  };
  risk: {
    riskLevel: RiskLevel;
    reasons: string[];
    confidence: number;
  };
  explanation: {
    headline: string;
    plainEnglish: string;
    bulletPoints?: string[];
    recommendedAction: string;
    whatToCheck?: string[];
  };
}

/** A threat indexed from on-chain `ThreatReported` events. */
export interface IndexedThreat {
  packageId: string;
  blobId: string;
  blobObjectId: string;
  reporter: string;
  category?: ThreatCategory;
  severity?: ThreatSeverity;
  timestamp: number;
  txDigest: string;
  reasons?: string[];
  endEpoch?: number;
  blobStatus?: 'active' | 'expiring' | 'expired';
}

/** Aggregated threat-registry statistics. */
export interface ThreatStats {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  lastIndexed: string | null;
}

/** Filters for {@link VibeGuard.queryThreats}. */
export interface QueryThreatsOptions {
  category?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}

/** Paginated threat query response. */
export interface QueryThreatsResult {
  success: boolean;
  threats: IndexedThreat[];
  count: number;
  offset: number;
  limit: number;
}

/** Threat statistics response. */
export interface ThreatStatsResult {
  success: boolean;
  stats: ThreatStats;
}

/** Payload of a `ThreatReported` SSE event. */
export interface ThreatFeedEvent {
  malicious_package_id: string;
  walrus_blob_id: string;
  blob_object_id: string;
  reporter: string;
}

/** A registered webhook endpoint. */
export interface WebhookInfo {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

/** Webhook registration response. */
export interface RegisterWebhookResult {
  success: boolean;
  webhook: {
    id: string;
    url: string;
    events: string[];
  };
}

/** Registered webhooks response. */
export interface WebhooksResult {
  success: boolean;
  webhooks: WebhookInfo[];
}

/** Threat re-index response. */
export interface ReindexResult {
  success: boolean;
  indexed: number;
  stats: ThreatStats;
}

/** Platform analytics counters. */
export interface AnalyticsData {
  totalScans: number;
  scamsBlocked: number;
  totalValueProtected: number;
  lastUpdated: string;
  threats: ThreatStats;
}

/** Walrus blob health response. */
export interface BlobHealthResult {
  success: boolean;
  timestamp?: string;
  summary?: {
    totalBlobs: number;
    healthy: number;
    needsAttention: number;
    failed: number;
  };
  warnings?: Array<{
    blobId: string;
    epochsRemaining: number;
    severity: string;
    expirationEpoch?: number;
  }>;
  error?: string;
}

/** Client configuration. */
export interface VibeGuardConfig {
  /** Optional bearer token sent as `Authorization: Bearer <token>`. */
  apiKey?: string;
  /** API origin. Defaults to `https://vibeguardai.xyz`. */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Defaults to `15000`. */
  timeoutMs?: number;
}

/** Machine-readable failure categories. */
export type VibeGuardErrorCode =
  | 'BAD_REQUEST'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'HTTP_ERROR'
  | 'BAD_RESPONSE';

/** Error thrown by the SDK for validation, transport, and API failures. */
export class VibeGuardError extends Error {
  /** Failure category. */
  readonly code: VibeGuardErrorCode;
  /** HTTP status, present for `HTTP_ERROR` and `BAD_RESPONSE`. */
  readonly status?: number;

  constructor(message: string, code: VibeGuardErrorCode, status?: number) {
    super(message);
    this.name = 'VibeGuardError';
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const NETWORKS: readonly string[] = ['mainnet', 'testnet', 'devnet'];
const DEFAULT_TIMEOUT_MS = 15_000;
const TX_INPUT_PATTERN = /^[A-Za-z0-9+/=_-]{1,8192}$/;
const MAX_LIMIT = 1_000;
const MAX_OFFSET = 100_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new VibeGuardError(`${name} must be a non-empty string`, 'BAD_REQUEST');
  }
  return value;
}

function requiredNetwork(value: unknown): Network {
  if (typeof value !== 'string' || !NETWORKS.includes(value)) {
    throw new VibeGuardError(
      `network must be one of: ${NETWORKS.join(', ')}`,
      'BAD_REQUEST'
    );
  }
  return value as Network;
}

function optionalInteger(value: unknown, name: string, max: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max) {
    throw new VibeGuardError(
      `${name} must be an integer between 0 and ${max}`,
      'BAD_REQUEST'
    );
  }
  return value;
}

function httpUrl(value: unknown, name: string): string {
  const raw = requiredString(value, name);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new VibeGuardError(`${name} must be a valid absolute URL`, 'BAD_REQUEST');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new VibeGuardError(`${name} must use http or https`, 'BAD_REQUEST');
  }
  return parsed.toString();
}

/**
 * VibeGuard API client.
 *
 * @example
 * ```ts
 * const guard = new VibeGuard();
 * const result = await guard.analyzeTransaction({
 *   transactionBytes: 'AAACAA...',
 *   network: 'testnet',
 * });
 * ```
 */
export class VibeGuard {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: VibeGuardConfig = {}) {
    if (config.apiKey !== undefined && typeof config.apiKey !== 'string') {
      throw new VibeGuardError('apiKey must be a string', 'BAD_REQUEST');
    }
    this.apiKey = config.apiKey;

    this.baseUrl = httpUrl(
      config.baseUrl !== undefined ? config.baseUrl : 'https://vibeguardai.xyz',
      'baseUrl'
    ).replace(/\/+$/, '');

    if (
      config.timeoutMs !== undefined &&
      (typeof config.timeoutMs !== 'number' ||
        !Number.isFinite(config.timeoutMs) ||
        config.timeoutMs <= 0)
    ) {
      throw new VibeGuardError('timeoutMs must be a positive number of milliseconds', 'BAD_REQUEST');
    }
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Analyze unsigned transaction bytes before signing.
   *
   * `RED` results are auto-reported on-chain by the VibeGuard backend
   * pipeline; the optional `onThreatDetected` callback fires so wallet
   * providers can react immediately.
   */
  async analyzeTransaction(options: AnalysisOptions): Promise<AnalysisResult> {
    if (!options || typeof options !== 'object') {
      throw new VibeGuardError('options must be an object', 'BAD_REQUEST');
    }

    const { onThreatDetected, ...payload } = options;

    if (onThreatDetected !== undefined && typeof onThreatDetected !== 'function') {
      throw new VibeGuardError('onThreatDetected must be a function', 'BAD_REQUEST');
    }

    const transactionBytes = requiredString(payload.transactionBytes, 'transactionBytes');
    if (!TX_INPUT_PATTERN.test(transactionBytes)) {
      throw new VibeGuardError(
        'transactionBytes must be base64/base64url transaction bytes or a transaction digest',
        'BAD_REQUEST'
      );
    }
    payload.transactionBytes = transactionBytes;
    payload.network = requiredNetwork(payload.network);

    if (payload.userAddress !== undefined) {
      requiredString(payload.userAddress, 'userAddress');
    }
    if (payload.userIntent !== undefined) {
      requiredString(payload.userIntent, 'userIntent');
    }

    const result = await this.request<AnalysisResult>('/api/explain', {
      method: 'POST',
      headers: this.headers(true),
      body: JSON.stringify(payload),
    });

    if (!result || typeof result !== 'object' || !result.risk || typeof result.risk.riskLevel !== 'string') {
      throw new VibeGuardError('VibeGuard API returned an unexpected response shape', 'BAD_RESPONSE');
    }

    if (result.risk.riskLevel === 'RED' && onThreatDetected) {
      onThreatDetected(result);
    }

    return result;
  }

  /**
   * Retrieve signed threat evidence stored on Walrus.
   *
   * @param blobId - Walrus blob ID (URL-encoded before the request).
   * @param blobObjectId - Optional Blob NFT object ID for liveness verification.
   */
  async retrieveThreatReport(blobId: string, blobObjectId?: string): Promise<ThreatReport> {
    const safeBlobId = encodeURIComponent(requiredString(blobId, 'blobId'));

    const params = new URLSearchParams();
    if (blobObjectId !== undefined) {
      params.set('blobObjectId', requiredString(blobObjectId, 'blobObjectId'));
    }

    return this.request<ThreatReport>(`/api/threat/${safeBlobId}`, {}, params);
  }

  /** Query the on-chain threat registry with optional filters. */
  async queryThreats(options: QueryThreatsOptions = {}): Promise<QueryThreatsResult> {
    if (!options || typeof options !== 'object') {
      throw new VibeGuardError('options must be an object', 'BAD_REQUEST');
    }

    const params = new URLSearchParams();
    if (options.category !== undefined) {
      params.set('category', requiredString(options.category, 'category'));
    }
    if (options.severity !== undefined) {
      params.set('severity', requiredString(options.severity, 'severity'));
    }

    const limit = optionalInteger(options.limit, 'limit', MAX_LIMIT);
    const offset = optionalInteger(options.offset, 'offset', MAX_OFFSET);
    if (limit !== undefined) params.set('limit', String(limit));
    if (offset !== undefined) params.set('offset', String(offset));

    return this.request<QueryThreatsResult>('/api/threats', {}, params);
  }

  /** Fetch aggregated threat-registry statistics. */
  async getThreatStats(): Promise<ThreatStatsResult> {
    const params = new URLSearchParams();
    params.set('stats', 'true');
    return this.request<ThreatStatsResult>('/api/threats', {}, params);
  }

  /**
   * Subscribe to the real-time `ThreatReported` SSE feed.
   *
   * Returns an unsubscribe function. The underlying `EventSource`
   * reconnects automatically on transient connection loss.
   *
   * @param callback - Invoked for each event payload.
   * @param onError - Invoked on malformed messages or connection errors.
   * @remarks Requires `EventSource` (Node.js 22+, browsers, or a polyfill).
   */
  subscribeToThreats(
    callback: (event: ThreatFeedEvent) => void,
    onError?: (error: unknown) => void
  ): () => void {
    if (typeof callback !== 'function') {
      throw new VibeGuardError('callback must be a function', 'BAD_REQUEST');
    }
    if (typeof EventSource === 'undefined') {
      throw new VibeGuardError(
        'EventSource is not available in this environment (requires Node.js 22+, a browser, or a polyfill)',
        'BAD_REQUEST'
      );
    }

    const eventSource = new EventSource(this.buildUrl('/api/events'));

    eventSource.onmessage = (event) => {
      try {
        callback(JSON.parse(String(event.data)) as ThreatFeedEvent);
      } catch (error) {
        onError?.(error);
      }
    };
    eventSource.onerror = (event) => {
      onError?.(event);
    };

    return () => eventSource.close();
  }

  /** Register a webhook endpoint for threat events. */
  async registerWebhook(url: string, events: string[], apiKey: string): Promise<RegisterWebhookResult> {
    const safeUrl = httpUrl(url, 'url');

    if (!Array.isArray(events) || events.length === 0) {
      throw new VibeGuardError('events must be a non-empty array of event names', 'BAD_REQUEST');
    }
    const normalizedEvents = events.map((event, index) => requiredString(event, `events[${index}]`));
    const key = requiredString(apiKey, 'apiKey');

    return this.request<RegisterWebhookResult>('/api/webhooks', {
      method: 'POST',
      headers: this.headers(true),
      body: JSON.stringify({ url: safeUrl, events: normalizedEvents, apiKey: key }),
    });
  }

  /** List registered webhooks. */
  async getWebhooks(): Promise<WebhooksResult> {
    return this.request<WebhooksResult>('/api/webhooks');
  }

  /** Trigger a threat-index refresh from on-chain events. */
  async reindexThreats(): Promise<ReindexResult> {
    return this.request<ReindexResult>('/api/indexer', {
      method: 'POST',
      headers: this.headers(false),
    });
  }

  /** Fetch raw indexer statistics. */
  async getIndexerStats(): Promise<ThreatStats> {
    return this.request<ThreatStats>('/api/indexer');
  }

  /** Fetch platform analytics counters. */
  async getAnalytics(): Promise<AnalyticsData> {
    return this.request<AnalyticsData>('/api/analytics');
  }

  /** Fetch Walrus blob health status for the threat registry. */
  async getBlobHealth(): Promise<BlobHealthResult> {
    return this.request<BlobHealthResult>('/api/blob-health');
  }

  private buildUrl(path: string, params?: URLSearchParams): string {
    const query = params && params.toString() ? `?${params.toString()}` : '';
    return `${this.baseUrl}${path}${query}`;
  }

  private headers(json: boolean): Record<string, string> {
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
    return headers;
  }

  private async request<T>(path: string, init: RequestInit = {}, params?: URLSearchParams): Promise<T> {
    const url = this.buildUrl(path, params);

    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (error) {
      const name = (error as { name?: string } | null)?.name;
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new VibeGuardError(
          `Request to ${path} timed out after ${this.timeoutMs}ms`,
          'TIMEOUT'
        );
      }
      throw new VibeGuardError(`Network request to ${path} failed: ${errorMessage(error)}`, 'NETWORK');
    }

    if (!response.ok) {
      let detail: string | undefined;
      try {
        const body = (await response.json()) as { error?: unknown } | null;
        if (body && typeof body === 'object' && typeof body.error === 'string') {
          detail = body.error;
        }
      } catch {
        // Non-JSON error body; status line is enough.
      }
      throw new VibeGuardError(
        `VibeGuard API error: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
        'HTTP_ERROR',
        response.status
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new VibeGuardError(
        `VibeGuard API returned a non-JSON response from ${path}`,
        'BAD_RESPONSE',
        response.status
      );
    }
  }
}
