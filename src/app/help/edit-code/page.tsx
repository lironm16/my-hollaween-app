"use client";

import { HelpShell, HelpShot } from "@/components/help-shell";

export default function EditCodeHelpPage() {
  return (
    <HelpShell title="איבדתי את קוד העריכה">
      <div className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/25">
        <HelpShot src="/help/step-3-done.png" alt="מסך הצלחה עם קוד עריכה" />
        <p className="text-sm leading-relaxed text-orange-50">
          אחרי הוספת בית, <strong className="text-orange-200">קוד העריכה נשמר במכשיר שלכם</strong> — אפשר
          לערוך ב<strong className="text-orange-200">תפריט → בית → שלי / עריכה</strong> בלי להקליד שוב.
        </p>
        <p className="text-sm leading-relaxed text-orange-50">
          אפשר <strong className="text-orange-200">לשתף את הקוד</strong> עם בן משפחה. אחרי שהם מזינים אותו
          פעם אחת — הוא נשמר גם במכשיר שלהם.
        </p>
        <p className="text-sm leading-relaxed text-orange-100">
          אם איבדתם לגמרי ואין גישה מאף מכשיר — פנו ל<strong className="text-orange-200">מנהל/ת האפליקציה</strong>{" "}
          לקבלת הקוד מחדש.
        </p>
      </div>
    </HelpShell>
  );
}
