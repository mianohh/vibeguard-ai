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

/// Inflow-expecting intent keywords (input is lowercased by the caller).
/// MUST stay in sync with INFLOW_INTENT_RE in lib/risk-engine.ts.
fn intent_expects_inflow(intent: &str) -> bool {
    [
        "claim", "airdrop", "mint", "receive", "collect", "reward", "earn",
        "free", "gift", "refund", "compensation", "giveaway", "voucher",
    ]
    .iter()
    .any(|kw| intent.contains(kw))
}

/// Framework packages matched by normalized hex value so mixed case and
/// padded forms (`0X2`, `0x00…02`) cannot masquerade as non-framework calls.
fn is_framework_package(package: &str) -> bool {
    let lower = package.trim().to_lowercase();
    let body = lower.strip_prefix("0x").unwrap_or(&lower);
    let body = body.trim_start_matches('0');
    matches!(body, "1" | "2" | "3" | "5")
}

fn is_drain_function(function: &str) -> bool {
    let f = function.to_lowercase();
    [
        "transfer_all",
        "drain",
        "sweep",
        "sweep_all",
        "approve_all",
        "set_approval_for_all",
        "emergency_withdraw",
        "migrate_all",
        "withdraw_all",
        "unwrap_all",
        "claim_all",
        "collect_all",
        "seize",
        "empty_vault",
        "drain_wallet",
    ]
    .iter()
    .any(|name| f == *name)
}

/// Function names that grant standing authority over the user's assets/objects
/// (Sui analogues of ERC-20 approvals / delegated control — ice phishing).
fn is_permission_function(function: &str) -> bool {
    let f = function.to_lowercase();
    [
        "set_approval_for_all",
        "approve_all",
        "approve",
        "authorize",
        "grant",
        "grant_cap",
        "add_permission",
        "set_permission",
        "add_rule",
        "delegate",
        "set_operator",
        "issue_cap",
    ]
    .iter()
    .any(|name| f == *name)
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

    // Case-insensitive direction matching (evasion: "out"/"Out"/"OUT").
    let outflows: Vec<&AssetFlow> = asset_flows
        .iter()
        .filter(|f| f.direction.eq_ignore_ascii_case("OUT"))
        .collect();
    let inflows: Vec<&AssetFlow> = asset_flows
        .iter()
        .filter(|f| f.direction.eq_ignore_ascii_case("IN"))
        .collect();

    // Strictly attributed flows of the signing user.
    let user_outflows: Vec<&AssetFlow> = outflows
        .iter()
        .copied()
        .filter(|f| f.sender.as_deref() == Some(input.user_address.as_str()))
        .collect();
    let user_inflows: Vec<&AssetFlow> = inflows
        .iter()
        .copied()
        .filter(|f| f.recipient.as_deref() == Some(input.user_address.as_str()))
        .collect();

    // Honeypot: user expects to receive, funds are leaving. Uses ANY outflow —
    // a spoofed/mismatched sender field must not disarm the detection.
    if user_expects_inflow && !outflows.is_empty() && user_inflows.is_empty() {
        flags.push("INTENT_MISMATCH_HONEYPOT".to_string());
    }

    for call in move_calls {
        if is_drain_function(&call.function) {
            flags.push(format!(
                "DRAIN_FUNCTION:{}::{}::{}",
                call.package, call.module, call.function
            ));
        }
        if is_permission_function(&call.function) {
            if user_expects_inflow {
                // Ice phishing: fake claim page asking for standing authority.
                flags.push(format!(
                    "PERMISSION_GRANT_HONEYPOT:{}::{}::{}",
                    call.package, call.module, call.function
                ));
            } else {
                flags.push(format!(
                    "PERMISSION_GRANT:{}::{}::{}",
                    call.package, call.module, call.function
                ));
            }
        }
    }

    let total_out: u64 = user_outflows.iter().map(|f| f.amount).sum();
    if total_out > 0 && user_inflows.is_empty() && user_expects_inflow {
        flags.push(format!("UNEXPECTED_OUTFLOW:{}", total_out));
    }

    if input.simulation_result.gas_budget > 500_000_000 {
        flags.push("HIGH_GAS_BUDGET".to_string());
    }

    // Multi-recipient drain: >3 unique recipients OR >3 separate outflows
    // (omitted recipient fields must not disarm the detection).
    // Real gRPC balanceChanges aggregate the sender's side into ONE outflow
    // entry, so a fan-out drain materializes as N distinct recipient-side IN
    // entries instead of N OUT entries — count that shape too.
    let unique_recipients: std::collections::HashSet<_> = outflows
        .iter()
        .filter_map(|f| f.recipient.as_deref())
        .collect();
    let third_party_ins: Vec<&AssetFlow> = inflows
        .iter()
        .copied()
        .filter(|f| f.recipient.as_deref() != Some(input.user_address.as_str()))
        .collect();
    let unique_in_recipients: std::collections::HashSet<_> = third_party_ins
        .iter()
        .filter_map(|f| f.recipient.as_deref())
        .collect();
    let null_in_count = third_party_ins.iter().filter(|f| f.recipient.is_none()).count();
    if unique_recipients.len() > 3
        || outflows.len() > 3
        || unique_in_recipients.len() > 3
        || null_in_count > 3
    {
        flags.push("MULTI_RECIPIENT_DRAIN".to_string());
    }

    // Risk-based amount signal (research: amount-at-risk thresholds reduce
    // false negatives): large value leaving even when intent appears to match.
    if total_out >= 100_000_000_000 && user_inflows.is_empty() {
        flags.push(format!("LARGE_OUTFLOW:{}", total_out));
    }

    // PTB bundle abuse: batched move calls beyond a normal dApp flow
    // (Sui PTBs support up to 1024 commands).
    if move_calls.len() > 8 {
        flags.push(format!("BUNDLE_COMPLEXITY:{}", move_calls.len()));
    }

    let is_red = flags.iter().any(|f| {
        f.starts_with("INTENT_MISMATCH_HONEYPOT")
            || f.starts_with("DRAIN_FUNCTION")
            || f.starts_with("MULTI_RECIPIENT_DRAIN")
            || f.starts_with("PERMISSION_GRANT_HONEYPOT")
    });

    let (intent_u8, risk_level, headline, malicious_package_id) = if is_red {
        let headline = if flags
            .iter()
            .any(|f| f.starts_with("PERMISSION_GRANT_HONEYPOT"))
        {
            "Dangerous permission grant — a scam contract could drain your wallet later"
        } else {
            "Honeypot detected — assets will leave your wallet"
        };
        (
            2u8,
            "RED".to_string(),
            headline.to_string(),
            candidate_package,
        )
    } else if flags.iter().any(|f| {
        f.starts_with("UNEXPECTED_OUTFLOW")
            || f.starts_with("HIGH_GAS_BUDGET")
            || f.starts_with("PERMISSION_GRANT")
            || f.starts_with("BUNDLE_COMPLEXITY")
            || f.starts_with("LARGE_OUTFLOW")
    }) {
        (
            1u8,
            "YELLOW".to_string(),
            "Suspicious transaction — review asset flows carefully".to_string(),
            None,
        )
    } else {
        (
            0u8,
            "GREEN".to_string(),
            "Transaction looks safe".to_string(),
            None,
        )
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

// ─── /sign_report — upload to Walrus internally, then sign ──────────────────

#[derive(Deserialize)]
pub struct SignReportRequest {
    pub malicious_package_id: String,
    pub reasons: Vec<String>,
    pub reporter: String,
}

#[derive(Serialize)]
pub struct SignReportResponse {
    pub signature: String,
    pub blob_id: String,
    pub blob_object_id: String,
    pub timestamp_ms: u64,
}

#[derive(Serialize)]
struct WalrusEvidence {
    package_id:         String,
    risk_level:         String,
    reasons:            Vec<String>,
    headline:           String,
    plain_english:      String,
    recommended_action: String,
    reported_at:        String,
    reported_by:        String,
}

#[derive(Deserialize)]
struct WalrusStoreResponse {
    #[serde(rename = "newlyCreated")]
    newly_created: Option<WalrusNewlyCreated>,
    #[serde(rename = "alreadyCertified")]
    already_certified: Option<WalrusAlreadyCertified>,
}

#[derive(Deserialize)]
struct WalrusNewlyCreated {
    #[serde(rename = "blobObject")]
    blob_object: WalrusBlobObject,
}

#[derive(Deserialize)]
struct WalrusBlobObject {
    id: String,
    #[serde(rename = "blobId")]
    blob_id: String,
}

#[derive(Deserialize)]
struct WalrusAlreadyCertified {
    #[serde(rename = "blobId")]
    blob_id: String,
}

pub async fn sign_report(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SignReportRequest>,
) -> Json<SignReportResponse> {
    let timestamp_ms = now_ms();

    // ── Step 1: upload evidence to Walrus ────────────────────────────────────
    let evidence = WalrusEvidence {
        package_id:         req.malicious_package_id.clone(),
        risk_level:         "RED".to_string(),
        reasons:            req.reasons.clone(),
        headline:           "Automated Detection: Honeypot/Malicious Contract".to_string(),
        plain_english:      req.reasons.join("; "),
        recommended_action: "Do Not Sign".to_string(),
        reported_at:        chrono::Utc::now().to_rfc3339(),
        reported_by:        req.reporter.clone(),
    };

    let walrus_publisher = std::env::var("WALRUS_PUBLISHER_URL")
        .unwrap_or_else(|_| "https://publisher.walrus-testnet.walrus.space".to_string());

    let client = reqwest::Client::new();
    let walrus_resp = client
        .put(format!("{}/v1/blobs?epochs=5", walrus_publisher))
        .header("Content-Type", "application/json")
        .json(&evidence)
        .send()
        .await;

    let (blob_id, blob_object_id) = match walrus_resp {
        Ok(resp) if resp.status().is_success() => {
            match resp.json::<WalrusStoreResponse>().await {
                Ok(w) => {
                    if let Some(nc) = w.newly_created {
                        (nc.blob_object.blob_id, nc.blob_object.id)
                    } else if let Some(ac) = w.already_certified {
                        (ac.blob_id.clone(), ac.blob_id)
                    } else {
                        ("unknown".to_string(), "unknown".to_string())
                    }
                }
                Err(_) => ("unknown".to_string(), "unknown".to_string()),
            }
        }
        _ => ("walrus_unavailable".to_string(), "walrus_unavailable".to_string()),
    };

    // ── Step 2: sign pkg_bytes(32) + blob_id_bytes + timestamp_le(8) ─────────
    let pkg_hex = req.malicious_package_id.trim_start_matches("0x");
    let padded  = format!("{:0>64}", pkg_hex);
    let mut pkg_bytes = Hex::decode(&padded).unwrap_or_else(|_| vec![0u8; 32]);
    pkg_bytes.resize(32, 0);

    let mut msg = pkg_bytes;
    msg.extend_from_slice(blob_id.as_bytes());
    msg.extend_from_slice(&timestamp_ms.to_le_bytes());

    let signature     = state.eph_kp.sign(&msg);
    let signature_hex = Hex::encode(signature.as_ref());

    Json(SignReportResponse {
        signature: signature_hex,
        blob_id,
        blob_object_id,
        timestamp_ms,
    })
}

// ─── Adversarial test suite ──────────────────────────────────────────────────
// Tier A: unit tests for analyze() covering RED cores, YELLOW cores,
// false-positive guards, and active evasion attempts.
#[cfg(test)]
mod tests {
    use super::*;

    const USER: &str = "0x1111111111111111111111111111111111111111111111111111111111111111";
    const ATTACKER: &str = "0x2222222222222222222222222222222222222222222222222222222222222222";
    const SCAM_PKG: &str =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    fn flow(
        direction: &str,
        amount: u64,
        sender: Option<&str>,
        recipient: Option<&str>,
    ) -> AssetFlow {
        AssetFlow {
            asset_type: "0x2::sui::SUI".to_string(),
            direction: direction.to_string(),
            amount,
            recipient: recipient.map(String::from),
            sender: sender.map(String::from),
        }
    }

    fn call(package: &str, module: &str, function: &str) -> MoveCall {
        MoveCall {
            package: package.to_string(),
            module: module.to_string(),
            function: function.to_string(),
        }
    }

    fn input(
        intent: &str,
        flows: Vec<AssetFlow>,
        calls: Vec<MoveCall>,
        gas_budget: u64,
    ) -> ThreatInput {
        ThreatInput {
            // analyze() never parses tx bytes — placeholder only.
            transaction_bytes: "AAAAAAAAAAAAAAAA".to_string(),
            user_intent: intent.to_string(),
            user_address: USER.to_string(),
            network: "testnet".to_string(),
            simulation_result: SimulationResult {
                asset_flows: flows,
                move_calls: calls,
                gas_budget,
            },
        }
    }

    fn run(i: &ThreatInput) -> ThreatPayload {
        analyze(i)
    }

    fn has(p: &ThreatPayload, prefix: &str) -> bool {
        p.flags.iter().any(|f| f.starts_with(prefix))
    }

    fn drain(amount: u64) -> AssetFlow {
        flow("OUT", amount, Some(USER), Some(ATTACKER))
    }

    // ── RED cores ───────────────────────────────────────────────────────────

    #[test]
    fn red_honeypot_claim_drain() {
        let p = run(&input(
            "Claim my airdrop rewards",
            vec![drain(300_000_000)],
            vec![],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "RED");
        assert_eq!(p.intent, 2);
        assert!(has(&p, "INTENT_MISMATCH_HONEYPOT"));
        assert!(has(&p, "UNEXPECTED_OUTFLOW:"));
        assert!(p.headline.contains("Honeypot"));
    }

    #[test]
    fn red_drain_function_lowercase() {
        let p = run(&input(
            "send payments",
            vec![],
            vec![call(SCAM_PKG, "vault", "transfer_all")],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "RED");
        assert!(has(&p, "DRAIN_FUNCTION:"));
        assert_eq!(p.malicious_package_id.as_deref(), Some(SCAM_PKG));
    }

    #[test]
    fn red_drain_function_mixed_case_evasion() {
        let p = run(&input(
            "send payments",
            vec![],
            vec![call(SCAM_PKG, "vault", "Transfer_All")],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "RED", "case-evasion must not disarm detection");
        assert!(has(&p, "DRAIN_FUNCTION:"));
    }

    #[test]
    fn red_drain_function_expanded_names() {
        for fn_name in [
            "withdraw_all",
            "unwrap_all",
            "claim_all",
            "collect_all",
            "seize",
            "sweep_all",
            "empty_vault",
            "drain_wallet",
        ] {
            let p = run(&input(
                "swap tokens",
                vec![],
                vec![call(SCAM_PKG, "mod", fn_name)],
                100_000_000,
            ));
            assert_eq!(p.risk_level, "RED", "function {} must be RED", fn_name);
            assert!(has(&p, "DRAIN_FUNCTION:"), "function {}", fn_name);
        }
    }

    #[test]
    fn red_multi_recipient_four_unique_recipients() {
        let flows = (0..4)
            .map(|i| {
                let r = format!("0x{:064x}", i + 0x3000);
                flow("OUT", 10_000_000, Some(USER), Some(r.as_str()))
            })
            .collect();
        let p = run(&input("send payments", flows, vec![], 100_000_000));
        assert_eq!(p.risk_level, "RED");
        assert!(has(&p, "MULTI_RECIPIENT_DRAIN"));
        assert!(!has(&p, "INTENT_MISMATCH_HONEYPOT"), "no claim intent → no honeypot flag");
    }

    #[test]
    fn red_multi_recipient_null_recipients_evasion() {
        // Evasion: attacker omits recipient fields so unique-recipient counting sees 0.
        let flows = (0..4)
            .map(|_| flow("OUT", 10_000_000, Some(USER), None))
            .collect();
        let p = run(&input("send payments", flows, vec![], 100_000_000));
        assert_eq!(p.risk_level, "RED", "omitted recipients must not disarm detection");
        assert!(has(&p, "MULTI_RECIPIENT_DRAIN"));
    }

    #[test]
    fn red_permission_grant_honeypot() {
        let p = run(&input(
            "Claim your free voucher",
            vec![],
            vec![call(SCAM_PKG, "vault", "authorize")],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "RED");
        assert!(has(&p, "PERMISSION_GRANT_HONEYPOT:"));
        assert!(p.headline.contains("permission grant"));
        assert_eq!(p.malicious_package_id.as_deref(), Some(SCAM_PKG));
    }

    #[test]
    fn red_honeypot_direction_case_evasion() {
        for dir in ["out", "Out", "oUt"] {
            let p = run(&input(
                "claim airdrop",
                vec![flow(dir, 50_000_000, Some(USER), Some(ATTACKER))],
                vec![],
                100_000_000,
            ));
            assert_eq!(p.risk_level, "RED", "direction {} must not disarm", dir);
            assert!(has(&p, "INTENT_MISMATCH_HONEYPOT"));
        }
    }

    #[test]
    fn red_honeypot_sender_spoof_evasion() {
        // Evasion: sender attribution mismatched so strict user_outflows is empty.
        let p = run(&input(
            "claim airdrop",
            vec![flow("OUT", 50_000_000, Some(ATTACKER), Some(ATTACKER))],
            vec![],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "RED", "sender mismatch must not disarm detection");
        assert!(has(&p, "INTENT_MISMATCH_HONEYPOT"));
    }

    #[test]
    fn red_drain_independent_of_intent() {
        let p = run(&input(
            "send 1 SUI to friend",
            vec![],
            vec![call(SCAM_PKG, "mod", "drain")],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "RED");
        assert!(has(&p, "DRAIN_FUNCTION:"));
    }

    #[test]
    fn red_mixed_case_intent() {
        let p = run(&input(
            "CLAIM My AIRDROP",
            vec![drain(1_000_000)],
            vec![],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "RED");
    }

    #[test]
    fn red_unicode_intent_no_panic() {
        let p = run(&input(
            " 🎁 CLAIM gift voucher ",
            vec![drain(1_000_000)],
            vec![],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "RED");
    }

    // ── YELLOW cores ────────────────────────────────────────────────────────

    #[test]
    fn yellow_high_gas_budget() {
        let p = run(&input(
            "send 1 SUI to friend",
            vec![drain(10_000_000)],
            vec![],
            500_000_001,
        ));
        assert_eq!(p.risk_level, "YELLOW");
        assert!(has(&p, "HIGH_GAS_BUDGET"));
        assert_eq!(p.intent, 1);
    }

    #[test]
    fn yellow_permission_grant_without_claim_intent() {
        let p = run(&input(
            "swap tokens",
            vec![],
            vec![call(SCAM_PKG, "mod", "grant_cap")],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "YELLOW");
        assert!(has(&p, "PERMISSION_GRANT:"));
        assert!(!has(&p, "PERMISSION_GRANT_HONEYPOT:"));
        assert_eq!(p.malicious_package_id, None, "yellow must not nominate a report pkg");
    }

    #[test]
    fn yellow_bundle_complexity_nine_calls() {
        let calls = (0..9)
            .map(|i| call("0x2", "coin", &format!("fn{}", i)))
            .collect();
        let p = run(&input("swap tokens", vec![], calls, 100_000_000));
        assert_eq!(p.risk_level, "YELLOW");
        assert!(has(&p, "BUNDLE_COMPLEXITY:9"));
    }

    #[test]
    fn yellow_large_outflow() {
        let p = run(&input(
            "send to treasury",
            vec![flow("OUT", 100_000_000_000, Some(USER), Some(ATTACKER))],
            vec![],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "YELLOW");
        assert!(has(&p, "LARGE_OUTFLOW:"));
    }

    // ── Boundaries ──────────────────────────────────────────────────────────

    #[test]
    fn boundary_gas_budget_exactly_500m_not_flagged() {
        let p = run(&input("view balance", vec![], vec![], 500_000_000));
        assert_eq!(p.risk_level, "GREEN");
        assert!(!has(&p, "HIGH_GAS_BUDGET"));
    }

    #[test]
    fn boundary_eight_move_calls_not_flagged() {
        let calls = (0..8)
            .map(|i| call("0x2", "coin", &format!("fn{}", i)))
            .collect();
        let p = run(&input("swap tokens", vec![], calls, 100_000_000));
        assert_eq!(p.risk_level, "GREEN");
        assert!(!has(&p, "BUNDLE_COMPLEXITY"));
    }

    #[test]
    fn boundary_three_recipients_not_flagged() {
        let flows = (0..3)
            .map(|i| {
                let r = format!("0x{:064x}", i + 0x4000);
                flow("OUT", 10_000_000, Some(USER), Some(r.as_str()))
            })
            .collect();
        let p = run(&input("send payments", flows, vec![], 100_000_000));
        assert_eq!(p.risk_level, "GREEN");
        assert!(!has(&p, "MULTI_RECIPIENT_DRAIN"));
    }

    #[test]
    fn boundary_large_outflow_one_below_threshold() {
        let p = run(&input(
            "send to treasury",
            vec![flow("OUT", 99_999_999_999, Some(USER), Some(ATTACKER))],
            vec![],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "GREEN");
        assert!(!has(&p, "LARGE_OUTFLOW"));
    }

    // ── False-positive guards (must stay GREEN) ─────────────────────────────

    #[test]
    fn green_honest_claim_with_inflow() {
        let p = run(&input(
            "claim airdrop rewards",
            vec![flow("IN", 300_000_000, None, Some(USER))],
            vec![],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "GREEN");
    }

    #[test]
    fn green_honest_claim_with_inflow_direction_case() {
        let p = run(&input(
            "claim airdrop",
            vec![flow("In", 300_000_000, None, Some(USER))],
            vec![],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "GREEN");
    }

    #[test]
    fn green_empty_flows_safe_intent() {
        let p = run(&input("view my balance", vec![], vec![], 1_000_000));
        assert_eq!(p.risk_level, "GREEN");
        assert_eq!(p.intent, 0);
        assert_eq!(p.malicious_package_id, None);
    }

    #[test]
    fn green_framework_only_move_calls_not_nominated() {
        let p = run(&input(
            "swap tokens",
            vec![],
            vec![
                call("0x2", "coin", "pay"),
                call("0x1", "option", "destroy_some"),
                call("0X2", "pay", "public_transfer"),
                call(
                    "0x0000000000000000000000000000000000000000000000000000000000000003",
                    "type_name",
                    "get",
                ),
            ],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "GREEN");
        assert_eq!(
            p.malicious_package_id, None,
            "framework packages (any case/padding) must not be nominated"
        );
    }

    #[test]
    fn green_normal_send_intent() {
        let p = run(&input(
            "send 1 SUI to friend",
            vec![drain(1_000_000_000)],
            vec![],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "GREEN");
        assert!(!has(&p, "INTENT_MISMATCH_HONEYPOT"));
    }

    #[test]
    fn green_self_transfer() {
        let p = run(&input(
            "move funds to my cold wallet",
            vec![flow("OUT", 100_000_000, Some(USER), Some(USER))],
            vec![],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "GREEN");
    }

    #[test]
    fn green_garbage_direction_no_panic() {
        let p = run(&input(
            "claim airdrop",
            vec![flow("???", 100, Some(USER), Some(ATTACKER))],
            vec![],
            100_000_000,
        ));
        assert_eq!(p.risk_level, "GREEN", "unparseable direction must not count as OUT");
    }

    // ── Serde / API contract ────────────────────────────────────────────────

    #[test]
    fn serde_negative_amount_rejected() {
        let body = format!(
            r#"{{"payload":{{"transaction_bytes":"AA==","user_intent":"x","user_address":"0x1","network":"testnet","simulation_result":{{"asset_flows":[{{"asset_type":"a","direction":"OUT","amount":-5}}],"move_calls":[],"gas_budget":1}}}}}}"#
        );
        assert!(
            serde_json::from_str::<ProcessDataRequest>(&body).is_err(),
            "negative amount must fail u64 deserialization (422 path)"
        );
    }

    #[test]
    fn serde_missing_simulation_rejected() {
        let body = r#"{"payload":{"transaction_bytes":"AA==","user_intent":"x","user_address":"0x1","network":"testnet"}}"#;
        assert!(serde_json::from_str::<ProcessDataRequest>(body).is_err());
    }

    // ── Signing contract ────────────────────────────────────────────────────

    #[test]
    fn signing_message_layout() {
        let payload = ThreatPayload {
            intent: 2,
            timestamp_ms: 1_700_000_000_000,
            risk_level: "RED".to_string(),
            headline: "h".to_string(),
            flags: vec![],
            malicious_package_id: None,
            walrus_blob_id: None,
        };
        // 32 zero-pkg bytes + empty blob + u64 LE timestamp
        assert_eq!(build_signing_message(&payload).len(), 40);

        let with_pkg = ThreatPayload {
            malicious_package_id: Some("0x01".to_string()),
            walrus_blob_id: Some("abc".to_string()),
            ..payload.clone()
        };
        let msg = build_signing_message(&with_pkg);
        assert_eq!(msg.len(), 32 + 3 + 8);
        // Short pkg hex is left-aligned after decode + resize — must match the
        // TS verifier in lib/enclave-client.ts (Buffer.copy at offset 0).
        assert_eq!(msg[0], 0x01);
        assert_eq!(&msg[1..32], &[0u8; 31]);
        assert_eq!(&msg[32..35], b"abc");
        assert_eq!(
            u64::from_le_bytes(msg[35..43].try_into().unwrap()),
            1_700_000_000_000
        );
    }

    #[test]
    fn red_via_drain_preserves_original_behavior() {
        // Regression: the original engine's RED triggers still fire.
        let p = run(&input(
            "claim",
            vec![flow("OUT", 42, Some(USER), Some(ATTACKER))],
            vec![],
            600_000_000,
        ));
        assert_eq!(p.risk_level, "RED");
        assert!(has(&p, "INTENT_MISMATCH_HONEYPOT"));
        assert!(has(&p, "UNEXPECTED_OUTFLOW:42"));
        assert!(has(&p, "HIGH_GAS_BUDGET"));
    }

    // ── Real gRPC balanceChange shapes (sender side aggregates to one entry) ─

    #[test]
    fn red_real_shape_fan_out_third_party_inflows() {
        // What a real 4-recipient drain dry-run produces: ONE aggregated OUT
        // for the sender + one IN per receiving address.
        let mut flows = vec![flow("OUT", 40_000_000, Some(USER), None)];
        for i in 0..4 {
            let r = format!("0x{:064x}", i + 0x4000);
            flows.push(flow("IN", 10_000_000, Some(ATTACKER), Some(r.as_str())));
        }
        let p = run(&input("move funds", flows, vec![], 100_000_000));
        assert_eq!(p.risk_level, "RED");
        assert!(has(&p, "MULTI_RECIPIENT_DRAIN"));
    }

    #[test]
    fn green_real_shape_three_third_party_inflows_boundary() {
        let mut flows = vec![flow("OUT", 30_000_000, Some(USER), None)];
        for i in 0..3 {
            let r = format!("0x{:064x}", i + 0x5000);
            flows.push(flow("IN", 10_000_000, Some(ATTACKER), Some(r.as_str())));
        }
        let p = run(&input("send to collaborators", flows, vec![], 100_000_000));
        assert_eq!(p.risk_level, "GREEN", "3 recipients stays under the threshold");
    }

    #[test]
    fn green_real_shape_inflows_to_user_not_fan_out() {
        // Multiple sources paying the USER must not count as fan-out drain.
        let mut flows = vec![flow("IN", 10_000_000, Some(ATTACKER), Some(USER))];
        for i in 0..4 {
            let s = format!("0x{:064x}", i + 0x6000);
            flows.push(flow("IN", 5_000_000, Some(s.as_str()), Some(USER)));
        }
        let p = run(&input("claim airdrop", flows, vec![], 100_000_000));
        assert_eq!(p.risk_level, "GREEN");
    }

    #[test]
    fn red_real_shape_null_recipient_in_evasion() {
        // Recipient-side entries with omitted recipient fields (4+).
        let mut flows = vec![flow("OUT", 40_000_000, Some(USER), None)];
        for _ in 0..4 {
            flows.push(flow("IN", 10_000_000, Some(ATTACKER), None));
        }
        let p = run(&input("move funds", flows, vec![], 100_000_000));
        assert_eq!(p.risk_level, "RED", "null recipient IN entries must not disarm");
        assert!(has(&p, "MULTI_RECIPIENT_DRAIN"));
    }
}
