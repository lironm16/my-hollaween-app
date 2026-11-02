"use client";

import { useEffect, useState } from "react";
import { PreviewNav } from "@/components/preview-nav";
import { cn } from "@/lib/utils";

type CurrentHit = {
  id: string;
  label: string;
  subtitle?: string;
  lat: number;
  lng: number;
  precise?: boolean;
};

type TryResponse = {
  ok: boolean;
  q: string;
  error?: string;
  google:
    | { configured: false; message: string }
    | {
        configured: true;
        input: string;
        autocompleteLanguage: string;
        suggestions: Array<{ placeId: string; primary: string; secondary?: string; types: string[] }>;
        details: Array<{
          placeId: string;
          types: string[];
          he?: { formattedAddress?: string; displayName?: string; lat?: number; lng?: number };
          en?: { formattedAddress?: string; displayName?: string; lat?: number; lng?: number };
        }>;
      }
    | null;
  current: CurrentHit[];
};

const EXAMPLES = [
  "Zabutinsky 105",
  "Jabotinsky 105 Ramat Gan",
  "ז'בוטינסקי 105",
  "נחליאלי 4 רמת גן",
  "ביה״ס ניצנים",
  "קניון איילון",
];

export default function GooglePlacesPreviewPage() {
  const [query, setQuery] = useState("Zabutinsky 105");
  const [debounced, setDebounced] = useState(query);
  const [data, setData] = useState<TryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 320);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/places/try?q=${encodeURIComponent(debounced)}`)
      .then(async (res) => {
        const body = (await res.json()) as TryResponse;
        if (!cancelled) setData(body);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const google = data?.google;
  const googleReady = google && "configured" in google && google.configured === true;

  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold text-orange-100">Google Places — ניסוי</h1>
          <p className="text-base leading-relaxed text-violet-200">
            השוואה בין Google (Autocomplete + פרטים בעברית ואנגלית) לבין החיפוש הנוכחי של האפליקציה. דורש{" "}
            <code className="text-orange-200">GOOGLE_MAPS_API_KEY</code> בשרת.
          </p>
          <PreviewNav current="/preview/google-places" />
        </header>

        <label className="block space-y-2">
          <span className="text-sm text-violet-300">חיפוש</span>
          <input
            type="search"
            dir="auto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-3 text-base text-right placeholder:text-white/35"
            placeholder="אנגלית, עברית, או שגיאות כתיב…"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setQuery(ex)}
              className="rounded-full bg-[#1d1028] px-3 py-1.5 text-sm text-orange-100 ring-1 ring-orange-500/25 hover:bg-white/5"
            >
              {ex}
            </button>
          ))}
        </div>

        {loading ? <p className="text-sm text-white/50">טוען…</p> : null}
        {data?.error ? <p className="text-sm text-red-300">{data.error}</p> : null}

        {google && "configured" in google && !google.configured ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-100">
            {google.message}
          </p>
        ) : null}

        {googleReady ? (
          <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
            <h2 className="text-lg font-medium text-orange-100">
              Google · שפת השלמה: {google.autocompleteLanguage}
            </h2>
            {google.details.length === 0 ? (
              <p className="text-sm text-white/45">אין הצעות</p>
            ) : (
              <ul className="space-y-4">
                {google.details.map((row) => (
                  <li key={row.placeId} className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-xs text-white/40 tabular-nums">{row.placeId}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-violet-300">עברית</p>
                        <p className="text-sm text-white/90">{row.he?.formattedAddress ?? row.he?.displayName ?? "—"}</p>
                        {row.he?.displayName && row.he.formattedAddress ? (
                          <p className="text-xs text-white/45">{row.he.displayName}</p>
                        ) : null}
                      </div>
                      <div dir="ltr" className="text-left">
                        <p className="text-xs font-semibold text-violet-300">English</p>
                        <p className="text-sm text-white/90">{row.en?.formattedAddress ?? row.en?.displayName ?? "—"}</p>
                        {row.en?.displayName && row.en.formattedAddress ? (
                          <p className="text-xs text-white/45">{row.en.displayName}</p>
                        ) : null}
                      </div>
                    </div>
                    {row.he?.lat != null && row.he?.lng != null ? (
                      <p className="mt-2 text-xs tabular-nums text-white/40" dir="ltr">
                        {row.he.lat.toFixed(5)}, {row.he.lng.toFixed(5)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-violet-500/20">
          <h2 className="text-lg font-medium text-orange-100">האפליקציה היום (Nominatim + רשימות)</h2>
          {!data?.current?.length ? (
            <p className="text-sm text-white/45">אין תוצאות</p>
          ) : (
            <ul className="space-y-2">
              {data.current.map((h) => (
                <li
                  key={h.id}
                  className={cn(
                    "rounded-xl border border-white/10 px-3 py-2.5",
                    h.precise ? "bg-emerald-950/20" : "bg-black/30",
                  )}
                >
                  <p className="text-sm text-white/90">{h.label}</p>
                  {h.subtitle ? <p className="text-xs text-white/45">{h.subtitle}</p> : null}
                  <p className="text-xs tabular-nums text-white/35" dir="ltr">
                    {h.lat.toFixed(5)}, {h.lng.toFixed(5)}
                    {h.precise ? " · precise" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
