"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

const C = {
  bg: "#08090a", surface: "#0f1012", border: "#1c1e22", borderHi: "#2a2d33",
  accent: "#f97316", accentDim: "#7c3010",
  text: "#e8e9eb", muted: "#454850", faint: "#14161a",
  danger: "#ef4444", green: "#22c55e",
};

export default function Auth() {
  const [mode,     setMode]     = useState("login"); // "login" | "signup"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [info,     setInfo]     = useState("");
  const [loading,  setLoading]  = useState(false);

  const inputStyle = {
    width: "100%", padding: "13px 14px",
    background: C.faint, border: `1px solid ${C.borderHi}`,
    borderRadius: 10, color: C.text,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 16, letterSpacing: 0.5, outline: "none",
    transition: "border-color .2s",
  };

  const handleSubmit = async () => {
    setError(""); setInfo(""); setLoading(true);
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password."); setLoading(false); return;
    }
    if (mode === "signup") {
      const { error: e } = await supabase.auth.signUp({ email: email.trim(), password });
      if (e) { setError(e.message); }
      else   { setInfo("Check your email to confirm your account, then log in."); setMode("login"); }
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (e) setError("Wrong email or password.");
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!email.trim()) { setError("Enter your email first."); return; }
    await supabase.auth.resetPasswordForEmail(email.trim());
    setInfo("Password reset email sent.");
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px", fontFamily: "'Barlow Condensed', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg} !important; }
        input:focus { border-color: ${C.accent} !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
      `}</style>

      <div style={{ width: "100%", maxWidth: 380, animation: "fadeUp .4s ease" }}>
        {/* Logo */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 0.88, letterSpacing: 3, color: C.accent }}>LOCK</div>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 0.88, letterSpacing: 3, color: C.text }}>IN.</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.muted, letterSpacing: 2, marginTop: 12 }}>
            {mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}
          </div>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={inputStyle}
          />

          {error && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.danger, letterSpacing: 0.5, padding: "4px 2px" }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.green, letterSpacing: 0.5, padding: "4px 2px" }}>
              {info}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%", padding: "14px",
              background: loading ? C.accentDim : C.accent,
              border: "none", borderRadius: 10,
              color: "#fff", fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 17, fontWeight: 700, letterSpacing: 3,
              cursor: loading ? "default" : "pointer",
              transition: "background .2s", marginTop: 4,
            }}
          >
            {loading ? "..." : mode === "login" ? "LOG IN" : "SIGN UP"}
          </button>
        </div>

        {/* Footer links */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, padding: "0 2px" }}>
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
            style={{ background: "none", border: "none", color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1, cursor: "pointer", textDecoration: "underline" }}
          >
            {mode === "login" ? "Create account" : "Already have an account"}
          </button>
          {mode === "login" && (
            <button
              onClick={handleForgot}
              style={{ background: "none", border: "none", color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1, cursor: "pointer", textDecoration: "underline" }}
            >
              Forgot password
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
