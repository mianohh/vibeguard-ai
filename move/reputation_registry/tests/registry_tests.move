#[test_only]
module reputation_registry::registry_tests {
    use reputation_registry::registry::{Self, AdminCap, ReputationRegistry};
    use sui::test_scenario::{Self as ts};
    use std::string;

    const ADMIN: address = @0xAD;
    const USER: address = @0xUSER;
    const MALICIOUS_PKG: address = @0xBAD;

    #[test]
    fun test_init_registry() {
        let mut scenario = ts::begin(ADMIN);
        
        registry::init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, ADMIN);
        
        assert!(ts::has_most_recent_for_sender<AdminCap>(&scenario), 0);
        assert!(ts::has_most_recent_shared<ReputationRegistry>(), 1);
        
        ts::end(scenario);
    }

    #[test]
    fun test_report_malicious_contract() {
        let mut scenario = ts::begin(ADMIN);
        
        registry::init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, USER);
        
        let mut registry = ts::take_shared<ReputationRegistry>(&scenario);
        
        // User reports malicious contract with Walrus blob
        registry::report_malicious_contract(
            &mut registry,
            MALICIOUS_PKG,
            string::utf8(b"walrus_blob_abc123xyz"),
            4, // Critical severity
            ts::ctx(&mut scenario)
        );
        
        // Verify it's blacklisted
        assert!(registry::is_blacklisted(&registry, MALICIOUS_PKG), 2);
        
        // Check entry details
        let entry = registry::get_entry(&registry, MALICIOUS_PKG);
        assert!(registry::entry_package_id(entry) == MALICIOUS_PKG, 3);
        assert!(registry::entry_severity(entry) == 4, 4);
        assert!(registry::entry_reporter(entry) == USER, 5);
        
        // Verify Walrus blob ID is stored
        let blob_id = registry::entry_walrus_blob_id(entry);
        assert!(blob_id == string::utf8(b"walrus_blob_abc123xyz"), 6);
        
        // Check total reports
        assert!(registry::get_total_reports(&registry) == 1, 7);
        
        ts::return_shared(registry);
        ts::end(scenario);
    }

    #[test]
    fun test_update_existing_report() {
        let mut scenario = ts::begin(ADMIN);
        
        registry::init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, USER);
        
        let mut registry = ts::take_shared<ReputationRegistry>(&scenario);
        
        // First report
        registry::report_malicious_contract(
            &mut registry,
            MALICIOUS_PKG,
            string::utf8(b"blob_v1"),
            2,
            ts::ctx(&mut scenario)
        );
        
        // Update with new evidence
        registry::report_malicious_contract(
            &mut registry,
            MALICIOUS_PKG,
            string::utf8(b"blob_v2_updated"),
            4,
            ts::ctx(&mut scenario)
        );
        
        // Verify updated
        let entry = registry::get_entry(&registry, MALICIOUS_PKG);
        assert!(registry::entry_walrus_blob_id(entry) == string::utf8(b"blob_v2_updated"), 8);
        assert!(registry::entry_severity(entry) == 4, 9);
        
        // Total reports should still be 1 (update, not new)
        assert!(registry::get_total_reports(&registry) == 1, 10);
        
        ts::return_shared(registry);
        ts::end(scenario);
    }

    #[test]
    fun test_admin_remove_package() {
        let mut scenario = ts::begin(ADMIN);
        
        registry::init_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, USER);
        
        let mut registry = ts::take_shared<ReputationRegistry>(&scenario);
        
        registry::report_malicious_contract(
            &mut registry,
            MALICIOUS_PKG,
            string::utf8(b"blob_test"),
            1,
            ts::ctx(&mut scenario)
        );
        
        assert!(registry::is_blacklisted(&registry, MALICIOUS_PKG), 11);
        
        ts::return_shared(registry);
        
        // Admin removes false positive
        ts::next_tx(&mut scenario, ADMIN);
        
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        let mut registry = ts::take_shared<ReputationRegistry>(&scenario);
        
        registry::remove_package(&admin_cap, &mut registry, MALICIOUS_PKG);
        
        assert!(!registry::is_blacklisted(&registry, MALICIOUS_PKG), 12);
        assert!(registry::get_total_reports(&registry) == 0, 13);
        
        ts::return_to_sender(&scenario, admin_cap);
        ts::return_shared(registry);
        ts::end(scenario);
    }
}
