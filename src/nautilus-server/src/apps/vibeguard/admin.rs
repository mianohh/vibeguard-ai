use axum::{http::StatusCode, response::Json};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tracing::info;

use super::threat_agent::AgentConfig;

// Global state for cached Seal keys and agent configuration
static SEAL_KEYS: Mutex<Option<Vec<u8>>> = Mutex::new(None);
static AGENT_CONFIG: Mutex<Option<AgentConfig>> = Mutex::new(None);

#[derive(Deserialize)]
pub struct InitSealKeyLoadRequest {
    pub enclave_object_id: String,
    pub initial_shared_version: u64,
}

#[derive(Serialize)]
pub struct InitSealKeyLoadResponse {
    /// Hex-encoded BCS-serialized FetchKeyRequest
    /// Contains: PTB for seal_approve + ElGamal encryption public key
    pub encoded_request: String,
}

#[derive(Deserialize)]
pub struct CompleteSealKeyLoadRequest {
    /// Hex-encoded Seal responses from key servers
    pub seal_responses: String,
}

#[derive(Serialize)]
pub struct StatusResponse {
    pub status: String,
}

#[derive(Deserialize)]
pub struct ProvisionConfigRequest {
    /// Base64-encoded encrypted agent configuration object
    pub encrypted_object: String,
}

/// POST /admin/init_seal_key_load
/// 
/// Step 1 of Seal 2-step key load.
/// 
/// Flow:
/// 1. Generate ElGamal encryption keypair (for decrypting Seal responses)
/// 2. Create seal_approve PTB signed by enclave ephemeral key
/// 3. Return FetchKeyRequest for use with seal-cli
pub async fn init_seal_key_load(
    Json(request): Json<InitSealKeyLoadRequest>,
) -> Result<Json<InitSealKeyLoadResponse>, (StatusCode, String)> {
    info!("🔐 /admin/init_seal_key_load called");
    info!("   Enclave object: {}", request.enclave_object_id);

    // TODO: Implement full Seal integration
    // For now, return stub response
    
    // In production:
    // 1. Generate ElGamal keypair: let (encryption_pk, encryption_sk) = generate_elgamal_keypair();
    // 2. Create seal_approve PTB with enclave ephemeral key signature
    // 3. Encode FetchKeyRequest with PTB + encryption_pk
    
    Err((
        StatusCode::NOT_IMPLEMENTED,
        "Seal key load not yet implemented. Use GEMINI_API_KEY env var for testing.".to_string(),
    ))
}

/// POST /admin/complete_seal_key_load
/// 
/// Step 2 of Seal 2-step key load.
/// 
/// Flow:
/// 1. Decrypt Seal responses using ElGamal private key
/// 2. Verify decrypted keys against Seal server public keys
/// 3. Cache keys in memory for later use
pub async fn complete_seal_key_load(
    Json(_request): Json<CompleteSealKeyLoadRequest>,
) -> Result<Json<StatusResponse>, (StatusCode, String)> {
    info!("🔐 /admin/complete_seal_key_load called");

    // TODO: Implement full Seal integration
    // For now, return stub response
    
    // In production:
    // 1. Decode seal_responses from hex
    // 2. Decrypt using ElGamal private key
    // 3. Verify against Seal server public keys
    // 4. Cache in SEAL_KEYS
    
    Err((
        StatusCode::NOT_IMPLEMENTED,
        "Seal key load not yet implemented. Use GEMINI_API_KEY env var for testing.".to_string(),
    ))
}

/// POST /admin/provision_agent_config
/// 
/// Decrypt and provision the LocalThreatAgent configuration.
/// 
/// Flow:
/// 1. Decrypt encrypted_object using cached Seal keys
/// 2. Store decrypted configuration in memory
/// 3. /process_data can now use the config
pub async fn provision_agent_config(
    Json(_request): Json<ProvisionConfigRequest>,
) -> Result<Json<StatusResponse>, (StatusCode, String)> {
    info!("🔑 /admin/provision_agent_config called");

    // TODO: Implement full Seal integration
    // For now, return stub response
    
    // In production:
    // 1. Decode encrypted_object from base64
    // 2. Decrypt using cached Seal keys
    // 3. Deserialize to AgentConfig
    // 4. Store in AGENT_CONFIG
    
    Err((
        StatusCode::NOT_IMPLEMENTED,
        "Seal config provisioning not yet implemented. Using default AgentConfig for testing.".to_string(),
    ))
}

/// Get cached agent configuration (if provisioned via Seal)
pub fn get_cached_agent_config() -> Option<AgentConfig> {
    AGENT_CONFIG.lock().unwrap().clone()
}
