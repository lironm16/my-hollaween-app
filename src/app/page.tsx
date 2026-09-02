import { Suspense } from "react";
import { NeighborhoodApp } from "@/components/neighborhood-app";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-orange-200">
          מדליקים דלעות…
        </div>
      }
    >
      <NeighborhoodApp />
    </Suspense>
  );
}
