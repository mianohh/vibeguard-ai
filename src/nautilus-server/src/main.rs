use axum::{
    extract::State,
    response::Json,
    routing::{get, post},
    Router,
};
use ed25519_dalek::{SigningKey, VerifyingKey};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing::info;

mod common;
mod apps;

use apps::vibeguard;

/// Global enclave state
pub struct EnclaveState {
    /// Ephemeral Ed25519 signing key generated at enclave boot
    /// Private key NEVER leaves enclave memory
    pub signing_key: SigningKey,
    /// Corresponding verifying (public) key
    pub verifying_key: VerifyingKey,
}

impl EnclaveState {
    pub fn new() -> Self {
        let signing_key = SigningKey::from_bytes(&rand::random::<[u8; 32]>());
        let verifying_key = signing_key.verifying_key();
        
        info!("🔑 Generated ephemeral enclave keypair");
        info!("   Public key: {}", hex::encode(verifying_key.as_bytes()));
        
        Self { signing_key, verifying_key }
    }
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    info!("🚀 VibeGuard Nautilus Server starting...");

    // Generate ephemeral keypair (in production, this happens inside AWS Nitro Enclave)
    let state = Arc::new(EnclaveState::new());

    // Build router
    let app = Router::new()
        .route("/health_check", get(health_check))
        .route("/get_attestation", get(common::get_attestation))
        .route("/process_data", post(vibeguard::process_data))
        .layer(CorsLayer::permissive())
        .with_state(state);

    // Admin endpoints (only accessible via localhost in production)
    let admin_app = Router::new()
        .route("/admin/init_seal_key_load", post(vibeguard::admin::init_seal_key_load))
        .route("/admin/complete_seal_key_load", post(vibeguard::admin::complete_seal_key_load))
        .route("/admin/provision_agent_config", post(vibeguard::admin::provision_agent_config));

    info!("✅ Server ready");
    info!("   Public endpoints: http://0.0.0.0:3000");
    info!("   Admin endpoints:  http://127.0.0.1:3001");

    // Start both servers
    let public_server = tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
            .await
            .expect("Failed to bind port 3000");
        axum::serve(listener, app)
            .await
            .expect("Public server failed");
    });

    let admin_server = tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:3001")
            .await
            .expect("Failed to bind port 3001");
        axum::serve(listener, admin_app)
            .await
            .expect("Admin server failed");
    });

    tokio::try_join!(public_server, admin_server).expect("Server error");
}

async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "vibeguard-nautilus-server",
        "version": env!("CARGO_PKG_VERSION")
    }))
}
