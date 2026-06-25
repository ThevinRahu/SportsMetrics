import React, { useState, useEffect } from 'react';
import { theme } from '../styles/theme';
import { getAIConfig, setAIConfig, getAvailableProviders } from '../services/dataFetcher';

export default function Settings({ open, onClose }) {
  const [provider, setProvider] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const providers = getAvailableProviders();

  useEffect(() => {
    const config = getAIConfig();
    setProvider(config.provider);
    setApiKey(config.apiKey);
  }, [open]);

  const handleSave = () => {
    setAIConfig(provider, apiKey);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  if (!open) return null;

  return (
    <div style={{ 
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div style={{ 
        background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 14,
        width: "min(480px, 95vw)", padding: 24
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>AI Data Settings</div>
            <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>
              Configure AI provider for live data extraction
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: theme.textDim }}>✕</button>
        </div>

        {/* How it works */}
        <div style={{ 
          background: theme.surface, borderRadius: 8, padding: 12, marginBottom: 20,
          borderLeft: `3px solid ${theme.amber}`, fontSize: 11, color: theme.textSecondary, lineHeight: 1.6
        }}>
          <strong style={{ color: theme.amber }}>How refresh works:</strong><br/>
          1. Fetches webpage from tournament's data source<br/>
          2. Sends content to AI which extracts ALL stats (tackles, scrums, lineouts, penalties, etc.)<br/>
          3. Structures data into our exact schema and saves to database<br/>
          4. All team metrics updated in one click
        </div>

        {/* Provider Selection */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, color: theme.textDim, display: "block", marginBottom: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
            AI Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px", fontSize: 13,
              background: theme.surface, color: theme.textPrimary,
              border: `1px solid ${theme.border}`, borderRadius: 8
            }}
          >
            {providers.map(p => (
              <option key={p.id} value={p.id}>{p.name}- {p.model}</option>
            ))}
          </select>
          <div style={{ fontSize: 10, color: theme.textDim, marginTop: 4 }}>
            {provider === "groq" && "Groq offers free API access with Llama 3.3 70B. Get a key at console.groq.com"}
            {provider === "groq_specdec" && "Fastest option- Groq's speculative decoding Llama 3.3. Same key as Groq."}
            {provider === "openrouter" && "OpenRouter has free models available. Get a key at openrouter.ai/keys"}
          </div>
        </div>

        {/* API Key */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 10, color: theme.textDim, display: "block", marginBottom: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider === "groq" ? "gsk_..." : "sk-or-..."}
            style={{
              width: "100%", padding: "10px 12px", fontSize: 13,
              background: theme.surface, color: theme.textPrimary,
              border: `1px solid ${theme.border}`, borderRadius: 8,
              boxSizing: "border-box"
            }}
          />
          <div style={{ fontSize: 10, color: theme.textDim, marginTop: 4 }}>
            Stored locally in your browser only. Never sent to our servers.
          </div>
        </div>

        {/* Get key instructions */}
        <div style={{ 
          background: theme.surface, borderRadius: 8, padding: 12, marginBottom: 20,
          fontSize: 11, color: theme.textSecondary, lineHeight: 1.6
        }}>
          <strong>Get a free Groq API key:</strong><br/>
          1. Go to <span style={{ color: theme.green }}>console.groq.com</span><br/>
          2. Sign up (free, no credit card)<br/>
          3. Create an API key<br/>
          4. Paste it above
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          style={{
            width: "100%", padding: "12px", fontSize: 13, fontWeight: 700,
            background: saved ? theme.greenDark : theme.green,
            color: saved ? theme.greenText : "#000",
            border: "none", borderRadius: 8, cursor: "pointer"
          }}
        >
          {saved ? "✓ Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
