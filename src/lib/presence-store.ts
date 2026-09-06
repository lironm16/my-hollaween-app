const DEVICE_TTL_MS = 2.5 * 60 * 1000;
const MAX_DEVICES = 2500;

type GlobalBag = { __hwPresence?: Map<string, number> };

function bag() {
  const g = globalThis as GlobalBag;
  if (!g.__hwPresence) g.__hwPresence = new Map();
  return g.__hwPresence;
}

function prune(now = Date.now()) {
  const devices = bag();
  for (const [id, seen] of devices) {
    if (now - seen > DEVICE_TTL_MS) devices.delete(id);
  }
}

export function touchPresence(id: string) {
  const clean = id.trim().slice(0, 40);
  if (!clean || clean.length < 8) return countPresence();
  const now = Date.now();
  prune(now);
  const devices = bag();
  if (!devices.has(clean) && devices.size >= MAX_DEVICES) prune(now);
  if (devices.size < MAX_DEVICES || devices.has(clean)) devices.set(clean, now);
  return devices.size;
}

export function countPresence() {
  prune();
  return bag().size;
}
