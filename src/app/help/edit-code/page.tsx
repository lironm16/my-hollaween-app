"use client";

import { HelpShell, HelpShot } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";

export default function EditCodeHelpPage() {
  return (
    <HelpShell title="איבדתי את קוד העריכה">
      <div className="space-y-4 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-orange-500/25">
        <p className="text-lg leading-relaxed text-orange-50">
          אין שחזור אוטומטי של קוד עריכה דרך האפליקציה.
        </p>
        <p className="text-lg leading-relaxed text-orange-100">
          אם איבדתם לגמרי ואין גישה מאף מכשיר — פנו ל<strong className="text-orange-200">מנהל/ת האפליקציה</strong>{" "}
          לקבלת הקוד מחדש.
        </p>
        <HelpShot src={helpImage("step-3-done.png")} alt="מסך הצלחה עם קוד עריכה" />
      </div>
    </HelpShell>
  );
}
