module reputation_registry::registry {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::table::{Self, Table};
    use std::string::String;

    /// Admin capability for managing the registry
    public struct AdminCap has key, store {
        id: UID
    }

    /// Entry in the blacklist with Walrus storage reference
    public struct BlacklistEntry has store, copy, drop {
        package_id: address,
        walrus_blob_id: String,  // Walrus decentralized storage reference
        severity: u8,  // 1=Low, 2=Medium, 3=High, 4=Critical
        added_at: u64,
        reporter: address
    }

    /// Main registry storing all blacklisted packages
    public struct ReputationRegistry has key {
        id: UID,
        blacklist: Table<address, BlacklistEntry>,
        total_reports: u64
    }

    /// Initialize the registry (called once on deployment)
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        
        let registry = ReputationRegistry {
            id: object::new(ctx),
            blacklist: table::new(ctx),
            total_reports: 0
        };

        transfer::transfer(admin_cap, tx_context::sender(ctx));
        transfer::share_object(registry);
    }

    /// Report a malicious contract with Walrus-stored threat analysis
    /// This function is called via zkLogin gasless transactions
    public entry fun report_malicious_contract(
        registry: &mut ReputationRegistry,
        package_id: address,
        walrus_blob_id: String,
        severity: u8,
        ctx: &mut TxContext
    ) {
        // Check if already reported
        if (table::contains(&registry.blacklist, package_id)) {
            // Update existing entry with new evidence
            let entry = table::borrow_mut(&mut registry.blacklist, package_id);
            entry.walrus_blob_id = walrus_blob_id;
            entry.severity = severity;
        } else {
            // Create new entry
            let entry = BlacklistEntry {
                package_id,
                walrus_blob_id,
                severity,
                added_at: tx_context::epoch(ctx),
                reporter: tx_context::sender(ctx)
            };
            table::add(&mut registry.blacklist, package_id, entry);
            registry.total_reports = registry.total_reports + 1;
        };
    }

    /// Admin function to remove false positives
    public entry fun remove_package(
        _admin_cap: &AdminCap,
        registry: &mut ReputationRegistry,
        package_id: address
    ) {
        if (table::contains(&registry.blacklist, package_id)) {
            table::remove(&mut registry.blacklist, package_id);
            registry.total_reports = registry.total_reports - 1;
        };
    }

    /// Check if a package is blacklisted
    public fun is_blacklisted(
        registry: &ReputationRegistry,
        package_id: address
    ): bool {
        table::contains(&registry.blacklist, package_id)
    }

    /// Get blacklist entry details
    public fun get_entry(
        registry: &ReputationRegistry,
        package_id: address
    ): &BlacklistEntry {
        table::borrow(&registry.blacklist, package_id)
    }

    /// Get total number of reports
    public fun get_total_reports(registry: &ReputationRegistry): u64 {
        registry.total_reports
    }

    /// Accessor functions for BlacklistEntry
    public fun entry_package_id(entry: &BlacklistEntry): address {
        entry.package_id
    }

    public fun entry_walrus_blob_id(entry: &BlacklistEntry): String {
        entry.walrus_blob_id
    }

    public fun entry_severity(entry: &BlacklistEntry): u8 {
        entry.severity
    }

    public fun entry_added_at(entry: &BlacklistEntry): u64 {
        entry.added_at
    }

    public fun entry_reporter(entry: &BlacklistEntry): address {
        entry.reporter
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
