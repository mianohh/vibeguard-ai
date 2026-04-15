use serde::{Deserialize, Serialize};
use tracing::info;

use super::ThreatAnalysisPayload;

/// Agent configuration (protected by Seal in production)
#[derive(Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub scoring_weights: ScoringWeights,
    pub risk_thresholds: RiskThresholds,
    pub heuristic_rules: HeuristicRules,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ScoringWeights {
    pub intent_mismatch: f32,
    pub asset_drain: f32,
    pub permission_change: f32,
    pub complexity: f32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct RiskThresholds {
    pub red_threshold: f32,
    pub yellow_threshold: f32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct HeuristicRules {
    pub max_safe_complexity: usize,
    pub suspicious_keywords: Vec<String>,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            scoring_weights: ScoringWeights {
                intent_mismatch: 10.0,
                asset_drain: 8.0,
                permission_change: 7.0,
                complexity: 3.0,
            },
            risk_thresholds: RiskThresholds {
                red_threshold: 8.0,
                yellow_threshold: 4.0,
            },
            heuristic_rules: HeuristicRules {
                max_safe_complexity: 5,
                suspicious_keywords: vec![
                    "drain".to_string(),
                    "exploit".to_string(),
                    "phishing".to_string(),
                ],
            },
        }
    }
}

pub struct AnalysisResult {
    pub risk_level: String,
    pub headline: String,
    pub plain_english: String,
    pub reasons: Vec<String>,
    pub recommended_action: String,
}

/// Analyze transaction using LocalThreatAgent (deterministic, pattern-based)
pub fn analyze_transaction(
    payload: &ThreatAnalysisPayload,
    config: &AgentConfig,
) -> Result<AnalysisResult, String> {
    info!("🛡️ Running LocalThreatAgent analysis");

    // Parse transaction bytes (simplified - in production, use full Sui parser)
    let tx_data = parse_transaction_bytes(&payload.transaction_bytes)?;

    // Calculate risk score
    let mut risk_score = 0.0;
    let mut reasons = Vec::new();

    // Pattern 1: Intent mismatch detection
    if detect_intent_mismatch(&payload.user_intent, &tx_data) {
        risk_score += config.scoring_weights.intent_mismatch;
        reasons.push("Intent mismatch: Transaction behavior differs from stated intent".to_string());
    }

    // Pattern 2: Asset drain detection
    if detect_asset_drain(&tx_data) {
        risk_score += config.scoring_weights.asset_drain;
        reasons.push("Potential asset drain: Unexpected token transfers detected".to_string());
    }

    // Pattern 3: Permission change detection
    if detect_permission_change(&tx_data) {
        risk_score += config.scoring_weights.permission_change;
        reasons.push("Permission change: Transaction modifies access controls".to_string());
    }

    // Pattern 4: Complexity analysis
    if tx_data.complexity > config.heuristic_rules.max_safe_complexity {
        risk_score += config.scoring_weights.complexity;
        reasons.push(format!("High complexity: {} operations detected", tx_data.complexity));
    }

    // Classify risk level
    let (risk_level, headline, recommended_action) = if risk_score >= config.risk_thresholds.red_threshold {
        (
            "RED",
            "🚨 Critical Threat Detected",
            "DO NOT SIGN. This transaction exhibits multiple high-risk patterns.",
        )
    } else if risk_score >= config.risk_thresholds.yellow_threshold {
        (
            "YELLOW",
            "⚠️ Suspicious Activity Detected",
            "Review carefully before signing. Verify transaction details match your intent.",
        )
    } else {
        (
            "GREEN",
            "✅ Transaction Appears Safe",
            "Transaction passed security checks. Safe to proceed.",
        )
    };

    if reasons.is_empty() {
        reasons.push("No security threats detected".to_string());
    }

    let plain_english = format!(
        "Risk Score: {:.1}/10. {}",
        risk_score,
        reasons.join(". ")
    );

    info!("✅ Analysis complete: {} (score: {:.1})", risk_level, risk_score);

    Ok(AnalysisResult {
        risk_level: risk_level.to_string(),
        headline: headline.to_string(),
        plain_english,
        reasons,
        recommended_action: recommended_action.to_string(),
    })
}

struct TransactionData {
    complexity: usize,
    has_transfers: bool,
    has_permission_changes: bool,
    recipient_addresses: Vec<String>,
}

fn parse_transaction_bytes(tx_bytes: &str) -> Result<TransactionData, String> {
    // Simplified parser - in production, use full BCS deserialization
    let complexity = tx_bytes.len() / 100; // Rough estimate
    
    Ok(TransactionData {
        complexity,
        has_transfers: tx_bytes.contains("transfer") || tx_bytes.contains("TransferObjects"),
        has_permission_changes: tx_bytes.contains("authorize") || tx_bytes.contains("grant"),
        recipient_addresses: vec![],
    })
}

fn detect_intent_mismatch(user_intent: &str, tx_data: &TransactionData) -> bool {
    let intent_lower = user_intent.to_lowercase();
    
    // User expects to receive, but transaction sends assets
    if (intent_lower.contains("claim") || intent_lower.contains("receive") || intent_lower.contains("airdrop"))
        && tx_data.has_transfers
    {
        return true;
    }
    
    false
}

fn detect_asset_drain(tx_data: &TransactionData) -> bool {
    // Multiple transfers or high complexity with transfers
    tx_data.has_transfers && tx_data.complexity > 10
}

fn detect_permission_change(tx_data: &TransactionData) -> bool {
    tx_data.has_permission_changes
}
