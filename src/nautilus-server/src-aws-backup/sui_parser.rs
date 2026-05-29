use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedTransaction {
    pub move_calls: Vec<MoveCall>,
    pub asset_flows: Vec<AssetFlow>,
    pub gas_budget: u64,
    pub sender: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveCall {
    pub package: String,
    pub module: String,
    pub function: String,
    pub type_arguments: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetFlow {
    pub asset_type: String,
    pub direction: String,
    pub amount: u64,
    pub recipient: Option<String>,
    pub sender: Option<String>,
}

pub fn parse_transaction_bytes(tx_bytes: &str) -> Result<ParsedTransaction> {
    let bytes = base64::decode(tx_bytes)
        .context("Failed to decode transaction bytes")?;
    
    // For now, use simplified parsing
    // In production, use full BCS deserialization with sui-types
    parse_transaction_simple(&bytes)
}

fn parse_transaction_simple(bytes: &[u8]) -> Result<ParsedTransaction> {
    // Simplified parser - extracts basic info without full BCS deserialization
    // This is a placeholder for the full implementation
    
    let mut move_calls = Vec::new();
    let mut asset_flows = Vec::new();
    
    // Extract gas budget (typically in first 8 bytes after header)
    let gas_budget = if bytes.len() >= 16 {
        u64::from_le_bytes(bytes[8..16].try_into().unwrap_or([0u8; 8]))
    } else {
        1_000_000_000 // Default 1 SUI
    };
    
    // Detect common patterns in transaction bytes
    if contains_pattern(bytes, b"transfer") || contains_pattern(bytes, b"TransferObjects") {
        asset_flows.push(AssetFlow {
            asset_type: "0x2::sui::SUI".to_string(),
            direction: "OUT".to_string(),
            amount: 0, // Would be extracted from actual parsing
            recipient: None,
            sender: None,
        });
    }
    
    Ok(ParsedTransaction {
        move_calls,
        asset_flows,
        gas_budget,
        sender: "0x0".to_string(),
    })
}

fn contains_pattern(haystack: &[u8], needle: &[u8]) -> bool {
    haystack.windows(needle.len()).any(|window| window == needle)
}

// Full BCS parser (to be implemented with sui-types)
#[allow(dead_code)]
fn parse_transaction_bcs(bytes: &[u8]) -> Result<ParsedTransaction> {
    // TODO: Implement full BCS deserialization
    // use bcs;
    // use sui_types::transaction::TransactionData;
    // 
    // let tx_data: TransactionData = bcs::from_bytes(bytes)?;
    // 
    // Extract all ProgrammableTransaction commands:
    // - MoveCall -> extract package, module, function
    // - TransferObjects -> extract recipients
    // - SplitCoins -> extract amounts
    // - MergeCoins -> detect consolidation
    
    parse_transaction_simple(bytes)
}

pub fn extract_move_calls(tx: &ParsedTransaction) -> Vec<&MoveCall> {
    tx.move_calls.iter().collect()
}

pub fn extract_asset_flows<'a>(tx: &'a ParsedTransaction, user_address: &str) -> (Vec<&'a AssetFlow>, Vec<&'a AssetFlow>) {
    let outflows: Vec<&AssetFlow> = tx.asset_flows
        .iter()
        .filter(|f| f.direction == "OUT" && f.sender.as_deref() == Some(user_address))
        .collect();
    
    let inflows: Vec<&AssetFlow> = tx.asset_flows
        .iter()
        .filter(|f| f.direction == "IN" && f.recipient.as_deref() == Some(user_address))
        .collect();
    
    (outflows, inflows)
}

pub fn is_framework_package(package: &str) -> bool {
    matches!(
        package,
        "0x1" | "0x2" | "0x3" | "0x5" |
        "0x0000000000000000000000000000000000000000000000000000000000000001" |
        "0x0000000000000000000000000000000000000000000000000000000000000002" |
        "0x0000000000000000000000000000000000000000000000000000000000000003" |
        "0x0000000000000000000000000000000000000000000000000000000000000005"
    )
}

pub fn is_drain_function(function: &str) -> bool {
    matches!(
        function,
        "transfer_all" | "drain" | "sweep" | "approve_all" |
        "set_approval_for_all" | "emergency_withdraw" | "migrate_all"
    )
}

pub fn count_unique_recipients(flows: &[&AssetFlow]) -> usize {
    use std::collections::HashSet;
    
    flows
        .iter()
        .filter_map(|f| f.recipient.as_deref())
        .collect::<HashSet<_>>()
        .len()
}
