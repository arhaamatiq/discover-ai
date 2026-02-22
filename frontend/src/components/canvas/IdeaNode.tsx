import { Handle, Position, type NodeProps } from "@xyflow/react";

export type IdeaNodeData = {
  label: string;
  content: string;
  tech_stack?: string[];
};

export function IdeaNode({ data }: NodeProps) {
  const { label, content, tech_stack } = data as IdeaNodeData;

  return (
    <div className="w-[280px] rounded-[15px] border-2 border-[#3A3A3A] bg-[#141414] p-4">
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2.5 w-2.5 rounded-full bg-blue-500/80" />
        <h3 className="text-sm font-medium text-white truncate">{label}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap mb-2">
        {content}
      </p>
      {tech_stack && tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tech_stack.map((tech) => (
            <span
              key={tech}
              className="rounded-md bg-[#2E2E2E] px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
