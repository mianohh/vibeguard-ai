use fastcrypto::ed25519::Ed25519KeyPair;
use crate::attestation::TeeMode;

pub mod app {
    pub use crate::apps::vibeguard::{process_data, sign_report};
}
pub mod apps;
pub mod attestation;
pub mod common;

pub struct AppState {
    pub eph_kp: Ed25519KeyPair,
    pub api_key: String,
    pub pcr0: String,
    pub pcr1: String,
    pub pcr2: String,
    pub provider: String,
    pub mode: TeeMode,
}
