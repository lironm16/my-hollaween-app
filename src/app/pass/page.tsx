"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Deep link `/pass?c=…` → map with register dialog open. */
function PassRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("c")?.trim();
    const qs = new URLSearchParams({ openPass: "1" });
    if (code) qs.set("c", code);
    router.replace(`/?${qs.toString()}`);
  }, [router, searchParams]);

  return null;
}

export default function PassPage() {
  return (
    <Suspense fallback={null}>
      <PassRedirect />
    </Suspense>
  );
}
