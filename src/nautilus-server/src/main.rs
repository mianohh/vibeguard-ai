use anyhow::{Context, Result};
use axum::{routing::get, routing::post, Router};
use fastcrypto::ed25519::{Ed25519KeyPair, Ed25519PrivateKey};
use fastcrypto::encoding::{Hex, Encoding};
use fastcrypto::traits::{KeyPair, ToFromBytes};
use nautilus_server::app::{process_data, sign_report};
use nautilus_server::attestation::create_tee_provider;
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

    // Initialize TEE provider and compute PCR measurements
    let tee = create_tee_provider();
    let (pcr0, pcr1, pcr2) = tee.compute_pcrs()
        .context("Failed to compute PCR measurements")?;

    info!("📡 PCR measurements computed via {} provider", tee.provider_name());
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
