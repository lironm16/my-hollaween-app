"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { inputStyles } from "@/components/ui/input";
import type { AddressHit } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (hit: AddressHit) => void;
  confirmed: boolean;
  disabled?: boolean;
};

export function AddressField({ value, onChange, onSelect, confirmed, disabled }: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<AddressHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }
    const t = window.setTimeout(() => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      fetch(`/api/address?q=${encodeURIComponent(q)}`, { signal: ac.signal, cache: "no-store" })
        .then((res) => res.json())
        .then((data: { hits?: AddressHit[]; error?: string }) => {
          if (ac.signal.aborted) return;
          if (data.error) {
            setError(data.error);
            setHits([]);
            return;
          }
          setHits(data.hits ?? []);
          setActive(0);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError("לא הצלחנו לחפש כתובות.");
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false);
        });
    }, 350);
    return () => window.clearTimeout(t);
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(hit: AddressHit) {
    onSelect(hit);
    setOpen(false);
    setHits([]);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        dir="rtl"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        required
        minLength={3}
        value={value}
        placeholder="רחוב ומספר, למשל חרוזים 8"
        aria-autocomplete="list"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        aria-invalid={value.trim().length >= 3 && !confirmed}
        role="combobox"
        className={cn(inputStyles, "h-10 bg-[#1d1028]")}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            setOpen(true);
            return;
          }
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          }
          if (e.key === "Enter" && open && hits[active]) {
            e.preventDefault();
            pick(hits[active]);
          }
        }}
      />
      {open && value.trim().length >= 2 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl bg-[#1d1028] py-1 text-sm shadow-lg ring-1 ring-orange-500/30"
        >
          {loading ? (
            <li className="px-3 py-2 text-violet-300">מחפשים כתובות…</li>
          ) : error ? (
            <li className="px-3 py-2 text-red-200">{error}</li>
          ) : hits.length === 0 ? (
            <li className="px-3 py-2 text-violet-300">
              אין כתובת כזו בשכונה. נסו רחוב ומספר בית, למשל «חרוזים 8».
            </li>
          ) : (
            hits.map((hit, i) => (
              <li key={hit.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-right",
                    i === active ? "bg-orange-500/20 text-orange-50" : "text-orange-100",
                  )}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(hit)}
                >
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-orange-400" />
                  <span>
                    <span className="block">{hit.label}</span>
                    {!hit.precise ? (
                      <span className="block text-[11px] text-violet-300">רחוב בלי מספר — גררו את הסיכה לבית</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
      {confirmed ? (
        <p className="mt-1 text-xs text-emerald-300">כתובת מאומתת על המפה</p>
      ) : value.trim().length >= 3 ? (
        <p className="mt-1 text-xs text-amber-200">בחרו כתובת מהרשימה, או גררו את הסיכה לבית הנכון</p>
      ) : (
        <p className="mt-1 text-xs text-violet-300">הכתובת חייבת להיות כתובת אמיתית בשכונה</p>
      )}
    </div>
  );
}

export async function reversePin(lat: number, lng: number): Promise<AddressHit | null> {
  const res = await fetch(`/api/address?lat=${lat}&lng=${lng}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { hit?: AddressHit | null };
  return data.hit ?? null;
}
