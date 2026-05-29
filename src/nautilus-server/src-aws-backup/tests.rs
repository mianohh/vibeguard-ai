#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_attestation_generation() {
        let public_key = vec![0x42; 32];
        let result = attestation::get_attestation_with_public_key(&public_key);
        
        assert!(result.is_ok());
        let doc = result.unwrap();
        
        // PCRs should be 48 bytes each
        assert_eq!(doc.pcr0.len(), 48);
        assert_eq!(doc.pcr1.len(), 48);
        assert_eq!(doc.pcr2.len(), 48);
        
        // Public key should match
        assert_eq!(doc.public_key, public_key);
    }

    #[test]
    fn test_framework_package_detection() {
        assert!(sui_parser::is_framework_package("0x1"));
        assert!(sui_parser::is_framework_package("0x2"));
        assert!(sui_parser::is_framework_package("0x3"));
        assert!(sui_parser::is_framework_package("0x5"));
        
        assert!(!sui_parser::is_framework_package("0x123abc"));
    }

    #[test]
    fn test_drain_function_detection() {
        assert!(sui_parser::is_drain_function("transfer_all"));
        assert!(sui_parser::is_drain_function("drain"));
        assert!(sui_parser::is_drain_function("sweep"));
        assert!(sui_parser::is_drain_function("approve_all"));
        
        assert!(!sui_parser::is_drain_function("transfer"));
        assert!(!sui_parser::is_drain_function("mint"));
    }

    #[test]
    fn test_unique_recipient_counting() {
        let flows = vec![
            sui_parser::AssetFlow {
                asset_type: "SUI".to_string(),
                direction: "OUT".to_string(),
                amount: 1000,
                recipient: Some("0xaaa".to_string()),
                sender: None,
            },
            sui_parser::AssetFlow {
                asset_type: "SUI".to_string(),
                direction: "OUT".to_string(),
                amount: 2000,
                recipient: Some("0xbbb".to_string()),
                sender: None,
            },
            sui_parser::AssetFlow {
                asset_type: "SUI".to_string(),
                direction: "OUT".to_string(),
                amount: 3000,
                recipient: Some("0xaaa".to_string()),
                sender: None,
            },
        ];
        
        let flow_refs: Vec<&sui_parser::AssetFlow> = flows.iter().collect();
        let count = sui_parser::count_unique_recipients(&flow_refs);
        
        assert_eq!(count, 2); // Only 0xaaa and 0xbbb
    }

    #[test]
    fn test_agent_config_default() {
        let config = threat_agent::AgentConfig::default();
        
        assert_eq!(config.scoring_weights.intent_mismatch, 10.0);
        assert_eq!(config.scoring_weights.asset_drain, 8.0);
        assert_eq!(config.risk_thresholds.red_threshold, 8.0);
        assert_eq!(config.risk_thresholds.yellow_threshold, 4.0);
    }
}
