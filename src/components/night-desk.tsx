"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Camera, CheckCircle2, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { HouseForm } from "@/components/house-form";
import { PushNotice } from "@/components/push-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { visitLabels, visitShort, stockLabels, treatLabels, decorShort, scareShort } from "@/lib/labels";
import {
  candyLevel,
  effectiveVisit,
  freezeExpireIso,
  freezeLabel,
  isFrozen,
  resolveDecorLevel,
  treatLevel,
} from "@/lib/house-state";
import { notifyCatalogChanged } from "@/lib/offline-db";
import { hostJpegFromBrowser } from "@/lib/photos";
import { readApiJson } from "@/lib/api-json";
import {
  SCARE_LEVELS,
  SENSITIVITY_OPTIONS,
  STOCK_LEVELS,
  VISIT_STATES,
  type HouseInput,
  type NightPatch,
  type PublicHouse,
  type SensitivityId,
  type StockLevel,
  type TreatId,
  type VisitState,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { ScareSign } from "@/components/scare-glyphs";
import { DEFAULT_PUSH_TEMPLATES, type PushKind } from "@/lib/push-templates";

type PushOffer = { kind: PushKind; title: string; body: string };
type PushNoticeState =
  | { mode: "offer"; offer: PushOffer }
  | { mode: "auto" | "sent"; title: string; body: string };

type Props = {
  house: PublicHouse;
  onUpdated: (house: PublicHouse) => void;
  editCode?: string;
  admin?: boolean;
  /** When false, hide the full house-details form (e.g. nested elsewhere). */
  showDetailsForm?: boolean;
};

export function NightDesk({
  house,
  onUpdated,
  editCode,
  admin,
  showDetailsForm = true,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [freezeUntil, setFreezeUntil] = useState("");
  const [notice, setNotice] = useState<PushNoticeState | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const frozen = isFrozen(house);
  const freezeText = freezeLabel(house);
  const visit = effectiveVisit(house);
  const sensitivities = SENSITIVITY_OPTIONS.filter((id) => house.treats.includes(id));

  useEffect(() => {
    if (!notice) return;
    noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [notice]);

  async function save(patch: NightPatch & Partial<HouseInput>, options?: { quiet?: boolean }) {
    if (!options?.quiet) setBusy(true);
    try {
      const url = admin
        ? `/api/admin/houses/${encodeURIComponent(house.id)}`
        : `/api/houses/${encodeURIComponent(house.id)}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(admin ? patch : { ...patch, editCode }),
      });
      const data = await readApiJson<{
        error?: string;
        house?: PublicHouse;
        push?: {
          kind?: PushKind;
          autoSent?: boolean;
          title?: string;
          body?: string;
          offer?: PushOffer;
        };
      }>(res);
      if (!res.ok || !data.house) {
        toast.error(data.error ?? "העדכון נכשל");
        return false;
      }
      onUpdated(data.house);
      notifyCatalogChanged();
      if (data.push?.autoSent) {
        setNotice({
          mode: "auto",
          title: data.push.title ?? "",
          body: data.push.body ?? "",
        });
        if (!options?.quiet) toast.success("נשמר · התראה נשלחה לשכונה");
      } else if (data.push?.offer) {
        setNotice({ mode: "offer", offer: data.push.offer });
        if (!options?.quiet) toast.success("נשמר — אפשר לשלוח התראה");
      } else if (data.push?.kind && !data.push.autoSent && !data.push.offer) {
        setNotice(null);
        if (!options?.quiet) toast.success("נשמר · סוג ההתראה כבוי אצל המנהלים");
      } else if (!options?.quiet) {
        setNotice(null);
        toast.success("נשמר");
      }
      return true;
    } catch {
      toast.error("אין קשר לשרת");
      return false;
    } finally {
      if (!options?.quiet) setBusy(false);
    }
  }

  async function sendOffer() {
    if (notice?.mode !== "offer") return;
    const offer = notice.offer;
    setOfferBusy(true);
    try {
      const res = await fetch(`/api/houses/${encodeURIComponent(house.id)}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editCode, kind: offer.kind }),
      });
      const data = await readApiJson<{ error?: string; sent?: number }>(res);
      if (!res.ok) {
        toast.error(data.error ?? "השליחה נכשלה");
        return;
      }
      toast.success(`התראה נשלחה ל־${data.sent ?? 0} מכשירים`);
      setNotice({ mode: "sent", title: offer.title, body: offer.body });
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setOfferBusy(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const image = await compressJpeg(file);
      let photoUrl: string | null = null;
      try {
        photoUrl = await hostJpegFromBrowser(image);
      } catch {
        photoUrl = null;
      }
      if (photoUrl) {
        const ok = await save({ photoUrl }, { quiet: true });
        if (ok) toast.success("התמונה עודכנה");
        return;
      }
      if (!editCode) {
        toast.error("העלאת התמונה נכשלה");
        return;
      }
      const res = await fetch(`/api/houses/${encodeURIComponent(house.id)}/photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editCode, image }),
      });
      const data = await readApiJson<{ error?: string; house?: PublicHouse }>(res);
      if (!res.ok || !data.house) {
        toast.error(data.error ?? "העלאת התמונה נכשלה");
        return;
      }
      onUpdated(data.house);
      notifyCatalogChanged();
      toast.success("התמונה עודכנה");
    } catch {
      toast.error("לא הצלחנו לשמור את התמונה");
    } finally {
      setBusy(false);
    }
  }

  function setStock(id: TreatId, level: StockLevel) {
    const treats = house.treats.includes(id) ? house.treats : ([...house.treats, id] as TreatId[]);
    void save({
      treats,
      treatStock: { ...house.treatStock, [id]: level },
      ...(id === "candy" && level === "out" ? { visit: "closed" as VisitState } : {}),
    });
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <div
          ref={noticeRef}
          className="space-y-3 rounded-2xl bg-[#1d1028] p-3.5 ring-1 ring-orange-400/35"
        >
          {notice.mode === "offer" ? (
            <>
              <div className="flex items-start gap-2">
                <Bell className="mt-0.5 size-4 shrink-0 text-orange-300" />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold text-orange-100">לשלוח התראה לשכונה?</p>
                  <p className="text-xs text-violet-300">
                    {DEFAULT_PUSH_TEMPLATES[notice.offer.kind].label} · נשלח רק אם תלחצו על הכפתור
                  </p>
                </div>
              </div>
              <PushNotice
                payload={{ title: notice.offer.title, body: notice.offer.body, url: "/" }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={offerBusy}
                  className="bg-orange-500 text-black hover:bg-orange-400"
                  onClick={() => void sendOffer()}
                >
                  <Bell className="size-4" />
                  {offerBusy ? "שולחים…" : "שלחו התראה לשכונה"}
                </Button>
                <Button type="button" variant="outline" disabled={offerBusy} onClick={() => setNotice(null)}>
                  לא עכשיו
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-200">
                  {notice.mode === "auto"
                    ? "נשלחה התראה אוטומטית לשכונה"
                    : "ההתראה נשלחה לשכונה"}
                </p>
              </div>
              {notice.title ? (
                <PushNotice payload={{ title: notice.title, body: notice.body, url: "/" }} />
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <Section title="סטטוס הערב" hint="מה הילדים צריכים לדעת עכשיו">
        <div className="grid grid-cols-3 gap-1.5">
          {VISIT_STATES.map((state) => (
            <button
              key={state}
              type="button"
              disabled={busy}
              title={visitLabels[state]}
              onClick={() => void save({ visit: state as VisitState })}
              className={cn(
                "rounded-xl px-2 py-2.5 text-center text-xs font-medium transition",
                visit === state
                  ? state === "closed"
                    ? "bg-red-700 text-white"
                    : "bg-orange-500 text-black"
                  : "bg-[#12081a] text-orange-100 ring-1 ring-orange-500/20",
              )}
            >
              {visitShort[state]}
            </button>
          ))}
        </div>
      </Section>

      <Section title="רמת פחד" hint="לילדים, מפחיד, או בלי קישוט בחוץ">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={busy}
            title={decorShort.none}
            onClick={() => void save({ decorLevel: "none" })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
              resolveDecorLevel(house) === "none"
                ? "bg-orange-500 text-black"
                : "bg-[#12081a] text-orange-100 ring-1 ring-orange-500/20",
            )}
          >
            <ScareSign level="none" className="size-7" />
            {decorShort.none}
          </button>
          {SCARE_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              disabled={busy}
              title={scareShort[level]}
              onClick={() =>
                void save({
                  scareLevel: level,
                  ...(resolveDecorLevel(house) === "none" ? { decorLevel: "mild" as const } : {}),
                })
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                resolveDecorLevel(house) !== "none" && house.scareLevel === level
                  ? "bg-orange-500 text-black"
                  : "bg-[#12081a] text-orange-100 ring-1 ring-orange-500/20",
              )}
            >
              <ScareSign level={level} className="size-7" />
              {scareShort[level]}
            </button>
          ))}
        </div>
      </Section>

      <Section title="מלאי" hint="מתעדכן מיד במפה">
        <StockRow
          label={treatLabels.candy}
          level={candyLevel(house)}
          busy={busy}
          onPick={(level) => setStock("candy", level)}
        />
        {sensitivities.length === 0 ? (
          <p className="text-xs text-violet-400">
            אין רגישויות מסומנות. אפשר להוסיף ב«פרטי הבית» למטה.
          </p>
        ) : (
          sensitivities.map((id) => (
            <StockRow
              key={id}
              label={treatLabels[id as SensitivityId]}
              level={treatLevel(house, id)}
              busy={busy}
              onPick={(level) => setStock(id, level)}
            />
          ))
        )}
      </Section>

      <Section
        title="תמונת קישוט"
        hint="מוצגת בכרטיס הבית כשפותחים אותו במפה"
      >
        {house.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={house.photoUrl}
            alt=""
            className="h-36 w-full rounded-xl object-cover ring-1 ring-orange-500/25"
          />
        ) : (
          <div className="flex h-28 items-center justify-center rounded-xl bg-[#12081a] text-sm text-violet-400 ring-1 ring-orange-500/15">
            אין תמונה עדיין
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-medium text-black",
                busy && "opacity-60",
              )}
            >
              <Camera className="size-3.5" />
              {house.photoUrl ? "החלפת תמונה" : "העלאת תמונה"}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void onPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {house.photoUrl ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void save({ photoUrl: "" })}
            >
              הסרת תמונה
            </Button>
          ) : null}
        </div>
      </Section>

      <Section
        title="הקפאה מהמפה"
        hint="ילדים לא רואים את הבית עד שמבטלים או עד השעה שבחרתם"
      >
        {house.adminFrozen && !admin ? (
          <p className="rounded-lg bg-violet-950/70 px-3 py-2 text-sm text-violet-100">
            מנהל הסתיר את הבית מהמפה. אי אפשר לבטל את זה מכאן.
          </p>
        ) : null}
        {freezeText ? (
          <p className="rounded-lg bg-[#2a1638] px-3 py-2 text-sm text-amber-100">{freezeText}</p>
        ) : null}

        {admin ? (
          <Button
            type="button"
            size="sm"
            variant={house.adminFrozen ? "outline" : "destructive"}
            disabled={busy}
            onClick={() => void save({ adminFrozen: !house.adminFrozen })}
          >
            {house.adminFrozen ? "החזרה למפה (מנהל)" : "הסתרה קבועה (מנהל)"}
          </Button>
        ) : null}

        {!house.adminFrozen || admin ? (
          frozen && !house.adminFrozen ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() => void save({ ownerFrozenUntil: null })}
            >
              בטל הקפאה
            </Button>
          ) : !house.adminFrozen ? (
            <div className="space-y-2">
              <label className="block space-y-1">
                <span className="text-xs text-violet-300">עד מתי? (אופציונלי)</span>
                <Input
                  type="time"
                  dir="ltr"
                  value={freezeUntil}
                  onChange={(e) => setFreezeUntil(e.target.value)}
                  disabled={busy}
                  className="h-10 max-w-[10rem] bg-[#12081a]"
                />
              </label>
              <Button
                type="button"
                disabled={busy}
                className="bg-sky-700 text-white hover:bg-sky-600"
                onClick={() =>
                  void save({ ownerFrozenUntil: freezeExpireIso(freezeUntil || null) })
                }
              >
                <Snowflake className="size-4" />
                הקפא מהמפה
              </Button>
            </div>
          ) : null
        ) : null}
      </Section>

      {showDetailsForm ? (
        <Section
          title="פרטי הבית"
          hint="שם, שעות, כתובת ורגישויות — נשמרים בלחיצה על הכפתור"
        >
          <button
            type="button"
            className="text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
            onClick={() => setDetailsOpen((v) => !v)}
          >
            {detailsOpen ? "הסתרת טופס הפרטים" : "עריכת פרטי הבית"}
          </button>
          {detailsOpen ? (
            <div className="rounded-xl bg-[#12081a]/80 p-3 ring-1 ring-orange-500/15">
              <HouseForm
                initial={house}
                submitLabel="שמירת פרטי הבית"
                busy={busy}
                onSubmit={async (input) => {
                  const ok = await save(input);
                  if (ok) setDetailsOpen(false);
                }}
              />
            </div>
          ) : null}
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5 rounded-2xl bg-[#1d1028] p-3.5 ring-1 ring-orange-500/20">
      <header className="space-y-0.5">
        <h3 className="text-sm font-semibold text-orange-100">{title}</h3>
        {hint ? <p className="text-xs text-violet-400">{hint}</p> : null}
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function StockRow({
  label,
  level,
  busy,
  onPick,
}: {
  label: string;
  level: StockLevel;
  busy: boolean;
  onPick: (level: StockLevel) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-orange-50">{label}</span>
      <span className="flex gap-1">
        {STOCK_LEVELS.map((item) => (
          <button
            key={item}
            type="button"
            disabled={busy}
            onClick={() => onPick(item)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium",
              level === item
                ? item === "out"
                  ? "bg-red-700 text-white"
                  : item === "low"
                    ? "bg-amber-400 text-black"
                    : "bg-emerald-700 text-white"
                : "bg-[#12081a] text-violet-100 ring-1 ring-violet-500/25",
            )}
          >
            {stockLabels[item]}
          </button>
        ))}
      </span>
    </div>
  );
}

async function compressJpeg(file: File) {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const max = 960;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  let quality = 0.72;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > 140_000 && quality > 0.38) {
    quality -= 0.08;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  return data;
}
