use fastcrypto::ed25519::Ed25519KeyPair;

pub mod app {
    pub use crate::apps::vibeguard::{process_data, sign_report};
}
pub mod apps;
pub mod common;

pub struct AppState {
    pub eph_kp: Ed25519KeyPair,
    pub api_key: String,
}
