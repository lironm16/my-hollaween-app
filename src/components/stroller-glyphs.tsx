import type { ReactNode } from "react";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-full w-full">
      {children}
    </svg>
  );
}

/** 1 — Classic bassinet pram (picker artwork). */
export function StrollerClassic() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/stroller-classic.png"
      alt=""
      aria-hidden
      className="h-full w-full object-contain"
    />
  );
}

/** 2 — Tall lightweight / umbrella stroller. */
export function StrollerUmbrella() {
  return (
    <Icon>
      <path
        d="M4.4 3.2v12.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M4.4 3.2h4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path fill="currentColor" d="M8.2 5.1 18.4 3.6l-1.2 4.4H9.1z" />
      <path fill="currentColor" d="M8.4 9.2h9.6l-.8 5.6H8.9z" />
      <circle cx="9.3" cy="19.1" r="2.7" fill="currentColor" />
      <circle cx="16.6" cy="19.1" r="2.35" fill="currentColor" />
    </Icon>
  );
}

/** 3 — Vintage deep pram with a big hood. */
export function StrollerVintage() {
  return (
    <Icon>
      <path
        d="M4.2 13.4V8.4c0-3.4 3.2-6 7.1-6h1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        fill="currentColor"
        d="M6.2 8.2c0-3.6 3.4-5.8 7.4-5.2 3.2.5 5.4 2.8 5.4 5.6v3.2H6.2V8.2Z"
      />
      <path fill="currentColor" d="M6.2 11.4h12.8v3.6H6.2z" />
      <circle cx="8.1" cy="19" r="3.35" fill="currentColor" />
      <circle cx="16.9" cy="19" r="3.35" fill="currentColor" />
    </Icon>
  );
}

/** 4 — Geometric public-sign stroller. */
export function StrollerSignStyle() {
  return (
    <Icon>
      <path
        d="M4.6 5.2 8.4 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path fill="currentColor" d="M7.4 8.2h11.4l-1.5 6.4H9.2z" />
      <circle cx="8.6" cy="19" r="3.4" fill="currentColor" />
      <circle cx="16.8" cy="19.4" r="2.4" fill="currentColor" />
    </Icon>
  );
}

/** 5 — Three-wheel jogging stroller. */
export function StrollerJogging() {
  return (
    <Icon>
      <path
        d="M4.8 4.6 8.2 13.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path fill="currentColor" d="M8.4 6.4 19 4.8l-1.4 4.6H9.6z" />
      <path fill="currentColor" d="M8.6 10.8 18.2 9.6l-1 4.8H9.4z" />
      <circle cx="8.2" cy="18.6" r="3.7" fill="currentColor" />
      <circle cx="18.2" cy="19.4" r="2.15" fill="currentColor" />
    </Icon>
  );
}

/** 6 — Lightweight stroller with a child in the seat. */
export function StrollerWithChild() {
  return (
    <Icon>
      <path
        d="M4.6 3.6v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M4.6 3.6h3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path fill="currentColor" d="M8.4 5.4 17.8 4l-1 4H9.2z" />
      <path fill="currentColor" d="M8.6 9.2h8.8l-.7 5.2H9.2z" />
      <circle cx="13.2" cy="8.15" r="1.7" fill="currentColor" />
      <circle cx="9.4" cy="19.1" r="2.6" fill="currentColor" />
      <circle cx="16.4" cy="19.1" r="2.3" fill="currentColor" />
    </Icon>
  );
}

export const STROLLER_OPTIONS = [
  {
    id: "classic",
    number: 1,
    name: "עגלה קלאסית",
    blurb: "סל עם גגון מחולק וידית מעוגלת — מה שבחרתם.",
    current: true,
    Glyph: StrollerClassic,
  },
  {
    id: "umbrella",
    number: 2,
    name: "טיולון קל",
    blurb: "גבוה ודק, כמו טיולון מטריה.",
    current: false,
    Glyph: StrollerUmbrella,
  },
  {
    id: "vintage",
    number: 3,
    name: "עגלת קפוצ׳ון",
    blurb: "גוף עמוק וגגון גדול.",
    current: false,
    Glyph: StrollerVintage,
  },
  {
    id: "sign",
    number: 4,
    name: "שלט פשוט",
    blurb: "גיאומטרי, כמו אייקון בשירותים ציבוריים.",
    current: false,
    Glyph: StrollerSignStyle,
  },
  {
    id: "jogging",
    number: 5,
    name: "טיולון ריצה",
    blurb: "גלגל אחורי גדול וגלגל קדמי קטן.",
    current: false,
    Glyph: StrollerJogging,
  },
  {
    id: "child",
    number: 6,
    name: "עם ילד",
    blurb: "טיולון עם ראש קטן במושב.",
    current: false,
    Glyph: StrollerWithChild,
  },
] as const;
