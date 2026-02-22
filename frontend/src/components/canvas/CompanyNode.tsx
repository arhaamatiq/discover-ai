import { Handle, Position, type NodeProps } from "@xyflow/react";

export type CompanyNodeData = {
  label: string;
  content: string;
};

export function CompanyNode({ data }: NodeProps) {
  const { label, content } = data as CompanyNodeData;

  return (
    <div className="w-[320px] rounded-[15px] border-2 border-border bg-background p-5">
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
        <h3 className="text-sm font-medium text-white truncate">{label}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
}
