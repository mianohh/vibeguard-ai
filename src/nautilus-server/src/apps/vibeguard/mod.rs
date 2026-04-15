use axum::{extract::State, http::StatusCode, response::Json};
use ed25519_dalek::Signer;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info};

use crate::EnclaveState;

pub mod admin;
mod threat_agent;

#[derive(Deserialize)]
pub struct ProcessDataRequest {
    pub payload: ThreatAnalysisPayload,
}

#[derive(Deserialize, Serialize)]
pub struct ThreatAnalysisPayload {
    pub transaction_bytes: String,
    pub user_intent: String,
    pub user_address: Option<String>,
    pub network: Option<String>,
}

#[derive(Serialize)]
pub struct ProcessDataResponse {
    /// The threat analysis result
    pub response: ThreatAnalysisResult,
    
    /// Ed25519 signature over the response (64 bytes, hex-encoded)
    /// Signed by the enclave's ephemeral keypair
    pub signature: String,
}

#[derive(Serialize, Deserialize)]
pub struct ThreatAnalysisResult {
    pub risk_level: String,
    pub headline: String,
    pub plain_english: String,
    pub reasons: Vec<String>,
    pub recommended_action: String,
    pub timestamp_ms: u64,
}

/// POST /process_data
/// 
/// Main enclave endpoint - performs threat analysis using LocalThreatAgent
/// and returns a signed response.
/// 
/// Flow:
/// 1. Load agent configuration (from Seal in production, default in testing)
/// 2. Run LocalThreatAgent analysis (deterministic, pattern-based)
/// 3. Sign response with enclave ephemeral keypair
/// 4. Return { response, signature }
pub async fn process_data(
    State(state): State<Arc<EnclaveState>>,
    Json(request): Json<ProcessDataRequest>,
) -> Result<Json<ProcessDataResponse>, (StatusCode, String)> {
    info!("🔍 /process_data called");

    // 1. Get agent configuration (from Seal in production, default in testing)
    let config = get_agent_config()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 2. Run LocalThreatAgent analysis
    let analysis = threat_agent::analyze_transaction(&request.payload, &config)
        .map_err(|e| {
            error!("Threat analysis error: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Analysis failed: {}", e))
        })?;

    // 3. Add timestamp
    let timestamp_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    let result = ThreatAnalysisResult {
        risk_level: analysis.risk_level,
        headline: analysis.headline,
        plain_english: analysis.plain_english,
        reasons: analysis.reasons,
        recommended_action: analysis.recommended_action,
        timestamp_ms,
    };

    // 4. Sign the response with enclave keypair
    let message = construct_signature_message(&result);
    let signature = state.signing_key.sign(&message);
    let signature_hex = hex::encode(signature.to_bytes());

    info!("✅ Analysis complete, response signed");

    Ok(Json(ProcessDataResponse {
        response: result,
        signature: signature_hex,
    }))
}

/// Construct the message to sign
/// 
/// Format: JSON serialization of the analysis result
fn construct_signature_message(result: &ThreatAnalysisResult) -> Vec<u8> {
    serde_json::to_vec(result).expect("Failed to serialize result")
}

/// Get agent configuration
/// 
/// In production: decrypted from Seal using cached keys
/// In testing: uses default configuration
fn get_agent_config() -> Result<threat_agent::AgentConfig, String> {
    // Check if Seal config is cached (production path)
    if let Some(config) = admin::get_cached_agent_config() {
        return Ok(config);
    }

    // Fallback to default configuration (testing path)
    Ok(threat_agent::AgentConfig::default())
}
