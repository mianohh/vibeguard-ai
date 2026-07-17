use anyhow::{Context, Result};
use sha2::{Digest, Sha384};
use tracing::info;

use super::{TeeMode, TeeProvider};

/// Simulation provider — computes PCRs from the running binary's hash.
/// Safe for local development and testing. Rejects use in production.
pub struct SimulationProvider;

impl SimulationProvider {
    pub fn new() -> Self {
        Self
    }
}

impl TeeProvider for SimulationProvider {
    fn compute_pcrs(&self) -> Result<(String, String, String)> {
        // Reject in production to prevent mock attestations from leaking
        if std::env::var("VIBEGUARD_ENV").as_deref() == Ok("production") {
            anyhow::bail!(
                "SimulationInProduction: cannot use simulation provider in production. \
                 Set VIBEGUARD_TEE_MODE=gcp_sev or VIBEGUARD_ENV=development"
            );
        }

        let binary_path = std::env::current_exe()
            .context("Failed to get current exe path")?;

        let binary_bytes = std::fs::read(&binary_path)
            .with_context(|| format!("Failed to read binary: {:?}", binary_path))?;

        let binary_hash: Vec<u8> = Sha384::digest(&binary_bytes).to_vec();
        let binary_hash_hex = hex::encode(&binary_hash);

        // PCR0: SHA384(SHA384(binary))
        let pcr0 = hex::encode(Sha384::digest(&binary_hash).as_slice());

        // PCR1: SHA384("kernel" + SHA384(binary) hex)
        let mut h1 = Sha384::new();
        h1.update(b"kernel");
        h1.update(binary_hash_hex.as_bytes());
        let pcr1 = hex::encode(h1.finalize().as_slice());

        // PCR2: SHA384("app" + SHA384(binary) hex)
        let mut h2 = Sha384::new();
        h2.update(b"app");
        h2.update(binary_hash_hex.as_bytes());
        let pcr2 = hex::encode(h2.finalize().as_slice());

        info!("📊 Simulation PCR computation (binary hash)");
        info!("   Binary SHA-384: {}...", &binary_hash_hex[..16]);

        Ok((pcr0, pcr1, pcr2))
    }

    fn provider_name(&self) -> &str {
        "simulation"
    }

    fn mode(&self) -> TeeMode {
        TeeMode::Simulation
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simulation_provider_returns_pcrs() {
        let provider = SimulationProvider::new();
        let result = provider.compute_pcrs();
        assert!(result.is_ok(), "Simulation PCR computation should succeed");

        let (pcr0, pcr1, pcr2) = result.unwrap();
        assert_eq!(pcr0.len(), 96, "PCR0 should be 96 hex chars (48 bytes SHA-384)");
        assert_eq!(pcr1.len(), 96);
        assert_eq!(pcr2.len(), 96);

        // PCR values should be deterministic (same binary = same values)
        let (pcr0_2, pcr1_2, pcr2_2) = provider.compute_pcrs().unwrap();
        assert_eq!(pcr0, pcr0_2);
        assert_eq!(pcr1, pcr1_2);
        assert_eq!(pcr2, pcr2_2);
    }

    #[test]
    fn test_simulation_provider_metadata() {
        let provider = SimulationProvider::new();
        assert_eq!(provider.provider_name(), "simulation");
        assert_eq!(provider.mode(), TeeMode::Simulation);
    }

    #[test]
    fn test_simulation_attest() {
        let provider = SimulationProvider::new();
        let proof = provider.attest().unwrap();
        assert_eq!(proof.provider, "simulation");
        assert_eq!(proof.mode, TeeMode::Simulation);
        assert!(proof.attestation_document.is_none());
        assert_eq!(proof.pcr0.len(), 96);
    }

    #[test]
    fn test_simulation_rejects_production() {
        std::env::set_var("VIBEGUARD_ENV", "production");
        let provider = SimulationProvider::new();
        let result = provider.compute_pcrs();
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("SimulationInProduction"), "Error should mention SimulationInProduction: {}", err);
        std::env::remove_var("VIBEGUARD_ENV");
    }
}
