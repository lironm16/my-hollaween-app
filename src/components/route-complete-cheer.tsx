"use client";

import { useLocale } from "@/hooks/use-locale";

export function RouteCompleteCheer({ show }: { show: boolean }) {
  const { t } = useLocale();
  if (!show) return null;
  return (
    <div className="route-complete-cheer" role="status" aria-live="polite">
      <div className="route-complete-cheer-card">
        <span className="route-complete-cheer-burst" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i /><i />
        </span>
        <span className="route-complete-cheer-flag" aria-hidden="true" />
        <span className="route-complete-cheer-title hw-cheer-display">{t("routeComplete.title")}</span>
        <span className="route-complete-cheer-sub hw-cheer-display">{t("routeComplete.sub")}</span>
      </div>
    </div>
  );
}
