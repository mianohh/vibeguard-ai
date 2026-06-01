use fastcrypto::ed25519::Ed25519KeyPair;
use crate::apps::vibeguard::threat_agent::AgentConfig;

pub mod app {
    pub use crate::apps::vibeguard::{process_data, sign_report};
}
pub mod apps;
pub mod common;

pub struct AppState {
    pub eph_kp: Ed25519KeyPair,
    pub api_key: String,
    pub agent_config: AgentConfig,
    pub pcr0: String,
    pub pcr1: String,
    pub pcr2: String,
}
