use serde::{Deserialize, Serialize};
use anyhow::{Result, Context};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttestationDoc {
    pub pcr0: Vec<u8>,
    pub pcr1: Vec<u8>,
    pub pcr2: Vec<u8>,
    pub public_key: Vec<u8>,
    pub document: Vec<u8>,
}

#[cfg(feature = "nitro")]
pub fn get_attestation_with_public_key(public_key: &[u8]) -> Result<AttestationDoc> {
    use aws_nitro_enclaves_nsm_api::{api::Request, driver as nsm_driver};
    
    let nsm_fd = nsm_driver::nsm_init();
    let user_data = Some(public_key.to_vec());
    let nonce = None;
    
    let request = Request::Attestation {
        user_data,
        nonce,
        public_key: None,
    };
    
    let response = nsm_driver::nsm_process_request(nsm_fd, request);
    nsm_driver::nsm_exit(nsm_fd);
    
    match response {
        aws_nitro_enclaves_nsm_api::api::Response::Attestation { document } => {
            let parsed = parse_attestation_document(&document)?;
            
            Ok(AttestationDoc {
                pcr0: parsed.pcrs.get(&0).cloned().unwrap_or_default(),
                pcr1: parsed.pcrs.get(&1).cloned().unwrap_or_default(),
                pcr2: parsed.pcrs.get(&2).cloned().unwrap_or_default(),
                public_key: public_key.to_vec(),
                document,
            })
        }
        _ => Err(anyhow::anyhow!("Failed to get attestation from NSM")),
    }
}

#[cfg(not(feature = "nitro"))]
pub fn get_attestation_with_public_key(public_key: &[u8]) -> Result<AttestationDoc> {
    // Mock attestation for local testing
    Ok(AttestationDoc {
        pcr0: vec![0xaa; 48],
        pcr1: vec![0xbb; 48],
        pcr2: vec![0xcc; 48],
        public_key: public_key.to_vec(),
        document: vec![],
    })
}

#[cfg(feature = "nitro")]
fn parse_attestation_document(doc: &[u8]) -> Result<ParsedAttestation> {
    use std::collections::BTreeMap;
    
    // Parse CBOR attestation document
    let value: serde_cbor::Value = serde_cbor::from_slice(doc)
        .context("Failed to parse attestation document")?;
    
    let map = value.as_map()
        .context("Attestation document is not a map")?;
    
    let mut pcrs = BTreeMap::new();
    
    if let Some(pcr_value) = map.iter().find(|(k, _)| {
        k.as_text().map(|s| s == "pcrs").unwrap_or(false)
    }).map(|(_, v)| v) {
        if let Some(pcr_map) = pcr_value.as_map() {
            for (k, v) in pcr_map {
                if let (Some(idx), Some(bytes)) = (k.as_integer(), v.as_bytes()) {
                    pcrs.insert(idx as u8, bytes.to_vec());
                }
            }
        }
    }
    
    Ok(ParsedAttestation { pcrs })
}

#[cfg(feature = "nitro")]
struct ParsedAttestation {
    pcrs: std::collections::BTreeMap<u8, Vec<u8>>,
}

pub fn pcr_to_hex(pcr: &[u8]) -> String {
    hex::encode(pcr)
}
