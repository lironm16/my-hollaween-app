"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Home } from "lucide-react";
import { inputStyles } from "@/components/ui/input";
import { formatDisplayAddress } from "@/lib/config";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function houseSearchHaystack(house: PublicHouse) {
  return [house.name, formatDisplayAddress(house), house.arrival, house.description]
    .filter(Boolean)
    .join(" ");
}

export function houseMatchesQuery(house: PublicHouse, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return houseSearchHaystack(house).toLowerCase().includes(needle);
}

export function HousePicker({
  houses,
  selected,
  onSelect,
  ownedIds,
  loading,
  disabled,
  placeholder = "הקלידו שם משפחה או כתובת",
}: {
  houses: PublicHouse[];
  selected: PublicHouse | null;
  onSelect: (house: PublicHouse | null) => void;
  ownedIds?: string[];
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const owned = useMemo(() => new Set(ownedIds ?? []), [ownedIds]);

  useEffect(() => {
    if (!selected) return;
    setQuery(houseHeadline(selected));
  }, [selected]);

  const matches = useMemo(() => {
    const needle =
      selected && query === houseHeadline(selected) ? "" : query;
    const filtered = houses.filter((house) => houseMatchesQuery(house, needle));
    return [...filtered].sort((a, b) => {
      const ao = owned.has(a.id) ? 0 : 1;
      const bo = owned.has(b.id) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return houseHeadline(a).localeCompare(houseHeadline(b), "he");
    });
  }, [houses, query, owned, selected]);

  useEffect(() => {
    setActive(0);
  }, [query, houses.length]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(house: PublicHouse) {
    onSelect(house);
    setQuery(houseHeadline(house));
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        dir="rtl"
        autoComplete="off"
        spellCheck={false}
        id="house-pick"
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        role="combobox"
        className={cn(inputStyles, "h-10 bg-[#12081a]")}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setOpen(true);
          if (selected && next !== houseHeadline(selected)) onSelect(null);
        }}
        onFocus={(event) => {
          setOpen(true);
          event.currentTarget.select();
        }}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            setOpen(true);
            return;
          }
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          }
          if (event.key === "Enter" && open && matches[active]) {
            event.preventDefault();
            pick(matches[active]);
          }
        }}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl bg-[#1d1028] py-1 text-sm shadow-lg ring-1 ring-orange-500/30"
        >
          {loading ? (
            <li className="px-3 py-2 text-violet-300">טוענים בתים…</li>
          ) : matches.length === 0 ? (
            <li className="px-3 py-2 text-violet-300">אין בית כזה ברשימה. נסו שם משפחה או רחוב.</li>
          ) : (
            matches.map((house, index) => {
              const mine = owned.has(house.id);
              const address = formatDisplayAddress(house);
              return (
                <li key={house.id} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-right",
                      index === active ? "bg-orange-500/20 text-orange-50" : "text-orange-100",
                    )}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pick(house)}
                  >
                    <Home className="mt-0.5 size-3.5 shrink-0 text-orange-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{houseHeadline(house)}</span>
                      <span className="block text-sm text-violet-300">
                        {address}
                        {house.arrival ? ` · ${house.arrival}` : ""}
                      </span>
                      {mine ? (
                        <span className="mt-0.5 block text-sm text-emerald-300">הבית שלכם</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
