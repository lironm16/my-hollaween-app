"use client";

import { Heart } from "lucide-react";

export function LikeCheer({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="like-cheer" role="status" aria-live="polite">
      <div className="like-cheer-card">
        <span className="like-cheer-burst" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
        <span className="like-cheer-heart" aria-hidden="true">
          <Heart className="size-5 fill-current" strokeWidth={2.2} />
        </span>
        שמרתם!
      </div>
    </div>
  );
}
