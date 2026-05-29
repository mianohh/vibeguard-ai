use anyhow::Result;
use axum::{routing::get, routing::post, Router};
use fastcrypto::{ed25519::Ed25519KeyPair, traits::KeyPair};
use fastcrypto::encoding::{Hex, Encoding};
use nautilus_server::app::{process_data, sign_report};
use nautilus_server::common::{get_attestation, health_check};
use nautilus_server::{AppState, attestation, seal_client};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    info!("🚀 VibeGuard Nautilus Server starting...");

    // Generate ephemeral enclave keypair
    let eph_kp = Ed25519KeyPair::generate(&mut rand::thread_rng());
    let public_key_hex = Hex::encode(eph_kp.public().as_ref());
    
    info!("🔑 Generated ephemeral enclave keypair");
    info!("   Public key: {}", public_key_hex);

    // Get attestation with public key embedded
    let attestation_doc = attestation::get_attestation_with_public_key(eph_kp.public().as_ref())?;
    let pcr0_hex = attestation::pcr_to_hex(&attestation_doc.pcr0);
    let pcr1_hex = attestation::pcr_to_hex(&attestation_doc.pcr1);
    let pcr2_hex = attestation::pcr_to_hex(&attestation_doc.pcr2);
    
    info!("📡 Attestation generated");
    info!("   PCR0: {}...", &pcr0_hex[..16]);
    info!("   PCR1: {}...", &pcr1_hex[..16]);
    info!("   PCR2: {}...", &pcr2_hex[..16]);

    // Load and decrypt agent config using Seal
    let agent_config = if let Ok(encrypted_config) = std::env::var("ENCRYPTED_AGENT_CONFIG") {
        info!("🔐 Attempting to decrypt agent config via Seal...");
        match seal_client::decrypt_agent_config(
            &encrypted_config,
            &pcr0_hex,
            &pcr1_hex,
            &pcr2_hex,
            &attestation_doc.document,
        ).await {
            Ok(config) => {
                info!("✅ Agent config decrypted successfully");
                config
            }
            Err(e) => {
                info!("⚠️ Seal decryption failed: {}", e);
                seal_client::load_default_config()
            }
        }
    } else {
        info!("⚠️ No encrypted config found, using defaults");
        seal_client::load_default_config()
    };

    let api_key = std::env::var("API_KEY").unwrap_or_else(|_| "dummy".to_string());
    let state = Arc::new(AppState { 
        eph_kp, 
        api_key,
        agent_config,
    });

    let cors = CorsLayer::new().allow_methods(Any).allow_headers(Any);

    let app = Router::new()
        .route("/health_check", get(health_check))
        .route("/get_attestation", get(get_attestation))
        .route("/process_data", post(process_data))
        .route("/sign_report", post(sign_report))
        .layer(cors)
        .with_state(state);

    info!("✅ Server ready");
    info!("   Endpoints: http://0.0.0.0:3000");

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    axum::serve(listener, app).await?;
    
    Ok(())
}
