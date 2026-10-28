#!/usr/bin/env node
/**
 * Scan house addresses in repo catalogs (+ optional Firestore via build-catalog)
 * and ensure data/event-street-labels.json has an English label for each road.
 *
 *   node --import tsx scripts/sync-event-street-labels.mjs
 *   node --import tsx scripts/sync-event-street-labels.mjs --check   # CI: exit 1 if gaps
 *   node --import tsx scripts/sync-event-street-labels.mjs --fetch   # Nominatim EN for missing
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const labelsPath = join(root, "data/event-street-labels.json");

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const fetchMissing = args.has("--fetch");

const { collectEventStreetRoads, collectEventStreetRoadsFromFirestore } = await import(
  "../src/lib/i18n/collect-event-street-roads.ts"
);
const { hasEnglishStreetMapping } = await import("../src/lib/i18n/event-street-labels.ts");

const fromFirestore = args.has("--from-firestore");

const USER_AGENT = "HalloweenNeighborhood/1.0 (street-label sync)";
const MIN_GAP_MS = 1100;
let lastCall = 0;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function nominatimEnglishRoad(roadHe) {
  const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastCall));
  if (wait) await sleep(wait);
  lastCall = Date.now();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("accept-language", "en");
  url.searchParams.set("countrycodes", "il");
  url.searchParams.set("q", `${roadHe}, Ramat Gan`);

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;
  const hits = await res.json();
  const hit = hits?.[0];
  if (!hit) return null;

  const named = hit.namedetails ?? {};
  const fromNamed = named["name:en"] || named.int_name || named.name;
  const fromAddress = hit.address?.road || hit.address?.pedestrian || hit.address?.residential;
  let label = (fromAddress || fromNamed || "").trim();
  if (!label || /[\u0590-\u05FF]/u.test(label)) {
    const head = String(hit.display_name ?? "").split(",")[0]?.trim() ?? "";
    if (head && !/[\u0590-\u05FF]/u.test(head)) label = head;
  }
  if (!label || /[\u0590-\u05FF]/u.test(label)) return null;
  return formatEnglishStreetLabel(label, roadHe);
}

function formatEnglishStreetLabel(label, roadHe) {
  let out = label.replace(/\s+/g, " ").trim();
  const lower = out.toLowerCase();
  const isSderot = /^(שדרות|שדרת)\s/u.test(roadHe) || /sderot|boulevard|blvd| rd$/iu.test(out);
  if (isSderot && !/sderot|blvd|boulevard| rd$/iu.test(out)) {
    if (!/^sderot\s/iu.test(out)) out = `Sderot ${out}`;
  } else if (!/\b(st|street|rd|road|blvd|boulevard|sderot)\b/iu.test(out)) {
    out = `${out} St`;
  }
  return out;
}

function sortLabels(obj) {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b, "he")),
  );
}

const labels = JSON.parse(readFileSync(labelsPath, "utf8"));
let roads = collectEventStreetRoads();
if (fromFirestore) {
  try {
    const firestoreRoads = await collectEventStreetRoadsFromFirestore();
    if (firestoreRoads.length) {
      roads = [...new Set([...roads, ...firestoreRoads])].sort((a, b) => a.localeCompare(b, "he"));
      console.log(`Firestore: ${firestoreRoads.length} distinct roads (${roads.length} total scanned).`);
    } else {
      console.warn("Firestore: no houses — check FIREBASE_* env.");
    }
  } catch (error) {
    console.warn("Firestore scan skipped:", error instanceof Error ? error.message : error);
  }
}
const missing = roads.filter((road) => !hasEnglishStreetMapping(road));

if (missing.length === 0) {
  console.log(`event-street-labels: ${roads.length} roads — all mapped.`);
  process.exit(0);
}

console.log(`event-street-labels: ${missing.length} unmapped of ${roads.length} roads:`);
for (const road of missing) console.log(`  · ${road}`);

if (checkOnly) {
  process.exit(1);
}

if (!fetchMissing) {
  console.log("Run with --fetch to query Nominatim (en) and append labels.");
  process.exit(1);
}

let added = 0;
for (const road of missing) {
  const en = await nominatimEnglishRoad(road);
  if (!en) {
    console.warn(`  skip (no EN hit): ${road}`);
    continue;
  }
  labels[road] = en;
  added += 1;
  console.log(`  + ${road} → ${en}`);
}

if (added === 0) {
  console.error("No new labels fetched.");
  process.exit(1);
}

writeFileSync(labelsPath, `${JSON.stringify(sortLabels(labels), null, 2)}\n`, "utf8");
console.log(`Wrote ${added} label(s) to data/event-street-labels.json`);

const stillMissing = roads.filter((road) => !hasEnglishStreetMapping(road));
if (stillMissing.length) {
  console.warn(`Still unmapped (${stillMissing.length}):`, stillMissing.join(", "));
  process.exit(1);
}
