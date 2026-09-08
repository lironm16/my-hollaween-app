"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminStatsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/stats");
  }, [router]);
  return (
    <div className="flex min-h-dvh items-center justify-center text-base text-orange-200">
      עוברים לתמונת מצב…
    </div>
  );
}
