import { Handle, Position, type NodeProps } from "@xyflow/react";

export type PromptBubbleNodeData = {
  prompt: string;
  parentId: string;
};

export function PromptBubbleNode({ data }: NodeProps) {
  const { prompt } = data as PromptBubbleNodeData;

  return (
    <div className="w-[582px] rounded-[15px] border-2 border-[#2E2E2E] bg-[#0F0F0F] px-6 py-[18px]">
      <Handle type="target" position={Position.Top} className="!bg-border" />
      <Handle type="source" position={Position.Bottom} className="!bg-border" />

      <div className="flex items-start gap-[30px]">
        {/* Arrow icon */}
        <svg
          width="14"
          height="11"
          viewBox="0 0 14 11"
          fill="none"
          className="mt-[5px] flex-shrink-0"
        >
          <path
            d="M0.5 1L7 5.5L0.5 10"
            stroke="#999999"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <p className="text-base text-[#999999] font-normal leading-relaxed">
          {prompt}
        </p>
      </div>
    </div>
  );
}
