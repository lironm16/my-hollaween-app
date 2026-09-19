"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { HelpShell } from "@/components/help-shell";

const QUESTIONS = [
  {
    question: "איך מוסיפים בית?",
    href: "/help/add-house",
  },
  {
    question: "איך מתקינים את האפליקציה?",
    href: "/help/install",
  },
  {
    question: "איך יוצרים מסלול?",
    href: "/help/create-route",
  },
  {
    question: "במהלך המסלול",
    href: "/help/during-route",
  },
  {
    question: "איך לשתף קוד עריכה?",
    href: "/help/share-edit-code",
  },
  {
    question: "איבדתי את קוד העריכה",
    href: "/help/edit-code",
  },
] as const;

export default function HelpPage() {
  return (
    <HelpShell title="שאלות ותשובות" backHref="/" backLabel="מפה">
      <ul className="space-y-2">
        {QUESTIONS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center gap-3 rounded-2xl bg-[#1d1028] px-4 py-5 ring-1 ring-orange-500/20 transition hover:bg-[#241332]"
            >
              <span className="min-w-0 flex-1 text-xl font-medium text-orange-50">{item.question}</span>
              <ChevronLeft className="size-7 shrink-0 text-orange-400/70" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </HelpShell>
  );
}
