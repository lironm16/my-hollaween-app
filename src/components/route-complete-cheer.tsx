"use client";

export function RouteCompleteCheer({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="route-complete-cheer" role="status" aria-live="polite">
      <div className="route-complete-cheer-card">
        <span className="route-complete-cheer-burst" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i /><i />
        </span>
        <span className="route-complete-cheer-flag" aria-hidden="true" />
        <span className="route-complete-cheer-title">סיימתם את המסלול!</span>
        <span className="route-complete-cheer-sub">כל העצירות בוצעו</span>
      </div>
    </div>
  );
}
