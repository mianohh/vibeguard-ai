use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::info;

use super::ThreatAnalysisPayload;

const GEMINI_API_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

#[derive(Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
}

#[derive(Serialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Serialize)]
struct GeminiPart {
    text: String,
}

#[derive(Deserialize)]
struct GeminiResponse {
    candidates: Vec<GeminiCandidate>,
}

#[derive(Deserialize)]
struct GeminiCandidate {
    content: GeminiContentResponse,
}

#[derive(Deserialize)]
struct GeminiContentResponse {
    parts: Vec<GeminiPartResponse>,
}

#[derive(Deserialize)]
struct GeminiPartResponse {
    text: String,
}

pub struct AnalysisResult {
    pub risk_level: String,
    pub headline: String,
    pub plain_english: String,
    pub reasons: Vec<String>,
    pub recommended_action: String,
}

/// Analyze transaction using Gemini API
pub async fn analyze_transaction(
    payload: &ThreatAnalysisPayload,
    api_key: &str,
) -> Result<AnalysisResult, String> {
    info!("🤖 Calling Gemini API for threat analysis");

    let prompt = format!(
        r#"You are a blockchain security expert analyzing a Sui transaction.

Transaction bytes: {}
User intent: {}

Analyze this transaction for security threats. Respond in JSON format:
{{
  "risk_level": "GREEN|YELLOW|RED",
  "headline": "Brief security assessment",
  "plain_english": "Detailed explanation in simple terms",
  "reasons": ["reason1", "reason2"],
  "recommended_action": "What the user should do"
}}

Focus on:
- Honeypot attacks (unexpected token drains)
- Intent mismatches (user expects X but transaction does Y)
- Phishing attempts
- Suspicious contract interactions"#,
        payload.transaction_bytes,
        payload.user_intent
    );

    let client = Client::new();
    let request = GeminiRequest {
        contents: vec![GeminiContent {
            parts: vec![GeminiPart { text: prompt }],
        }],
    };

    let response = client
        .post(format!("{}?key={}", GEMINI_API_URL, api_key))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Gemini API error {}: {}", status, error_text));
    }

    let gemini_response: GeminiResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let text = gemini_response
        .candidates
        .first()
        .and_then(|c| c.content.parts.first())
        .map(|p| p.text.as_str())
        .ok_or("No response from Gemini")?;

    // Parse JSON response
    let analysis: serde_json::Value = serde_json::from_str(
        text.trim_start_matches("```json")
            .trim_end_matches("```")
            .trim(),
    )
    .map_err(|e| format!("Failed to parse Gemini JSON: {}", e))?;

    Ok(AnalysisResult {
        risk_level: analysis["risk_level"]
            .as_str()
            .unwrap_or("YELLOW")
            .to_string(),
        headline: analysis["headline"]
            .as_str()
            .unwrap_or("Analysis complete")
            .to_string(),
        plain_english: analysis["plain_english"]
            .as_str()
            .unwrap_or("Unable to analyze")
            .to_string(),
        reasons: analysis["reasons"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_default(),
        recommended_action: analysis["recommended_action"]
            .as_str()
            .unwrap_or("Review carefully")
            .to_string(),
    })
}
