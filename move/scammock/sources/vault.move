/// Test-only adversarial package for scripts/test-adversarial.ts.
/// Entry points are named after known drain / permission-grant heuristics so
/// the full pipeline (static PTB parse → RiskEngine → enclave move_calls)
/// can be exercised against REAL MoveCall bytes, never executed on-chain.
module scammock::vault {
    use sui::coin;
    use sui::transfer;
    use sui::tx_context::TxContext;
    use sui::sui::SUI;

    /// Ice-phishing style standing-grant entry point (moves no value).
    public entry fun authorize(_ctx: &mut TxContext) {}

    /// Classic drain: takes the caller's coin and ships it to `recipient`.
    public entry fun drain(c: coin::Coin<SUI>, recipient: address, ctx: &mut TxContext) {
        transfer::public_transfer(c, recipient);
    }
}
