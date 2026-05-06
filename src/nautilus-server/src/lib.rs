use fastcrypto::ed25519::Ed25519KeyPair;

pub mod apps;
pub mod common;

pub use apps::vibeguard::{process_data, sign_report};

pub struct AppState {
    pub eph_kp: Ed25519KeyPair,
    pub api_key: String,
}
