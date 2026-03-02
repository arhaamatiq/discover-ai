"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import { GradientBackground } from "@/components/GradientBackground";

type ResearchData = {
  company: string;
  summary: string;
  research: string;
  logo_url?: string | null;
};

export default function ContextPage() {
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem("discover_research");
    if (!stored) { router.replace("/intake"); return; }
    setResearchData(JSON.parse(stored));
    setTimeout(() => setMounted(true), 60);
  }, [router]);

  function navigateToCanvas(extra?: string) {
    if (!researchData) return;
    if (extra) {
      sessionStorage.setItem("discover_research", JSON.stringify({ ...researchData, context: extra }));
    }
    router.push("/canvas");
  }

  function handleSubmit() {
    if (!additionalDetails.trim()) return;
    navigateToCanvas(additionalDetails.trim());
  }

  if (!researchData) return null;

  const delay = (ms: number) => `${ms}ms`;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <GradientBackground />

      <div
        className="relative z-10 flex flex-col items-center gap-10 px-6 max-w-[520px] w-full"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Company badge — confirmation of what was researched */}
        <div
          className="flex flex-col items-center gap-4"
          style={{
            opacity: mounted ? 1 : 0,
            transition: `opacity 0.5s ${delay(80)}`,
          }}
        >
          {/* Logo + name pill */}
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 backdrop-blur-sm">
            <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] flex items-center justify-center overflow-hidden flex-shrink-0">
              {researchData.logo_url ? (
                <Image
                  src={researchData.logo_url}
                  alt={researchData.company}
                  width={24}
                  height={24}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  {researchData.company.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-sm font-medium text-white/90">{researchData.company}</span>
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/[0.12] px-2 py-0.5 text-[11px] font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Researched
            </span>
          </div>

          {/* Summary */}
          {researchData.summary && (
            <p className="text-[13px] text-muted-foreground text-center leading-relaxed max-w-[380px] line-clamp-2">
              {researchData.summary}
            </p>
          )}
        </div>

        {/* Divider */}
        <div
          className="w-full flex items-center gap-4"
          style={{ opacity: mounted ? 1 : 0, transition: `opacity 0.5s ${delay(160)}` }}
        >
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[11px] tracking-widest uppercase text-muted-foreground/50 font-medium">Step 2 of 2</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Heading + CTA block */}
        <div
          className="flex flex-col items-center gap-7 w-full"
          style={{ opacity: mounted ? 1 : 0, transition: `opacity 0.5s ${delay(220)}` }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-normal text-white leading-snug">
              Ready to discover?
            </h1>
            <p className="text-[15px] text-muted-foreground">
              Jump in now or add more context first
            </p>
          </div>

          {/* Primary CTA */}
          <button
            onClick={() => navigateToCanvas()}
            className="btn-shimmer group flex h-[50px] items-center gap-2.5 rounded-[15px] bg-primary px-8 text-[15px] font-medium text-primary-foreground transition-all duration-150 hover:scale-[1.02] hover:opacity-95 active:scale-[0.98]"
          >
            <Sparkles className="size-4 opacity-70 transition-transform duration-200 group-hover:rotate-12" strokeWidth={1.5} />
            <span>Start discovering</span>
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
          </button>

          {/* Or divider */}
          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 h-px bg-white/[0.05]" />
            <span className="text-[13px] text-muted-foreground/60">or refine first</span>
            <div className="flex-1 h-px bg-white/[0.05]" />
          </div>

          {/* Optional context input */}
          <div className="flex flex-col gap-2.5 w-full items-center">
            <p className="text-[13px] text-muted-foreground text-center">
              Areas of interest, specific ideas, bottlenecks
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="e.g. Focus on internal tools…"
                className="intake-input h-[46px] w-[390px] rounded-[15px] border-2 border-border bg-transparent px-5 text-[14px] text-white placeholder:text-[#363636] outline-none transition-all duration-200"
              />
              <button
                onClick={handleSubmit}
                disabled={!additionalDetails.trim()}
                className="group flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-[15px] bg-primary text-primary-foreground transition-all duration-150 hover:scale-105 hover:opacity-90 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
