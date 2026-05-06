use axum::{extract::State, response::Json};
use serde::Serialize;
use std::sync::Arc;
use tracing::info;
use fastcrypto::encoding::{Hex, Encoding};

use crate::AppState;

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

    use fastcrypto::traits::KeyPair;
    let public_key = Hex::encode(state.eph_kp.public().as_bytes());

    let (pcr0, pcr1, pcr2) = get_pcr_measurements();
    let attestation_document = get_attestation_document();

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

fn get_pcr_measurements() -> (String, String, String) {
    #[cfg(feature = "nitro")]
    {
        // Real AWS Nitro Enclave - use mock values for now
        // TODO: Implement real NSM API calls when running in actual enclave
        let pcr0 = "aa".repeat(48);
        let pcr1 = "bb".repeat(48);
        let pcr2 = "cc".repeat(48);
        
        (pcr0, pcr1, pcr2)
    }

    #[cfg(not(feature = "nitro"))]
    {
        // Local testing - use mock PCRs matching seal-setup.ts
        let pcr0 = "aa".repeat(48); // 48 bytes of 0xaa
        let pcr1 = "bb".repeat(48); // 48 bytes of 0xbb
        let pcr2 = "cc".repeat(48); // 48 bytes of 0xcc
        
        (pcr0, pcr1, pcr2)
    }
}

fn get_attestation_document() -> Option<String> {
    #[cfg(feature = "nitro")]
    {
        // Real AWS Nitro Enclave - would get signed attestation document
        // TODO: Implement real NSM API calls when running in actual enclave
        None
    }

    #[cfg(not(feature = "nitro"))]
    {
        // Local testing - no real attestation document
        None
    }
}
