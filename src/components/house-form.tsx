"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { compressJpegFile, type PhotoFocus } from "@/lib/compress-image";
import { HousePhotoFrame } from "@/components/house-photo-frame";
import { AddressField, reversePin } from "@/components/address-field";
import { resolveAddressHit } from "@/lib/address-resolve-client";
import type { LocationResolution } from "@/lib/location-resolution";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { themeFromName } from "@/lib/labels";
import { useLocale } from "@/hooks/use-locale";
import { useLocalizedLabels } from "@/hooks/use-localized-labels";
import { hoursWindowsIssueLocalized } from "@/lib/i18n/hours-issue";
import { isPoiHouse } from "@/lib/house-kind";
import { displayAddressFromHit } from "@/lib/address-fields";
import {
  config,
  neighborhoodFromAddress,
  neighborhoodInferredFromPin,
  neighborhoodLabelForPin,
} from "@/lib/config";
import type { AddressHit } from "@/lib/types";
import { parseStreetAndNumber, streetPinHint } from "@/lib/address-text";
import {
  isSchoolCampusAddress,
  schoolCampusNeighborhoodForAddress,
} from "@/lib/school-campus";
import { eventNeighborhoodForNewHousePin } from "@/lib/add-house-event-zone";
import {
  SENSITIVITY_OPTIONS,
  type AccessibilityLevel,
  type DecorLevel,
  type EntryLevel,
  type HouseDisplayTier,
  type HouseInput,
  type HouseKind,
  type ScareLevel,
  type SensitivityId,
  type TreatId,
  type VisitState,
} from "@/lib/types";
import {
  accessibleBooleanFromLevel,
  resolveAccessibilityLevel,
  resolveDisplayTier,
  resolveEntryLevel,
} from "@/lib/house-visitor-fields";
import { candyTone, CandySign, type CandyTone } from "@/components/candy-glyphs";
import { freezeExpireIso, isOwnerFrozen, resolveDecorLevel } from "@/lib/house-state";
import { LocationKindSign } from "@/components/location-kind-sign";
import { PracticeLocationSign } from "@/components/practice-location-sign";
import { ScarePumpkin, ScareSign } from "@/components/scare-glyphs";
import { PIN_GLYPH_SCALE } from "@/lib/pin-faces";
import { SensitivityMark } from "@/components/sensitivity-glyphs";
import {
  houseHoursWindows,
  MAX_HOUR_WINDOWS,
  nightStatusControlsEnabled,
  parseClockMinutes,
  syncHoursFields,
} from "@/lib/hours";
import { useAppNow } from "@/hooks/use-app-clock";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { defaultAddHouseOpenHours } from "@/lib/event-settings";
import type { HoursWindow } from "@/lib/types";
import {
  normalizeOwnerPhone,
  ownerPhoneValidationError,
} from "@/lib/owner-phone";
import { HOUSE_FIELD_LIMITS } from "@/lib/schema";
import { cn } from "@/lib/utils";

const empty: HouseInput = {
  kind: "house",
  poiCategory: "other",
  name: "",
  theme: "pumpkin",
  address: "",
  arrival: "",
  description: "",
  lat: config.map.center.lat,
  lng: config.map.center.lng,
  treats: ["candy"],
  scareLevel: "mild",
  openFrom: "17:00",
  openTo: "20:00",
  openHours: [{ from: "17:00", to: "20:00" }],
  openFrom2: "",
  openTo2: "",
  notes: "",
  accessible: false,
  visit: "come",
  treatStock: { candy: "plenty" },
  decorLevel: "mild",
  decorated: true,
  neighborhood: undefined,
};

function clock(value: string) {
  return /^\d{2}:\d{2}/.exec(value)?.[0] ?? value;
}

function initialCandyTone(initial?: Partial<HouseInput>): CandyTone {
  if (!initial) return "plenty";
  return candyTone({ treats: initial.treats ?? ["candy"], treatStock: initial.treatStock });
}

function initialDecorLevel(initial?: Partial<HouseInput>): DecorLevel {
  if (!initial) return "mild";
  return resolveDecorLevel(initial);
}

export type HouseFormExtras = {
  photoDataUrl?: string;
  clearPhoto?: boolean;
  ownerFrozenUntil?: string | null;
  addedBy?: string | null;
  ownerPhone?: string | null;
};

export function HouseForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  busy,
  extraActions,
}: {
  initial?: Partial<HouseInput> & {
    id?: string;
    photoUrl?: string;
    visit?: VisitState;
    ownerFrozenUntil?: string | null;
    addedBy?: string | null;
    ownerPhone?: string | null;
    accessibilityLevel?: AccessibilityLevel;
    entryLevel?: EntryLevel;
    displayTier?: HouseDisplayTier;
  };
  submitLabel: string;
  onSubmit: (input: HouseInput, extras?: HouseFormExtras) => Promise<void> | void;
  onCancel?: () => void;
  busy?: boolean;
  extraActions?: ReactNode;
}) {
  const { t, locale, dir } = useLocale();
  const { scareShort, decorShort, houseKindLabels, candyTones } = useLocalizedLabels();
  const { catalog } = useCatalog();
  const catalogDefaultHours = useMemo(
    () =>
      defaultAddHouseOpenHours(
        catalog?.eventSettings?.eventOpenHours
          ? { eventOpenHours: catalog.eventSettings.eventOpenHours }
          : undefined,
      ),
    [catalog?.eventSettings?.eventOpenHours],
  );
  const [form, setForm] = useState<HouseInput>({ ...empty, ...catalogDefaultHours, ...initial });
  const [placeKind, setPlaceKind] = useState<"house" | "poi" | "practice">(() => {
    if (initial?.isPractice) return "practice";
    return initial?.kind === "poi" ? "poi" : "house";
  });
  const [locating, setLocating] = useState(false);
  const [addressOk, setAddressOk] = useState(Boolean(initial?.address && initial.lat && initial.lng));
  const [locationDraft, setLocationDraft] = useState<LocationResolution | null>(() => {
    if (!initial?.address || initial.lat === undefined || initial.lng === undefined) return null;
    return {
      sourceId: initial.locationSourceId ?? "legacy-edit",
      addressHe: initial.address,
      addressEn: initial.addressEn?.trim() || initial.address,
      lat: initial.lat,
      lng: initial.lng,
      precise: true,
    };
  });
  const [locationConfirmed, setLocationConfirmed] = useState(
    () => Boolean(initial?.locationSourceId) || Boolean(initial?.id && initial?.address),
  );
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [addressFieldActive, setAddressFieldActive] = useState(false);
  const [decorLevel, setDecorLevel] = useState<DecorLevel>(() => initialDecorLevel(initial));
  const [candy, setCandy] = useState<CandyTone>(() => initialCandyTone(initial));
  const [hourWindows, setHourWindows] = useState<HoursWindow[]>(() => {
    const windows = houseHoursWindows({ ...empty, ...catalogDefaultHours, ...initial });
    return windows.length ? windows : catalogDefaultHours.openHours;
  });
  const [nightStatus, setNightStatus] = useState<"open" | "pause" | "stop">(() => {
    if (initial?.visit === "closed") return "stop";
    if (isOwnerFrozen(initial ?? {})) return "pause";
    return "open";
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFocus, setPhotoFocus] = useState<PhotoFocus>({ x: 50, y: 50 });
  const [clearPhoto, setClearPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addedBy, setAddedBy] = useState(() => initial?.addedBy?.trim() ?? "");
  const [ownerPhone, setOwnerPhone] = useState(() => initial?.ownerPhone?.trim() ?? "");
  const [ownerPhoneTouched, setOwnerPhoneTouched] = useState(false);
  const [accessibilityLevel, setAccessibilityLevel] = useState<AccessibilityLevel | null>(() =>
    resolveAccessibilityLevel(initial ?? {}) ?? null,
  );
  const [entryLevel, setEntryLevel] = useState<EntryLevel | null>(
    () => resolveEntryLevel(initial ?? {}) ?? null,
  );
  const [displayTier, setDisplayTier] = useState<HouseDisplayTier | null>(
    () => resolveDisplayTier(initial ?? {}) ?? null,
  );
  const existingPhoto = initial?.photoUrl ?? "";
  const isNewHouse = !initial?.id;
  const ownerPhoneRequired = isNewHouse || !initial?.ownerPhone?.trim();
  const ownerPhoneError = ownerPhoneTouched
    ? ownerPhoneValidationError(ownerPhone, ownerPhoneRequired)
      ? !ownerPhone.trim()
        ? t("houseForm.phoneRequired")
        : t("houseForm.phoneInvalid")
      : null
    : null;
  const now = useAppNow();
  const { admin } = useAdminSession();
  const blocked = Boolean(busy || saving);

  useEffect(() => {
    if (!isNewHouse || initial?.openHours?.length || initial?.openFrom) return;
    setForm((prev) => ({ ...prev, ...catalogDefaultHours }));
    setHourWindows(catalogDefaultHours.openHours);
  }, [catalogDefaultHours, initial?.openFrom, initial?.openHours?.length, isNewHouse]);
  const isPracticePlace = placeKind === "practice";
  const isPoi = placeKind === "poi" && isPoiHouse({ ...form, kind: "poi" });
  const scareGlyph = isPoi ? ScarePumpkin : undefined;
  const scareGlyphScale = isPoi ? PIN_GLYPH_SCALE.poi : PIN_GLYPH_SCALE.house;

  function updateHourWindow(index: number, patch: Partial<HoursWindow>) {
    setHourWindows((current) =>
      current.map((window, i) => (i === index ? { ...window, ...patch } : window)),
    );
  }

  function addHourWindow() {
    setHourWindows((current) => {
      if (current.length >= MAX_HOUR_WINDOWS) return current;
      const last = current[current.length - 1];
      const nextFrom = last?.to || "20:00";
      const fromMin = parseClockMinutes(clock(nextFrom));
      const toMin = fromMin === null ? 21 * 60 : Math.min(23 * 60 + 59, fromMin + 60);
      if (fromMin !== null && toMin <= fromMin) return current;
      const hours = Math.floor(toMin / 60);
      const minutes = toMin % 60;
      const nextTo = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      return [...current, { from: nextFrom, to: nextTo }];
    });
  }

  function removeHourWindow(index: number) {
    setHourWindows((current) =>
      current.length <= 1 ? current : current.filter((_, i) => i !== index),
    );
  }

  function pickCandy(tone: CandyTone) {
    setCandy(tone);
    if (tone !== "plenty" && tone !== "low") {
      setForm((f) => {
        const treats = f.treats.filter((id) => !SENSITIVITY_OPTIONS.includes(id as SensitivityId));
        return { ...f, treats };
      });
    }
  }

  const candyOffered = candy === "plenty" || candy === "low";
  const undecorated = decorLevel === "none";
  const hoursIssue = hoursWindowsIssueLocalized(
    hourWindows.map((window) => ({ from: clock(window.from), to: clock(window.to) })),
    locale,
  );
  const hoursSource = {
    openHours: hourWindows,
    openFrom: hourWindows[0]?.from,
    openTo: hourWindows[0]?.to,
  };
  const pauseCloseEnabled = nightStatusControlsEnabled(hoursSource, now);

  useEffect(() => {
    if (!pauseCloseEnabled && nightStatus !== "open") setNightStatus("open");
  }, [pauseCloseEnabled, nightStatus]);

  useEffect(() => {
    const remembered = initial?.id ? null : readLastOwner();
    setAddedBy(initial?.addedBy?.trim() || remembered?.addedBy || "");
    setOwnerPhone(initial?.ownerPhone?.trim() || remembered?.ownerPhone || "");
    setOwnerPhoneTouched(false);
  }, [initial?.id, initial?.addedBy, initial?.ownerPhone]);

  useEffect(() => {
    if (!initial?.id && initial?.neighborhood === undefined) return;
    setForm((f) => {
      if (f.neighborhood !== undefined) return f;
      if (initial?.neighborhood !== undefined) {
        return { ...f, neighborhood: initial.neighborhood };
      }
      const fromText = initial?.address ? neighborhoodFromAddress(initial.address) : null;
      return fromText !== null ? { ...f, neighborhood: fromText } : f;
    });
  }, [initial?.id, initial?.neighborhood, initial?.address]);

  /** Houses missing street text (legacy redaction / bad rows) — infer from pin so save is not blocked. */
  useEffect(() => {
    if (!initial?.id || initial.address?.trim()) return;
    if (typeof initial.lat !== "number" || typeof initial.lng !== "number") return;
    let cancelled = false;
    void reversePin(initial.lat, initial.lng).then((hit) => {
      if (cancelled || !hit) return;
      const address = displayAddressFromHit(hit);
      if (address.trim().length < HOUSE_FIELD_LIMITS.address.min) return;
      setForm((f) => ({
        ...f,
        address,
        lat: hit.lat,
        lng: hit.lng,
      }));
      setAddressOk(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initial?.id, initial?.address, initial?.lat, initial?.lng]);

  const lockedSchoolHood = useMemo(
    () => schoolCampusNeighborhoodForAddress(form.address),
    [form.address],
  );
  const schoolCampusPinLocked = useMemo(
    () => isSchoolCampusAddress(form.address),
    [form.address],
  );

  useEffect(() => {
    if (!lockedSchoolHood) return;
    setForm((f) => (f.neighborhood === lockedSchoolHood ? f : { ...f, neighborhood: lockedSchoolHood }));
  }, [lockedSchoolHood]);

  const confirmedHoodLabel = useMemo(() => {
    if (!addressOk) return null;
    const hasNumber =
      Boolean(parseStreetAndNumber(form.address.trim()).num) || isSchoolCampusAddress(form.address);
    if (!hasNumber) return null;
    return lockedSchoolHood ?? form.neighborhood ?? neighborhoodLabelForPin(form.lat, form.lng);
  }, [addressOk, form.address, lockedSchoolHood, form.neighborhood, form.lat, form.lng]);

  function guessedHood(address: string, lat: number, lng: number) {
    return (
      schoolCampusNeighborhoodForAddress(address) ??
      neighborhoodLabelForPin(lat, lng) ??
      neighborhoodFromAddress(address)
    );
  }

  function pickScare(level: ScareLevel) {
    setForm((f) => ({ ...f, scareLevel: level }));
    setDecorLevel((current) => (current === "none" ? "mild" : current));
  }

  function setTreat(id: SensitivityId, on: boolean) {
    setForm((f) => {
      const rest = f.treats.filter((t) => t !== id);
      const treats = on ? [...rest, id] : rest;
      return { ...f, treats };
    });
  }

  function onAddressTyped(value: string) {
    setAddressOk(false);
    setLocationConfirmed(false);
    setLocationDraft(null);
    setForm((f) => ({ ...f, address: value, locationSourceId: null, addressEn: null }));
  }

  async function applyResolvedHit(hit: AddressHit) {
    setResolvingLocation(true);
    try {
      const resolved = await resolveAddressHit(hit, form.address);
      if (!resolved) {
        toast.error(t("addressField.searchFailed"));
        setAddressOk(false);
        setLocationConfirmed(false);
        setLocationDraft(null);
        return;
      }
      const { resolution } = resolved;
      const hood = resolveNeighborhoodForPin(resolution.addressHe, resolution.lat, resolution.lng);
      if (isNewHouse && !schoolCampusNeighborhoodForAddress(resolution.addressHe) && !hood) {
        toast.error(t("houseForm.outsideEventZones"));
        setAddressOk(false);
        setLocationConfirmed(false);
        setLocationDraft(null);
        return;
      }
      setLocationDraft(resolution);
      setLocationConfirmed(false);
      setForm((f) => ({
        ...f,
        address: resolution.addressHe,
        addressEn: resolution.addressEn,
        lat: resolution.lat,
        lng: resolution.lng,
        locationSourceId: resolution.sourceId,
        ...(hood !== null ? { neighborhood: hood } : {}),
      }));
      setAddressOk(true);
      if (!resolution.precise) {
        toast.message(streetPinHint(hit) ?? t("houseForm.pinStreetHint"));
      }
    } finally {
      setResolvingLocation(false);
    }
  }

  function resolveNeighborhoodForPin(address: string, lat: number, lng: number) {
    const campusHood = schoolCampusNeighborhoodForAddress(address);
    if (campusHood) return campusHood;
    if (isNewHouse) return eventNeighborhoodForNewHousePin(lat, lng);
    return guessedHood(address, lat, lng);
  }

  function onAddressSelect(hit: AddressHit) {
    void applyResolvedHit(hit);
  }

  async function syncFromPin(lat: number, lng: number) {
    setForm((f) => ({ ...f, lat, lng }));
    setLocationConfirmed(false);
    const hit = await reversePin(lat, lng);
    if (!hit) {
      setAddressOk(false);
      setLocationDraft(null);
      toast.error(t("houseForm.geocodeMiss"));
      return;
    }
    await applyResolvedHit(hit);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void syncFromPin(pos.coords.latitude, pos.coords.longitude).finally(() =>
          setLocating(false),
        );
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <form
      className="space-y-6"
      dir={dir}
      onSubmit={(e) => {
        e.preventDefault();
        if (blocked) return;
        if (!addressOk || form.address.trim().length < HOUSE_FIELD_LIMITS.address.min) {
          toast.error(t("houseForm.pickRealAddress"));
          return;
        }
        if (!locationConfirmed || !locationDraft) {
          toast.error(t("addressField.needLocationConfirm"));
          return;
        }
        let neighborhood = form.neighborhood;
        if (isNewHouse && !isSchoolCampusAddress(form.address)) {
          const geoHood = eventNeighborhoodForNewHousePin(form.lat, form.lng);
          if (!geoHood) {
            toast.error(t("houseForm.outsideEventZones"));
            return;
          }
          neighborhood = geoHood;
        }
        if (neighborhood === undefined) {
          neighborhood =
            schoolCampusNeighborhoodForAddress(form.address) ??
            eventNeighborhoodForNewHousePin(form.lat, form.lng) ??
            neighborhoodInferredFromPin(form.lat, form.lng) ??
            undefined;
        }
        if (isNewHouse && neighborhood === undefined) {
          toast.error(t("houseForm.outsideEventZones"));
          return;
        }
        const submitter = addedBy.trim();
        if (isNewHouse && submitter.length < 2) {
          toast.error(t("houseForm.needSubmitter"));
          return;
        }
        if (!isNewHouse && submitter.length > 0 && submitter.length < 2) {
          toast.error(t("houseForm.submitterTooShort"));
          return;
        }
        setOwnerPhoneTouched(true);
        const phoneIssue = ownerPhoneValidationError(ownerPhone, ownerPhoneRequired);
        if (phoneIssue) {
          toast.error(
            !ownerPhone.trim() ? t("houseForm.phoneRequired") : t("houseForm.phoneInvalid"),
          );
          return;
        }
        const phone = normalizeOwnerPhone(ownerPhone);
        if (!accessibilityLevel) {
          toast.error(t("houseForm.needAccessibility"));
          return;
        }
        if (!entryLevel) {
          toast.error(t("houseForm.needEntryLevel"));
          return;
        }
        if (!displayTier) {
          toast.error(t("houseForm.needDisplayTier"));
          return;
        }
        if (decorLevel === "none" && candy !== "plenty" && candy !== "low" && !(pauseCloseEnabled && nightStatus === "stop") && initial?.visit !== "closed") {
          toast.error(t("houseForm.needDecorOrCandy"));
          return;
        }
        const theme = themeFromName(form.name) ?? form.theme;
        const withoutCandy = form.treats.filter((id) => id !== "candy");
        const treats =
          candy === "none"
            ? withoutCandy.filter((id) => !SENSITIVITY_OPTIONS.includes(id as SensitivityId))
            : (["candy" as const, ...withoutCandy] as TreatId[]);
        const treatStock = { ...(form.treatStock ?? {}) };
        if (candy === "none") {
          delete treatStock.candy;
        } else {
          treatStock.candy = candy;
        }
        const effectiveNight =
          pauseCloseEnabled && nightStatus !== "open" ? nightStatus : "open";
        const visit: VisitState =
          effectiveNight === "stop"
            ? "closed"
            : candy === "plenty" || candy === "low" || candy === "out"
              ? "come"
              : decorLevel !== "none"
                ? "decorOnly"
                : "come";
        const ownerFrozenUntil = effectiveNight === "pause" ? freezeExpireIso() : null;
        const windows = hourWindows.map((window) => ({
          from: clock(window.from),
          to: clock(window.to),
        }));
        const submitHoursIssue = hoursWindowsIssueLocalized(windows, locale);
        if (submitHoursIssue) {
          toast.error(submitHoursIssue);
          return;
        }
        if (isNewHouse) rememberLastOwner({ addedBy: submitter, ownerPhone: phone });
        const hours = syncHoursFields(windows);
        const payload: HouseInput = {
          ...form,
          address: locationDraft.addressHe,
          addressEn: locationDraft.addressEn,
          lat: locationDraft.lat,
          lng: locationDraft.lng,
          locationSourceId: locationDraft.sourceId,
          neighborhood,
          theme,
          treats,
          treatStock,
          visit,
          decorLevel,
          decorated: decorLevel !== "none",
          accessibilityLevel,
          entryLevel,
          displayTier,
          accessible: accessibleBooleanFromLevel(accessibilityLevel),
          openHours: hours.openHours,
          openFrom: hours.openFrom,
          openTo: hours.openTo,
          openFrom2: hours.openFrom2,
          openTo2: hours.openTo2,
          ...(admin
            ? {
                kind: isPracticePlace ? "house" : form.kind ?? "house",
                isPractice: isPracticePlace,
                poiCategory:
                  !isPracticePlace && form.kind === "poi" ? (form.poiCategory ?? "other") : null,
              }
            : { kind: "house", poiCategory: null, isPractice: false }),
        };
        setSaving(true);
        void (async () => {
          try {
            let photoDataUrl: string | undefined;
            if (photoFile) {
              try {
                photoDataUrl = await compressJpegFile(photoFile, photoFocus);
              } catch {
                toast.warning(t("houseForm.photoProcessFailed"));
              }
            }
            await onSubmit(payload, {
              photoDataUrl,
              clearPhoto: clearPhoto && !photoFile,
              ownerFrozenUntil,
              addedBy: submitter || null,
              ownerPhone: phone || null,
            });
          } finally {
            setSaving(false);
          }
        })();
      }}
    >
      {admin ? (
        <FormSection title={t("houseForm.placeTypeSection")}>
          <div className="flex flex-wrap gap-1.5">
            {(["house", "poi"] as HouseKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setPlaceKind(kind);
                  setForm((current) => ({
                    ...current,
                    kind,
                    isPractice: false,
                    poiCategory: kind === "poi" ? current.poiCategory ?? "other" : null,
                  }));
                }}
                className={
                  placeKind === kind
                    ? "inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-lg font-medium text-black"
                    : "inline-flex items-center gap-1.5 rounded-full bg-[#1d1028] px-3 py-1.5 text-lg text-orange-100 ring-1 ring-orange-500/30"
                }
              >
                <LocationKindSign kind={kind} className="size-6" />
                {houseKindLabels[kind]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPlaceKind("practice");
                setForm((current) => ({
                  ...current,
                  kind: "house",
                  isPractice: true,
                  poiCategory: null,
                }));
              }}
              className={
                placeKind === "practice"
                  ? "inline-flex items-center gap-1.5 rounded-full bg-teal-500 px-3 py-1.5 text-lg font-medium text-black"
                  : "inline-flex items-center gap-1.5 rounded-full bg-[#1d1028] px-3 py-1.5 text-lg text-orange-100 ring-1 ring-teal-400/40"
              }
            >
              <PracticeLocationSign className="size-6" />
              {t("houseForm.practiceHouse")}
            </button>
          </div>
          {isPracticePlace ? (
            <p className="text-base text-teal-200/90">
              {t("houseForm.practiceHint")}
            </p>
          ) : null}
        </FormSection>
      ) : null}
      <FormSection
        title={
          isPracticePlace
            ? t("houseForm.sectionPractice")
            : isPoi
              ? t("houseForm.sectionPoi")
              : t("houseForm.sectionHouse")
        }
      >
        <Field
          label={isPoi ? t("houseForm.namePoi") : t("houseForm.nameHouse")}
          charCount={{ length: form.name.length, max: HOUSE_FIELD_LIMITS.name.max }}
        >
          <Input
            required
            value={form.name}
            minLength={HOUSE_FIELD_LIMITS.name.min}
            maxLength={HOUSE_FIELD_LIMITS.name.max}
            onChange={(e) => {
              const name = e.target.value;
              const theme = themeFromName(name) ?? form.theme;
              setForm({ ...form, name, theme });
            }}
            className="h-11 bg-[#1d1028] text-lg"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("houseForm.yourName")} hint={t("houseForm.notShown")}>
            <Input
              required={isNewHouse}
              value={addedBy}
              autoComplete="name"
              minLength={isNewHouse ? HOUSE_FIELD_LIMITS.addedBy.min : undefined}
              maxLength={HOUSE_FIELD_LIMITS.addedBy.max}
              onChange={(e) => setAddedBy(e.target.value)}
              className="h-11 bg-[#1d1028] text-lg"
            />
          </Field>
          <Field label={t("houseForm.phone")} hint={t("houseForm.notShown")}>
            <Input
              required={ownerPhoneRequired}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={ownerPhone}
              maxLength={HOUSE_FIELD_LIMITS.ownerPhone.max}
              onChange={(e) => setOwnerPhone(e.target.value)}
              onBlur={() => setOwnerPhoneTouched(true)}
              aria-invalid={ownerPhoneError ? true : undefined}
              aria-describedby={ownerPhoneError ? "owner-phone-error" : undefined}
              className={cn(
                "h-11 bg-[#1d1028] text-lg",
                ownerPhoneError && "ring-2 ring-rose-500/70",
              )}
            />
          </Field>
        </div>
        {ownerPhoneError ? (
          <p id="owner-phone-error" className="-mt-2 text-base text-rose-300" role="alert">
            {ownerPhoneError}
          </p>
        ) : null}
      </FormSection>
      <FormSection
        title={t("addressField.locationSection")}
        hint={t("addressField.locationSubtitle")}
      >
        <Field
          label={t("houseForm.address")}
          hint={t("houseForm.hiddenUntilEvent")}
          charCount={{ length: form.address.length, max: HOUSE_FIELD_LIMITS.address.max }}
        >
          <AddressField
            value={form.address}
            onChange={onAddressTyped}
            onSelect={onAddressSelect}
            confirmed={addressOk && locationConfirmed}
            hoodLabel={confirmedHoodLabel}
            disabled={blocked || resolvingLocation}
            maxLength={HOUSE_FIELD_LIMITS.address.max}
            onFocusChange={setAddressFieldActive}
          />
          {!isNewHouse ? (
            <p className="mt-1 text-base text-violet-300">{t("houseForm.editAddressHint")}</p>
          ) : null}
        </Field>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-lg font-medium">{t("houseForm.mapPin")}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={useMyLocation}
              disabled={schoolCampusPinLocked || blocked || resolvingLocation}
            >
              {locating ? t("houseForm.locating") : t("houseForm.myLocation")}
            </Button>
          </div>
          <div
            className={cn(
              "relative z-0 isolate h-72 overflow-hidden rounded-xl ring-1 ring-orange-500/30",
              addressFieldActive && "hidden sm:block",
            )}
          >
            <HouseMapDynamic
              pickMode
              pick={{ lat: form.lat, lng: form.lng }}
              pickDraggable={!schoolCampusPinLocked && !blocked}
              onPick={
                !schoolCampusPinLocked && !blocked
                  ? (lat, lng) => void syncFromPin(lat, lng)
                  : undefined
              }
            />
          </div>
          <p className="mt-1 text-base text-violet-300">
            {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
            {schoolCampusPinLocked ? t("houseForm.schoolPinLocked") : null}
          </p>
        </div>
        {locationDraft && addressOk ? (
          <div className="space-y-2 rounded-xl bg-[#1d1028] p-4 ring-1 ring-orange-500/25">
            <p className="text-lg text-orange-50">{locationDraft.addressHe}</p>
            <p className="text-lg text-violet-200" dir="ltr">
              {locationDraft.addressEn}
            </p>
            {locationConfirmed ? (
              <p className="text-base text-emerald-300">{t("addressField.locationConfirmed")}</p>
            ) : (
              <p className="text-base text-amber-200">{t("addressField.locationDirty")}</p>
            )}
            <Button
              type="button"
              className="h-11 w-full bg-orange-500 text-black hover:bg-orange-400"
              disabled={blocked || resolvingLocation || locationConfirmed}
              onClick={() => setLocationConfirmed(true)}
            >
              {t("addressField.confirmLocation")}
            </Button>
          </div>
        ) : null}
        <Field
          label={t("houseForm.arrival")}
          hint={t("houseForm.hiddenUntilEvent")}
          charCount={{ length: form.arrival.length, max: HOUSE_FIELD_LIMITS.arrival.max }}
        >
          <Input
            value={form.arrival}
            maxLength={HOUSE_FIELD_LIMITS.arrival.max}
            onChange={(e) => setForm({ ...form, arrival: e.target.value })}
            placeholder={t("houseForm.arrivalPlaceholder")}
          />
        </Field>
        <Field
          label={t("houseForm.visitorNote")}
          hint={t("houseForm.hiddenUntilEvent")}
          charCount={{ length: form.notes.length, max: HOUSE_FIELD_LIMITS.notes.max }}
        >
          <Input
            value={form.notes}
            maxLength={HOUSE_FIELD_LIMITS.notes.max}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder={t("houseForm.visitorNotePlaceholder")}
          />
        </Field>
      </FormSection>
      <FormSection title={t("houseForm.accessibilitySection")}>
        <div className="flex flex-wrap gap-1.5">
          <ChoiceChip
            selected={accessibilityLevel === "accessible"}
            onClick={() => setAccessibilityLevel("accessible")}
          >
            {t("houseForm.accessibilityAccessible")}
          </ChoiceChip>
          <ChoiceChip
            selected={accessibilityLevel === "partial"}
            onClick={() => setAccessibilityLevel("partial")}
          >
            {t("houseForm.accessibilityPartial")}
          </ChoiceChip>
          <ChoiceChip
            selected={accessibilityLevel === "not_accessible"}
            onClick={() => setAccessibilityLevel("not_accessible")}
          >
            {t("houseForm.accessibilityNot")}
          </ChoiceChip>
        </div>
      </FormSection>
      <FormSection title={t("houseForm.entrySection")}>
        <div className="flex flex-wrap gap-1.5">
          <ChoiceChip
            selected={entryLevel === "ground_entrance_lobby"}
            onClick={() => setEntryLevel("ground_entrance_lobby")}
          >
            {t("houseForm.entryGround")}
          </ChoiceChip>
          <ChoiceChip
            selected={entryLevel === "not_ground"}
            onClick={() => setEntryLevel("not_ground")}
          >
            {t("houseForm.entryNotGround")}
          </ChoiceChip>
        </div>
      </FormSection>
      <FormSection title={t("houseForm.displayTierSection")}>
        <div className="flex flex-wrap gap-1.5">
          <ChoiceChip selected={displayTier === "subtle"} onClick={() => setDisplayTier("subtle")}>
            {t("houseForm.displayTierSubtle")}
          </ChoiceChip>
          <ChoiceChip
            selected={displayTier === "very_nice"}
            onClick={() => setDisplayTier("very_nice")}
          >
            {t("houseForm.displayTierVeryNice")}
          </ChoiceChip>
          <ChoiceChip selected={displayTier === "wild"} onClick={() => setDisplayTier("wild")}>
            {t("houseForm.displayTierWild")}
          </ChoiceChip>
        </div>
      </FormSection>
      <FormSection title={t("houseForm.hoursSection")}>
        <div className="space-y-2">
          {hourWindows.map((window, index) => (
            <div key={`hours-${index}`} className="hours-range-row" dir="ltr">
              <div className="min-w-0">
                <p className="hours-range-row__label">{t("houseForm.openTime")}</p>
                <TimeField
                  required
                  ariaLabel={`${t("houseForm.openTime")} ${index + 1}`}
                  value={window.from}
                  onChange={(from) => updateHourWindow(index, { from })}
                />
              </div>
              <span className="hours-range-row__sep" aria-hidden>
                –
              </span>
              <div className="min-w-0">
                <p className="hours-range-row__label">{t("houseForm.closeTime")}</p>
                <TimeField
                  required
                  ariaLabel={`${t("houseForm.closeTime")} ${index + 1}`}
                  value={window.to}
                  onChange={(to) => updateHourWindow(index, { to })}
                />
              </div>
              {hourWindows.length > 1 ? (
                <button
                  type="button"
                  aria-label={t("houseForm.removeHoursWindow")}
                  className="hours-range-row__remove px-1 text-xl text-violet-300 hover:text-orange-200"
                  onClick={() => removeHourWindow(index)}
                >
                  ×
                </button>
              ) : (
                <span className="hours-range-row__remove" aria-hidden />
              )}
            </div>
          ))}
          {hourWindows.length < MAX_HOUR_WINDOWS ? (
            <button
              type="button"
              className="text-lg font-medium text-orange-300 underline-offset-2 hover:underline"
              onClick={addHourWindow}
            >
              {t("houseForm.addHoursWindow")}
            </button>
          ) : null}
          {hoursIssue ? <p className="text-lg text-red-300">{hoursIssue}</p> : null}
        </div>
        <Field
          label={t("houseForm.status")}
          hint={pauseCloseEnabled ? undefined : t("houseForm.pauseCloseHint")}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <NightStatusChip
              label={t("houseForm.statusOpen")}
              dotClass="is-open"
              selected={nightStatus === "open"}
              onClick={() => setNightStatus("open")}
            />
            <NightStatusChip
              label={t("houseForm.statusPause")}
              dotClass="is-break"
              selected={nightStatus === "pause"}
              disabled={!pauseCloseEnabled}
              onClick={() => setNightStatus("pause")}
            />
            <NightStatusChip
              label={t("houseForm.statusClosed")}
              dotClass="is-closed"
              selected={nightStatus === "stop"}
              disabled={!pauseCloseEnabled}
              onClick={() => setNightStatus("stop")}
            />
          </div>
        </Field>
      </FormSection>
      <FormSection title={t("houseForm.whatsInside")}>
        <Field label={t("houseForm.scareLevel")}>
          <div className="flex flex-wrap gap-1.5">
            <ChoiceChip selected={undecorated} onClick={() => setDecorLevel("none")}>
              <ScareSign
                Glyph={scareGlyph}
                level="none"
                className="size-6"
                glyphClassName={scareGlyphScale}
                locale={locale}
              />
              {decorShort.none}
            </ChoiceChip>
            {(["mild", "medium", "spicy"] as ScareLevel[]).map((level) => (
              <ChoiceChip
                key={level}
                selected={!undecorated && form.scareLevel === level}
                onClick={() => pickScare(level)}
              >
                <ScareSign
                  Glyph={scareGlyph}
                  level={level}
                  className="size-6"
                  glyphClassName={scareGlyphScale}
                  locale={locale}
                />
                {scareShort[level]}
              </ChoiceChip>
            ))}
          </div>
        </Field>
        <Field label={t("houseForm.treats")}>
          <div className="flex flex-wrap gap-1.5">
            {candyTones.map((tone) => (
              <ChoiceChip
                key={tone.id}
                selected={candy === tone.id}
                onClick={() => pickCandy(tone.id)}
              >
                <CandySign tone={tone.id} className="size-6" />
                {tone.label}
              </ChoiceChip>
            ))}
          </div>
        </Field>
        <Field label={t("houseForm.markWhatFits")}>
          <div className="space-y-2 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20">
            {candyOffered
              ? SENSITIVITY_OPTIONS.map((id) => (
                  <CheckRow
                    key={id}
                    checked={form.treats.includes(id)}
                    onChange={(on) => setTreat(id, on)}
                  >
                    <SensitivityMark labeled kind={id} />
                  </CheckRow>
                ))
              : null}
          </div>
        </Field>
        <Field
          label={t("houseForm.description")}
          charCount={{ length: form.description.length, max: HOUSE_FIELD_LIMITS.description.max }}
        >
          <Textarea
            value={form.description}
            maxLength={HOUSE_FIELD_LIMITS.description.max}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t("houseForm.descriptionPlaceholder")}
            className="min-h-20 text-lg"
          />
        </Field>
      </FormSection>
      <FormSection title={t("houseForm.photoSection")}>
          {photoPreview || (existingPhoto && !clearPhoto) ? (
            <HousePhotoFrame
              src={photoPreview || existingPhoto}
              focus={photoPreview ? photoFocus : { x: 50, y: 50 }}
              onFocusChange={photoPreview ? setPhotoFocus : undefined}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-lg text-orange-100 ring-1 ring-orange-500/40",
                  blocked && "opacity-60",
                )}
              >
                <Camera className="size-4" />
                {photoPreview || (existingPhoto && !clearPhoto)
                  ? t("houseForm.replacePhoto")
                  : t("houseForm.uploadPhoto")}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={blocked}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setPhotoFile(file);
                  setPhotoFocus({ x: 50, y: 50 });
                  setClearPhoto(false);
                  const reader = new FileReader();
                  reader.onload = () => setPhotoPreview(String(reader.result ?? ""));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {photoPreview || (existingPhoto && !clearPhoto) ? (
              <button
                type="button"
                disabled={blocked}
                className="rounded-lg px-3 py-2 text-lg text-violet-200 ring-1 ring-orange-500/30"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                  setPhotoFocus({ x: 50, y: 50 });
                  setClearPhoto(true);
                }}
              >
                {t("houseForm.removePhoto")}
              </button>
            ) : null}
          </div>
      </FormSection>
      <div className={onCancel ? "flex gap-2" : undefined}>
        <Button
          type="submit"
          disabled={blocked}
          className={
            onCancel
              ? "h-11 flex-1 text-lg bg-orange-500 text-black hover:bg-orange-400"
              : "h-11 w-full text-lg bg-orange-500 text-black hover:bg-orange-400"
          }
        >
          {blocked ? t("common.savingServer") : submitLabel}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={blocked}
            className="h-11 flex-1 text-lg"
            onClick={onCancel}
          >
            {t("common.cancel")}
          </Button>
        ) : null}
      </div>
      {extraActions}
    </form>
  );
}

function NightStatusChip({
  label,
  dotClass,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  dotClass: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <ChoiceChip selected={selected} disabled={disabled} onClick={onClick}>
      <span className={cn("night-status-dot", dotClass)} />
      {label}
    </ChoiceChip>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="border-b border-orange-500/25 pb-1">
        <h2 className="text-xl font-semibold text-orange-200">{title}</h2>
        {hint ? <p className="mt-1 text-base text-violet-300">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function CharCount({ length, max }: { length: number; max: number }) {
  return (
    <span
      className={cn(
        "shrink-0 text-base tabular-nums",
        length >= max ? "text-orange-300" : "text-violet-400",
      )}
      aria-live="polite"
    >
      {length}/{max}
    </span>
  );
}

function Field({
  label,
  hint,
  children,
  charCount,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  charCount?: { length: number; max: number };
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <Label className="whitespace-nowrap">{label}</Label>
          {hint ? (
            <span className="whitespace-nowrap text-base text-violet-400">· {hint}</span>
          ) : null}
        </div>
        {charCount ? <CharCount {...charCount} /> : null}
      </div>
      {children}
    </div>
  );
}

function ChoiceChip({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-lg",
        selected
          ? "bg-orange-500 font-medium text-black disabled:opacity-100"
          : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/30 disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}

function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-lg text-orange-50">
      <input
        type="checkbox"
        className="size-5 accent-orange-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}


const LAST_OWNER_KEY = "house-form:last-owner";

function readLastOwner(): { addedBy?: string; ownerPhone?: string } | null {
  try {
    const raw = window.localStorage.getItem(LAST_OWNER_KEY);
    return raw ? (JSON.parse(raw) as { addedBy?: string; ownerPhone?: string }) : null;
  } catch {
    return null;
  }
}

function rememberLastOwner(owner: { addedBy: string; ownerPhone: string }) {
  try {
    window.localStorage.setItem(LAST_OWNER_KEY, JSON.stringify(owner));
  } catch {
    // Private mode / storage full — prefill is best-effort.
  }
}

function TimeField({
  value,
  onChange,
  required,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div className="time-field-wrap">
      <input
        type="time"
        aria-label={ariaLabel}
        required={required}
        dir="ltr"
        lang="he-IL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="filter-time-input h-11 w-full min-w-0 min-h-11 rounded-lg border border-input bg-[#1d1028] px-2.5 py-2 text-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  );
}
