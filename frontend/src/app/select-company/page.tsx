"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Globe, Loader2 } from "lucide-react";
import Image from "next/image";
import { GradientBackground } from "@/components/GradientBackground";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Candidate = {
  name: string;
  domain: string | null;
  description: string;
  logo_url: string | null;
};

const STATUS_MESSAGES = [
  "Analyzing your input…",
  "Searching the web…",
  "Gathering company details…",
  "Reading company website…",
  "Synthesizing research…",
  "Putting it all together…",
];
const ROTATE_MS = 3200;

export default function SelectCompanyPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("discover_candidates");
    if (!stored) { router.replace("/intake"); return; }
    try {
      const parsed = JSON.parse(stored) as Candidate[];
      setCandidates(parsed);
      setTimeout(() => setMounted(true), 60);
    } catch {
      router.replace("/intake");
    }
  }, [router]);

  useEffect(() => {
    if (loading) {
      setStatusIdx(0);
      intervalRef.current = setInterval(() => {
        setStatusIdx((prev) => (prev < STATUS_MESSAGES.length - 1 ? prev + 1 : prev));
      }, ROTATE_MS);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loading]);

  async function handleContinue() {
    if (selected === null || loading) return;
    const candidate = candidates[selected];
    setLoading(true);
    setError("");
    const query = candidate.domain ? `${candidate.name} ${candidate.domain}` : candidate.name;

    try {
      const res = await fetch(`${API_URL}/api/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: query }),
      });
      if (!res.ok) {
        let message = `Research failed (${res.status})`;
        try { const body = await res.json(); if (body?.detail) message = body.detail; } catch { /* ignore */ }
        throw new Error(message);
      }
      const data = await res.json();
      sessionStorage.setItem("discover_research", JSON.stringify(data));
      sessionStorage.removeItem("discover_candidates");
      router.push("/context");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (candidates.length === 0) return null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <GradientBackground />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-[580px] w-full">
        {/* Header */}
        <div
          className="flex flex-col items-center gap-2"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground/50 mb-1">
            Multiple matches found
          </span>
          <h1 className="text-2xl font-normal text-white text-center">
            Which company did you mean?
          </h1>
          <p className="text-[15px] text-muted-foreground text-center">
            Select the right one to continue
          </p>
        </div>

        {/* Candidate cards */}
        <div className="flex flex-col gap-2.5 w-full">
          {candidates.map((c, i) => {
            const isSelected = selected === i;
            return (
              <button
                key={i}
                onClick={() => !loading && setSelected(i)}
                disabled={loading}
                className="group relative flex items-center gap-4 w-full rounded-[16px] border-2 px-5 py-4 text-left outline-none"
                style={{
                  borderColor: isSelected ? "rgba(147, 97, 222, 0.6)" : "rgba(46,46,46,1)",
                  background: isSelected
                    ? "rgba(147, 97, 222, 0.07)"
                    : "rgba(255,255,255,0.01)",
                  boxShadow: isSelected
                    ? "0 0 0 1px rgba(147,97,222,0.15), 0 4px 24px rgba(147,97,222,0.08)"
                    : "none",
                  transform: isSelected ? "translateY(-1px)" : "translateY(0)",
                  opacity: mounted ? 1 : 0,
                  transition: [
                    `opacity 0.45s ${i * 80 + 120}ms cubic-bezier(0.16,1,0.3,1)`,
                    `transform 0.18s ease`,
                    `border-color 0.18s ease`,
                    `background 0.18s ease`,
                    `box-shadow 0.18s ease`,
                  ].join(", "),
                  animation: mounted
                    ? `cardReveal 0.45s ${i * 80 + 120}ms cubic-bezier(0.16,1,0.3,1) both`
                    : "none",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected && !loading)
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(100,100,100,0.6)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(46,46,46,1)";
                }}
              >
                {/* Logo */}
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#1A1A1A] border border-white/[0.05] flex items-center justify-center overflow-hidden">
                  {c.logo_url ? (
                    <Image
                      src={c.logo_url}
                      alt={c.name}
                      width={28}
                      height={28}
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-[15px] font-medium text-white truncate leading-snug">
                    {c.name}
                  </span>
                  {c.description && (
                    <span className="text-[13px] text-muted-foreground line-clamp-1 leading-relaxed">
                      {c.description}
                    </span>
                  )}
                </div>

                {/* Domain */}
                {c.domain && (
                  <div className="flex items-center gap-1.5 flex-shrink-0 mr-2">
                    <Globe className="size-3 text-muted-foreground/60" strokeWidth={1.5} />
                    <span className="text-[12px] text-muted-foreground/70 font-mono">
                      {c.domain}
                    </span>
                  </div>
                )}

                {/* Selection indicator */}
                <div
                  className="flex-shrink-0 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all duration-150"
                  style={{
                    borderColor: isSelected ? "rgba(147, 97, 222, 0.8)" : "rgba(60,60,60,1)",
                    background: isSelected ? "rgba(147, 97, 222, 0.85)" : "transparent",
                  }}
                >
                  {isSelected && (
                    <Check
                      className="size-3 text-white"
                      strokeWidth={2.5}
                      style={{ animation: "checkPop 0.25s cubic-bezier(0.34,1.56,0.64,1) both" }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue button */}
        <div
          className="flex flex-col items-center gap-4 w-full"
          style={{
            opacity: mounted ? 1 : 0,
            transition: `opacity 0.5s ${candidates.length * 80 + 200}ms cubic-bezier(0.16,1,0.3,1)`,
          }}
        >
          <button
            onClick={handleContinue}
            disabled={selected === null || loading}
            className="btn-shimmer group flex h-[50px] items-center gap-2.5 rounded-[15px] bg-primary px-8 text-[15px] font-medium text-primary-foreground transition-all duration-150 hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Researching…</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
              </>
            )}
          </button>

          {/* Loading status */}
          {loading && (
            <div
              className="flex items-center gap-3"
              style={{ animation: "fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
            >
              <div className="flex gap-[5px] items-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="block w-[5px] h-[5px] rounded-full bg-muted-foreground"
                    style={{ animation: `dotBounce 1.2s ${i * 0.18}s ease-in-out infinite` }}
                  />
                ))}
              </div>
              <p
                key={statusIdx}
                className="text-[13px] text-muted-foreground"
                style={{ animation: "statusSlide 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
              >
                {STATUS_MESSAGES[statusIdx]}
              </p>
            </div>
          )}

          {error && (
            <p
              className="text-[13px] text-red-400"
              style={{ animation: "fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
