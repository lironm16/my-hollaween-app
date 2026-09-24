"use client";

import { Gem } from "lucide-react";

export function GemCheer({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="gem-cheer" role="status" aria-live="polite">
      <div className="gem-cheer-card">
        <span className="gem-cheer-burst" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
        <span className="gem-cheer-gem" aria-hidden="true">
          <Gem className="size-5 fill-current" strokeWidth={2.1} />
        </span>
        אספתם יהלום!
      </div>
    </div>
  );
}
