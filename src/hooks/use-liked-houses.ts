"use client";

import { useEffect, useState } from "react";
import { loadLikedIds, toggleLiked } from "@/lib/offline-db";

export function useLikedHouses() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const read = () => setIds(loadLikedIds());
    read();
    window.addEventListener("storage", read);
    window.addEventListener("hw-liked-changed", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("hw-liked-changed", read);
    };
  }, []);

  return {
    likedIds: ids,
    liked: (id: string) => ids.includes(id),
    toggle: (id: string) => setIds(toggleLiked(id)),
  };
}
