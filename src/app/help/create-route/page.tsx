"use client";

import { HelpShell, HelpStep } from "@/components/help-shell";

const STEPS = [
  {
    title: "סינון (אופציונלי)",
    body: (
      <>
        לפני המסלול אפשר לסנן בתים: רמת פחד, ממתקים, נגישות, שכונה ועוד — כפתור{" "}
        <strong className="text-orange-200">סינון</strong> בסרגל. רק בתים שעוברים את הסינון
        נכנסים למסלול. בתים שכבר סימנתם כ<strong className="text-orange-200">ביקור</strong> לא
        נכללים.
      </>
    ),
    image: "/help/route-1-filters.svg",
    imageAlt: "חלון סינון בתים",
  },
  {
    title: "נקודת התחלה",
    body: (
      <>
        לחצו על כפתור <strong className="text-orange-200">📍</strong> בסרגל ובחרו מאיפה יוצאים:
        מיקום נוכחי (GPS), מרכז השכונה, או נקודה על המפה. המסלול מחושב מהנקודה הזו.
      </>
    ),
    image: "/help/route-2-origin.svg",
    imageAlt: "בחירת נקודת התחלה",
  },
  {
    title: "הפעלת מסלול",
    body: (
      <>
        לחצו על כפתור <strong className="text-orange-200">מסלול</strong> (אייקון שביל) בסרגל
        הכלים. הכפתור נדלק בכתום — המסלול פעיל. אם בחרתם GPS ועדיין אין מיקום, תתבקשו לאשר
        גישה למיקום.
      </>
    ),
    image: "/help/route-3-enable.svg",
    imageAlt: "הפעלת מסלול מהסרגל",
  },
  {
    title: "צפייה במסלול",
    body: (
      <>
        ב<strong className="text-orange-200">מפה</strong>: קו כתום מחבר את העצירות לפי הסדר. ב
        <strong className="text-orange-200">רשימה</strong>: סיכום (בתים, עצירות, מרחק, זמן
        משוער) ואז רשימת עצירות ממוספרות עם מרחק הליכה בין כל תחנה.
      </>
    ),
    image: "/help/route-4-summary.svg",
    imageAlt: "סיכום מסלול ורשימת עצירות",
  },
] as const;

export default function CreateRouteHelpPage() {
  return (
    <HelpShell title="איך יוצרים מסלול?">
      <p className="mb-4 text-lg leading-relaxed text-violet-100">
        המסלול בונה אוטומטית סדר ביקור בבתים לפי הסינון, נקודת ההתחלה, ומרחק הליכה. אין צורך
        לבחור ידנית כל בית.
      </p>
      <ol className="space-y-4">
        {STEPS.map((step, index) => (
          <HelpStep
            key={step.title}
            n={index + 1}
            title={step.title}
            body={step.body}
            image={step.image}
            imageAlt={step.imageAlt}
          />
        ))}
      </ol>
      <p className="mt-5 text-center text-lg text-violet-200">
        <a href="/help/during-route" className="text-orange-300 underline underline-offset-2 hover:text-orange-200">
          המשך: מה עושים במהלך המסלול?
        </a>
      </p>
    </HelpShell>
  );
}
