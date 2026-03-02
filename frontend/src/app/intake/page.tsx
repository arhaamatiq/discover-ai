"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { GradientBackground } from "@/components/GradientBackground";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STATUS_MESSAGES = [
  "Analyzing your input…",
  "Searching the web…",
  "Gathering company details…",
  "Reading company website…",
  "Synthesizing research…",
  "Putting it all together…",
];

const ROTATE_MS = 3200;

export default function IntakePage() {
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
      setTimeout(() => inputRef.current?.focus(), 400);
    }, 50);
    return () => clearTimeout(t);
  }, []);

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

  async function handleSubmit() {
    if (!details.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const disambigRes = await fetch(`${API_URL}/api/disambiguate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: details.trim() }),
      });

      if (!disambigRes.ok) {
        let message = `Lookup failed (${disambigRes.status})`;
        try { const body = await disambigRes.json(); if (body?.detail) message = body.detail; } catch { /* ignore */ }
        throw new Error(message);
      }

      const disambigData = await disambigRes.json();

      if (disambigData.ambiguous && disambigData.candidates?.length > 1) {
        sessionStorage.setItem("discover_candidates", JSON.stringify(disambigData.candidates));
        router.push("/select-company");
        return;
      }

      const companyQuery = disambigData.candidates?.[0]?.domain
        ? `${disambigData.candidates[0].name} ${disambigData.candidates[0].domain}`
        : details.trim();

      const res = await fetch(`${API_URL}/api/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: companyQuery }),
      });

      if (!res.ok) {
        let message = `Research failed (${res.status})`;
        try { const body = await res.json(); if (body?.detail) message = body.detail; } catch { /* ignore */ }
        throw new Error(message);
      }

      const data = await res.json();
      sessionStorage.setItem("discover_research", JSON.stringify(data));
      router.push("/context");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <GradientBackground />

      <div
        className="relative z-10 flex flex-col gap-3"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Eyebrow */}
        <span
          className="text-xs font-medium tracking-widest uppercase text-muted-foreground/60 mb-1"
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.5s 0.15s",
          }}
        >
          Step 1 of 2
        </span>

        <h1 className="text-2xl font-normal text-white leading-snug">
          Hey! Let&apos;s start with context
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Company name, website, or any details you have
        </p>

        {/* Input row */}
        <div
          className="flex items-center gap-3 mt-10"
          style={{
            animation: mounted ? "fadeUp 0.5s 0.2s cubic-bezier(0.16,1,0.3,1) both" : "none",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={details}
            onChange={(e) => { setDetails(e.target.value); if (error) setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. Ramp, stripe.com, a fintech startup…"
            disabled={loading}
            className="intake-input h-[48px] w-[440px] rounded-[15px] border-2 border-border bg-transparent px-5 text-[15px] text-white placeholder:text-[#363636] outline-none transition-all duration-200 disabled:opacity-40"
            style={{
              animation: shake ? "shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97)" : undefined,
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!details.trim() || loading}
            className="group flex h-[48px] w-[48px] flex-shrink-0 items-center justify-center rounded-[15px] bg-primary text-primary-foreground transition-all duration-150 hover:scale-105 hover:opacity-90 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading
              ? <Loader2 className="size-4 animate-spin" />
              : <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
            }
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div
            className="flex items-center gap-3 mt-5"
            style={{ animation: "fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both" }}
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

        {/* Error */}
        {error && !loading && (
          <p
            className="text-[13px] text-red-400 mt-3"
            style={{ animation: "fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
