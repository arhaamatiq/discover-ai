"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

type Props = {
  onClose: () => void;
  onSwitchToSignUp: () => void;
  onSuccess?: () => void;
};

function GoogleLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
      <path d="M5.84 14.09A6.97 6.97 0 0 1 5.47 12c0-.72.13-1.43.37-2.09V7.07H2.18A11.96 11.96 0 0 0 .96 12c0 1.94.46 3.77 1.22 5.33l3.66-3.24Z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335"/>
    </svg>
  );
}

export function LoginModal({ onClose, onSwitchToSignUp, onSuccess }: Props) {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inputClass =
    "w-full h-[33.69px] rounded-[9px] bg-[#232323] px-3 text-white outline-none focus:ring-1 focus:ring-[#444] transition-all text-[16px]";

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);
    setError("");
    const err = await signIn(email.trim(), password.trim());
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      onSuccess?.();
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative bg-[#171717] rounded-[15px] flex-shrink-0"
        style={{ width: "403.59px", height: "544.19px" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute flex items-center justify-center rounded-full bg-[#3C3C3C] hover:bg-[#555] transition-colors"
          style={{ top: "10.44px", right: "10.43px", width: "13.88px", height: "13.88px" }}
        >
          <X size={7} color="#909090" strokeWidth={2.5} />
        </button>

        {/* Title */}
        <p className="absolute text-white" style={{ top: "34.95px", left: "36.78px", fontSize: "24px", lineHeight: "1.21" }}>
          Login
        </p>

        {/* Continue with Google */}
        <button
          onClick={signInWithGoogle}
          className="absolute flex items-center gap-[11px] rounded-[10px] bg-white hover:bg-gray-50 transition-colors cursor-pointer"
          style={{
            top: "121.68px",
            left: "78.23px",
            width: "246px",
            height: "39px",
            padding: "15px",
            boxShadow: "0px 2px 3px rgba(0,0,0,0.17), 0px 0px 3px rgba(0,0,0,0.08)",
          }}
        >
          <GoogleLogo />
          <span style={{ fontSize: "16px", fontWeight: 500, color: "rgba(0,0,0,0.54)", fontFamily: "Roboto, sans-serif" }}>
            Continue with Google
          </span>
        </button>

        {/* Email label + input */}
        <label className="absolute text-[#646464]" style={{ top: "208.18px", left: "80.19px", fontSize: "16px" }}>
          Email
        </label>
        <div className="absolute" style={{ top: "232.09px", left: "78.23px", width: "247.13px" }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            aria-label="Email"
          />
        </div>

        {/* Password label + input */}
        <label className="absolute text-[#646464]" style={{ top: "274.69px", left: "80.19px", fontSize: "16px" }}>
          Password
        </label>
        <div className="absolute" style={{ top: "298.6px", left: "78.23px", width: "247.13px" }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className={inputClass}
            aria-label="Password"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="absolute text-red-400 text-xs" style={{ top: "342px", left: "78.23px", maxWidth: "247px" }}>
            {error}
          </p>
        )}

        {/* Continue button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !email.trim() || !password.trim()}
          className="absolute flex items-center justify-center rounded-[15px] bg-[#E0E0E0] hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
          style={{ top: "393.79px", left: "148.33px", width: "118.54px", height: "38.86px", fontSize: "16px", color: "#2E2E2E" }}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" color="#2E2E2E" /> : "Continue"}
        </button>

        {/* Switch to sign up */}
        <button
          onClick={onSwitchToSignUp}
          className="absolute text-[#B9B9B9] hover:text-white transition-colors cursor-pointer"
          style={{ top: "465.47px", left: "171.8px", fontSize: "16px" }}
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
