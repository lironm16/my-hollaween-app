"use client";

import Link from "next/link";
import { HelpExpandable, HelpShell } from "@/components/help-shell";
import { HelpText } from "@/lib/render-help-text";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useAppNow } from "@/hooks/use-app-clock";
import { useGemHuntAdminUi } from "@/hooks/use-gem-admin-ui";
import { buttonVariants } from "@/components/ui/button";
import { GEM_ALBUM_TITLE_HE } from "@/lib/gem-album-copy";
import {
  GEM_FOUND_CHEER_HE,
  GEM_FOUND_I_HE,
  GEM_GAME_TITLE_HE,
  GEM_NOT_FOUND_I_HE,
} from "@/lib/gem-hunt-copy";
import { cn } from "@/lib/utils";

export default function GemHuntHelpPage() {
  const { admin, ready } = useAdminSession();
  const now = useAppNow();
  const { gemUiVisible: showGemHuntHelp } = useGemHuntAdminUi(admin);

  if (!ready) {
    return (
      <HelpShell title={GEM_GAME_TITLE_HE}>
        <p className="text-base text-violet-300">טוענים…</p>
      </HelpShell>
    );
  }

  if (!showGemHuntHelp) {
    return (
      <HelpShell title={GEM_GAME_TITLE_HE}>
        <div className="space-y-4 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-orange-500/25">
          <p className="text-lg leading-relaxed text-orange-50">הציד עדיין לא פתוח לכולם.</p>
          <Link href="/help" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "inline-flex")}>
            חזרה לשאלות ותשובות
          </Link>
        </div>
      </HelpShell>
    );
  }

  return (
    <HelpShell title={GEM_GAME_TITLE_HE}>
      <p className="mb-5 text-lg leading-relaxed text-violet-100">
        ליד בתים נבחרים מסתתר שדון — חיה קטנה שאפשר למצוא במצלמה ולהוסיף ל
        <strong className="font-semibold text-orange-100">{GEM_ALBUM_TITLE_HE}</strong>. המדריך הזה מיועד
        לבדיקות לפני פתיחה לציבור.
      </p>

      <div className="space-y-3">
        <HelpExpandable title="איפה רואים שדונים?" defaultOpen>
          <ul className="list-disc space-y-2 pr-5 text-lg leading-relaxed text-orange-50">
            <li>
              <HelpText>
                {
                  "במפה — סימני שדון על בתים (אחרי שמפעילים את כפתור השדונים בסרגל). בליל פורים, כשהציד פעיל, יופיע גם כפתור <<חיפוש שדון נסתר>> כשמתקרבים לבית."
                }
              </HelpText>
            </li>
            <li>
              <HelpText>
                {
                  "בפרטי בית — בלוק <<שדון נסתר>> עם מרחק וכפתור <<פתחו מצלמה>> בטווח (iPhone ~5 מ׳, Android ~15 מ׳ מהנקודה על המדרכה)."
                }
              </HelpText>
            </li>
            <li>
              <HelpText>
                {
                  `בסינון — אפשר לסנן <<${GEM_NOT_FOUND_I_HE}>> / <<${GEM_FOUND_I_HE}>>. ב<<הסימונים שלי>> יש לשונית <<${GEM_FOUND_I_HE}>>.`
                }
              </HelpText>
            </li>
          </ul>
        </HelpExpandable>

        <HelpExpandable title="איך מתחילים ציד?">
          <ol className="list-decimal space-y-2 pr-5 text-lg leading-relaxed text-orange-50">
            <li>
              <HelpText>{"התקרבו לבית — עדכנו מיקום (GPS) אם צריך."}</HelpText>
            </li>
            <li>
              <HelpText>
                {
                  "פתחו <<פתחו מצלמה>> מפרטי הבית או מכפתור הציד במפה. ב-iPhone — Safari; ב-Android — Chrome עם WebXR כשזמין."
                }
              </HelpText>
            </li>
            <li>
              <HelpText>
                {
                  "אשרו מיקום וכיוון (מצפן) כשהדפדפן מבקש — החץ ב<<רמז>> זקוק לכיוון."
                }
              </HelpText>
            </li>
            <li>
              <HelpText>
                {
                  "סובבו את המצלמה — השדון ננעל בעולם ליד המדרכה (בטווח קרוב, עד ~15 מ׳, כדי שלא יתערבב עם שכן)."
                }
              </HelpText>
            </li>
          </ol>
        </HelpExpandable>

        <HelpExpandable title="רמז ו«גלה לי»">
          <div className="space-y-3 text-lg leading-relaxed text-orange-50">
            <p>
              <HelpText>
                {
                  "<<רמז · כוון אותי>> — חץ מצפן (קו ישר לשדון), מרחק, שמאלה/ימינה, וקישור <<הליכה ב-Google Maps>> למסלול ברחוב."
                }
              </HelpText>
            </p>
            <p>
              <HelpText>
                {
                  "<<גלה לי>> — מציג את החיה במרכז המסך בלי לחפש עם המצלמה (שימושי בלי הרשאת מצלמה או כשקשה לכוון). <<הסתר>> מחזיר למצב ציד רגיל. צריך להיות בטווח הציד (כפתור מודגש בירוק); מחוץ לטווח — הודעת שגיאה בשורת הרמז."
                }
              </HelpText>
            </p>
            <p>
              <HelpText>
                {
                  "אחרי <<גלה לי>>, לחיצה על <<רמז>> מבטלת את מרכוז המסך — כדי לחזור לניווט."
                }
              </HelpText>
            </p>
          </div>
        </HelpExpandable>

        <HelpExpandable title={`מציאה ו${GEM_ALBUM_TITLE_HE}`}>
          <div className="space-y-3 text-lg leading-relaxed text-orange-50">
            <p>
              <HelpText>
                {
                  `כשהחיה במסגרת — הקישו עליה (או סובבו במצב מפגש ואז הקישו). אחרי <<${GEM_FOUND_CHEER_HE}>> אפשר לפתוח את <<${GEM_ALBUM_TITLE_HE}>> מהתפריט.`
                }
              </HelpText>
            </p>
            <p>
              <HelpText>
                {
                  "כל בית עם שדון מוסיף שדון לאוסף — אפשר לראות מי כבר נמצא ומי עדיין מחכה בשכונה."
                }
              </HelpText>
            </p>
            <Link
              href="/gem-bag"
              className="inline-block text-orange-300 underline underline-offset-2 hover:text-orange-200"
            >
              {`פתיחת ${GEM_ALBUM_TITLE_HE}`}
            </Link>
          </div>
        </HelpExpandable>

        <HelpExpandable title="בעיות נפוצות">
          <ul className="list-disc space-y-2 pr-5 text-lg leading-relaxed text-orange-50">
            <li>
              <HelpText>
                {
                  "**מרחק קופץ** — המתינו ל-GPS להתייצב; עמדו בחוץ עם שמיים פתוחים."
                }
              </HelpText>
            </li>
            <li>
              <HelpText>
                {
                  "**אין מצלמה** — אפשר לצוד עם <<גלה לי>> בלבד."
                }
              </HelpText>
            </li>
            <li>
              <HelpText>
                {
                  "**חץ לא זז (Safari)** — לחצו <<אפשרו כיוון>> בfooter ואשרו ב-iOS."
                }
              </HelpText>
            </li>
            <li>
              <HelpText>
                {
                  "**שדון של שכן** — הנקודה על המדרכה מוגבלת בטווח; אם צריך כיול — כלי מנהל בפרטי הבית."
                }
              </HelpText>
            </li>
          </ul>
        </HelpExpandable>
      </div>
    </HelpShell>
  );
}
