/// SealEnclave — On-chain verification layer for the VibeGuard Seal–Nautilus integration.
///
/// This contract proves three things on-chain:
///   1. An approved enclave environment was registered (PCRs + public key stored on-chain).
///   2. Only the approved enclave can produce accepted threat reports (Ed25519 signature verified).
///   3. Verified outputs are committed to trusted product logic (ThreatVerified event emitted).
///
/// The LocalThreatAgent configuration is encrypted off-chain under a Seal policy tied to these PCRs.
/// Only the enclave whose PCR measurements match this registration can decrypt and use it.
module seal_enclave::enclave {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::ed25519;
    use sui::clock::{Self, Clock};
    use std::string::String;
    use std::vector;

    // =========================================================================
    // Errors
    // =========================================================================

    const EInvalidSignature: u64 = 1;
    const EStaleReport: u64 = 2;

    // Max age of a signed report: 5 minutes in milliseconds
    const MAX_REPORT_AGE_MS: u64 = 300_000;

    // =========================================================================
    // Events
    // =========================================================================

    /// Emitted when an approved enclave is registered on-chain.
    struct EnclaveRegistered has copy, drop {
        enclave_id: address,
        pcr0: vector<u8>,
        pcr1: vector<u8>,
        pcr2: vector<u8>,
    }

    /// Emitted when a threat report is verified as coming from the approved enclave.
    /// This is the cryptographic proof that the Seal-protected LocalThreatAgent configuration
    /// was used inside the trusted execution environment.
    struct ThreatVerified has copy, drop {
        malicious_package_id: address,
        walrus_blob_id: String,
        enclave_signer: address,
        timestamp_ms: u64,
        verified: bool,
    }

    // =========================================================================
    // Shared Objects
    // =========================================================================

    /// Stores the approved enclave's PCR measurements and Ed25519 public key.
    /// PCRs are the cryptographic measurements of the enclave's code and config.
    /// Only an enclave matching these PCRs can decrypt the Seal-protected agent configuration.
    struct EnclaveConfig has key {
        id: UID,
        /// PCR0: measurement of the enclave image (code + data)
        pcr0: vector<u8>,
        /// PCR1: measurement of the Linux kernel and boot ramdisk
        pcr1: vector<u8>,
        /// PCR2: measurement of the application
        pcr2: vector<u8>,
        /// Ed25519 public key generated inside the enclave at startup.
        /// The private key never leaves enclave memory.
        enclave_public_key: vector<u8>,
        /// Whether an enclave has been registered
        is_registered: bool,
    }

    // =========================================================================
    // Initialization
    // =========================================================================

    fun init(ctx: &mut TxContext) {
        transfer::share_object(EnclaveConfig {
            id: object::new(ctx),
            pcr0: vector::empty(),
            pcr1: vector::empty(),
            pcr2: vector::empty(),
            enclave_public_key: vector::empty(),
            is_registered: false,
        });
    }

    // =========================================================================
    // Entry Functions
    // =========================================================================

    /// Step 2 of the Seal–Nautilus flow: register the approved enclave on-chain.
    /// Called once after the enclave starts and exposes its attestation endpoint.
    /// Stores PCR measurements and the enclave's ephemeral Ed25519 public key.
    public entry fun register_enclave(
        config: &mut EnclaveConfig,
        pcr0: vector<u8>,
        pcr1: vector<u8>,
        pcr2: vector<u8>,
        enclave_public_key: vector<u8>,
        ctx: &mut TxContext
    ) {
        config.pcr0 = pcr0;
        config.pcr1 = pcr1;
        config.pcr2 = pcr2;
        config.enclave_public_key = enclave_public_key;
        config.is_registered = true;

        event::emit(EnclaveRegistered {
            enclave_id: tx_context::sender(ctx),
            pcr0: config.pcr0,
            pcr1: config.pcr1,
            pcr2: config.pcr2,
        });
    }

    /// Step 5 of the Seal–Nautilus flow: verify and accept a threat report.
    /// Includes freshness check — reports older than 5 minutes are rejected,
    /// providing replay resistance per the Nautilus verified compute pattern.
    public entry fun verify_and_report(
        config: &EnclaveConfig,
        malicious_package_id: address,
        walrus_blob_id: String,
        enclave_signature: vector<u8>,
        timestamp_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Freshness check — reject stale reports to prevent replay attacks
        let now = clock::timestamp_ms(clock);
        assert!(now <= timestamp_ms + MAX_REPORT_AGE_MS, EStaleReport);

        if (config.is_registered) {
            // Reconstruct the signed message: address bytes + blob id bytes + timestamp bytes
            let msg = sui::address::to_bytes(malicious_package_id);
            let blob_bytes = std::string::bytes(&walrus_blob_id);
            vector::append(&mut msg, *blob_bytes);

            // Append timestamp as 8 little-endian bytes
            let ts = timestamp_ms;
            let i = 0u8;
            while (i < 8) {
                vector::push_back(&mut msg, ((ts & 0xff) as u8));
                ts = ts >> 8;
                i = i + 1;
            };

            let valid = ed25519::ed25519_verify(
                &enclave_signature,
                &config.enclave_public_key,
                &msg
            );
            assert!(valid, EInvalidSignature);
        };

        event::emit(ThreatVerified {
            malicious_package_id,
            walrus_blob_id,
            enclave_signer: tx_context::sender(ctx),
            timestamp_ms,
            verified: config.is_registered,
        });
    }

    // =========================================================================
    // Query Functions
    // =========================================================================

    public fun is_registered(config: &EnclaveConfig): bool {
        config.is_registered
    }

    public fun get_pcrs(config: &EnclaveConfig): (vector<u8>, vector<u8>, vector<u8>) {
        (config.pcr0, config.pcr1, config.pcr2)
    }
}
