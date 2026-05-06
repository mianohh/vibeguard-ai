use anyhow::Result;
use axum::{routing::get, routing::post, Router};
use fastcrypto::{ed25519::Ed25519KeyPair, traits::KeyPair};
use fastcrypto::encoding::{Hex, Encoding};
use nautilus_server::app::{process_data, sign_report};
use nautilus_server::common::get_attestation;
use nautilus_server::AppState;
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

    let eph_kp = Ed25519KeyPair::generate(&mut rand::thread_rng());
    let public_key_hex = Hex::encode(eph_kp.public().as_bytes());
    
    info!("🔑 Generated ephemeral enclave keypair");
    info!("   Public key: {}", public_key_hex);

    let api_key = std::env::var("API_KEY").unwrap_or_else(|_| "dummy".to_string());
    let state = Arc::new(AppState { eph_kp, api_key });

    let cors = CorsLayer::new().allow_methods(Any).allow_headers(Any);

    let app = Router::new()
        .route("/health_check", get(nautilus_server::common::health_check))
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
