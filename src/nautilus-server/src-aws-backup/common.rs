use axum::{extract::State, response::Json};
use serde::{Serialize, Deserialize};
use std::sync::Arc;
use tracing::info;
use fastcrypto::encoding::{Hex, Encoding};
use fastcrypto::traits::KeyPair;

use crate::{AppState, attestation};

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
}

pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        service: "vibeguard-nautilus-server".to_string(),
    })
}

#[derive(Serialize)]
pub struct AttestationResponse {
    /// Enclave's ephemeral Ed25519 public key (32 bytes, hex-encoded)
    pub public_key: String,
    
    /// PCR0: Enclave image measurement (48 bytes, hex-encoded)
    pub pcr0: String,
    
    /// PCR1: Kernel and boot ramdisk measurement (48 bytes, hex-encoded)
    pub pcr1: String,
    
    /// PCR2: Application measurement (48 bytes, hex-encoded)
    pub pcr2: String,
    
    pub attestation_document: Option<String>,
}

pub async fn get_attestation(
    State(state): State<Arc<AppState>>,
) -> Json<AttestationResponse> {
    info!("📡 /get_attestation called");

    let public_key = Hex::encode(state.eph_kp.public().as_ref());

    // Get real attestation with public key embedded
    let attestation_doc = attestation::get_attestation_with_public_key(state.eph_kp.public().as_ref())
        .unwrap_or_else(|e| {
            tracing::error!("Failed to get attestation: {}", e);
            attestation::AttestationDoc {
                pcr0: vec![0xaa; 48],
                pcr1: vec![0xbb; 48],
                pcr2: vec![0xcc; 48],
                public_key: state.eph_kp.public().as_ref().to_vec(),
                document: vec![],
            }
        });

    let pcr0 = attestation::pcr_to_hex(&attestation_doc.pcr0);
    let pcr1 = attestation::pcr_to_hex(&attestation_doc.pcr1);
    let pcr2 = attestation::pcr_to_hex(&attestation_doc.pcr2);
    
    let attestation_document = if !attestation_doc.document.is_empty() {
        Some(base64::encode(&attestation_doc.document))
    } else {
        None
    };

    info!("   Public key: {}...", &public_key[..16]);
    info!("   PCR0: {}...", &pcr0[..16]);

    Json(AttestationResponse {
        public_key,
        pcr0,
        pcr1,
        pcr2,
        attestation_document,
    })
}
