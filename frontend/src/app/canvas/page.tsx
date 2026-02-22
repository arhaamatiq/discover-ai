"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useDiscovery } from "@/lib/useDiscovery";
import { useAuth } from "@/lib/AuthContext";
import { CompanyHeaderNode } from "@/components/canvas/CompanyHeaderNode";
import { IdeaCardNode } from "@/components/canvas/IdeaCardNode";
import { PromptBubbleNode } from "@/components/canvas/PromptBubbleNode";
import { HamburgerMenu } from "@/components/canvas/HamburgerMenu";
import { ShareModal } from "@/components/canvas/ShareModal";
import { SignUpModal } from "@/components/auth/SignUpModal";
import { LoginModal } from "@/components/auth/LoginModal";

export default function CanvasPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [showShare, setShowShare] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "login" | null>(null);

  const onAuthRequired = useCallback(() => {
    if (!user) setAuthMode("signup");
  }, [user]);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    status,
    isRunning,
    startDiscovery,
    restoreFromSession,
    saveToSupabase,
  } = useDiscovery({
    onAuthRequired: user ? undefined : onAuthRequired,
    userId: user?.id ?? null,
  });

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      "company-header": CompanyHeaderNode,
      "idea-card": IdeaCardNode,
      "prompt-bubble": PromptBubbleNode,
    }),
    []
  );

  const startedRef = useRef(false);

  useEffect(() => {
    // Redirect to intake if no research data
    const stored = sessionStorage.getItem("discover_research");
    if (!stored) {
      router.replace("/intake");
      return;
    }
    // Guard against React StrictMode double-mount
    if (startedRef.current) return;
    startedRef.current = true;
    if (!restoreFromSession()) {
      startDiscovery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAuthSuccess() {
    setAuthMode(null);
    if (user) saveToSupabase(user.id);
  }

  return (
    <div className="h-screen w-screen relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#6D6D6D"
        />
        <Controls
          className="!bg-[#1A1A1A] !border-border !rounded-xl [&>button]:!bg-[#1A1A1A] [&>button]:!border-border [&>button]:!text-white [&>button:hover]:!bg-[#2E2E2E]"
        />
        <HamburgerMenu />
      </ReactFlow>

      {/* Share with us — persistent bottom-right button */}
      <button
        onClick={() => setShowShare(true)}
        className="absolute bottom-5 right-5 z-40 flex items-center rounded-[17px] bg-[#D9D9D9] text-black hover:bg-[#c8c8c8] transition-colors cursor-pointer"
        style={{ width: "140.15px", height: "33.69px", paddingLeft: "19.57px", fontSize: "16px" }}
        aria-label="Share with us"
      >
        Share with us
      </button>

      {/* Share with us popup */}
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}

      {/* Auth modals */}
      {authMode === "signup" && (
        <SignUpModal
          onClose={() => setAuthMode(null)}
          onSwitchToLogin={() => setAuthMode("login")}
          onSuccess={handleAuthSuccess}
        />
      )}
      {authMode === "login" && (
        <LoginModal
          onClose={() => setAuthMode(null)}
          onSwitchToSignUp={() => setAuthMode("signup")}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Status bar */}
      {status && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-[#1A1A1A] border border-border px-4 py-2">
          {isRunning && (
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
          <span className="text-xs text-muted-foreground">{status}</span>
        </div>
      )}
    </div>
  );
}
