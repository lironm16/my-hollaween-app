"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Diamond manager lives on בדיקות — keep old URL working. */
export default function AdminGemsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/rehearsal");
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center text-base text-orange-200">
      עוברים לבדיקות…
    </div>
  );
}
