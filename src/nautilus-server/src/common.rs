use axum::{extract::State, response::Json};
use fastcrypto::encoding::{Hex, Encoding};
use fastcrypto::traits::KeyPair;
use serde::Serialize;
use std::sync::Arc;
use tracing::info;

use crate::AppState;
use crate::attestation::TeeMode;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub public_key: String,
}

pub async fn health_check(
    State(state): State<Arc<AppState>>,
) -> Json<HealthResponse> {
    let public_key = Hex::encode(state.eph_kp.public().as_ref());
    Json(HealthResponse {
        status: "healthy".to_string(),
        service: "vibeguard-nautilus-server".to_string(),
        public_key,
    })
}

#[derive(Serialize)]
pub struct AttestationResponse {
    /// Enclave's persistent Ed25519 public key (32 bytes, hex-encoded)
    pub public_key: String,
    /// PCR0: SHA384(SHA384(binary)) — enclave image measurement
    pub pcr0: String,
    /// PCR1: SHA384("kernel" + SHA384(binary) hex) — kernel measurement
    pub pcr1: String,
    /// PCR2: SHA384("app" + SHA384(binary) hex) — application measurement
    pub pcr2: String,
    /// TEE provider identifier
    pub provider: String,
    /// TEE mode
    pub mode: TeeMode,
    /// Attestation document (None on non-Nitro instances)
    pub attestation_document: Option<String>,
}

pub async fn get_attestation(
    State(state): State<Arc<AppState>>,
) -> Json<AttestationResponse> {
    info!("📡 /get_attestation called");

    let public_key = Hex::encode(state.eph_kp.public().as_ref());

    info!("   Public key: {}...", &public_key[..16]);
    info!("   PCR0: {}...", &state.pcr0[..16]);

    Json(AttestationResponse {
        public_key,
        pcr0: state.pcr0.clone(),
        pcr1: state.pcr1.clone(),
        pcr2: state.pcr2.clone(),
        provider: "gcp_sev".to_string(),
        mode: TeeMode::GcpSev,
        attestation_document: None,
    })
}
