"use client";

import { HelpShell, HelpShot } from "@/components/help-shell";

export default function EditCodeHelpPage() {
  return (
    <HelpShell title="איבדתי את קוד העריכה">
      <div className="space-y-4 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-orange-500/25">
        <p className="text-lg leading-relaxed text-orange-50">
          <strong className="text-orange-200">קודם</strong> — בדקו אם הבית עדיין שמור במכשיר הזה: תפריט → בית →{" "}
          <strong className="text-orange-200">הבתים שלי</strong> (הקוד מופיע ליד הבית), או תפריט → בית →{" "}
          <strong className="text-orange-200">עריכה</strong> → בחרו את הבית → הקוד בראש מסך העריכה.
        </p>
        <p className="text-lg leading-relaxed text-orange-100">
          אין שחזור אוטומטי של קוד עריכה דרך האפליקציה.
        </p>
        <p className="text-lg leading-relaxed text-orange-100">
          אם איבדתם לגמרי ואין גישה מאף מכשיר — פנו ל<strong className="text-orange-200">מנהל/ת האפליקציה</strong>{" "}
          לקבלת הקוד מחדש.
        </p>
        <HelpShot src="/help/step-3-done.png" alt="מסך הצלחה עם קוד עריכה" />
      </div>
    </HelpShell>
  );
}
