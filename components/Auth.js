"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

/* ══════════ PALETTE (ARCTIC STEALTH) ══════════════════════════════════════ */
const C = {
  bg: "#050b14", surface: "#0b1221", border: "#1a2436", borderHi: "#2a3b59",
  accent: "#00f0ff", accentDim: "#008c99", accentGlow: "rgba(0, 240, 255, 0.12)",
  text: "#f8fafc", muted: "#64748b", faint: "#0f172a",
  danger: "#fb7185", green: "#10b981",
};

export default function Auth() {
  const [mode,     setMode]     = useState("login"); // "login" | "signup"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [info,     setInfo]     = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async () => {
    setError(""); setInfo(""); setLoading(true);
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password."); setLoading(false); return;
    }
    if (mode === "signup") {
      const { error: e } = await supabase.auth.signUp({ email: email.trim(), password });
      if (e) { setError(e.message); }
      else   { setInfo("System initialized. Check email to confirm connection."); setMode("login"); }
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (e) setError("Access denied. Invalid credentials.");
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!email.trim()) { setError("Provide email to initiate reset."); return; }
    await supabase.auth.resetPasswordForEmail(email.trim());
    setInfo("Reset protocol sent to email.");
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", fontFamily: "'Barlow Condensed', sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg} !important; -webkit-font-smoothing: antialiased; }
        
        .auth-input {
          width: 100%; padding: 14px 16px;
          background: ${C.surface}; border: 1px solid ${C.borderHi};
          border-radius: 12px; color: ${C.text};
          font-family: 'JetBrains Mono', monospace; font-size: 14px;
          outline: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }
        .auth-input:focus {
          border-color: ${C.accent};
          box-shadow: 0 0 16px ${C.accentGlow}, inset 0 2px 4px rgba(0,0,0,0.5);
        }
        
        .btn-press { transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .btn-press:active { transform: scale(0.96); }
        
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp .6s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
        
        {/* Logo */}
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 0.85, letterSpacing: 4, color: C.accent, textShadow: `0 0 20px ${C.accentGlow}` }}>LOCK</div>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 0.85, letterSpacing: 4, color: C.text }}>IN.</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.muted, letterSpacing: 3, marginTop: 16, background: C.border, display: "inline-block", padding: "6px 12px", borderRadius: 6 }}>
            {mode === "login" ? "SYSTEM LOGIN" : "INITIALIZE ACCOUNT"}
          </div>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            className="auth-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            className="auth-input"
          />

          {error && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.danger, letterSpacing: 0.5, padding: "4px 8px", background: `${C.danger}15`, borderLeft: `2px solid ${C.danger}`, borderRadius: 4 }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.green, letterSpacing: 0.5, padding: "4px 8px", background: `${C.green}15`, borderLeft: `2px solid ${C.green}`, borderRadius: 4 }}>
              {info}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={loading ? "" : "btn-press"}
            style={{
              width: "100%", padding: "16px",
              background: loading ? C.accentDim : C.accent,
              border: "none", borderRadius: 12,
              color: C.bg, fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 18, fontWeight: 700, letterSpacing: 3,
              cursor: loading ? "default" : "pointer",
              transition: "all .3s cubic-bezier(0.4, 0, 0.2, 1)", marginTop: 8,
              boxShadow: loading ? "none" : `0 8px 24px ${C.accent}44`
            }}
          >
            {loading ? "AUTHENTICATING..." : mode === "login" ? "LOG IN" : "SIGN UP"}
          </button>
        </div>

        {/* Footer links */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, padding: "0 8px" }}>
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
            className="btn-press"
            style={{ background: "none", border: "none", color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer", transition: "color .2s" }}
            onMouseEnter={e => e.target.style.color = C.accent}
            onMouseLeave={e => e.target.style.color = C.muted}
          >
            {mode === "login" ? "[ CREATE ACCOUNT ]" : "[ BACK TO LOGIN ]"}
          </button>
          {mode === "login" && (
            <button
              onClick={handleForgot}
              className="btn-press"
              style={{ background: "none", border: "none", color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer", transition: "color .2s" }}
              onMouseEnter={e => e.target.style.color = C.accent}
              onMouseLeave={e => e.target.style.color = C.muted}
            >
              [ RESET PASSWORD ]
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
