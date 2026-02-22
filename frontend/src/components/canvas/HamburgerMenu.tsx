"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getNodesBounds, getViewportForBounds, useReactFlow } from "@xyflow/react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { RotateCcw, Download, User, X, LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const router = useRouter();
  const { getNodes } = useReactFlow();
  const { user, signOut } = useAuth();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  const handleStartOver = () => {
    setIsOpen(false);
    setShowConfirm(true);
  };

  const handleConfirmYes = async () => {
    if (user) {
      await supabase.from("workspaces").delete().eq("user_id", user.id);
    }
    sessionStorage.removeItem("discover_research");
    sessionStorage.removeItem("discover_canvas");
    router.push("/intake");
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    router.push("/");
  };

  const handleExport = useCallback(async () => {
    const nodes = getNodes();
    if (!nodes.length) return;

    setIsExporting(true);
    setIsOpen(false);

    try {
      const nodesBounds = getNodesBounds(nodes);
      const padding = 60;
      const width = 1400;
      const height = 900;

      const viewport = getViewportForBounds(
        nodesBounds,
        width - padding * 2,
        height - padding * 2,
        0.05,
        2,
        0
      );

      const flowEl = document.querySelector(
        ".react-flow__viewport"
      ) as HTMLElement;
      if (!flowEl) return;

      const dataUrl = await toPng(flowEl, {
        backgroundColor: "#0E0E0E",
        width,
        height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${viewport.x + padding}px, ${viewport.y + padding}px) scale(${viewport.zoom})`,
          transformOrigin: "top left",
        },
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [width, height],
        hotfixes: ["px_scaling"],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
      pdf.save("discover-ai-canvas.pdf");
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [getNodes]);

  return (
    <>
      {/* Hamburger button — hidden when panel or confirm dialog is open */}
      {!isOpen && !showConfirm && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="absolute top-5 right-5 z-50 flex flex-col items-end gap-[5px] p-2 cursor-pointer"
        >
          <span className="block w-[22px] h-[2px] bg-white rounded-full" />
          <span className="block w-[22px] h-[2px] bg-white rounded-full" />
          <span className="block w-[22px] h-[2px] bg-white rounded-full" />
        </button>
      )}

      {/* Menu panel */}
      {isOpen && (
        <div
          className="absolute top-5 right-5 z-50 bg-[#171717] rounded-[19px] overflow-hidden"
          style={{ width: "326.82px", height: "310.61px" }}
        >
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="absolute top-[11px] right-[11px] w-[18px] h-[18px] rounded-full bg-[#3C3C3C] flex items-center justify-center hover:bg-[#555] transition-colors"
          >
            <X size={12} color="#909090" strokeWidth={2.8} />
          </button>

          {/* Logo / branding row */}
          <div className="flex items-center absolute" style={{ top: "24px", left: "24px", right: "32px" }}>
            {/* Logo mark — styled placeholder */}
            <div className="w-[60px] h-[60px] rounded-[12px] bg-[#232323] flex items-center justify-center flex-shrink-0 overflow-hidden">
              <span className="text-white text-[22px] font-light select-none leading-none">D</span>
            </div>
            <div className="ml-[22px]">
              <p className="text-white leading-[1.21]" style={{ fontSize: "20px" }}>
                Discover AI
              </p>
              <p className="text-[#B8B8B8] leading-[1.21]" style={{ fontSize: "16px" }}>
                Applied Engineering
              </p>
            </div>
          </div>

          {/* Start Over button */}
          <button
            onClick={handleStartOver}
            className="absolute flex items-center w-[267.75px] h-[33.69px] rounded-[9px] bg-[#232323] hover:bg-[#2a2a2a] transition-colors text-[#DADADA] cursor-pointer"
            style={{ top: "124.19px", left: "27.7px", fontSize: "16px" }}
          >
            <RotateCcw
              size={15}
              strokeWidth={1.8}
              className="flex-shrink-0"
              style={{ marginLeft: "12.38px", color: "#DADADA" }}
            />
            <span style={{ marginLeft: "12px" }}>Start Over</span>
          </button>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="absolute flex items-center w-[266.61px] h-[33.69px] rounded-[9px] bg-[#232323] hover:bg-[#2a2a2a] transition-colors text-[#DADADA] cursor-pointer disabled:opacity-50"
            style={{ top: "168.31px", left: "28.84px", fontSize: "16px" }}
          >
            <Download
              size={15}
              strokeWidth={1.8}
              className="flex-shrink-0"
              style={{ marginLeft: "10.5px", color: "#DADADA" }}
            />
            <span style={{ marginLeft: "11px" }}>
              {isExporting ? "Exporting…" : "Export"}
            </span>
          </button>

          {/* User section */}
          <div
            className="absolute flex items-center w-[271.42px] h-[49.5px] rounded-[9px] bg-[#232323]"
            style={{ top: "225.57px", left: "26.44px" }}
          >
            <div
              className="w-[29.61px] h-[29.61px] rounded-full bg-[#3C3C3C] flex items-center justify-center flex-shrink-0"
              style={{ marginLeft: "12.48px" }}
            >
              <User size={14} color="#909090" strokeWidth={1.5} />
            </div>
            <span
              className="text-white truncate"
              style={{ fontSize: "16px", marginLeft: "14px", maxWidth: "150px" }}
            >
              {displayName}
            </span>
            {user && (
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                className="ml-auto mr-3 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
              >
                <LogOut size={14} color="#909090" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation dialog — dark full-canvas overlay */}
      {showConfirm && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div
            className="relative bg-[#171717] rounded-[19px]"
            style={{ width: "326.82px", height: "250.92px" }}
          >
            {/* "Are you sure?" */}
            <p
              className="absolute text-white"
              style={{ top: "30.33px", left: "98.91px", fontSize: "20px", lineHeight: "1.21" }}
            >
              Are you sure?
            </p>

            {/* Subtitle */}
            <p
              className="absolute text-[#B8B8B8]"
              style={{ top: "63.33px", left: "60.91px", fontSize: "16px", lineHeight: "1.21" }}
            >
              This will delete all progress
            </p>

            {/* Yes button */}
            <button
              onClick={handleConfirmYes}
              className="absolute flex items-center justify-center text-[#DADADA] rounded-[9px] hover:brightness-125 transition-all cursor-pointer"
              style={{
                top: "124.19px",
                left: "28.84px",
                width: "266.61px",
                height: "33.69px",
                backgroundColor: "#3A0404",
                border: "1px solid #9F0000",
                fontSize: "16px",
              }}
            >
              Yes
            </button>

            {/* No button */}
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute flex items-center justify-center text-[#DADADA] rounded-[9px] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
              style={{
                top: "172.9px",
                left: "28.84px",
                width: "266.61px",
                height: "33.69px",
                backgroundColor: "#1F1F1F",
                border: "1px solid #4F4F4F",
                fontSize: "16px",
              }}
            >
              No
            </button>
          </div>
        </div>
      )}
    </>
  );
}
