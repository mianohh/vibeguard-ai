#[test_only]
module reputation_registry::registry_tests {
    use reputation_registry::registry::{Self, ThreatRegistry};
    use sui::test_scenario::{Self as ts};
    use std::string;

    const ADMIN: address = @0xAD;
    const USER: address = @0x1234;
    const MALICIOUS_PKG: address = @0xBAD;
    const BLOB_OBJECT: address = @0xB10B;

    #[test]
    fun test_init_registry() {
        let scenario = ts::begin(ADMIN);

        registry::init_for_testing(ts::ctx(&mut scenario));

        ts::next_tx(&mut scenario, ADMIN);

        assert!(ts::has_most_recent_shared<ThreatRegistry>(), 0);

        ts::end(scenario);
    }

    #[test]
    fun test_report_malicious_contract() {
        let scenario = ts::begin(ADMIN);

        registry::init_for_testing(ts::ctx(&mut scenario));

        ts::next_tx(&mut scenario, USER);

        let registry = ts::take_shared<ThreatRegistry>(&scenario);

        // User reports malicious contract with Walrus blob
        registry::report_malicious_contract(
            &mut registry,
            MALICIOUS_PKG,
            string::utf8(b"walrus_blob_abc123xyz"),
            BLOB_OBJECT,
            ts::ctx(&mut scenario)
        );

        // Verify it's flagged
        assert!(registry::is_threat_reported(&registry, MALICIOUS_PKG), 1);
        assert!(!registry::is_threat_reported(&registry, @0x9999), 2);

        // Verify Walrus blob IDs are stored
        assert!(
            registry::get_threat_blob_id(&registry, MALICIOUS_PKG) == string::utf8(b"walrus_blob_abc123xyz"),
            3
        );
        assert!(registry::get_threat_blob_object_id(&registry, MALICIOUS_PKG) == BLOB_OBJECT, 4);

        // Check total reports
        assert!(registry::get_total_threats(&registry) == 1, 5);

        ts::return_shared(registry);
        ts::end(scenario);
    }

    #[test]
    fun test_duplicate_report_dedups() {
        let scenario = ts::begin(ADMIN);

        registry::init_for_testing(ts::ctx(&mut scenario));

        ts::next_tx(&mut scenario, USER);

        let registry = ts::take_shared<ThreatRegistry>(&scenario);

        // First report
        registry::report_malicious_contract(
            &mut registry,
            MALICIOUS_PKG,
            string::utf8(b"blob_v1"),
            BLOB_OBJECT,
            ts::ctx(&mut scenario)
        );

        // Duplicate report for the same package
        registry::report_malicious_contract(
            &mut registry,
            MALICIOUS_PKG,
            string::utf8(b"blob_v2"),
            BLOB_OBJECT,
            ts::ctx(&mut scenario)
        );

        // Dedup: record retained, total unchanged
        assert!(registry::get_threat_blob_id(&registry, MALICIOUS_PKG) == string::utf8(b"blob_v1"), 6);
        assert!(registry::get_total_threats(&registry) == 1, 7);

        ts::return_shared(registry);
        ts::end(scenario);
    }

    #[test]
    fun test_multiple_packages_tracked() {
        let scenario = ts::begin(ADMIN);

        registry::init_for_testing(ts::ctx(&mut scenario));

        ts::next_tx(&mut scenario, USER);

        let registry = ts::take_shared<ThreatRegistry>(&scenario);

        registry::report_malicious_contract(
            &mut registry,
            MALICIOUS_PKG,
            string::utf8(b"blob_a"),
            BLOB_OBJECT,
            ts::ctx(&mut scenario)
        );
        registry::report_malicious_contract(
            &mut registry,
            @0xFACE,
            string::utf8(b"blob_b"),
            BLOB_OBJECT,
            ts::ctx(&mut scenario)
        );

        assert!(registry::is_threat_reported(&registry, MALICIOUS_PKG), 8);
        assert!(registry::is_threat_reported(&registry, @0xFACE), 9);
        assert!(registry::get_total_threats(&registry) == 2, 10);

        ts::return_shared(registry);
        ts::end(scenario);
    }
}
