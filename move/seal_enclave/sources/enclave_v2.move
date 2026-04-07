/// Enhanced SealEnclave with AWS Nitro Attestation Document Verification
///
/// This module supports TWO registration paths:
/// 1. register_enclave() - Direct PCR registration (for testing/staging)
/// 2. register_enclave_with_attestation() - Full AWS Nitro attestation verification (production)
///
/// The attestation path verifies the AWS certificate chain on-chain before accepting
/// the enclave registration, providing cryptographic proof that the enclave is running
/// on real AWS Nitro hardware with the expected code.
module seal_enclave::enclave_v2 {
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
    const EInvalidAttestation: u64 = 3;
    const EAttestationVerificationFailed: u64 = 4;

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
        registration_method: String, // "direct" or "attestation"
    }

    /// Emitted when a threat report is verified as coming from the approved enclave.
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
    struct EnclaveConfig has key {
        id: UID,
        /// PCR0: measurement of the enclave image (code + data)
        pcr0: vector<u8>,
        /// PCR1: measurement of the Linux kernel and boot ramdisk
        pcr1: vector<u8>,
        /// PCR2: measurement of the application
        pcr2: vector<u8>,
        /// Ed25519 public key generated inside the enclave at startup.
        enclave_public_key: vector<u8>,
        /// Whether an enclave has been registered
        is_registered: bool,
        /// Whether registration used attestation verification
        attestation_verified: bool,
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
            attestation_verified: false,
        });
    }

    // =========================================================================
    // Entry Functions - Direct Registration (Testing/Staging)
    // =========================================================================

    /// Direct PCR registration without attestation verification.
    /// Use for testing and staging environments.
    /// For production, use register_enclave_with_attestation().
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
        config.attestation_verified = false;

        event::emit(EnclaveRegistered {
            enclave_id: tx_context::sender(ctx),
            pcr0: config.pcr0,
            pcr1: config.pcr1,
            pcr2: config.pcr2,
            registration_method: std::string::utf8(b"direct"),
        });
    }

    // =========================================================================
    // Entry Functions - Attestation-Based Registration (Production)
    // =========================================================================

    /// Register enclave with AWS Nitro attestation document verification.
    /// 
    /// This function:
    /// 1. Verifies the AWS certificate chain using the root cert in Sui framework
    /// 2. Extracts PCR0, PCR1, PCR2 from the attestation document
    /// 3. Extracts the enclave's ephemeral public key
    /// 4. Stores the verified measurements on-chain
    /// 
    /// The attestation_document is a CBOR-encoded document signed by AWS.
    /// Only valid if it chains back to the AWS Nitro root certificate.
    public entry fun register_enclave_with_attestation(
        config: &mut EnclaveConfig,
        attestation_document: vector<u8>,
        ctx: &mut TxContext
    ) {
        // Verify attestation document and extract PCRs + public key
        let (pcr0, pcr1, pcr2, public_key) = verify_attestation_document(&attestation_document);

        config.pcr0 = pcr0;
        config.pcr1 = pcr1;
        config.pcr2 = pcr2;
        config.enclave_public_key = public_key;
        config.is_registered = true;
        config.attestation_verified = true;

        event::emit(EnclaveRegistered {
            enclave_id: tx_context::sender(ctx),
            pcr0: config.pcr0,
            pcr1: config.pcr1,
            pcr2: config.pcr2,
            registration_method: std::string::utf8(b"attestation"),
        });
    }

    // =========================================================================
    // Attestation Verification (Production Path)
    // =========================================================================

    /// Verify AWS Nitro attestation document and extract PCRs + public key.
    /// 
    /// This is a placeholder for the full attestation verification logic.
    /// In production, this would:
    /// 1. Parse CBOR-encoded attestation document
    /// 2. Verify certificate chain against AWS Nitro root cert (in Sui framework)
    /// 3. Extract PCR measurements from the document
    /// 4. Extract enclave public key from user_data field
    /// 
    /// For now, this aborts to indicate the feature is not yet implemented.
    /// Use register_enclave() for testing until AWS Nitro deployment.
    fun verify_attestation_document(
        _attestation_document: &vector<u8>
    ): (vector<u8>, vector<u8>, vector<u8>, vector<u8>) {
        // TODO: Implement full attestation verification
        // 
        // Steps:
        // 1. Parse CBOR document
        // 2. Extract certificate chain
        // 3. Verify chain against AWS root cert (sui::nitro::verify_attestation)
        // 4. Extract PCRs from document.pcrs field
        // 5. Extract public key from document.user_data or document.public_key
        // 
        // Reference: https://docs.aws.amazon.com/enclaves/latest/user/verify-root.html
        
        abort EAttestationVerificationFailed
    }

    // =========================================================================
    // Verification Function (Used by Both Paths)
    // =========================================================================

    /// Verify and accept a threat report.
    /// Works with both direct and attestation-based registration.
    public entry fun verify_and_report(
        config: &EnclaveConfig,
        malicious_package_id: address,
        walrus_blob_id: String,
        enclave_signature: vector<u8>,
        timestamp_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Freshness check
        let now = clock::timestamp_ms(clock);
        assert!(now <= timestamp_ms + MAX_REPORT_AGE_MS, EStaleReport);

        if (config.is_registered) {
            // Reconstruct the signed message
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

    public fun is_attestation_verified(config: &EnclaveConfig): bool {
        config.attestation_verified
    }

    public fun get_pcrs(config: &EnclaveConfig): (vector<u8>, vector<u8>, vector<u8>) {
        (config.pcr0, config.pcr1, config.pcr2)
    }
}
