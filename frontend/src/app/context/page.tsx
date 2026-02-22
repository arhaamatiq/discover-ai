"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { GradientBackground } from "@/components/GradientBackground";

type ResearchData = {
  company: string;
  summary: string;
  research: string;
};

export default function ContextPage() {
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState("");
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem("discover_research");
    if (!stored) {
      router.replace("/intake");
      return;
    }
    setResearchData(JSON.parse(stored));
  }, [router]);

  function navigateToCanvas(extra?: string) {
    if (!researchData) return;
    if (extra) {
      const updated = { ...researchData, context: extra };
      sessionStorage.setItem("discover_research", JSON.stringify(updated));
    }
    router.push("/canvas");
  }

  function handleSubmit() {
    if (!additionalDetails.trim()) return;
    navigateToCanvas(additionalDetails.trim());
  }

  if (!researchData) return null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <GradientBackground />
      <div className="relative z-10 flex flex-col items-center gap-[47px]">
        {/* Start button — skip additional context */}
        <div className="flex flex-col items-center gap-[47px]">
          <button
            onClick={() => navigateToCanvas()}
            className="flex h-[46px] items-center gap-2 rounded-[15px] bg-primary px-7 text-base text-primary-foreground transition-opacity hover:opacity-80"
          >
            <span>Start</span>
            <ArrowRight className="size-4" strokeWidth={1.5} />
          </button>
          <span className="text-base text-muted-foreground">Or</span>
        </div>

        {/* Additional context input */}
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-normal text-white text-center">
            Tell us more
          </h1>
          <p className="text-base text-muted-foreground text-center">
            Areas of Interest/Prototype ideas/Bottlenecks
          </p>

          <div className="flex items-center gap-3 mt-[27px]">
            <input
              type="text"
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter details"
              className="h-[46px] w-[434px] rounded-[15px] border-2 border-border bg-transparent px-5 text-base text-white placeholder:text-[#2E2E2E] outline-none focus:border-muted-foreground transition-colors"
            />
            <button
              onClick={handleSubmit}
              disabled={!additionalDetails.trim()}
              className="flex h-[46px] w-[46px] items-center justify-center rounded-[15px] bg-primary text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowRight className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
