import { CountdownDesignV2 } from "@/components/countdown-design-v2";
import { PreviewNav } from "@/components/preview-nav";
import { config } from "@/lib/config";

export default function CountdownPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6 pb-16">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.brandEn} · עיצוב ספירה לאחור v2</p>
          <h1 className="font-display text-2xl text-orange-100">מסך מלא + שורת ספירה</h1>
          <p className="text-base leading-relaxed text-violet-200">
            פתיחה ראשונה במסך מלא, שורת ספירה קבועה עם שניות, סרגל צף על המפה — לחיצה על השורה
            פותחת שוב.
          </p>
          <PreviewNav current="/preview/countdown" />
        </header>

        <CountdownDesignV2 />
      </div>
    </div>
  );
}
