module reputation_registry::registry {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::table::{Self, Table};

    /// Shared object storing community-reported malicious contracts
    public struct ReputationRegistry has key {
        id: UID,
        reports: Table<address, u64>, // package_id -> report count
    }

    /// Initialize the registry as a shared object
    fun init(ctx: &mut TxContext) {
        let registry = ReputationRegistry {
            id: object::new(ctx),
            reports: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    /// Report a malicious contract (community threat reporting)
    public entry fun report_malicious_contract(
        registry: &mut ReputationRegistry,
        package_id: address,
        ctx: &mut TxContext
    ) {
        let reporter = tx_context::sender(ctx);
        
        if (table::contains(&registry.reports, package_id)) {
            let count = table::borrow_mut(&mut registry.reports, package_id);
            *count = *count + 1;
        } else {
            table::add(&mut registry.reports, package_id, 1);
        };
    }

    /// Get report count for a package
    public fun get_report_count(registry: &ReputationRegistry, package_id: address): u64 {
        if (table::contains(&registry.reports, package_id)) {
            *table::borrow(&registry.reports, package_id)
        } else {
            0
        }
    }
}
