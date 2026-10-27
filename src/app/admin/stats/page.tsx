"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/use-locale";

export default function AdminStatsRedirect() {
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    router.replace("/stats");
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center text-base text-orange-200">
      {t("help.statsRedirect")}
    </div>
  );
}
