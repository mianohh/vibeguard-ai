pub mod gcp_sev;
pub mod simulation;

use anyhow::Result;
use serde::Serialize;
use tracing::info;

/// TEE provider mode identifier
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TeeMode {
    Simulation,
    GcpSev,
}

/// Attestation proof returned by a TEE provider
#[derive(Debug, Clone, Serialize)]
pub struct AttestationProof {
    pub pcr0: String,
    pub pcr1: String,
    pub pcr2: String,
    pub provider: String,
    pub mode: TeeMode,
    pub attestation_document: Option<String>,
}

/// Trait for TEE-specific attestation computation.
/// Each provider computes PCR values from its own trust anchor
/// (binary hash for simulation, TPM for real TEE).
pub trait TeeProvider: Send + Sync {
    /// Compute PCR measurements from the provider's trust anchor
    fn compute_pcrs(&self) -> Result<(String, String, String)>;

    /// Provider identifier (e.g., "simulation", "gcp_sev")
    fn provider_name(&self) -> &str;

    /// Mode enum value
    fn mode(&self) -> TeeMode;

    /// Build a full attestation proof
    fn attest(&self) -> Result<AttestationProof> {
        let (pcr0, pcr1, pcr2) = self.compute_pcrs()?;
        Ok(AttestationProof {
            pcr0,
            pcr1,
            pcr2,
            provider: self.provider_name().to_string(),
            mode: self.mode(),
            attestation_document: None,
        })
    }
}

/// Factory: select the appropriate TEE provider based on environment.
///
/// Selection logic:
/// - `VIBEGUARD_TEE_MODE=gcp_sev`  → GcpSevProvider (reads TPM if available, else binary hash)
/// - `VIBEGUARD_TEE_MODE=simulation` → SimulationProvider
/// - `VIBEGUARD_ENV=development` → SimulationProvider (default for dev)
/// - Otherwise → auto-detect from compile-time `cfg!(debug_assertions)`
pub fn create_tee_provider() -> Box<dyn TeeProvider> {
    if let Ok(mode) = std::env::var("VIBEGUARD_TEE_MODE") {
        match mode.as_str() {
            "gcp_sev" => {
                info!("🔒 TEE provider: GCP SEV-SNP (explicit)");
                return Box::new(gcp_sev::GcpSevProvider::new());
            }
            "simulation" => {
                info!("🧪 TEE provider: Simulation (explicit)");
                return Box::new(simulation::SimulationProvider::new());
            }
            _ => {
                tracing::warn!("Unknown VIBEGUARD_TEE_MODE '{}', falling back to auto-detect", mode);
            }
        }
    }

    if let Ok(env) = std::env::var("VIBEGUARD_ENV") {
        if env == "development" {
            info!("🧪 TEE provider: Simulation (development env)");
            return Box::new(simulation::SimulationProvider::new());
        }
    }

    // Auto-detect: debug builds use simulation, release uses GCP SEV
    if cfg!(debug_assertions) {
        info!("🧪 TEE provider: Simulation (debug build)");
        Box::new(simulation::SimulationProvider::new())
    } else {
        info!("🔒 TEE provider: GCP SEV-SNP (release build)");
        Box::new(gcp_sev::GcpSevProvider::new())
    }
}

#[cfg(test)]
mod tests;
