module reputation_registry::registry {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table};
    use std::string::String;

    /// =======================================================================
    /// Events (The foundation for the Automated Detection Pipeline)
    /// =======================================================================
    
    /// Emitted whenever a new honeypot or malicious contract is reported.
    /// Off-chain indexers listen to this event to trigger real-time B2B Webhooks.
    struct ThreatReported has copy, drop {
        malicious_package_id: address,
        walrus_blob_id: String,
        reporter: address,
    }

    /// =======================================================================
    /// Shared Objects (The foundation for Reputation Data Growth)
    /// =======================================================================

    /// The decentralized global registry of all reported threats.
    struct ThreatRegistry has key {
        id: UID,
        /// Maps the malicious package address to the Walrus Blob ID containing the full AI report
        threats: Table<address, String>,
        total_threats_logged: u64,
    }

    /// =======================================================================
    /// Initialization
    /// =======================================================================

    fun init(ctx: &mut TxContext) {
        // Create and share the registry so anyone (via zkLogin) can interact with it
        transfer::share_object(ThreatRegistry {
            id: object::new(ctx),
            threats: table::new(ctx),
            total_threats_logged: 0,
        });
    }

    /// =======================================================================
    /// Public/Entry Functions
    /// =======================================================================

    /// Allows a user to gaslessly report a threat.
    /// Called directly by the Next.js frontend after the Walrus upload succeeds.
    public entry fun report_malicious_contract(
        registry: &mut ThreatRegistry,
        malicious_package_id: address,
        walrus_blob_id: String,
        ctx: &mut TxContext
    ) {
        // If the threat hasn't been logged yet, add it to the on-chain table
        if (!table::contains(&registry.threats, malicious_package_id)) {
            table::add(&mut registry.threats, malicious_package_id, walrus_blob_id);
            registry.total_threats_logged = registry.total_threats_logged + 1;
        };

        // Always emit the event so off-chain indexers catch the signal instantly
        event::emit(ThreatReported {
            malicious_package_id,
            walrus_blob_id,
            reporter: tx_context::sender(ctx),
        });
    }

    /// Query function to check if a package is reported
    public fun is_threat_reported(registry: &ThreatRegistry, package_id: address): bool {
        table::contains(&registry.threats, package_id)
    }

    /// Get the Walrus blob ID for a reported threat
    public fun get_threat_blob_id(registry: &ThreatRegistry, package_id: address): String {
        *table::borrow(&registry.threats, package_id)
    }

    /// Get total number of threats logged
    public fun get_total_threats(registry: &ThreatRegistry): u64 {
        registry.total_threats_logged
    }
}
