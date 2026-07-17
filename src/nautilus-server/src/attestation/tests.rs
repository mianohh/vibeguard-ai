use super::*;

#[test]
fn test_create_tee_provider_simulation_explicit() {
    std::env::set_var("VIBEGUARD_TEE_MODE", "simulation");
    let provider = create_tee_provider();
    assert_eq!(provider.provider_name(), "simulation");
    assert_eq!(provider.mode(), TeeMode::Simulation);
    std::env::remove_var("VIBEGUARD_TEE_MODE");
}

#[test]
fn test_create_tee_provider_gcp_sev_explicit() {
    std::env::set_var("VIBEGUARD_TEE_MODE", "gcp_sev");
    std::env::set_var("VIBEGUARD_TPM_PATH", "/dev/nonexistent-tpm");
    let provider = create_tee_provider();
    assert_eq!(provider.provider_name(), "gcp_sev");
    assert_eq!(provider.mode(), TeeMode::GcpSev);
    std::env::remove_var("VIBEGUARD_TEE_MODE");
    std::env::remove_var("VIBEGUARD_TPM_PATH");
}

#[test]
fn test_create_tee_provider_development_env() {
    std::env::set_var("VIBEGUARD_ENV", "development");
    let provider = create_tee_provider();
    assert_eq!(provider.provider_name(), "simulation");
    std::env::remove_var("VIBEGUARD_ENV");
}

#[test]
fn test_attestation_proof_serializes() {
    let proof = AttestationProof {
        pcr0: "a".repeat(96),
        pcr1: "b".repeat(96),
        pcr2: "c".repeat(96),
        provider: "test".to_string(),
        mode: TeeMode::Simulation,
        attestation_document: None,
    };
    let json = serde_json::to_string(&proof).unwrap();
    assert!(json.contains("\"provider\":\"test\""));
    assert!(json.contains("\"mode\":\"simulation\""));
    assert!(json.contains("\"attestation_document\":null"));
}

#[test]
fn test_tee_mode_serializes_snake_case() {
    assert_eq!(serde_json::to_string(&TeeMode::Simulation).unwrap(), "\"simulation\"");
    assert_eq!(serde_json::to_string(&TeeMode::GcpSev).unwrap(), "\"gcp_sev\"");
}
