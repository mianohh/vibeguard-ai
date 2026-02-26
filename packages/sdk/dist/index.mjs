// src/index.ts
var VibeGuard = class {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://vibeguardai.vercel.app";
  }
  async analyzeTransaction(options) {
    const headers = {
      "Content-Type": "application/json"
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    const response = await fetch(`${this.baseUrl}/api/explain`, {
      method: "POST",
      headers,
      body: JSON.stringify(options)
    });
    if (!response.ok) {
      throw new Error(`VibeGuard API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
};
export {
  VibeGuard
};
