# HallowHood — Test Plan

**App:** Halloween neighborhood PWA (Next.js 16, React 19)  
**Targets:** Mobile web + PWA on iOS Safari and Android Chrome; desktop web secondary  
**Scale goal:** ~1,000 concurrent readers on event night

---

## Automated test commands

```bash
npm test              # Unit tests only (src/lib/*.test.ts)
npm run test:api      # API integration (isolated server, port auto-picked)
npm run test:stress   # Load test — GET /api/catalog + /catalog.json
npm run test:e2e      # Playwright E2E (offline + visitor flows)
npm run test:all      # Unit + API + stress + E2E
npm run ci            # Unit + build + API + stress + E2E (local CI mirror)
npm run lint          # ESLint (not in CI yet — 36 existing errors)
```

**CI** (`.github/workflows/ci.yml`): unit → build → API integration → stress (200 concurrent) → browser E2E on every PR and `main` push.

**Rehearsal mode** for time-sensitive manual tests: `/?rehearsal=open` or Admin → חזרה כללית.

---

## 1. Platform & installation matrix

| Platform | Install method | Display mode | Push | GPS | Offline catalog | Priority |
|----------|---------------|--------------|------|-----|-----------------|----------|
| **iOS Safari** | Share → Add to Home Screen | `standalone` | Requires A2HS first | Yes | localStorage + IndexedDB + SW | **P0** |
| **iOS PWA (A2HS)** | Already installed | `standalone` | Full push after permission | Yes | Same | **P0** |
| **Android Chrome** | Menu → Add to Home Screen (manual; auto-install blocked) | `browser` (avoids WebAPK/Play Protect) | Web Push after permission | Yes | Same | **P0** |
| **Android Samsung/Firefox** | Manual A2HS if supported | varies | May differ | Yes | Same | **P1** |
| **Desktop Chrome** | Optional install | `standalone` or tab | Works | N/A | Same | **P2** |
| **Native App Store / Play** | Not in scope | — | — | — | — | Out of scope |

### P0 installation smoke tests (manual, per platform)

| ID | Test | iOS Safari | iOS A2HS | Android Chrome |
|----|------|:----------:|:--------:|:--------------:|
| INS-01 | First visit loads map with house pins | ✓ | ✓ | ✓ |
| INS-02 | A2HS flow completes; icon on home screen | ✓ | — | ✓ |
| INS-03 | Launched from home screen: RTL Hebrew layout | — | ✓ | partial |
| INS-04 | App name: HallowHood / הלואין בשכונה | ✓ | ✓ | ✓ |
| INS-05 | Android: Chrome install banner does not auto-trigger WebAPK | — | — | ✓ |
| INS-06 | Android: manual A2HS via menu works | — | — | ✓ |
| INS-07 | First visit online → catalog cached locally | ✓ | ✓ | ✓ |
| INS-08 | Second launch offline → map/list show saved houses | ✓ | ✓ | ✓ |

---

## 2. Automated coverage map

### Unit tests (`src/lib/*.test.ts` — 29 files, 147 cases)

| Domain | Covered |
|--------|---------|
| House filtering (candy, scare, hours, sensitivities, neighborhoods) | ✅ |
| Walking route ordering, geometry, completion, changes | ✅ |
| Skip reasons & temp restore logic | ✅ |
| Catalog merge/sync | ✅ |
| Push templates, topics, policy | ✅ |
| PWA manifest per user-agent (iOS standalone, Android browser) | ✅ |
| Address fields, photos, nav links, storage errors | ✅ |
| Admin snapshot, rehearsal stubs, quick-update logic | ✅ |
| Map a11y announcements (logic) | ✅ |
| CSV export (`house-csv.test.ts`) | ✅ EXP-01 |
| Search matching (`house-search.test.ts`) | ✅ EXP-02 logic |
| Add-form minimum rule (`house-submit-minimum.test.ts`) | ✅ ADD-03 client rule |
| Multi-unit cluster grouping (`house-clusters.test.ts`) | ✅ MAP-03 logic |

### Load test (`scripts/stress-test.mjs`)

| Endpoint | Coverage |
|----------|----------|
| GET `/api/catalog` | ✅ p50/p95/p99, error rate |
| GET `/catalog.json` | ✅ same |

### API integration (`scripts/api-integration.mjs`)

| Scenario | Manual ID | Coverage |
|----------|-----------|----------|
| GET `/api/catalog` JSON + poll headers | — | ✅ |
| GET `/api/catalog?since=…` delta | — | ✅ |
| Admin login reject / accept + session + logout | ADM-01, ADM-09 | ✅ |
| POST `/api/houses` out of bounds | ADD-02 | ✅ |
| POST `/api/houses` decor-only / candy-only | ADD-01 | ✅ |
| POST `/api/houses` create + catalog + admin delete | ADD-01 | ✅ |
| POST `/api/houses/[id]/unlock` wrong / correct code | ADD-04, ADD-05 | ✅ |
| Admin PATCH freeze (`adminFrozen`) | ADM-03 | ✅ |
| Admin DELETE removes house from catalog | ADM-04 | ✅ |
| Admin CSV export Hebrew headers | ADM-08 | ✅ |

### E2E — offline (`scripts/check-offline-catalog.mjs`)

| Scenario | Manual ID | Coverage |
|----------|-----------|----------|
| Catalog saved to localStorage after first load | OFF-01 | ✅ |
| List view shows cached houses | MAP-04 | ✅ |
| Server-down banner with cached list (sim-server) | OFF-02 | ✅ |
| Offline banner with cached list | OFF-03 | ✅ |
| `/offline.html` lists saved houses | OFF-05 | ✅ |

### E2E — visitor flows (`scripts/e2e-visitor-flows.mjs`)

| Scenario | Manual ID | Coverage |
|----------|-----------|----------|
| Map loads with houses (rehearsal) | MAP-01 | ✅ |
| Map ↔ list toggle | MAP-04 | ✅ |
| List row opens house detail | MAP-02 | ✅ |
| Like / visit via actions menu → localStorage | MAP-07, MAP-08 | ✅ |
| Liked-only quick filter | MAP-09 | ✅ |
| Open-now filter in rehearsal | MAP-06 | ✅ |
| Route empty when all visited + “לא ביקרתי” filter (list view) | ROUTE-03 | ✅ |
| Route mode controls | ROUTE-01 | ✅ |
| Skip link → list view | A11Y-01 | ✅ |
| Search page opens house | EXP-02 | ✅ |
| Filter dims non-matching pins | MAP-05 | ✅ |
| Multi-unit address data in catalog | MAP-03 | ✅ (logic in unit test) |
| Skip house + skipped page restore | MAP-10, EXP-03 | ✅ |
| Temp skip restore alert | MAP-11 | ✅ |
| Route respects filters / completion cheer | ROUTE-02, ROUTE-04 | ✅ |
| My houses page | MY-01 | ✅ |
| Service worker shell precache | SW precache | ✅ |
| `/offline.html` empty state (no cache) | OFF-04 | ✅ |

### Not automated

| Area | Count | Notes |
|------|-------|-------|
| React components | 87 files | UI/visual |
| Hooks | 20 files | Client state |
| Most pages/routes | 22 pages | search, add form UI, admin UI |
| Remaining API routes | push, walk-route, photo upload | Partial CRUD covered |
| Service Worker | `public/sw.js` | Precache, tile cache |
| Push delivery E2E | PUSH-01–07 | Real device + permission |
| PWA install (A2HS) | INS-02–06 | OS-level UX |
| Photo upload | EDIT-03 | Cloudinary/Blob |
| Firestore activity totals | — | Production integration |
| Excel download button | EXP-01 UI | CSV logic unit-tested |
| Cross-browser visual | — | Hebrew RTL, map tiles |
| GPS / real location | ORIGIN-02 | Device permission |

---

## 3. Required manual tests

### A. Core visitor flows (P0)

| ID | Scenario | Expected |
|----|----------|----------|
| MAP-01 | Map loads as home (`/`) | Pins visible, Hebrew RTL |
| MAP-02 | Pin → house card | Bottom sheet; map pans pin above card |
| MAP-03 | Multi-unit address (×N pin) | One pin per building |
| MAP-04 | Map ↔ list toggle | Same houses; list sorted by distance |
| MAP-05 | Filter sheet → הצג תוצאות | Count updates; non-matching pins dimmed |
| MAP-06 | "פתוחים עכשיו" filter (`/?rehearsal=open`) | Only open houses |
| MAP-07 | Like (heart) | "שמרתם!" — persists after refresh |
| MAP-08 | Visited (✓) | "כל הכבוד!" — excluded from new route |
| MAP-09 | Quick filters (❤️ / ✓ toolbar) | Filters to saved / not-visited |
| MAP-10 | Skip house | Hidden; appears on skipped page |
| MAP-11 | Temp skip restore | Alert when house reopens |
| ROUTE-01 | Enter route mode | Walking line + stop numbers |
| ROUTE-02 | Route respects filters | Only matching stops |
| ROUTE-03 | Route excludes visited | Empty route message |
| ROUTE-04 | Route completion | "סיימתם את המסלול!" |
| ROUTE-05 | Google Maps nav | Walking mode; street+city only |
| ORIGIN-01–03 | Distance origin options | Center / GPS / map pick |
| SHARE-01–02 | Share & focus links | URL works |
| A11Y-01 | Skip to list link | Accessible list |
| STATS-01 | Stats page | Personal + neighborhood counts |

### B. House owner flows (P0)

| ID | Scenario | Expected |
|----|----------|----------|
| ADD-01 | Add house happy path | On map; 6-digit edit code |
| ADD-02 | Address outside neighborhood | Validation error |
| ADD-03 | No decor AND no candy | Validation error |
| ADD-04–05 | Edit with/without code | Code gate or direct edit |
| EDIT-01 | Quick update (rehearsal open) | Stock/status saves |
| EDIT-02 | Quick update offline | Queued locally (`e2e-batch5.mjs`) |
| EDIT-03 | Photo upload | Compressed; tap-to-load on slow network |
| EDIT-04 | Delete house | Removed from public map |
| MY-01 | My houses page | Device-owned houses listed |

### C. Offline & resilience (P0)

| ID | Scenario | Expected | Auto |
|----|----------|----------|:----:|
| OFF-01 | First visit online | Catalog cached | ✅ E2E |
| OFF-02 | Server down | "השרת לא עונה" + saved list | ✅ E2E |
| OFF-03 | No internet | "אין אינטרנט" + saved list | ✅ E2E |
| OFF-04 | First visit offline (no cache) | "אין עותק שמור" | ✅ E2E (`offline.html`) |
| OFF-05 | `/offline.html` | Saved houses list | ✅ E2E |
| OFF-06 | Auto-refresh (~3 min) | Catalog updates when online | `e2e-batch5.mjs` |
| OFF-07 | Owner offline queue | Syncs when network returns | `e2e-batch4.mjs` |

### D. Push notifications (P0 on real devices)

| ID | Scenario | Platform |
|----|----------|----------|
| PUSH-01 | Subscribe flow | All |
| PUSH-02 | iOS without A2HS shows guidance | iOS Safari |
| PUSH-03 | Test notification | A2HS / Android |
| PUSH-04–07 | Unsubscribe, settings, night updates, admin broadcast | All |

### E. Admin flows (P1)

| ID | Scenario |
|----|----------|
| ADM-01 | Login at `/admin` |
| ADM-02 | Edit without code |
| ADM-03 | Freeze house |
| ADM-04 | Delete house |
| ADM-05 | Rehearsal scenes |
| ADM-06 | Server-down rehearsal |
| ADM-07 | Active visitors count |
| ADM-08 | Export with admin columns |
| ADM-09 | Logout |

### F. Export & misc (P2)

| ID | Scenario |
|----|----------|
| EXP-01 | Excel export filtered list |
| EXP-02 | Search house (`/search`) |
| EXP-03 | Skipped houses restore |

---

## 4. Manual → automated conversion roadmap

### Done / in CI

| Manual ID | Auto test |
|-----------|-----------|
| OFF-01–05 | `npm run test:e2e` |
| MAP-01, MAP-02, MAP-04, MAP-06–09, MAP-07–08 | `e2e-visitor-flows.mjs` |
| MAP-03, MAP-05, MAP-10–11, ROUTE-02, ROUTE-04, EXP-03, MY-01 | `e2e-batch3.mjs` |
| STATS-01, ORIGIN-01, OFF-07 | `e2e-batch4.mjs` |
| SHARE-02, EDIT-02, ORIGIN-02–03, MAP-03 UI, OFF-06 | `e2e-batch5.mjs` |
| ROUTE-01, ROUTE-03 | `e2e-visitor-flows.mjs` |
| A11Y-01, EXP-02 | `e2e-visitor-flows.mjs` |
| SW precache | `check-sw-precache.mjs` |
| ADD-01, ADD-02, ADD-04, ADD-05, ADM-01, ADM-03, ADM-04, ADM-08, ADM-09 | `npm run test:api` |
| EDIT-01, EDIT-04, PUSH API, walk-route API | `npm run test:api` |
| PUSH unsubscribe/test, address API, photo validation, house notify, ADM-02/07, admin push | `npm run test:api` |
| SHARE-01 (share URL path), ROUTE-05 (Maps walking URL) | `nav-links.test.ts` |
| ORIGIN-02–03 resolution, OFF-06 poll interval | `distance-origin.test.ts`, `catalog-poll.test.ts` |
| MAP-03 cluster grouping | `house-clusters.test.ts` |
| ADD-03 (client rule) | `house-submit-minimum.test.ts` |
| EXP-01 (CSV logic) | `house-csv.test.ts` |
| Filter logic | `filter-houses.test.ts` |
| Route ordering | `route-order.test.ts` |
| PWA manifest | `pwa-manifest.test.ts` |
| Load at scale | `npm run test:stress` |

### Next candidates (low priority)

| Manual ID | Proposed test | Framework |
|-----------|---------------|-----------|
| ROUTE-05 | Google Maps handoff in browser | Manual device check |
| EDIT-03 | Photo upload on slow network | Manual / staging |
| ADM-05/06 | Rehearsal scene UI | Playwright visual |

### Must stay manual

| Area | Reason |
|------|--------|
| A2HS install flows | OS-level UX |
| Push permissions & delivery | Browser dialogs; iOS A2HS requirement |
| Real GPS | Device permission |
| Multi-device load feel | 10+ physical phones |
| Photo upload on slow 3G | Real network |
| Cross-browser visual (RTL, tiles) | Visual judgment |

---

## 5. Test execution schedule

| When | What | Where |
|------|------|-------|
| Every PR | Unit + build + API + stress + E2E | GitHub Actions |
| Weekly pre-event | Full manual P0 on iPhone A2HS + Android | Physical devices |
| 1 week before event | 10-phone load smoke | Staging/production |
| Event night T-2h | OFF-01–07 on 3 devices; PUSH-03 | Production |
| Post-event | Review Firestore activity totals | Admin stats |

---

## 6. Coverage summary

```
Automated:     ~40% business logic (lib layer)
               ~25% total surface (API + E2E + stress)

Manual P0:     ~25% (install, push, GPS, photo upload)

Convertible:   ~15% of remaining manual → Playwright + API

Must stay manual: ~15% (A2HS, push permissions, multi-device)
```

---

## 7. Known gaps

| Priority | Gap | Status |
|----------|-----|--------|
| P0 | Offline E2E in CI | ✅ Wired |
| P0 | quick-update unit tests | ✅ Fixed (policy: no house-status push) |
| P1 | ESLint in CI | Blocked — 36 existing errors |
| P1 | API route tests | Not started |
| P1 | Service Worker tests | Not started |
| P2 | Component tests | Not started |
