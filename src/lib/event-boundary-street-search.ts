type StreetRow = { street: string; city: string };

export function normalizeStreetToken(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[''""`׳״]/g, "")
    .replace(/\s+/g, " ");
}

/** Loose Hebrew match (e.g. אבא הילל ≈ אבא הלל). */
export function looseStreetQueryMatch(street: string, query: string): boolean {
  const stripYod = (s: string) => normalizeStreetToken(s).replace(/י/g, "");
  const ss = stripYod(street);
  const qq = stripYod(query);
  if (!qq) return true;
  if (ss.includes(qq) || qq.includes(ss)) return true;

  const qTokens = qq.split(/\s+/).filter(Boolean);
  const sTokens = ss.split(/\s+/).filter(Boolean);
  if (qTokens.length === 0) return true;

  return qTokens.every((qt) =>
    sTokens.some((st) => {
      if (st.startsWith(qt) || qt.startsWith(st)) return true;
      if (st.length >= 2 && qt.length >= 2 && st.slice(0, 2) === qt.slice(0, 2)) {
        const minLen = Math.min(st.length, qt.length);
        let same = 0;
        for (let i = 0; i < minLen; i++) if (st[i] === qt[i]) same++;
        return same / minLen >= 0.75;
      }
      return false;
    }),
  );
}

export function streetMatchScore(street: string, query: string): number {
  if (!looseStreetQueryMatch(street, query)) return 0;
  const ns = normalizeStreetToken(street);
  const nq = normalizeStreetToken(query);
  if (ns === nq) return 100;
  if (normalizeStreetToken(street).replace(/י/g, "") === normalizeStreetToken(query).replace(/י/g, "")) {
    return 95;
  }
  if (ns.startsWith(nq)) return 80;
  if (nq.startsWith(ns)) return 70;
  return 50;
}

/** Drop longer names that extend a shorter match in the same city (אבא הלל vs אבא הלל סילבר). */
export function collapseStreetPrefixDuplicates(rows: StreetRow[], query: string): StreetRow[] {
  const byCity = new Map<string, StreetRow[]>();
  for (const row of rows) {
    const list = byCity.get(row.city) ?? [];
    list.push(row);
    byCity.set(row.city, list);
  }

  const out: StreetRow[] = [];
  for (const list of byCity.values()) {
    const sorted = [...list].sort((a, b) => a.street.length - b.street.length);
    const kept: StreetRow[] = [];
    for (const row of sorted) {
      const ns = normalizeStreetToken(row.street);
      const dominated = kept.some((k) => {
        const nk = normalizeStreetToken(k.street);
        if (!ns.startsWith(`${nk} `)) return false;
        return streetMatchScore(k.street, query) >= streetMatchScore(row.street, query);
      });
      if (!dominated) kept.push(row);
    }
    out.push(...kept);
  }
  return out;
}

export function rankAndFilterStreets(rows: StreetRow[], query: string, limit: number): StreetRow[] {
  const scored = rows
    .map((row) => ({ row, score: streetMatchScore(row.street, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.row.street.length - b.row.street.length);

  const deduped: StreetRow[] = [];
  const seen = new Set<string>();
  for (const { row } of scored) {
    const key = `${row.city}|${row.street}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return collapseStreetPrefixDuplicates(deduped, query).slice(0, limit);
}
