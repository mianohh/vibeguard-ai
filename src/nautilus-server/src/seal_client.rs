use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use crate::apps::vibeguard::threat_agent::AgentConfig;

const SEAL_KEY_SERVER_URLS: &[&str] = &[
    "https://seal-key-server-1.sui.io",
    "https://seal-key-server-2.sui.io",
    "https://seal-key-server-3.sui.io",
];

#[derive(Serialize)]
struct KeyShareRequest {
    policy_id: String,
    pcr0: String,
    pcr1: String,
    pcr2: String,
    attestation_document: String,
}

#[derive(Deserialize)]
struct KeyShareResponse {
    share: String,
}

pub async fn decrypt_agent_config(
    encrypted_config: &str,
    pcr0: &str,
    pcr1: &str,
    pcr2: &str,
    attestation_doc: &[u8],
) -> Result<AgentConfig> {
    tracing::info!("🔐 Requesting Seal key shares with PCR measurements");
    
    let policy_id = "0x00"; // PCR-based policy from seal-setup.ts
    let attestation_b64 = base64::encode(attestation_doc);
    
    let mut shares = Vec::new();
    
    for (idx, server_url) in SEAL_KEY_SERVER_URLS.iter().enumerate() {
        match request_key_share(
            server_url,
            policy_id,
            pcr0,
            pcr1,
            pcr2,
            &attestation_b64,
        ).await {
            Ok(share) => {
                tracing::info!("✅ Received key share {} from {}", idx + 1, server_url);
                shares.push(share);
            }
            Err(e) => {
                tracing::warn!("⚠️ Failed to get share from {}: {}", server_url, e);
            }
        }
    }
    
    if shares.len() < 2 {
        return Err(anyhow::anyhow!(
            "Insufficient key shares: got {}, need at least 2",
            shares.len()
        ));
    }
    
    let decryption_key = combine_shares(&shares)?;
    let config_json = decrypt_with_key(encrypted_config, &decryption_key)?;
    
    let config: AgentConfig = serde_json::from_str(&config_json)
        .context("Failed to parse decrypted agent config")?;
    
    tracing::info!("✅ Agent config decrypted successfully");
    Ok(config)
}

async fn request_key_share(
    server_url: &str,
    policy_id: &str,
    pcr0: &str,
    pcr1: &str,
    pcr2: &str,
    attestation_doc: &str,
) -> Result<String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;
    
    let request = KeyShareRequest {
        policy_id: policy_id.to_string(),
        pcr0: pcr0.to_string(),
        pcr1: pcr1.to_string(),
        pcr2: pcr2.to_string(),
        attestation_document: attestation_doc.to_string(),
    };
    
    let response = client
        .post(format!("{}/key-share", server_url))
        .json(&request)
        .send()
        .await?;
    
    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "Key server returned error: {}",
            response.status()
        ));
    }
    
    let share_response: KeyShareResponse = response.json().await?;
    Ok(share_response.share)
}

fn combine_shares(shares: &[String]) -> Result<Vec<u8>> {
    // Shamir's Secret Sharing reconstruction
    // For now, use simple XOR (replace with proper SSS in production)
    let mut combined = vec![0u8; 32];
    
    for share in shares {
        let share_bytes = base64::decode(share)
            .context("Failed to decode key share")?;
        
        for (i, byte) in share_bytes.iter().enumerate() {
            if i < combined.len() {
                combined[i] ^= byte;
            }
        }
    }
    
    Ok(combined)
}

fn decrypt_with_key(encrypted_config: &str, key: &[u8]) -> Result<String> {
    // AES-256-GCM decryption
    use aes_gcm::{
        aead::{Aead, KeyInit},
        Aes256Gcm, Nonce,
    };
    
    let encrypted_bytes = base64::decode(encrypted_config)
        .context("Failed to decode encrypted config")?;
    
    if encrypted_bytes.len() < 12 {
        return Err(anyhow::anyhow!("Encrypted config too short"));
    }
    
    let (nonce_bytes, ciphertext) = encrypted_bytes.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    
    let cipher = Aes256Gcm::new_from_slice(key)
        .context("Invalid key length")?;
    
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| anyhow::anyhow!("Decryption failed - invalid key or corrupted data"))?;
    
    String::from_utf8(plaintext)
        .context("Decrypted config is not valid UTF-8")
}

pub fn load_default_config() -> AgentConfig {
    tracing::warn!("⚠️ Using default agent config (Seal decryption unavailable)");
    AgentConfig::default()
}
