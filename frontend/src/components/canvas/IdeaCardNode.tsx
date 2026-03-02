import { useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ArrowRight, Star, MessageSquare } from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";

export type IdeaCardNodeData = {
  title: string;
  description: string;
  parentId?: string;
  isLoading?: boolean;
  onSubmitPrompt?: (nodeId: string, prompt: string) => void;
  onCreateVariations?: (nodeId: string) => void;
  onAuthRequired?: () => void;
};

export function IdeaCardNode({ id, data }: NodeProps) {
  const { title, description, isLoading, onSubmitPrompt, onCreateVariations, onAuthRequired } =
    data as IdeaCardNodeData;
  const [showOptions, setShowOptions] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [starred, setStarred] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Close options when clicking outside the node */
  useEffect(() => {
    if (!showOptions) return;
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowOptions(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [showOptions]);

  /* Close input when clicking outside the node */
  useEffect(() => {
    if (!showInput) return;
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowInput(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [showInput]);

  function handleCardClick() {
    if (showInput || !onSubmitPrompt) return;
    setShowOptions((prev) => !prev);
  }

  function handleSubmit() {
    if (!prompt.trim() || !onSubmitPrompt) return;
    onSubmitPrompt(id, prompt.trim());
    setPrompt("");
    setShowInput(false);
  }

  function handleChat() {
    if (onAuthRequired) { onAuthRequired(); return; }
    setShowOptions(false);
    setShowInput(true);
  }

  function handleExploreFurther() {
    if (onAuthRequired) { onAuthRequired(); return; }
    if (!onSubmitPrompt) return;
    setShowOptions(false);
    onSubmitPrompt(
      id,
      "Explore this idea further. Go deeper into the implementation approach, key technical components, potential challenges, and how it would specifically create value for the company."
    );
  }

  function handleCreateVariations() {
    if (onAuthRequired) { onAuthRequired(); return; }
    if (!onCreateVariations) return;
    setShowOptions(false);
    onCreateVariations(id);
  }

  function handleStar(e: React.MouseEvent) {
    e.stopPropagation();
    setStarred((prev) => !prev);
    setShowOptions(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* ── Star button (white circle) at top-right corner ── */}
      {showOptions && (
        <button
          onClick={handleStar}
          className="absolute z-20 flex items-center justify-center rounded-full bg-white nopan nodrag"
          style={{
            width: 34,
            height: 34,
            top: -11,
            right: -12,
            animation: "optionFadeIn 150ms ease-out both",
          }}
        >
          <Star
            size={18}
            strokeWidth={1.5}
            color={starred ? "#8D5CE8" : "#2E2E2E"}
            fill={starred ? "#8D5CE8" : "none"}
          />
        </button>
      )}

      {/* ── Main card ── */}
      <div
        onClick={handleCardClick}
        className={`w-[578px] rounded-[15px] border-2 p-6 transition-colors duration-200 ${
          onSubmitPrompt ? "cursor-pointer" : ""
        } ${
          starred
            ? "bg-[#2C085B] border-[#4C1C9A]"
            : "bg-[#171717] border-border"
        }`}
      >
        <Handle type="target" position={Position.Top} className="!bg-border" />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-border"
        />

        {/* Star indicator inside card when starred (options hidden) */}
        {starred && !showOptions && (
          <button
            onClick={handleStar}
            className="absolute top-[7px] right-[5px] z-10 nopan nodrag"
          >
            <Star size={18} strokeWidth={1.5} color="#8D5CE8" fill="none" />
          </button>
        )}

        <div className="space-y-3">
          {title && (
            <h3 className="text-lg font-normal text-white">{title}</h3>
          )}
          <p className="text-[18px] text-muted-foreground leading-relaxed whitespace-pre-line">
            {(() => {
              // Keep reasoning; do not display Signal — start from Problem
              let text = description.replace(/\n{2,}/g, "\n");
              const problemMatch = text.match(/\nProblem:\s*/i);
              if (problemMatch) {
                text = text.slice(problemMatch.index! + 1).trimStart();
              } else if (/^Problem:\s*/i.test(text)) {
                text = text.trimStart();
              }
              return text;
            })()}
          </p>
        </div>
      </div>

      {/* ── Loading spinner below card ── */}
      {isLoading && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-3" style={{ top: "100%" }}>
          <LoadingSpinner />
        </div>
      )}

      {/* ── Option buttons (right-aligned, cascading below card) ── */}
      {showOptions && onSubmitPrompt && (
        <div className="absolute top-full right-0 mt-[7px] flex flex-col items-end gap-[7px] nopan nodrag nowheel z-10">
          {/* Chat */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleChat();
            }}
            className="flex items-center gap-[10px] h-[43px] rounded-[15px] bg-[#2E2E2E] border-2 border-[#2E2E2E] px-4 text-white text-base font-normal hover:bg-[#3A3A3A] transition-colors"
            style={{ animation: "optionFadeIn 150ms ease-out both" }}
          >
            <MessageSquare size={18} strokeWidth={2} />
            <span>Chat</span>
          </button>

          {/* Explore Further */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExploreFurther();
            }}
            className="flex items-center h-[43px] rounded-[15px] bg-[#2E2E2E] border-2 border-[#2E2E2E] px-4 text-white text-base font-normal hover:bg-[#3A3A3A] transition-colors"
            style={{
              animation: "optionFadeIn 150ms ease-out both",
              animationDelay: "50ms",
            }}
          >
            Explore Further
          </button>

          {/* Create Variations */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCreateVariations();
            }}
            className="flex items-center h-[43px] rounded-[15px] bg-[#2E2E2E] border-2 border-[#2E2E2E] px-4 text-white text-base font-normal hover:bg-[#3A3A3A] transition-colors"
            style={{
              animation: "optionFadeIn 150ms ease-out both",
              animationDelay: "100ms",
            }}
          >
            Create Variations
          </button>
        </div>
      )}

      {/* ── Chat input (shown when Chat option is selected) ── */}
      {showInput && (
        <div
          className="absolute top-full left-0 mt-5 flex items-center gap-[15px] nopan nodrag nowheel z-10"
          style={{ animation: "optionFadeIn 150ms ease-out both" }}
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") {
                setShowInput(false);
              }
            }}
            placeholder="Enter Prompt"
            autoFocus
            className="h-[46px] min-w-[578px] max-w-[720px] rounded-[15px] border-2 border-[#2E2E2E] bg-[#171717] px-5 text-base text-white placeholder:text-[#2E2E2E] outline-none focus:border-muted-foreground transition-colors"
            style={{
              width: Math.max(578, Math.min(720, prompt.length * 9.5 + 40)),
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            className="flex h-[46px] w-[47px] flex-shrink-0 items-center justify-center rounded-[15px] bg-[#E0E0E0] transition-opacity hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowRight className="size-4" strokeWidth={1.5} color="#2E2E2E" />
          </button>
        </div>
      )}
    </div>
  );
}
