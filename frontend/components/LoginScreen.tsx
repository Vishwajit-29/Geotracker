import React, { useState } from "react";
import { User } from "../types";

interface LoginScreenProps {
  users: User[];
  onLogin: (name: string, password: string) => Promise<boolean>;
}

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
) : (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const success = await onLogin(name.trim(), password);
      if (!success) setError("Invalid credentials. Please try again.");
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="gt-login-shell">
      {/* ── Left panel ── */}
      <div className="gt-login-left">
        {/* Logo */}
        <div className="gt-row" style={{ marginBottom: 48, position: "relative", zIndex: 1 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "#292524", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
          }}>
            <img src="/logo.png" alt="GeoTracker" style={{ width: 22, height: 22, objectFit: "contain" }} />
          </div>
          <span style={{ color: "#F5F5F4", fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px" }}>
            GeoTracker
          </span>
        </div>

        {/* Hero text */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", zIndex: 1 }}>
          <h1 style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 36, fontWeight: 500,
            color: "#FFFFFF", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 14,
          }}>
            Track attendance.
          </h1>
          <p style={{ color: "#A8A29E", fontSize: 15, lineHeight: 1.6, marginBottom: 32, maxWidth: 320 }}>
            Real-time geofenced attendance for modern teams.
          </p>

          {/* Feature bullets */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {["GPS-verified check-ins", "Live attendance dashboard", "Smart leave management"].map(f => (
              <div key={f} style={{
                borderLeft: "2.5px solid #C96442",
                paddingLeft: 12,
                color: "#D6D3D1",
                fontSize: 13.5,
                fontWeight: 500,
                lineHeight: 1.5,
              }}>{f}</div>
            ))}
          </div>
        </div>

        {/* Footer status */}
        <div className="gt-row" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#16A34A", flexShrink: 0 }} />
          <span style={{ color: "#78716C", fontSize: 12 }}>System operational</span>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="gt-login-right">
        <div className="gt-login-form-wrap">
          <h2 style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 500,
            color: "#1C1917", letterSpacing: "-0.02em", marginBottom: 4,
          }}>
            Welcome back.
          </h2>
          <p style={{ color: "#A8A29E", fontSize: 13, marginBottom: 28 }}>
            Sign in to continue.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Name */}
            <div>
              <label className="gt-label">Full Name</label>
              <div className="gt-input-with-icon">
                <span className="gt-input-icon material-symbols-outlined" style={{ fontSize: 17 }}>person</span>
                <input
                  className="gt-input"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="gt-label">Password</label>
              <div className="gt-input-with-icon" style={{ position: "relative" }}>
                <span className="gt-input-icon material-symbols-outlined" style={{ fontSize: 17 }}>lock</span>
                <input
                  className="gt-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    color: "#A8A29E", background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center",
                  }}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right", marginTop: -4 }}>
              <span className="gt-text-link" style={{ fontSize: 12 }}>Forgot password?</span>
            </div>

            {error && (
              <div style={{
                background: "#FEF2F2", border: "1px solid #FECACA",
                borderRadius: 6, padding: "10px 14px",
                color: "#DC2626", fontSize: 13,
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="gt-btn gt-btn-primary gt-btn-lg"
              style={{ width: "100%", marginTop: 4 }}
            >
              {isLoading ? (
                <><div className="gt-spinner" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} /> Signing in…</>
              ) : "Sign in →"}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            marginTop: 24, display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6, color: "#D6D3D1", fontSize: 11,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>lock</span>
            Protected by 256-bit encryption · GDPR compliant
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;