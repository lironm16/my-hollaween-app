"use client";

import { cn } from "@/lib/utils";
import { useLocaleContext } from "@/components/locale-provider";
import type { AppLocale } from "@/lib/i18n/locale";
import { APP_LOCALES } from "@/lib/i18n/locale";

function LanguageOption({
  active,
  label,
  onSelect,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-start ring-1 transition",
        active
          ? "bg-orange-500/15 ring-orange-400/50 text-orange-50"
          : "bg-[#12081a] ring-orange-500/20 text-orange-100 hover:bg-orange-500/5",
      )}
    >
      <span className="text-base font-medium">{label}</span>
      <span
        className={cn(
          "size-5 shrink-0 rounded-full border-2",
          active ? "border-orange-400 bg-orange-400" : "border-violet-400/60 bg-transparent",
        )}
        aria-hidden
      />
    </button>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-[#241332] p-2.5 ring-1 ring-white/10">
      <h2 className="mb-2 text-base font-semibold text-orange-400">{title}</h2>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  he: "עברית",
};

export function LanguageSettings() {
  const { locale, setLocale, t, dir } = useLocaleContext();

  return (
    <div dir={dir}>
      <SettingsSection title={t("settings.languageSection")}>
        <p className="px-1 text-sm text-violet-300">{t("settings.languageHint")}</p>
        {APP_LOCALES.map((code) => (
          <LanguageOption
            key={code}
            active={locale === code}
            label={LOCALE_LABELS[code]}
            onSelect={() => {
              if (code !== locale) setLocale(code);
            }}
          />
        ))}
      </SettingsSection>
    </div>
  );
}
