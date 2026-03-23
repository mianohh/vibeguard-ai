module reputation_registry::registry {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table};
    use std::string::String;

    struct ThreatRecord has store {
        walrus_blob_id: String,
        blob_object_id: address,
    }

    struct ThreatReported has copy, drop {
        malicious_package_id: address,
        walrus_blob_id: String,
        blob_object_id: address,
        reporter: address,
    }

    struct ThreatRegistry has key {
        id: UID,
        threats: Table<address, ThreatRecord>,
        total_threats_logged: u64,
    }

    fun init(ctx: &mut TxContext) {
        transfer::share_object(ThreatRegistry {
            id: object::new(ctx),
            threats: table::new(ctx),
            total_threats_logged: 0,
        });
    }

    public entry fun report_malicious_contract(
        registry: &mut ThreatRegistry,
        malicious_package_id: address,
        walrus_blob_id: String,
        blob_object_id: address,
        ctx: &mut TxContext
    ) {
        if (!table::contains(&registry.threats, malicious_package_id)) {
            table::add(&mut registry.threats, malicious_package_id, ThreatRecord {
                walrus_blob_id,
                blob_object_id,
            });
            registry.total_threats_logged = registry.total_threats_logged + 1;
        };

        event::emit(ThreatReported {
            malicious_package_id,
            walrus_blob_id,
            blob_object_id,
            reporter: tx_context::sender(ctx),
        });
    }

    public fun is_threat_reported(registry: &ThreatRegistry, package_id: address): bool {
        table::contains(&registry.threats, package_id)
    }

    public fun get_threat_blob_id(registry: &ThreatRegistry, package_id: address): String {
        table::borrow(&registry.threats, package_id).walrus_blob_id
    }

    public fun get_threat_blob_object_id(registry: &ThreatRegistry, package_id: address): address {
        table::borrow(&registry.threats, package_id).blob_object_id
    }

    public fun get_total_threats(registry: &ThreatRegistry): u64 {
        registry.total_threats_logged
    }
}
