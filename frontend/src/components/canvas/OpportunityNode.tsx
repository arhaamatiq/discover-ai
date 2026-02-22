import { Handle, Position, type NodeProps } from "@xyflow/react";

export type OpportunityNodeData = {
  label: string;
  content: string;
};

export function OpportunityNode({ data }: NodeProps) {
  const { label, content } = data as OpportunityNodeData;

  return (
    <div className="w-[280px] rounded-[15px] border-2 border-[#3A3A3A] bg-[#141414] p-4">
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
        <h3 className="text-sm font-medium text-white truncate">{label}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
}
