import { Handle, Position, type NodeProps } from "@xyflow/react";

export type ScopeNodeData = {
  label: string;
  content: string; // JSON string of scope data
};

export function ScopeNode({ data }: NodeProps) {
  const { label } = data as ScopeNodeData;
  let scope: {
    complexity?: string;
    timeline?: string;
    team_size?: number;
    key_milestones?: string[];
  } = {};

  try {
    scope = JSON.parse((data as ScopeNodeData).content);
  } catch {
    scope = {};
  }

  return (
    <div className="w-[260px] rounded-[15px] border-2 border-[#3A3A3A] bg-[#141414] p-4">
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        <h3 className="text-xs font-medium text-white truncate">{label}</h3>
      </div>
      <div className="space-y-2 text-xs text-muted-foreground">
        {scope.complexity && (
          <div className="flex justify-between">
            <span>Complexity</span>
            <span className="text-white">{scope.complexity}</span>
          </div>
        )}
        {scope.timeline && (
          <div className="flex justify-between">
            <span>Timeline</span>
            <span className="text-white">{scope.timeline}</span>
          </div>
        )}
        {scope.team_size && (
          <div className="flex justify-between">
            <span>Team Size</span>
            <span className="text-white">{scope.team_size} engineers</span>
          </div>
        )}
        {scope.key_milestones && scope.key_milestones.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#2E2E2E]">
            <p className="text-[10px] uppercase tracking-wider mb-1.5">Milestones</p>
            <ul className="space-y-1">
              {scope.key_milestones.map((m, i) => (
                <li key={i} className="text-[11px] text-muted-foreground">
                  {i + 1}. {m}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
