"use client";

import Link from "next/link";
import { HelpSection, HelpShell, HelpStep } from "@/components/help-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AddHouseGuidePage() {
  return (
    <HelpShell title="איך מוסיפים בית עם תמונה?">
      <div className="space-y-4">
        <HelpSection title="לפני שמתחילים">
          <p>
            כל בית נשמר <strong className="text-orange-200">בשרת</strong> ומופיע במפה לכל השכונה. צריך
            חיבור אינטרנט בשלב השמירה.
          </p>
          <p>
            הכתובת חייבת להיות <strong className="text-orange-200">בתוך השכונה</strong> — בחרו מהרשימה
            או גררו את הסיכה עד לבית.
          </p>
        </HelpSection>

        <HelpSection title="שלבים — הוספת בית">
          <ol className="list-none space-y-4 ps-0">
            <HelpStep n={1}>
              <p>
                <strong className="text-orange-200">תפריט</strong> (☰) → <strong>בית</strong> →{" "}
                <strong>הוספה</strong>.
              </p>
              <p className="text-violet-300">או ישר: קישור «הוספת בית» מדף השאלות.</p>
            </HelpStep>
            <HelpStep n={2}>
              <p>
                <strong className="text-orange-200">שם הבית</strong> — למשל «בית משפחת לוי», או בחרו
                הצעה מהרשימה.
              </p>
            </HelpStep>
            <HelpStep n={3}>
              <p>
                <strong className="text-orange-200">כתובת</strong> — הקלידו רחוב ומספר ובחרו מהרשימה.
                אחרי הבחירה הסיכה זזה למקום; אפשר לגרור לדיוק.
              </p>
              <p className="text-amber-200/90">
                בלי כתובת מהרשימה השמירה תיכשל — «בחרו כתובת אמיתית מהרשימה».
              </p>
            </HelpStep>
            <HelpStep n={4}>
              <p>
                מלאו <strong className="text-orange-200">שעות ב־31 באוקטובר</strong>, רמת פחד,
                ממתקים או קישוטים (לפחות אחד מהם — לא «לא מקושט» ו«בלי ממתקים» יחד).
              </p>
            </HelpStep>
            <HelpStep n={5}>
              <p id="photo">
                <strong className="text-orange-200">תמונת קישוט</strong> (אופציונלי — גם אחרי
                ההוספה):
              </p>
              <ul className="mt-2 list-disc space-y-1.5 ps-5 text-violet-200">
                <li>לחצו <strong>העלאת תמונה</strong> ובחרו תמונה מהגלריה.</li>
                <li>
                  <strong>גררו את התמונה</strong> כדי לבחור מה יופיע במרכז הכרטיס — התמונה נחתכת
                  לריבוע.
                </li>
                <li>האפליקציה דוחסת אוטומטית — אין צורך לערוך מראש.</li>
                <li>צלמו ביום, בתאורה טובה, את הקישוט בכניסה לבית.</li>
                <li>אפשר להוסיף או להחליף תמונה גם ב<strong>עריכה מלאה</strong> אחרי השמירה.</li>
              </ul>
            </HelpStep>
            <HelpStep n={6}>
              <p>
                לחצו <strong className="text-orange-200">שמירה</strong>. אחרי הצלחה מופיעים:
              </p>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-violet-200">
                <li>«הבית במפה!»</li>
                <li>
                  <strong id="edit-code">קוד עריכה</strong> בן 6 ספרות — העתיקו ושמרו (וואטסאפ,
                  הערות). בלי הקוד לא ניתן לערוך מהטלפון של מישהו אחר.
                </li>
              </ul>
            </HelpStep>
          </ol>
        </HelpSection>

        <HelpSection title="טיפים לתמונה">
          <ul className="list-disc space-y-1.5 ps-5">
            <li>עדיף תמונה אופקית — הכרטיס חותך לריבוע.</li>
            <li>אם ההעלאה נכשלה — הבית כבר נשמר; הוסיפו תמונה בעריכה כשהרשת יציבה.</li>
            <li>במפה, תמונות נטענות בלחיצה — חוסך נתונים.</li>
          </ul>
        </HelpSection>

        <HelpSection title="עריכה אחרי ההוספה" id="edit">
          <ul className="list-disc space-y-1.5 ps-5">
            <li>
              <strong className="text-orange-200">תפריט → בית → עריכה</strong> — אם הוספתם מהמכשיר
              הזה, נפתח בלי קוד.
            </li>
            <li>ממכשיר אחר — הזינו את קוד העריכה.</li>
            <li>בליל האירוע — «עדכון מהיר» לסגירה, הפסקה או «נגמרו הממתקים».</li>
            <li>«הבתים שלי» בתפריט — רשימת הבתים שנוספו מהטלפון הזה.</li>
          </ul>
        </HelpSection>

        <HelpSection title="איבדתי את קוד העריכה" id="edit-code">
          <p>
            אין אפשרות לשחזר קוד דרך האפליקציה. שמרו אותו בזמן ההוספה, או שתפו עם בן משפחה. מנהל
            האפליקציה יכול לעזור במקרה חריג.
          </p>
        </HelpSection>

        <HelpSection title="הוספה למסך הבית" id="install">
          <p>
            <strong className="text-orange-200">אייפון (Safari):</strong> שיתוף → «הוספה למסך הבית».
          </p>
          <p>
            <strong className="text-orange-200">אנדרואיד (Chrome):</strong> תפריט → «הוסף למסך
            הבית».
          </p>
          <p className="text-violet-300">פתחו פעם אחת ברשת כדי שהמפה תישמר לעבודה גם בלי קליטה.</p>
        </HelpSection>

        <Link
          href="/add"
          className={cn(buttonVariants(), "block w-full bg-orange-500 text-center text-black hover:bg-orange-400")}
        >
          פתיחת טופס הוספת בית
        </Link>
      </div>
    </HelpShell>
  );
}
