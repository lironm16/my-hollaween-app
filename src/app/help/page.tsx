"use client";

import Link from "next/link";
import { ChevronLeft, HelpCircle } from "lucide-react";
import { HelpShell } from "@/components/help-shell";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const QUESTIONS = [
  {
    id: "add-house",
    question: "איך מוסיפים בית עם תמונה?",
    summary: "טופס הוספה, כתובת מהרשימה, קוד עריכה והעלאת תמונת קישוט.",
    href: "/help/add-house",
  },
  {
    id: "edit-house",
    question: "איך עורכים בית אחרי ההוספה?",
    summary: "תפריט → בית → עריכה, או עדכון מהיר בליל האירוע.",
    href: "/help/add-house#edit",
  },
  {
    id: "edit-code",
    question: "איבדתי את קוד העריכה — מה עושים?",
    summary: "אין שחזור אוטומטי. שמרו את הקוד בזמן ההוספה.",
    href: "/help/add-house#edit-code",
  },
  {
    id: "install",
    question: "איך מוסיפים את האפליקציה למסך הבית?",
    summary: "Safari / Chrome → הוספה למסך הבית, ואז פתיחה פעם אחת ברשת.",
    href: "/help/add-house#install",
  },
] as const;

export default function HelpPage() {
  return (
    <HelpShell title="שאלות ותשובות" backHref="/" backLabel="חזרה למפה">
      <p className="mb-4 text-base text-violet-200">
        מדריכים קצרים לבעלי בתים ולמבקרים. בחרו שאלה לפרטים המלאים.
      </p>
      <ul className="space-y-2">
        {QUESTIONS.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-start gap-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20 transition hover:bg-[#241332] hover:ring-orange-500/35"
            >
              <HelpCircle className="mt-0.5 size-5 shrink-0 text-orange-400" aria-hidden />
              <span className="min-w-0 flex-1 text-right">
                <span className="block text-base font-semibold text-orange-50">{item.question}</span>
                <span className="mt-1 block text-sm text-violet-300">{item.summary}</span>
              </span>
              <ChevronLeft className="mt-1 size-5 shrink-0 text-violet-500" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link
          href="/add"
          className={cn(buttonVariants(), "w-full bg-orange-500 text-black hover:bg-orange-400")}
        >
          הוספת בית — ישר לטופס
        </Link>
      </div>
    </HelpShell>
  );
}
