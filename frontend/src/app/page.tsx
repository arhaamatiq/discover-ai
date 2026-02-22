"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { GradientBackground } from "@/components/GradientBackground";
import { LoginModal } from "@/components/auth/LoginModal";
import { SignUpModal } from "@/components/auth/SignUpModal";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("workspaces")
      .select("research_data, canvas_data")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.research_data) {
          sessionStorage.setItem("discover_research", JSON.stringify(data.research_data));
          if (data.canvas_data) {
            sessionStorage.setItem("discover_canvas", JSON.stringify(data.canvas_data));
          }
          router.push("/canvas");
        }
      });
  }, [user, router]);

  function handleLoginSuccess() {
    setAuthMode(null);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <GradientBackground />

      {/* Bottom-left attribution */}
      <div className="absolute bottom-8 left-6 z-10 flex flex-col gap-[2px]">
        <span style={{ fontSize: "14px", color: "#A7A7A7", lineHeight: "1.21" }}>
          Developed by
        </span>
        <span style={{ fontSize: "16px", color: "#FFFFFF", lineHeight: "1.21" }}>
          APPLIED ENGINEERING{" "}
          <span style={{ color: "#A7A7A7" }}>SAN JOSE STATE UNIVERSITY</span>
        </span>
      </div>

      {/* Centred content */}
      <div className="relative z-10 flex flex-col gap-[45px]" style={{ minWidth: "321px" }}>
        {/* Title + subtitle */}
        <div className="flex flex-col gap-[11px]">
          <h1 style={{ fontSize: "32px", color: "#FFFFFF", lineHeight: "1.21", fontWeight: 400 }}>
            DiscoverAI
          </h1>
          <p style={{ fontSize: "16px", color: "#999999", lineHeight: "1.21" }}>
            Interactive AI tool for you to ideate with us
          </p>
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-[20px]">
          {/* Get Started */}
          <button
            onClick={() => router.push("/intake")}
            className="flex items-center gap-2 rounded-[15px] bg-[#E0E0E0] hover:bg-white transition-colors cursor-pointer"
            style={{ height: "46px", paddingLeft: "17px", paddingRight: "17px", fontSize: "16px", color: "#2E2E2E" }}
          >
            <span>Get Started</span>
            <ArrowRight size={14} strokeWidth={1.5} color="#2E2E2E" />
          </button>

          {/* Login */}
          <button
            onClick={() => setAuthMode("login")}
            className="flex items-center justify-center rounded-[15px] bg-[#2F2F2F] hover:bg-[#3a3a3a] transition-colors cursor-pointer"
            style={{ height: "46px", width: "120px", paddingLeft: "17px", paddingRight: "17px", fontSize: "16px", color: "#E0E0E0" }}
          >
            Login
          </button>
        </div>
      </div>

      {/* Auth modals */}
      {authMode === "login" && (
        <LoginModal
          onClose={() => setAuthMode(null)}
          onSwitchToSignUp={() => setAuthMode("signup")}
          onSuccess={handleLoginSuccess}
        />
      )}
      {authMode === "signup" && (
        <SignUpModal
          onClose={() => setAuthMode(null)}
          onSwitchToLogin={() => setAuthMode("login")}
          onSuccess={handleLoginSuccess}
        />
      )}
    </main>
  );
}
