"use client";

import { HelpShell } from "@/components/help-shell";

export default function EditCodeHelpPage() {
  return (
    <HelpShell title="איבדתי את קוד העריכה">
      <div className="rounded-2xl bg-[#1d1028] p-4 text-sm leading-relaxed text-violet-100 ring-1 ring-orange-500/25">
        <p>אין שחזור אוטומטי דרך האפליקציה.</p>
        <p className="mt-2 text-orange-100">
          פנו ל<strong className="text-orange-200"> מנהל/ת האפליקציה</strong> — אפשר לקבל את קוד
          העריכה מחדש.
        </p>
        <p className="mt-2 text-violet-300">אם הוספתם מהטלפון הזה: תפריט → בית → שלי / עריכה — בלי קוד.</p>
      </div>
    </HelpShell>
  );
}
