# HallowHood — Manual Test Checklist

**Open on your phone:** `/checklist` (formatted) or `/docs/MANUAL_TEST_CHECKLIST.md` (raw markdown)

Use this before event night. CI already covers logic, API, and Playwright flows — this list is **device-only** and **feel/permission** checks.

**Tips**
- Rehearsal mode: open `/?rehearsal=open` or Admin → בדיקות → שעון בדיקות
- Record device + browser on each row (e.g. `iPhone 15 / Safari A2HS`)
- One-time production cleanup if needed: `npm run purge:e2e-houses` (Firebase creds)

---

## How to use

| Pass | Meaning |
|------|---------|
| ☐ → ☑ | Works as expected on a real device |
| N/A | Not relevant for this platform |
| Skip | Already verified on another device this round |

---

## A. Minimum pre-event pass (do these first)

| ☐ | ID | Test | Device | Notes |
|---|-----|------|--------|-------|
| ☐ | INS-01 | Map loads at `/` with pins, Hebrew RTL | | |
| ☐ | INS-07 | First visit online caches catalog | | |
| ☐ | INS-08 | Second launch offline still shows houses | | |
| ☐ | PUSH-03 | Test push notification arrives | | iOS needs A2HS first |
| ☐ | MAP-03 | Multi-unit address (חרוזים 8): **3 units** in real mode, tappable list | | |
| ☐ | ROUTE-05 | Actions → ניווט opens Google Maps **walking**, **street text** (not coordinates) | | |
| ☐ | OFF-02 | Server down → “השרת לא עונה” + saved list | | Admin → בדיקות → השרת לא עונה |
| ☐ | OFF-03 | Airplane mode → “אין אינטרנט” + saved list | | |

---

## B. Installation & PWA (P0)

### iPhone — Safari (browser tab)

| ☐ | ID | Test | Pass |
|---|-----|------|------|
| ☐ | INS-01 | Map loads with pins | |
| ☐ | INS-02 | Share → Add to Home Screen completes | |
| ☐ | INS-04 | Name: HallowHood / הלואין בשכונה | |
| ☐ | INS-07 | Catalog cached after first online visit | |
| ☐ | INS-08 | Offline relaunch shows cached houses | |

### iPhone — Home Screen (A2HS / standalone)

| ☐ | ID | Test | Pass |
|---|-----|------|------|
| ☐ | INS-01 | Map loads from home screen icon | |
| ☐ | INS-03 | RTL layout looks correct in standalone | |
| ☐ | INS-04 | App name correct on home screen | |
| ☐ | INS-08 | Offline relaunch works | |

### Android — Chrome

| ☐ | ID | Test | Pass |
|---|-----|------|------|
| ☐ | INS-01 | Map loads | |
| ☐ | INS-02 | Manual A2HS via menu (⋮ → Add to Home screen) | |
| ☐ | INS-05 | Android Chrome: menu shows Install app (full PWA) | |
| ☐ | INS-06 | A2HS icon launches app | |
| ☐ | INS-07 | Catalog cached | |
| ☐ | INS-08 | Offline relaunch works | |

---

## C. Push notifications (P0 — real devices)

| ☐ | ID | Test | iOS Safari | iOS A2HS | Android |
|---|-----|------|:----------:|:--------:|:-------:|
| ☐ | PUSH-01 | Subscribe flow completes | | | |
| ☐ | PUSH-02 | Without A2HS: shows install-first guidance | | N/A | N/A |
| ☐ | PUSH-03 | Test notification arrives on device | | | |
| ☐ | PUSH-04 | Unsubscribe works | | | |
| ☐ | PUSH-05 | Alert settings / topic toggles persist | | | |
| ☐ | PUSH-06 | Owner update → neighbor alert (night scenario) | | | |
| ☐ | PUSH-07 | Admin broadcast reaches subscribers | | | |

---

## D. Visitor flows — spot-check on phone (P0)

Automated in CI; confirm **feel** on at least one phone.

| ☐ | ID | Test | Expected |
|---|-----|------|----------|
| ☐ | MAP-02 | Tap pin → bottom sheet; pin visible above card | Sheet readable, map pans |
| ☐ | MAP-04 | Map ↔ list toggle | Same houses; list by distance |
| ☐ | MAP-05 | Filter → הצג תוצאות | Count updates; other pins dim |
| ☐ | MAP-06 | “פתוחים עכשיו” with `/?rehearsal=open` | Only open houses |
| ☐ | MAP-07 | Like (❤️) | Persists after refresh |
| ☐ | MAP-08 | Visited (✓) | Excluded from new route |
| ☐ | MAP-09 | Toolbar quick filters (❤️ / לא ביקרתי) | Filters list/map |
| ☐ | MAP-10 | Skip house | Hidden; on skipped page |
| ☐ | MAP-11 | Temp skip restore alert | Alert when house reopens |
| ☐ | ROUTE-01 | Route mode | Walking line + stop numbers |
| ☐ | ROUTE-02 | Route respects active filters | |
| ☐ | ROUTE-03 | Route excludes visited | Empty route message |
| ☐ | ROUTE-04 | Finish route | “סיימתם את המסלול!” |
| ☐ | ORIGIN-01 | Neighborhood center origin | Distances sensible |
| ☐ | ORIGIN-02 | GPS origin | Permission + accurate distance |
| ☐ | ORIGIN-03 | Pick origin on map | |
| ☐ | SHARE-01 | Share house link | URL opens correct house |
| ☐ | SHARE-02 | Focus link `/?focus=…` | Opens house on map |
| ☐ | STATS-01 | Stats page | Personal + neighborhood counts |
| ☐ | A11Y-01 | “דלג לרשימת הבתים” | Reaches list |

---

## E. House owner flows (P0)

| ☐ | ID | Test | Expected |
|---|-----|------|----------|
| ☐ | ADD-01 | Add house happy path | On map; 6-digit edit code |
| ☐ | ADD-02 | Address outside neighborhood | Validation error |
| ☐ | ADD-04 | Edit with wrong code | Shows error; edit denied |
| ☐ | ADD-05 | Edit with correct code | Opens edit |
| ☐ | EDIT-01 | Quick update (`/?rehearsal=open`) | Stock/status saves |
| ☐ | EDIT-02 | Quick update offline | Queued; syncs when online |
| ☐ | EDIT-03 | **Photo upload on real/slow network** | Compresses; loads on card |
| ☐ | EDIT-04 | Delete house | Removed from public map |
| ☐ | MY-01 | My houses page | Device-owned houses listed |

---

## F. Offline & resilience (P0)

**Event night T-2h:** run section F on **3 physical devices**.

| ☐ | ID | Test | How to trigger | Expected |
|---|-----|------|----------------|----------|
| ☐ | OFF-01 | Catalog cached | First online visit | Data in localStorage |
| ☐ | OFF-02 | Server down banner | Admin → השרת לא עונה | “השרת לא עונה” + list |
| ☐ | OFF-03 | No internet | Airplane mode | “אין אינטרנט” + list |
| ☐ | OFF-04 | No cache offline | Fresh install + offline | “אין עותק שמור” |
| ☐ | OFF-05 | `/offline.html` | Open while offline | Saved houses list |
| ☐ | OFF-06 | Auto-refresh ~3 min | Stay online 3+ min | Catalog updates |
| ☐ | OFF-07 | Owner offline queue | Edit offline → online | Changes sync |

---

## G. Admin (P1)

| ☐ | ID | Test | Expected |
|---|-----|------|----------|
| ☐ | ADM-01 | Login at `/admin` | Admin menu visible |
| ☐ | ADM-02 | Edit house without owner code | |
| ☐ | ADM-03 | Freeze house | Frozen on map |
| ☐ | ADM-04 | Delete house | Removed from catalog |
| ☐ | ADM-05 | Rehearsal scenes | Pins/banners match scene |
| ☐ | ADM-06 | Server-down simulation | Banner on map |
| ☐ | ADM-07 | Active visitors count | Reasonable number |
| ☐ | ADM-08 | CSV export | Hebrew headers; opens in Excel |
| ☐ | ADM-09 | Logout | Session cleared |

---

## H. Export & search (P2)

| ☐ | ID | Test | Expected |
|---|-----|------|----------|
| ☐ | EXP-01 | Excel export from map | `.xlsx` downloads |
| ☐ | EXP-02 | Search page `/search` | Finds and opens house |
| ☐ | EXP-03 | Skipped houses restore | Restore returns to route |

---

## I. Visual & cross-browser (P1–P2)

| ☐ | Area | Check |
|---|------|-------|
| ☐ | RTL | Hebrew layout not clipped or mirrored wrong |
| ☐ | Map tiles | Dark/light toggle readable |
| ☐ | Samsung / Firefox | Basic map + list if used in neighborhood |
| ☐ | Desktop Chrome | Optional smoke (secondary) |

---

## J. Load smoke (~1 week before event)

| ☐ | Test | Pass |
|---|------|------|
| ☐ | 10 phones on production simultaneously | Map/list responsive |
| ☐ | Route mode under load | Line + stops render |
| ☐ | Admin stats during traffic | Page loads |

---

## K. Production one-offs

| ☐ | Task | Done |
|---|------|------|
| ☐ | `npm run purge:e2e-houses` if test houses leaked to Firestore | |
| ☐ | Confirm Vercel deploy from latest `main` is live | |
| ☐ | Verify חרוזים 8 shows **3** real units (not 4+) | |

---

## Covered by CI — skip unless debugging

- Unit tests (`npm test`)
- API integration (`npm run test:api`)
- Stress test (`npm run test:stress`)
- E2E: offline, visitor flows, batches 3–7, SW precache (`npm run test:e2e`)
- ADD-03 validation logic, ROUTE-05 URL format, cluster grouping

---

## Sign-off

| Role | Name | Date | Devices tested |
|------|------|------|----------------|
| Owner | | | |
| Tester | | | |

**Event night ready:** ☐ Minimum pass (A) ☐ Offline on 3 devices (F) ☐ Push verified (C)
