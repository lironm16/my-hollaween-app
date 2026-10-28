"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import { POI_PIN_FACE_SRC } from "@/lib/pin-faces";
import { PIN_BACKGROUND } from "@/lib/pin-colors";
import { BuildingClusterPinArt } from "@/components/building-cluster-pin-art";
import {
  buildingClusterPinClass,
  type BuildingClusterIconKind,
} from "@/lib/map-pin-building-icon";
import {
  PIN_SCHOOL_CAMPUS_INK_SRC,
  PIN_SCHOOL_CAMPUS_INK_SRC_2X,
} from "@/lib/map-pin-school-icon";
import { SkipIcon } from "@/components/skip-icon";
import { useLocale } from "@/hooks/use-locale";
import { useLocalizedLabels } from "@/hooks/use-localized-labels";
import { cn } from "@/lib/utils";

function SwatchPin({
  scare,
  poi,
  candy,
  closed,
  onBreak,
  bare,
  multi,
  multiClusterKind,
  school,
  visited,
  skipped,
  gemRing,
}: {
  scare?: "mild" | "medium" | "spicy";
  poi?: boolean;
  candy?: "plenty" | "low" | "out";
  closed?: boolean;
  onBreak?: boolean;
  bare?: boolean;
  multi?: boolean;
  multiClusterKind?: BuildingClusterIconKind;
  school?: boolean;
  visited?: boolean;
  skipped?: boolean;
  gemRing?: "sparkle" | "diamond";
}) {
  const scareLevel = scare ?? "mild";
  const scareSrc = poi ? POI_PIN_FACE_SRC : `/icons/pin-scare-${scareLevel}.png`;
  return (
    <div
      className={cn(
        "house-pin is-legend relative",
        poi && "is-poi",
        multi && "is-building",
        multi && multiClusterKind && buildingClusterPinClass(multiClusterKind),
        school && "is-school-campus is-school-list-pin",
        gemRing === "sparkle" && "is-gem-ring-sparkle",
        gemRing === "diamond" && "is-gem-ring-diamond",
        bare && "is-undecorated",
        visited && !skipped && "is-visited",
        skipped && "is-skipped",
      )}
      style={
        multi && multiClusterKind
          ? undefined
          : {
              background: school
                ? undefined
                : bare
                  ? poi
                    ? PIN_BACKGROUND.poi.undecorated
                    : PIN_BACKGROUND.house.undecorated
                  : poi
                    ? PIN_BACKGROUND.poi.decorated
                    : PIN_BACKGROUND.house.decorated,
            }
      }
      aria-hidden
    >
      {gemRing ? (
        <>
          <i className={`pin-gem-ring is-${gemRing}`} aria-hidden />
          {gemRing === "sparkle" ? (
            <span className="pin-gem-sparkles" aria-hidden>
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          ) : null}
        </>
      ) : null}
      {scare || bare ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pin-scare" src={scareSrc} alt="" />
      ) : null}
      {multi && multiClusterKind ? <BuildingClusterPinArt kind={multiClusterKind} /> : null}
      {school ? (
        <span className="pin-school-art" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="pin-school-castle-img is-ink"
            src={PIN_SCHOOL_CAMPUS_INK_SRC}
            srcSet={`${PIN_SCHOOL_CAMPUS_INK_SRC} 1x, ${PIN_SCHOOL_CAMPUS_INK_SRC_2X} 2x`}
            alt=""
            width={68}
            height={56}
            decoding="async"
          />
        </span>
      ) : null}
      {closed ? <b className="pin-status is-closed" /> : null}
      {onBreak ? <b className="pin-status is-break" /> : null}
      {candy ? <b className={`pin-status is-${candy}`} /> : null}
      {skipped ? (
        <b className="pin-status is-skipped" aria-hidden>
          <SkipIcon className="pin-skip-icon" />
        </b>
      ) : null}
    </div>
  );
}

export function MapLegend({ showGemLegend = false }: { showGemLegend?: boolean }) {
  const { t, dir } = useLocale();
  const { decorShort, scareShort, candyToneLabels } = useLocalizedLabels();

  const groups = useMemo(() => {
    const L = "mapLegend";
    const base: { title: string; items: { key: string; label: string; node: ReactNode }[] }[] = [
      {
        title: t(`${L}.sectionPlaceKind`),
        items: [
          { key: "house-kind", label: t("labels.houseKindHouse"), node: <SwatchPin scare="mild" /> },
          { key: "poi-kind", label: t("labels.houseKindPoi"), node: <SwatchPin scare="mild" poi /> },
          { key: "school-kind", label: t(`${L}.school`), node: <SwatchPin school /> },
          {
            key: "building-houses",
            label: t(`${L}.buildingHouses`),
            node: <SwatchPin multi multiClusterKind="houses" />,
          },
          {
            key: "building-businesses",
            label: t(`${L}.buildingBusinesses`),
            node: <SwatchPin multi multiClusterKind="businesses" />,
          },
          {
            key: "building-mixed",
            label: t(`${L}.buildingMixed`),
            node: <SwatchPin multi multiClusterKind="mixed" />,
          },
        ],
      },
      {
        title: t(`${L}.sectionTreats`),
        items: [
          { key: "plenty", label: candyToneLabels.plenty, node: <SwatchPin scare="mild" candy="plenty" /> },
          { key: "low", label: candyToneLabels.low, node: <SwatchPin scare="mild" candy="low" /> },
          { key: "out", label: candyToneLabels.out, node: <SwatchPin scare="mild" candy="out" /> },
        ],
      },
      {
        title: t(`${L}.sectionDecor`),
        items: [
          { key: "bare", label: t(`${L}.decorBare`), node: <SwatchPin bare /> },
          { key: "mild", label: scareShort.mild, node: <SwatchPin scare="mild" /> },
          { key: "medium", label: scareShort.medium, node: <SwatchPin scare="medium" /> },
          { key: "spicy", label: scareShort.spicy, node: <SwatchPin scare="spicy" /> },
        ],
      },
      {
        title: t(`${L}.sectionHouse`),
        items: [
          { key: "closed", label: t("visitMarks.closed"), node: <SwatchPin scare="mild" closed /> },
          { key: "break", label: t("visitMarks.pause"), node: <SwatchPin scare="mild" onBreak /> },
          { key: "visited", label: t("visitMarks.visited"), node: <SwatchPin scare="mild" visited /> },
          {
            key: "skipped",
            label: t("visitMarks.skipped"),
            node: <SwatchPin scare="mild" candy="plenty" skipped />,
          },
        ],
      },
    ];
    if (showGemLegend) {
      base.push({
        title: t(`${L}.gemSection`),
        items: [
          {
            key: "gem-open",
            label: t(`${L}.gemOpen`),
            node: <SwatchPin scare="mild" gemRing="sparkle" />,
          },
        ],
      });
    }
    return base;
  }, [t, candyToneLabels, scareShort, showGemLegend]);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const panelId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative">
      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-3"
              onClick={() => setOpen(false)}
            >
              <div
                id={panelId}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                dir={dir}
                className="map-legend-panel relative flex max-h-[min(88dvh,40rem)] w-[min(38rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl bg-[#160b20] text-start shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-orange-500/30"
                onClick={(event) => event.stopPropagation()}
              >
                <OverlayCloseBar
                  compact
                  onClose={() => setOpen(false)}
                  label={t("mapLegend.close")}
                  title={
                    <span id={titleId} className="text-base font-semibold text-orange-100">
                      {t("mapLegend.title")}
                    </span>
                  }
                  className="border-b border-orange-500/15 px-3 pb-2"
                />
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
                  <div className="flex flex-col gap-3">
                    {groups.map((group) => (
                      <section key={group.title}>
                        <h3 className="mb-1.5 text-base font-semibold text-orange-200">{group.title}</h3>
                        <ul className="flex flex-wrap justify-start gap-x-1 gap-y-2">
                          {group.items.map((item) => (
                            <li key={item.key} className="flex w-[4.75rem] min-w-0 flex-col items-center gap-1">
                              <div className="grid size-16 shrink-0 place-items-center overflow-visible" dir="ltr">
                                {item.node}
                              </div>
                              <span className="w-full text-center text-base leading-tight text-violet-100">
                                {item.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full bg-[#1d1028] text-orange-100 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-orange-500/35 hover:bg-orange-500/10"
        aria-label={t("mapLegend.buttonAria")}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={t("mapLegend.buttonTitle")}
        onClick={() => setOpen((value) => !value)}
      >
        <Info className="size-5" />
      </button>
    </div>
  );
}
