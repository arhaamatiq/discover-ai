import { Handle, Position, type NodeProps } from "@xyflow/react";
import Image from "next/image";
import { useState } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

export type CompanyHeaderNodeData = {
  label: string; // Company name
  description: string; // One-liner what they do
  logo_url?: string; // Company logo URL
  isLoading?: boolean;
};

export function CompanyHeaderNode({ data }: NodeProps) {
  const { label, description, logo_url, isLoading } = data as CompanyHeaderNodeData;
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="relative">
      <div className="w-[582px] rounded-[15px] border-2 border-border bg-[#171717] p-6">
        <Handle type="source" position={Position.Bottom} className="!bg-border" />

        {/* Company icon + name and description */}
        <div className="flex gap-8">
          {/* Logo / fallback placeholder */}
          <div className="h-[69px] w-[69px] flex-shrink-0 rounded-[15px] border border-border bg-[#0F0F0F] overflow-hidden flex items-center justify-center">
            {logo_url && !logoError ? (
              <Image
                src={logo_url}
                alt={`${label} logo`}
                width={69}
                height={69}
                className="object-contain p-2"
                onError={() => setLogoError(true)}
                unoptimized
              />
            ) : null}
          </div>

          {/* Text */}
          <div className="flex-1">
            <h2 className="text-xl font-normal text-white">{label}</h2>
            <p className="mt-2.5 text-base text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-3" style={{ top: "100%" }}>
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}
