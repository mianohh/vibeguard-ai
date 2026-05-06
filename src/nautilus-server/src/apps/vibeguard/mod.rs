use axum::{extract::State, Json};
use fastcrypto::traits::Signer;
use fastcrypto::encoding::{Hex, Encoding};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::AppState;

#[derive(Deserialize)]
pub struct ProcessDataRequest {
    pub payload: ThreatInput,
}

#[derive(Deserialize)]
pub struct ThreatInput {
    pub transaction_bytes: String,
    pub user_intent: String,
    pub user_address: String,
    pub network: String,
    pub simulation_result: SimulationResult,
}

#[derive(Deserialize)]
pub struct SimulationResult {
    pub asset_flows: Vec<AssetFlow>,
    pub move_calls: Vec<MoveCall>,
    pub gas_budget: u64,
}

#[derive(Deserialize)]
pub struct AssetFlow {
    pub asset_type: String,
    pub direction: String,
    pub amount: u64,
    pub recipient: Option<String>,
    pub sender: Option<String>,
}

#[derive(Deserialize)]
pub struct MoveCall {
    pub package: String,
    pub module: String,
    pub function: String,
}

#[derive(Serialize)]
pub struct ProcessDataResponse {
    pub response: ThreatPayload,
    pub signature: String,
}

#[derive(Serialize, Clone)]
pub struct ThreatPayload {
    pub intent: u8,
    pub timestamp_ms: u64,
    pub risk_level: String,
    pub headline: String,
    pub flags: Vec<String>,
    pub malicious_package_id: Option<String>,
    pub walrus_blob_id: Option<String>,
}

fn build_signing_message(payload: &ThreatPayload) -> Vec<u8> {
    let mut msg = Vec::new();

    let pkg_hex = payload
        .malicious_package_id
        .as_deref()
        .unwrap_or("0000000000000000000000000000000000000000000000000000000000000000");
    let mut pkg_bytes = hex::decode(pkg_hex.trim_start_matches("0x"))
        .unwrap_or_else(|_| vec![0u8; 32]);
    pkg_bytes.resize(32, 0);
    msg.extend_from_slice(&pkg_bytes);

    let blob = payload.walrus_blob_id.as_deref().unwrap_or("");
    msg.extend_from_slice(blob.as_bytes());

    msg.extend_from_slice(&payload.timestamp_ms.to_le_bytes());

    msg
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn intent_expects_inflow(intent: &str) -> bool {
    ["claim", "airdrop", "mint", "receive", "collect", "reward", "earn"]
        .iter()
        .any(|kw| intent.contains(kw))
}

fn is_framework_package(package: &str) -> bool {
    matches!(
        package,
        "0x1" | "0x2" | "0x3" | "0x5" |
        "0x0000000000000000000000000000000000000000000000000000000000000001" |
        "0x0000000000000000000000000000000000000000000000000000000000000002" |
        "0x0000000000000000000000000000000000000000000000000000000000000003" |
        "0x0000000000000000000000000000000000000000000000000000000000000005"
    )
}

fn is_drain_function(function: &str) -> bool {
    matches!(
        function,
        "transfer_all" | "drain" | "sweep" | "approve_all" |
        "set_approval_for_all" | "emergency_withdraw" | "migrate_all"
    )
}

fn analyze(input: &ThreatInput) -> ThreatPayload {
    let timestamp_ms = now_ms();
    let mut flags: Vec<String> = Vec::new();

    let move_calls = &input.simulation_result.move_calls;
    let asset_flows = &input.simulation_result.asset_flows;

    let candidate_package = move_calls
        .iter()
        .find(|c| !is_framework_package(&c.package))
        .map(|c| c.package.clone());

    let user_expects_inflow = intent_expects_inflow(&input.user_intent.to_lowercase());

    let outflows: Vec<&AssetFlow> = asset_flows
        .iter()
        .filter(|f| f.direction == "OUT" && f.sender.as_deref() == Some(input.user_address.as_str()))
        .collect();

    let inflows: Vec<&AssetFlow> = asset_flows
        .iter()
        .filter(|f| f.direction == "IN" && f.recipient.as_deref() == Some(input.user_address.as_str()))
        .collect();

    if user_expects_inflow && !outflows.is_empty() && inflows.is_empty() {
        flags.push("INTENT_MISMATCH_HONEYPOT".to_string());
    }

    for call in move_calls {
        if is_drain_function(&call.function) {
            flags.push(format!("DRAIN_FUNCTION:{}::{}::{}", call.package, call.module, call.function));
        }
    }

    let total_out: u64 = outflows.iter().map(|f| f.amount).sum();
    if total_out > 0 && inflows.is_empty() && user_expects_inflow {
        flags.push(format!("UNEXPECTED_OUTFLOW:{}", total_out));
    }

    if input.simulation_result.gas_budget > 500_000_000 {
        flags.push("HIGH_GAS_BUDGET".to_string());
    }

    let unique_recipients: std::collections::HashSet<_> = outflows
        .iter()
        .filter_map(|f| f.recipient.as_deref())
        .collect();
    if unique_recipients.len() > 3 {
        flags.push("MULTI_RECIPIENT_DRAIN".to_string());
    }

    let (intent_u8, risk_level, headline, malicious_package_id) =
        if flags.iter().any(|f| f.starts_with("INTENT_MISMATCH_HONEYPOT") || f.starts_with("DRAIN_FUNCTION")) {
            (2u8, "RED".to_string(), "Honeypot detected — assets will leave your wallet".to_string(), candidate_package)
        } else if flags.iter().any(|f| f.starts_with("UNEXPECTED_OUTFLOW") || f.starts_with("HIGH_GAS_BUDGET") || f.starts_with("MULTI_RECIPIENT_DRAIN")) {
            (1u8, "YELLOW".to_string(), "Suspicious transaction — review asset flows carefully".to_string(), None)
        } else {
            (0u8, "GREEN".to_string(), "Transaction looks safe".to_string(), None)
        };

    ThreatPayload {
        intent: intent_u8,
        timestamp_ms,
        risk_level,
        headline,
        flags,
        malicious_package_id,
        walrus_blob_id: None,
    }
}

pub async fn process_data(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ProcessDataRequest>,
) -> Json<ProcessDataResponse> {
    let payload = analyze(&req.payload);
    let msg = build_signing_message(&payload);
    let signature = state.eph_kp.sign(&msg);
    let signature_hex = Hex::encode(signature.as_ref());

    Json(ProcessDataResponse {
        response: payload,
        signature: signature_hex,
    })
}

#[derive(Deserialize)]
pub struct SignReportRequest {
    pub malicious_package_id: String,
    pub walrus_blob_id: String,
    pub timestamp_ms: u64,
}

#[derive(Serialize)]
pub struct SignReportResponse {
    pub signature: String,
    pub timestamp_ms: u64,
}

pub async fn sign_report(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SignReportRequest>,
) -> Json<SignReportResponse> {
    // Build message matching Move contract: address_bytes(32) + blob_bytes + timestamp_le(8)
    let pkg_hex = req.malicious_package_id.trim_start_matches("0x");
    let padded = format!("{:0>64}", pkg_hex);
    let mut pkg_bytes = Hex::decode(&padded).unwrap_or_else(|_| vec![0u8; 32]);
    pkg_bytes.resize(32, 0);

    let mut msg = pkg_bytes;
    msg.extend_from_slice(req.walrus_blob_id.as_bytes());
    msg.extend_from_slice(&req.timestamp_ms.to_le_bytes());

    let signature = state.eph_kp.sign(&msg);
    let signature_hex = Hex::encode(signature.as_ref());

    Json(SignReportResponse {
        signature: signature_hex,
        timestamp_ms: req.timestamp_ms,
    })
}
