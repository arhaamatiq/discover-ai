"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";

type Props = {
  onClose: () => void;
};

export function ShareModal({ onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");

  const inputClass =
    "w-full h-[33.69px] rounded-[9px] bg-[#232323] px-3 text-white outline-none focus:ring-1 focus:ring-[#444] transition-all placeholder-transparent text-[16px]";
  const textareaClass =
    "w-full rounded-[9px] bg-[#232323] px-3 py-2 text-white outline-none focus:ring-1 focus:ring-[#444] transition-all resize-none text-[16px] placeholder-transparent";

  return (
    /* Darkened full-canvas overlay */
    <div
      className="absolute inset-0 z-[200] flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal card — 583.48 × 579.15, matches Figma */}
      <div
        className="relative bg-[#171717] rounded-[15px] flex-shrink-0"
        style={{ width: "583.48px", height: "579.15px" }}
      >
        {/* Close button — top-right circle */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute flex items-center justify-center rounded-full bg-[#3C3C3C] hover:bg-[#555] transition-colors"
          style={{ top: "15.97px", right: "15px", width: "22px", height: "22px" }}
        >
          <X size={12} color="#909090" strokeWidth={4.0} />
        </button>

        {/* Title */}
        <p
          className="absolute text-white"
          style={{ top: "39.12px", left: "37.59px", fontSize: "24px", lineHeight: "1.21" }}
        >
          Let&apos;s Get In Touch!
        </p>

        {/* Subtitle */}
        <p
          className="absolute text-[#B9B9B9]"
          style={{ top: "79.12px", left: "37.59px", fontSize: "16px", lineHeight: "1.21" }}
        >
          Your DiscoverAI workspace will be shared automatically
        </p>

        {/* Name label */}
        <label
          className="absolute text-[#646464]"
          style={{ top: "129.37px", left: "40.37px", fontSize: "16px" }}
        >
          Name
        </label>
        {/* Name input */}
        <div
          className="absolute"
          style={{ top: "154px", left: "37.59px", width: "247.95px" }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            aria-label="Name"
          />
        </div>

        {/* Email label */}
        <label
          className="absolute text-[#646464]"
          style={{ top: "193px", left: "40.37px", fontSize: "16px" }}
        >
          Email
        </label>
        {/* Email input */}
        <div
          className="absolute"
          style={{ top: "217.78px", left: "38.41px", width: "247.13px" }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            aria-label="Email"
          />
        </div>

        {/* Company label */}
        <label
          className="absolute text-[#646464]"
          style={{ top: "259px", left: "40.37px", fontSize: "16px" }}
        >
          Company
        </label>
        {/* Company input */}
        <div
          className="absolute"
          style={{ top: "284.29px", left: "38.41px", width: "247.13px" }}
        >
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={inputClass}
            aria-label="Company"
          />
        </div>

        {/* Message label */}
        <label
          className="absolute text-[#646464]"
          style={{ top: "340px", left: "40.37px", fontSize: "16px" }}
        >
          Message
        </label>
        {/* Message textarea */}
        <div
          className="absolute"
          style={{ top: "366.77px", left: "40.37px", width: "495.84px", height: "112.15px" }}
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={textareaClass}
            style={{ height: "112.15px" }}
            aria-label="Message"
          />
        </div>

        {/* Send button */}
        <button
          aria-label="Send"
          className="absolute flex items-center rounded-[9px] bg-[#E0E0E0] hover:bg-[#cecece] transition-colors cursor-pointer text-[#2E2E2E]"
          style={{ top: "500.33px", left: "415px", width: "115px", height: "36.75px", fontSize: "16px" }}
        >
          <span style={{ marginLeft: "26.35px" }}>Send</span>
          <Send
            size={14}
            strokeWidth={1.5}
            style={{ marginLeft: "auto", marginRight: "12px", color: "#2E2E2E" }}
          />
        </button>
      </div>
    </div>
  );
}
