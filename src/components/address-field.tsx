"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { inputStyles } from "@/components/ui/input";
import type { AddressHit } from "@/lib/types";
import { streetPinHint } from "@/lib/address-text";
import { cn } from "@/lib/utils";
import { useVisualKeyboardOpen } from "@/hooks/use-visual-keyboard-open";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (hit: AddressHit) => void;
  confirmed: boolean;
  fieldError?: string | null;
  disabled?: boolean;
  emptyHint?: boolean;
  maxLength?: number;
  onFocusChange?: (focused: boolean) => void;
  placeholder?: string;
};

export function AddressField({
  value,
  onChange,
  onSelect,
  confirmed,
  fieldError = null,
  disabled,
  emptyHint = true,
  maxLength,
  onFocusChange,
  placeholder = "רחוב ומספר, או שם מוסד — למשל חרוזים 8",
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const keyboardOpen = useVisualKeyboardOpen();
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

  const listOpen = open && value.trim().length >= 2;
  const dropUp = keyboardOpen || focused;

  useEffect(() => {
    onFocusChange?.(focused);
  }, [focused, onFocusChange]);

  return (
    <div
      ref={wrapRef}
      className={cn("relative", listOpen && "z-40")}
    >
      <input
        ref={inputRef}
        dir="rtl"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        required
        minLength={3}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
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
        onFocus={() => {
          setFocused(true);
          setOpen(true);
          window.requestAnimationFrame(() => {
            inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
          });
        }}
        onBlur={() => {
          setFocused(false);
        }}
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
      {listOpen ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute z-50 max-h-[min(14rem,var(--app-h,50vh))] w-full overflow-auto rounded-xl bg-[#1d1028] py-1 text-base shadow-lg ring-1 ring-orange-500/30",
            dropUp ? "bottom-full mb-1" : "top-full mt-1",
          )}
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
            hits.map((hit, i) => {
              const sub = hit.subtitle ?? streetPinHint(hit);
              return (
              <li key={hit.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-right",
                    i === active ? "bg-orange-500/20 text-orange-50" : "text-orange-100",
                  )}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(hit)}
                >
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-orange-400" />
                  <span>
                    <span className="block">{hit.label}</span>
                    {sub ? <span className="block text-base text-violet-300">{sub}</span> : null}
                  </span>
                </button>
              </li>
              );
            })
          )}
        </ul>
      ) : null}
      {fieldError ? (
        <p className="mt-1 text-base text-red-300">{fieldError}</p>
      ) : !listOpen && confirmed ? (
        <p className="mt-1 text-base text-emerald-300">כתובת מאומתת על המפה</p>
      ) : !listOpen && value.trim().length >= 3 ? (
        <p className="mt-1 text-base text-amber-200">בחרו כתובת מהרשימה, או גררו את הסיכה לבית הנכון</p>
      ) : !listOpen && emptyHint ? (
        <p className="mt-1 text-base text-violet-300">הכתובת חייבת להיות כתובת אמיתית בשכונה</p>
      ) : null}
    </div>
  );
}

export async function reversePin(lat: number, lng: number): Promise<AddressHit | null> {
  const res = await fetch(`/api/address?lat=${lat}&lng=${lng}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { hit?: AddressHit | null };
  return data.hit ?? null;
}
