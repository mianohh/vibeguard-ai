use anyhow::{Context, Result};
use axum::{routing::get, routing::post, Router};
use fastcrypto::ed25519::{Ed25519KeyPair, Ed25519PrivateKey};
use fastcrypto::encoding::{Hex, Encoding};
use fastcrypto::traits::{KeyPair, ToFromBytes};
use nautilus_server::app::{process_data, sign_report};
use nautilus_server::common::{get_attestation, health_check};
use nautilus_server::apps::vibeguard::threat_agent::AgentConfig;
use nautilus_server::AppState;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

/// Load or generate a persistent Ed25519 keypair from a seed file.
/// The seed is a 32-byte hex string stored in enclave-keypair.json.
/// This ensures the public key is stable across restarts.
fn load_persistent_keypair() -> Result<Ed25519KeyPair> {
    let keypair_path = std::env::var("KEYPAIR_PATH")
        .unwrap_or_else(|_| "/home/ec2-user/nautilus-server/enclave-keypair.json".to_string());

    let json = std::fs::read_to_string(&keypair_path)
        .with_context(|| format!("Failed to read keypair file: {}", keypair_path))?;

    let val: serde_json::Value = serde_json::from_str(&json)
        .context("Failed to parse keypair JSON")?;

    let seed_hex = val["seed_hex"]
        .as_str()
        .context("keypair JSON missing 'seed_hex'")?;

    let seed_bytes = Hex::decode(seed_hex)
        .context("Failed to hex-decode seed")?;

    let private_key = Ed25519PrivateKey::from_bytes(&seed_bytes)
        .context("Failed to construct Ed25519 private key from seed")?;

    Ok(Ed25519KeyPair::from(private_key))
}

/// Compute deterministic PCRs from the running binary's SHA-384 hash.
/// PCR0 = SHA384(binary_sha384_bytes)
/// PCR1 = SHA384("kernel" + binary_sha384_hex_bytes)
/// PCR2 = SHA384("app"    + binary_sha384_hex_bytes)
fn compute_pcrs() -> Result<(String, String, String)> {
    use sha2::{Sha384, Digest};

    // Get path of the running binary
    let binary_path = std::env::current_exe()
        .context("Failed to get current exe path")?;

    let binary_bytes = std::fs::read(&binary_path)
        .with_context(|| format!("Failed to read binary: {:?}", binary_path))?;

    // SHA-384 of the binary
    let binary_hash: Vec<u8> = Sha384::digest(&binary_bytes).to_vec();
    let binary_hash_hex = hex::encode(&binary_hash);

    // PCR0: hash of the binary hash bytes (simulates enclave image measurement)
    let pcr0 = hex::encode(Sha384::digest(&binary_hash).as_slice());

    // PCR1: hash of "kernel" prefix + binary hash hex
    let mut h1 = Sha384::new();
    h1.update(b"kernel");
    h1.update(binary_hash_hex.as_bytes());
    let pcr1 = hex::encode(h1.finalize().as_slice());

    // PCR2: hash of "app" prefix + binary hash hex
    let mut h2 = Sha384::new();
    h2.update(b"app");
    h2.update(binary_hash_hex.as_bytes());
    let pcr2 = hex::encode(h2.finalize().as_slice());

    info!("📊 Binary SHA-384: {}...", &binary_hash_hex[..16]);

    Ok((pcr0, pcr1, pcr2))
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    info!("🚀 VibeGuard Nautilus Server starting...");

    // Load persistent keypair (stable public key across restarts)
    let eph_kp = load_persistent_keypair()
        .context("Failed to load persistent keypair")?;

    let public_key_hex = Hex::encode(eph_kp.public().as_ref());
    info!("🔑 Loaded persistent enclave keypair");
    info!("   Public key: {}", public_key_hex);

    // Compute real PCRs from binary hash
    let (pcr0, pcr1, pcr2) = compute_pcrs()
        .context("Failed to compute PCR measurements")?;

    info!("📡 PCR measurements computed from binary");
    info!("   PCR0: {}...", &pcr0[..16]);
    info!("   PCR1: {}...", &pcr1[..16]);
    info!("   PCR2: {}...", &pcr2[..16]);

    // Agent config — use env var if set, otherwise defaults
    let agent_config = if let Ok(config_json) = std::env::var("AGENT_CONFIG") {
        serde_json::from_str::<AgentConfig>(&config_json)
            .unwrap_or_else(|e| {
                tracing::warn!("Failed to parse AGENT_CONFIG: {}, using defaults", e);
                AgentConfig::default()
            })
    } else {
        AgentConfig::default()
    };

    let api_key = std::env::var("API_KEY").unwrap_or_else(|_| "dummy".to_string());

    let state = Arc::new(AppState {
        eph_kp,
        api_key,
        agent_config,
        pcr0,
        pcr1,
        pcr2,
    });

    let cors = CorsLayer::new().allow_methods(Any).allow_headers(Any);

    let app = Router::new()
        .route("/health_check", get(health_check))
        .route("/get_attestation", get(get_attestation))
        .route("/process_data", post(process_data))
        .route("/sign_report", post(sign_report))
        .layer(cors)
        .with_state(state);

    info!("✅ Server ready on http://0.0.0.0:3000");

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    axum::serve(listener, app).await?;

    Ok(())
}
