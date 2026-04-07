use axum::{extract::State, response::Json};
use serde::Serialize;
use std::sync::Arc;
use tracing::info;

use crate::EnclaveState;

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
    
    /// AWS Nitro attestation document (base64-encoded)
    /// In production, this is a CBOR-encoded document signed by AWS
    /// For local testing, this is a mock value
    pub attestation_document: Option<String>,
}

/// GET /get_attestation
/// 
/// Returns the enclave's public key and PCR measurements.
/// In production (AWS Nitro), this also returns a signed attestation document
/// that proves the enclave is running the expected code.
pub async fn get_attestation(
    State(state): State<Arc<EnclaveState>>,
) -> Json<AttestationResponse> {
    info!("📡 /get_attestation called");

    let public_key = hex::encode(state.verifying_key.as_bytes());

    // In production, these PCRs come from the real Nitro Enclave
    // For local testing, we use deterministic mock values
    let (pcr0, pcr1, pcr2) = get_pcr_measurements();

    // In production, this would be the real AWS Nitro attestation document
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

/// Get PCR measurements
/// 
/// In production (AWS Nitro), this reads from /dev/nsm device
/// For local testing, returns deterministic mock values matching seal-setup.ts
fn get_pcr_measurements() -> (String, String, String) {
    #[cfg(feature = "nitro")]
    {
        // Real AWS Nitro Enclave - read from NSM device
        use aws_nitro_enclaves_nsm_api as nsm;
        
        let nsm_fd = nsm::driver::nsm_init();
        let nsm_response = nsm::driver::nsm_get_attestation_doc(nsm_fd, None, None, None);
        
        match nsm_response {
            nsm::api::Response::Attestation { document } => {
                // Parse CBOR document and extract PCRs
                // (Implementation details omitted for brevity)
                unimplemented!("Real Nitro PCR extraction")
            }
            _ => panic!("Failed to get attestation from NSM"),
        }
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

/// Get attestation document
/// 
/// In production, this is a CBOR-encoded document signed by AWS
/// For local testing, returns None
fn get_attestation_document() -> Option<String> {
    #[cfg(feature = "nitro")]
    {
        // Real AWS Nitro Enclave - get signed attestation document
        use aws_nitro_enclaves_nsm_api as nsm;
        
        let nsm_fd = nsm::driver::nsm_init();
        let nsm_response = nsm::driver::nsm_get_attestation_doc(nsm_fd, None, None, None);
        
        match nsm_response {
            nsm::api::Response::Attestation { document } => {
                Some(base64::encode(&document))
            }
            _ => None,
        }
    }

    #[cfg(not(feature = "nitro"))]
    {
        // Local testing - no real attestation document
        None
    }
}
