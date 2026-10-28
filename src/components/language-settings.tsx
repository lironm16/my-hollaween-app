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

function SettingSwitch({
  on,
  title,
  onChange,
}: {
  on: boolean;
  title: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl bg-[#12081a] px-3 py-3 text-start ring-1 ring-orange-500/20"
      onClick={() => onChange(!on)}
    >
      <span className="text-base font-medium text-orange-50">{title}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.stopPropagation();
          onChange(!on);
        }}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full outline-none transition focus:outline-none focus-visible:ring-0",
          on ? "bg-orange-500" : "bg-[#2a1638] ring-1 ring-orange-500/25",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-6 rounded-full bg-white shadow transition-[inset-inline-start]",
            on ? "start-5" : "start-0.5",
          )}
        />
      </button>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-[#241332] p-2.5 ring-1 ring-white/10">
      <h2 className="mb-2 text-base font-semibold text-orange-400">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function SettingsSubsection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[#1a0d24]/90 p-2 ring-1 ring-orange-500/10">
      <h3 className="px-1 text-sm font-semibold tracking-wide text-violet-200/95">{title}</h3>
      {hint ? (
        <p className="mt-1 px-1 text-sm leading-snug text-violet-300/80">{hint}</p>
      ) : null}
      <div className={cn("grid gap-2", hint ? "mt-2" : "mt-1.5")}>{children}</div>
    </div>
  );
}

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  he: "עברית",
};

export function LanguageSettings() {
  const { locale, setLocale, translateUserContent, setTranslateUserContent, t, dir } =
    useLocaleContext();

  return (
    <div dir={dir} className="space-y-3">
      <SettingsSection title={t("settings.languageSection")}>
        <SettingsSubsection title={t("settings.interfaceSection")}>
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
        </SettingsSubsection>
        <SettingsSubsection title={t("settings.contentSection")}>
          <SettingSwitch
            title={t("settings.contentTranslateOn")}
            on={translateUserContent}
            onChange={setTranslateUserContent}
          />
        </SettingsSubsection>
      </SettingsSection>
    </div>
  );
}
