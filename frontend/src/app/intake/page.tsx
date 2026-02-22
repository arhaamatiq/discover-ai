"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { GradientBackground } from "@/components/GradientBackground";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function IntakePage() {
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit() {
    if (!details.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: details.trim() }),
      });

      if (!res.ok) throw new Error(`Research failed (${res.status})`);

      const data = await res.json();
      sessionStorage.setItem("discover_research", JSON.stringify(data));
      router.push("/context");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <GradientBackground />
      <div className="relative z-10 flex flex-col gap-2">
        <h1 className="text-xl font-normal text-white">
          Hey! Let&apos;s start with context
        </h1>
        <p className="text-base text-muted-foreground">
          Company Name/Website/Additional details
        </p>

        <div className="flex items-center gap-3 mt-[44px]">
          <input
            type="text"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Enter details"
            disabled={loading}
            className="h-[46px] w-[434px] rounded-[15px] border-2 border-border bg-transparent px-5 text-base text-white placeholder:text-[#2E2E2E] outline-none focus:border-muted-foreground transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={!details.trim() || loading}
            className="flex h-[46px] w-[46px] items-center justify-center rounded-[15px] bg-primary text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground mt-4 animate-pulse">
            Researching company...
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400 mt-4">{error}</p>
        )}
      </div>
    </main>
  );
}
