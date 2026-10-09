"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { houseVisitQrUrl } from "@/lib/house-visit-qr";
import type { PublicHouse } from "@/lib/types";
import {
  fitFontSize,
  VISIT_POSTER_LAYOUT,
  VISIT_POSTER_PAPER,
  VISIT_POSTER_TEMPLATE_HEIGHT,
  VISIT_POSTER_TEMPLATE_SRC,
  VISIT_POSTER_TEMPLATE_WIDTH,
  visitPosterHouseName,
} from "@/lib/visit-poster";

function boxStyle(box: (typeof VISIT_POSTER_LAYOUT)[keyof typeof VISIT_POSTER_LAYOUT]): CSSProperties {
  return {
    position: "absolute",
    left: `${box.left}%`,
    top: `${box.top}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
  };
}

/** Font sizes are in `cqw` (percent of poster width) so screen and print match. */
function useFittedNameSize(name: string) {
  const posterRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [sizeCqw, setSizeCqw] = useState(12);

  useLayoutEffect(() => {
    const poster = posterRef.current;
    const box = boxRef.current;
    const text = textRef.current;
    if (!poster || !box || !text) return;

    const fit = () => {
      const posterWidth = poster.clientWidth;
      if (!posterWidth) return;
      const best = fitFontSize({
        min: 2,
        max: 16,
        precision: 0.1,
        fits: (cqw) => {
          text.style.fontSize = `${(cqw * posterWidth) / 100}px`;
          return text.scrollWidth <= box.clientWidth + 0.5 && text.scrollHeight <= box.clientHeight + 0.5;
        },
      });
      text.style.fontSize = `${best}cqw`;
      setSizeCqw(best);
    };

    fit();
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });
    const observer = new ResizeObserver(fit);
    observer.observe(poster);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [name]);

  return { posterRef, boxRef, textRef, sizeCqw };
}

function useVisitQrDataUrl(house: PublicHouse) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    const url = houseVisitQrUrl(house);
    let cancelled = false;
    void import("qrcode").then((QRCode) =>
      QRCode.toDataURL(url, {
        width: 900,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#1e0a3c", light: "#ffffff" },
      }).then((next) => {
        if (!cancelled) setDataUrl(next);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [house]);
  return dataUrl;
}

export function VisitPoster({ house }: { house: PublicHouse }) {
  const name = visitPosterHouseName(house);
  const { posterRef, boxRef, textRef, sizeCqw } = useFittedNameSize(name);
  const qrDataUrl = useVisitQrDataUrl(house);

  return (
    <div
      ref={posterRef}
      className="visit-poster"
      style={{ aspectRatio: `${VISIT_POSTER_TEMPLATE_WIDTH} / ${VISIT_POSTER_TEMPLATE_HEIGHT}` }}
      dir="rtl"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={VISIT_POSTER_TEMPLATE_SRC}
        alt=""
        className="visit-poster-template"
        width={VISIT_POSTER_TEMPLATE_WIDTH}
        height={VISIT_POSTER_TEMPLATE_HEIGHT}
      />

      <div
        className="visit-poster-title"
        style={{ ...boxStyle(VISIT_POSTER_LAYOUT.title), background: VISIT_POSTER_PAPER }}
        aria-label="בשכונה Halloween"
      >
        <span className="visit-poster-drip">בשכונה</span>
        <span className="visit-poster-drip">Halloween</span>
      </div>

      <div ref={boxRef} className="visit-poster-name-box" style={boxStyle(VISIT_POSTER_LAYOUT.name)}>
        <span ref={textRef} className="visit-poster-name" style={{ fontSize: `${sizeCqw}cqw` }}>
          {name}
        </span>
      </div>

      <div className="visit-poster-qr" style={boxStyle(VISIT_POSTER_LAYOUT.qr)}>
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="קוד QR לסימון ביקור" />
        ) : null}
      </div>
    </div>
  );
}

export const VISIT_POSTER_CSS = `
.visit-poster {
  position: relative;
  width: 100%;
  container-type: inline-size;
  overflow: hidden;
  background: ${VISIT_POSTER_PAPER};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.visit-poster-template {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.visit-poster-title {
  display: flex;
  direction: ltr;
  align-items: center;
  justify-content: center;
  gap: 2.2cqw;
}
.visit-poster-drip {
  font-family: var(--font-rubik-wet-paint), "Rubik Wet Paint", cursive;
  font-size: 7.8cqw;
  line-height: 1.15;
  padding-bottom: 1.2cqw;
  background: linear-gradient(180deg, #fb923c 0%, #ea580c 42%, #7e22ce 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-stroke: 0.22cqw #3b0764;
  white-space: nowrap;
}
.visit-poster-name-box {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.visit-poster-name {
  display: block;
  max-width: 100%;
  font-family: var(--font-rubik-wet-paint), "Rubik Wet Paint", cursive;
  font-weight: 400;
  line-height: 1.18;
  padding-bottom: 0.8cqw;
  color: #5b1a8f;
  -webkit-text-stroke: 0.18cqw #3b0764;
  text-shadow: 0.35cqw 0.35cqw 0 #fdba74;
  text-wrap: balance;
  overflow-wrap: normal;
  word-break: keep-all;
}
.visit-poster-qr {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: 0.6cqw;
}
.visit-poster-qr img {
  width: 100%;
  height: 100%;
  display: block;
  image-rendering: pixelated;
}
`;
