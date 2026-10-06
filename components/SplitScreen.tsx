"use client";

import type { Id } from "../convex/_generated/dataModel";
import { AvatarChat } from "./AvatarChat";
import { PreviewPane } from "./PreviewPane";

// "Talk on the left, watch it build on the right."
export function SplitScreen({
  projectId,
  onStartApp,
}: {
  projectId: Id<"projects">;
  onStartApp: (name: string, prompt: string) => void | Promise<void>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="h-[45%] min-h-0 border-b-[3px] border-ink/10 md:h-full md:w-2/5 md:min-w-[340px] md:max-w-md md:border-b-0 md:border-r-[3px]">
        <AvatarChat projectId={projectId} onStartApp={onStartApp} />
      </div>
      <div className="min-h-0 flex-1">
        <PreviewPane projectId={projectId} />
      </div>
    </div>
  );
}
