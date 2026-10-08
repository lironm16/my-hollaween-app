"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { collectHelpRequestContext } from "@/lib/help-request-client";
import {
  HELP_REQUEST_PLATFORM_LABELS,
  HELP_REQUEST_PLATFORMS,
  HELP_REQUEST_ROLE_LABELS,
  HELP_REQUEST_ROLES,
  HELP_REQUEST_TOPIC_LABELS,
  HELP_REQUEST_TOPICS,
  type HelpRequestPlatform,
  type HelpRequestRole,
  type HelpRequestTopic,
} from "@/lib/help-request-schema";
import { isAndroidUserAgent, isIosUserAgent } from "@/lib/pwa-manifest";
import { cn } from "@/lib/utils";

function defaultPlatform(): HelpRequestPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (isAndroidUserAgent(ua)) return "android";
  if (isIosUserAgent(ua)) return "iphone";
  return "other";
}

function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
  labels,
}: {
  legend: string;
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  labels: Record<T, string>;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-base font-medium text-orange-100">{legend}</legend>
      <div className="flex flex-col gap-1 rounded-xl bg-[#12081a] p-1 ring-1 ring-orange-500/20">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-base transition",
              value === option ? "bg-orange-500/15 text-orange-50" : "text-orange-50 hover:bg-orange-500/10",
            )}
          >
            <input
              type="radio"
              name={name}
              className="size-4 accent-orange-500"
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{labels[option]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function HelpContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<HelpRequestRole>("visitor");
  const [platform, setPlatform] = useState<HelpRequestPlatform>(() => defaultPlatform());
  const [topic, setTopic] = useState<HelpRequestTopic | "">("");
  const [houseHint, setHouseHint] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  const topicOptions = useMemo(() => HELP_REQUEST_TOPICS, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/help-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone.trim() || undefined,
          role,
          platform,
          topic: topic || undefined,
          houseHint: houseHint.trim() || undefined,
          message,
          company,
          context: collectHelpRequestContext(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ticket?: string };
      if (!res.ok) {
        setError(data.error ?? "השליחה נכשלה.");
        return;
      }
      setTicket(data.ticket ?? "ok");
    } catch {
      setError("אין חיבור לשרת. בדקו רשת ונסו שוב.");
    } finally {
      setBusy(false);
    }
  }

  if (ticket) {
    return (
      <div className="space-y-4 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-emerald-500/30">
        <div className="flex flex-col items-center gap-2 text-center">
          <CheckCircle2 className="size-12 text-emerald-400" aria-hidden />
          <h2 className="text-xl font-semibold text-orange-50">קיבלנו את הפנייה</h2>
          <p className="text-lg text-violet-100">
            {phone.trim()
              ? "ננסה לחזור אליכם לפי הטלפון שהשארתם."
              : "אם השארתם טלפון — נחזור אליכם. אפשר גם לבדוק שוב בעזרה בשאלות ותשובות."}
          </p>
          <p className="text-sm text-violet-300/90" dir="ltr">
            #{ticket}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      <p className="text-lg leading-relaxed text-orange-100/95">
        משהו לא עובד? נשמח לעזור. השאירו פרטים — אפשר גם בלי טלפון, ואז נענה כשאפשר דרך עדכונים באפליקציה.
      </p>

      <div className="hidden" aria-hidden>
        <Label htmlFor="help-company">Company</Label>
        <Input
          id="help-company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="help-name">שם *</Label>
        <Input
          id="help-name"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-orange-500/25 bg-[#12081a] text-lg text-orange-50"
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="help-phone">טלפון (אופציונלי — לחזרה אליכם)</Label>
        <Input
          id="help-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="050-1234567"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border-orange-500/25 bg-[#12081a] text-lg text-orange-50"
          maxLength={24}
        />
      </div>

      <ChoiceGroup
        legend="מי אתם?"
        name="help-role"
        value={role}
        onChange={setRole}
        options={HELP_REQUEST_ROLES}
        labels={HELP_REQUEST_ROLE_LABELS}
      />

      <ChoiceGroup
        legend="איזה טלפון?"
        name="help-platform"
        value={platform}
        onChange={setPlatform}
        options={HELP_REQUEST_PLATFORMS}
        labels={HELP_REQUEST_PLATFORM_LABELS}
      />

      <fieldset className="space-y-2">
        <legend className="text-base font-medium text-orange-100">נושא (אופציונלי)</legend>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value as HelpRequestTopic | "")}
          className="h-11 w-full rounded-lg border border-orange-500/25 bg-[#12081a] px-3 text-lg text-orange-50"
        >
          <option value="">בחרו…</option>
          {topicOptions.map((t) => (
            <option key={t} value={t}>
              {HELP_REQUEST_TOPIC_LABELS[t]}
            </option>
          ))}
        </select>
      </fieldset>

      {role === "owner" ? (
        <div className="space-y-2">
          <Label htmlFor="help-house">שם הבית או כתובת (אופציונלי)</Label>
          <Input
            id="help-house"
            value={houseHint}
            onChange={(e) => setHouseHint(e.target.value)}
            className="border-orange-500/25 bg-[#12081a] text-lg text-orange-50"
            maxLength={120}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="help-message">מה קרה / במה צריכים עזרה? *</Label>
        <Textarea
          id="help-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[8rem] border-orange-500/25 bg-[#12081a] text-lg text-orange-50"
          maxLength={2000}
          placeholder="למשל: המפה ריקה, לא מצליחים להתקין, קוד עריכה לא עובד…"
        />
      </div>

      {error ? <p className="text-base text-red-300">{error}</p> : null}

      <Button
        type="submit"
        size="lg"
        disabled={busy}
        className="w-full bg-orange-500 text-lg text-black hover:bg-orange-400"
      >
        {busy ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden />
            שולח…
          </>
        ) : (
          "שליחה"
        )}
      </Button>

      <p className="text-sm leading-relaxed text-violet-300/85">
        עם השליחה נשלח גם מידע טכני (גרסת אפליקציה, עמוד, מכשיר) — כדי שנוכל לעזור מהר יותר. לא נשלח קודי עריכה.
      </p>
    </form>
  );
}
