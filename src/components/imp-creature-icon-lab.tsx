import type { FC, ReactNode } from "react";

import { cn } from "@/lib/utils";

type IconProps = { className?: string };

function SvgFrame({
  className,
  children,
  fill = "none",
}: {
  className?: string;
  children: ReactNode;
  fill?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* —— Imp / שדון (3 directions) —— */

export const ImpDevilFaceOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path d="M8 9.5 6.25 4.75 9.5 8.25" {...stroke} />
    <path d="M16 9.5 17.75 4.75 14.5 8.25" {...stroke} />
    <path d="M12 7.25c3.2 0 5.5 2.45 5.5 5.65 0 3.45-2.65 6.1-5.5 6.1s-5.5-2.65-5.5-6.1c0-3.2 2.3-5.65 5.5-5.65z" {...stroke} />
    <path d="M9.75 13.35c.55.4 1.05.4 1.55 0M13.7 13.35c.55.4 1.05.4 1.55 0" {...stroke} />
    <path d="M10.75 16.1c.75.55 1.5.85 2.25.85s1.5-.3 2.25-.85" {...stroke} />
  </SvgFrame>
);

export const ImpDevilFaceFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M8.1 9.4 6.35 4.65 9.15 8.05c-.85-.3-1.55-1.05-1.55-2.15 0-1.55 1.25-2.85 4.4-2.85s4.4 1.3 4.4 2.85c0 1.1-.7 1.85-1.55 2.15l2.8-3.4-1.75 4.75c1.45.5 2.5 2.35 2.5 4.35 0 .75-.15 1.45-.4 2.05H9.05c-.25-.6-.4-1.3-.4-2.05 0-2 1.05-3.85 2.5-4.35Z" />
    <ellipse cx="10.35" cy="13.25" rx="0.95" ry="1.1" fill="#1d1028" />
    <ellipse cx="13.65" cy="13.25" rx="0.95" ry="1.1" fill="#1d1028" />
  </SvgFrame>
);

export const ImpPitchforkOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path d="M9 5.5 7.5 3 9 4.2M15 5.5 16.5 3 15 4.2" {...stroke} />
    <circle cx="12" cy="13" r="5.25" {...stroke} />
    <path d="M9.5 12.5c.6.45 1.15.45 1.75 0M13.75 12.5c.6.45 1.15.45 1.75 0" {...stroke} />
    <path d="M12 17.5v3.5M10 21h4" {...stroke} />
  </SvgFrame>
);

export const ImpPitchforkFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M9.15 5.35 7.85 3.15 9.05 4.05 10.35 3.15 9.15 5.35Z" />
    <path d="M14.85 5.35 16.15 3.15 14.95 4.05 13.65 3.15 14.85 5.35Z" />
    <circle cx="12" cy="13" r="5.25" />
    <ellipse cx="10.35" cy="12.65" rx="0.85" ry="1" fill="#1d1028" />
    <ellipse cx="13.65" cy="12.65" rx="0.85" ry="1" fill="#1d1028" />
    <rect x="11.15" y="17.5" width="1.7" height="3.5" rx="0.5" />
  </SvgFrame>
);

export const ImpImpishGrinOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path d="M7.5 9 6 5 8.75 8.25M16.5 9 18 5 15.25 8.25" {...stroke} />
    <path d="M12 20.5c3.5-2.2 5.75-5.15 5.75-8.35C17.75 8.35 15.2 6 12 6S6.25 8.35 6.25 12.15c0 3.2 2.25 6.15 5.75 8.35z" {...stroke} />
    <path d="M9 12.75c.5.35.95.35 1.45 0M14.55 12.75c.5.35.95.35 1.45 0" {...stroke} />
    <path d="M9.75 15.75c.85 1.1 1.85 1.65 2.25 1.65s1.4-.55 2.25-1.65" {...stroke} />
  </SvgFrame>
);

export const ImpImpishGrinFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M7.65 9.05 6.15 5.05 8.55 8.05 9.85 5.05 7.65 9.05ZM16.35 9.05 17.85 5.05 15.45 8.05 14.15 5.05 16.35 9.05ZM12 20.65c3.35-2.1 5.55-4.95 5.55-8.05C17.55 8.5 15.15 6.35 12 6.35S6.45 8.5 6.45 12.6c0 3.1 2.2 5.95 5.55 8.05Z" />
    <path d="M9.75 15.85c.85 1 1.75 1.45 2.25 1.45s1.4-.45 2.25-1.45" fill="#1d1028" />
  </SvgFrame>
);

/* —— Gem roster creatures —— */

export const CreatureGhostOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path
      d="M12 3.5c3.45 0 6 2.65 6 6.15v5.35c0 .55-.45 1-1 1-.35 0-.65-.15-.85-.4L14.5 13.5l-1.25 2.15-1.25-2.15-1.65 2.1a1 1 0 0 1-1.55-.25V9.65c0-3.5 2.55-6.15 6-6.15z"
      {...stroke}
    />
    <circle cx="9.75" cy="9.25" r="0.85" fill="currentColor" stroke="none" />
    <circle cx="14.25" cy="9.25" r="0.85" fill="currentColor" stroke="none" />
  </SvgFrame>
);

export const CreatureGhostFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M12 3.5c3.45 0 6 2.65 6 6.15v5.35c0 .55-.45 1-1 1-.35 0-.65-.15-.85-.4L14.5 13.5l-1.25 2.15-1.25-2.15-1.65 2.1a1 1 0 0 1-1.55-.25V9.65c0-3.5 2.55-6.15 6-6.15z" />
    <circle cx="9.75" cy="9.25" r="0.85" fill="#1d1028" />
    <circle cx="14.25" cy="9.25" r="0.85" fill="#1d1028" />
  </SvgFrame>
);

export const CreatureSkullOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path d="M12 4c3.75 0 6.5 2.65 6.5 6.05 0 2.05-1 3.85-2.55 4.85v2.85c0 .55-.45 1-1 1h-5.9c-.55 0-1-.45-1-1v-2.85C6.5 13.9 5.5 12.1 5.5 10.05 5.5 6.65 8.25 4 12 4z" {...stroke} />
    <circle cx="9.35" cy="10.2" r="1.1" {...stroke} />
    <circle cx="14.65" cy="10.2" r="1.1" {...stroke} />
    <path d="M10.25 14.25h3.5M11 16.75v1.75M13 16.75v1.75" {...stroke} />
  </SvgFrame>
);

export const CreatureSkullFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M12 4c3.75 0 6.5 2.65 6.5 6.05 0 2.05-1 3.85-2.55 4.85v2.85c0 .55-.45 1-1 1h-5.9c-.55 0-1-.45-1-1v-2.85C6.5 13.9 5.5 12.1 5.5 10.05 5.5 6.65 8.25 4 12 4z" />
    <circle cx="9.35" cy="10.2" r="1.15" fill="#1d1028" />
    <circle cx="14.65" cy="10.2" r="1.15" fill="#1d1028" />
    <path d="M10.25 14.25h3.5" stroke="#1d1028" strokeWidth="1.2" />
  </SvgFrame>
);

export const CreatureBatOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path
      d="M12 9.5c1.35-2.45 3.35-4.55 6.15-5.35-1 2-.55 3.95.65 5.65 1.45 1.95 3.05 3 4 2.95-2 1-3.75.55-5.65-.55L12 19.5 6.85 12.2c-1.9 1.1-3.65 1.55-5.65.55 1-.05 2.55-1 4-2.95 1.2-1.7 1.65-3.65.65-5.65 2.8.8 4.8 2.9 6.15 5.35z"
      {...stroke}
    />
  </SvgFrame>
);

export const CreatureBatFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M12 9.5c1.35-2.45 3.35-4.55 6.15-5.35-1 2-.55 3.95.65 5.65 1.45 1.95 3.05 3 4 2.95-2 1-3.75.55-5.65-.55L12 19.5 6.85 12.2c-1.9 1.1-3.65 1.55-5.65.55 1-.05 2.55-1 4-2.95 1.2-1.7 1.65-3.65.65-5.65 2.8.8 4.8 2.9 6.15 5.35z" />
  </SvgFrame>
);

export const CreatureSpiderOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path d="M4 8.5 9 11M20 8.5 15 11M3.5 13.5 9.5 13M20.5 13.5 14.5 13M5 18 9.5 14.5M19 18 14.5 14.5" {...stroke} />
    <circle cx="12" cy="12.5" r="3.35" {...stroke} />
    <circle cx="12" cy="8.75" r="2" {...stroke} />
  </SvgFrame>
);

export const CreatureSpiderFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <ellipse cx="12" cy="12.55" rx="3.35" ry="3.55" />
    <circle cx="12" cy="8.75" r="2.05" />
    <path
      d="M4 8.5 9 11M20 8.5 15 11M3.5 13.5 9.5 13M20.5 13.5 14.5 13M5 18 9.5 14.5M19 18 14.5 14.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
  </SvgFrame>
);

export const CreaturePumpkinOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path d="M12 4.25c2.85 0 5.25 2.15 5.25 5.35 0 4.35-2.35 7.9-5.25 9.15C9.1 17.5 6.75 13.95 6.75 9.6c0-3.2 2.4-5.35 5.25-5.35z" {...stroke} />
    <path d="M12 4.25V3M10.5 3.5c.45-.65 1.05-1 1.5-1s1.05.35 1.5 1" {...stroke} />
    <path d="M9.25 10.25c.55.35 1.05.35 1.55 0M14.2 10.25c.55.35 1.05.35 1.55 0M9.75 13.25c.85.75 1.65 1.1 2.25 1.1s1.4-.35 2.25-1.1" {...stroke} />
  </SvgFrame>
);

export const CreaturePumpkinFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M12 4.25c2.85 0 5.25 2.15 5.25 5.35 0 4.35-2.35 7.9-5.25 9.15C9.1 17.5 6.75 13.95 6.75 9.6c0-3.2 2.4-5.35 5.25-5.35z" />
    <path d="M9.25 10.25c.55.35 1.05.35 1.55 0M14.2 10.25c.55.35 1.05.35 1.55 0" stroke="#1d1028" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    <path d="M9.75 13.25c.85.75 1.65 1.1 2.25 1.1s1.4-.35 2.25-1.1" stroke="#1d1028" strokeWidth="1.4" strokeLinecap="round" fill="none" />
  </SvgFrame>
);

export const CreatureCatOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path d="M8.5 8.25 7 4.5 10 7.75M15.5 8.25 17 4.5 14 7.75" {...stroke} />
    <path d="M12 19.5c3.75-1.85 6.25-5.15 6.25-8.65C18.25 7.35 15.45 5 12 5S5.75 7.35 5.75 10.85c0 3.5 2.5 6.8 6.25 8.65z" {...stroke} />
    <path d="M9 11.25c.45.35.85.35 1.25 0M14.75 11.25c.45.35.85.35 1.25 0M12 13.75v1.25" {...stroke} />
  </SvgFrame>
);

export const CreatureCatFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M8.55 8.15 7.15 4.65 9.65 7.55 10.85 4.65 8.55 8.15ZM15.45 8.15 16.85 4.65 14.35 7.55 13.15 4.65 15.45 8.15ZM12 19.55c3.55-1.75 5.95-4.85 5.95-8.25C17.95 7.45 15.25 5.25 12 5.25S6.05 7.45 6.05 11.3c0 3.4 2.4 6.5 5.95 8.25Z" />
    <ellipse cx="10.1" cy="11.15" rx="0.75" ry="1" fill="#1d1028" />
    <ellipse cx="13.9" cy="11.15" rx="0.75" ry="1" fill="#1d1028" />
  </SvgFrame>
);

export const CreatureMummyOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path d="M7.5 6.5h9M6.75 9h10.5M7 11.5h10M6.5 14h11M7.25 16.5h9.5M8 19h8" {...stroke} />
    <rect x="7" y="5" width="10" height="14" rx="3" {...stroke} />
    <circle cx="10" cy="10.5" r="0.85" fill="currentColor" stroke="none" />
    <circle cx="14" cy="10.5" r="0.85" fill="currentColor" stroke="none" />
  </SvgFrame>
);

export const CreatureMummyFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <rect x="7" y="5" width="10" height="14" rx="3" />
    <path d="M7.5 6.5h9M6.75 9h10.5M7 11.5h10M6.5 14h11M7.25 16.5h9.5" stroke="#1d1028" strokeWidth="0.9" />
    <circle cx="10" cy="10.5" r="0.85" fill="#1d1028" />
    <circle cx="14" cy="10.5" r="0.85" fill="#1d1028" />
  </SvgFrame>
);

export const CreatureEyeOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <ellipse cx="12" cy="12" rx="7.25" ry="5.25" {...stroke} />
    <circle cx="12" cy="12" r="2.75" {...stroke} />
    <circle cx="13.1" cy="10.9" r="0.75" fill="currentColor" stroke="none" />
  </SvgFrame>
);

export const CreatureEyeFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <ellipse cx="12" cy="12" rx="7.25" ry="5.25" />
    <circle cx="12" cy="12" r="2.75" fill="#1d1028" />
    <circle cx="13.1" cy="10.9" r="0.75" fill="#fff" />
  </SvgFrame>
);

export const CreatureFrankOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path d="M8.5 5.5h7l1 2.5v11.5H7.5V8l1-2.5z" {...stroke} />
    <path d="M9.25 10.5h1.75M13 10.5h1.75M10.25 14.25h3.5" {...stroke} />
    <path d="M6.75 11.5h1.75M15.5 11.5h1.75" {...stroke} />
  </SvgFrame>
);

export const CreatureFrankFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M8.5 5.5h7l1 2.5v11.5H7.5V8l1-2.5z" />
    <rect x="6.75" y="10.75" width="1.75" height="2.5" rx="0.4" />
    <rect x="15.5" y="10.75" width="1.75" height="2.5" rx="0.4" />
    <path d="M10.25 14.25h3.5" stroke="#1d1028" strokeWidth="1.3" />
  </SvgFrame>
);

export const CreatureSlimeOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path
      d="M12 4.5c2.15 0 3.75 1.55 3.75 3.55 1.65.35 2.85 1.85 2.85 3.65 0 2.15-1.75 3.9-3.9 3.9-.55 1.15-1.65 1.9-2.95 1.9s-2.4-.75-2.95-1.9c-2.15 0-3.9-1.75-3.9-3.9 0-1.8 1.2-3.3 2.85-3.65 0-2 1.6-3.55 3.75-3.55z"
      {...stroke}
    />
    <circle cx="10.25" cy="11.75" r="0.85" fill="currentColor" stroke="none" />
    <circle cx="13.75" cy="11.75" r="0.85" fill="currentColor" stroke="none" />
  </SvgFrame>
);

export const CreatureSlimeFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M12 4.5c2.15 0 3.75 1.55 3.75 3.55 1.65.35 2.85 1.85 2.85 3.65 0 2.15-1.75 3.9-3.9 3.9-.55 1.15-1.65 1.9-2.95 1.9s-2.4-.75-2.95-1.9c-2.15 0-3.9-1.75-3.9-3.9 0-1.8 1.2-3.3 2.85-3.65 0-2 1.6-3.55 3.75-3.55z" />
    <circle cx="10.25" cy="11.75" r="0.85" fill="#1d1028" />
    <circle cx="13.75" cy="11.75" r="0.85" fill="#1d1028" />
  </SvgFrame>
);

export const CreatureReaperOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path d="M12 3.5c3.2 0 5.75 2.35 5.75 5.35 0 2.35-1.35 4.35-3.35 5.35L12 21l-2.4-7.4C7.6 12.6 6.25 10.6 6.25 8.15c0-3 2.55-5.35 5.75-5.35z" {...stroke} />
    <path d="M9.5 9.25h5" {...stroke} />
  </SvgFrame>
);

export const CreatureReaperFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M12 3.5c3.2 0 5.75 2.35 5.75 5.35 0 2.35-1.35 4.35-3.35 5.35L12 21l-2.4-7.4C7.6 12.6 6.25 10.6 6.25 8.15c0-3 2.55-5.35 5.75-5.35z" />
    <path d="M9.5 9.25h5" stroke="#1d1028" strokeWidth="1.3" />
  </SvgFrame>
);

export const CreatureDragonOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path d="M6.5 14.5c2-3.5 4.5-6 9-6.5-1.5 2.25-1.35 4.65.25 6.5 1.35 1.65 3.15 2.55 5.25 2.35" {...stroke} />
    <path d="M8 9.5 6.5 6 9.25 8.75M11.5 7.75 11 4.5 13 7" {...stroke} />
    <circle cx="14.75" cy="11.25" r="0.85" fill="currentColor" stroke="none" />
  </SvgFrame>
);

export const CreatureDragonFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M6.35 14.65c1.85-3.25 4.25-5.65 8.65-6.15-1.35 2.05-1.2 4.25.2 5.95 1.2 1.45 2.85 2.25 4.8 2.1-2.15 1.05-4.05.65-6.05-.55-2.35-1.35-4.65-1.05-7.6-.35z" />
    <path d="M8 9.5 6.5 6 9.25 8.75 10.85 6.15 12.75 7.85 11.5 7.75 11 4.5 13 7 14.35 9.35" />
    <circle cx="14.75" cy="11.25" r="0.85" fill="#1d1028" />
  </SvgFrame>
);

export const CreatureCandyOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path d="M12 4.5 16.5 19.5H7.5L12 4.5z" {...stroke} />
    <path d="M9.75 12h4.5M10.75 15.25h2.5" {...stroke} />
  </SvgFrame>
);

export const CreatureCandyFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M12 4.5 16.5 19.5H7.5L12 4.5z" />
    <path d="M9.75 12h4.5M10.75 15.25h2.5" stroke="#1d1028" strokeWidth="1.2" />
  </SvgFrame>
);

export const CreatureRavenOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <path d="M8.5 10.5c1.5-2.5 3.5-4 6-4.5-1 1.65-.65 3.35.65 4.65 1.15 1.15 2.55 1.65 3.85 1.45" {...stroke} />
    <path d="M6.5 14.5c1.65-.35 3.15-1.15 4.35-2.65" {...stroke} />
    <circle cx="13.75" cy="9.75" r="0.75" fill="currentColor" stroke="none" />
  </SvgFrame>
);

export const CreatureRavenFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <path d="M8.35 10.65c1.45-2.35 3.35-3.75 5.75-4.2-.9 1.5-.6 3.05.55 4.25 1 1 2.25 1.45 3.45 1.25-1.65.85-3.15.55-4.65-.65-1.35-.75-2.85-.55-4.65-.35z" />
    <path d="M6.35 14.65c1.55-.3 2.95-1.05 4.1-2.45" />
    <circle cx="13.75" cy="9.75" r="0.75" fill="#1d1028" />
  </SvgFrame>
);

export const CreatureSkeletonOutline: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className}>
    <circle cx="12" cy="8.25" r="3.35" {...stroke} />
    <path d="M12 11.6v2.15M9.75 13.75h4.5M10.5 16.25h3M11.25 16.25v3.25M12.75 16.25v3.25" {...stroke} />
  </SvgFrame>
);

export const CreatureSkeletonFilled: FC<IconProps> = ({ className }) => (
  <SvgFrame className={className} fill="currentColor">
    <circle cx="12" cy="8.25" r="3.35" />
    <rect x="11.15" y="11.6" width="1.7" height="2.15" rx="0.35" />
    <rect x="9.75" y="13.75" width="4.5" height="1.35" rx="0.35" />
    <rect x="10.5" y="16.25" width="3" height="1.1" rx="0.35" />
    <rect x="11.25" y="17.35" width="1.1" height="2.15" rx="0.35" />
    <rect x="12.65" y="17.35" width="1.1" height="2.15" rx="0.35" />
  </SvgFrame>
);

export type CreatureIconLabEntry = {
  id: string;
  creatureHe: string;
  styleHe: string;
  note: string;
  /** Primary imp candidate for ⋮ menu */
  impCandidate?: boolean;
  Outline: FC<IconProps>;
  Filled: FC<IconProps>;
};

export const CREATURE_ICON_LAB: CreatureIconLabEntry[] = [
  {
    id: "imp-devil-face",
    creatureHe: "שדון",
    styleHe: "פרצוף + קרניים",
    note: "מאוזן, קריא ב-size-4 — מועמד לתפריט.",
    impCandidate: true,
    Outline: ImpDevilFaceOutline,
    Filled: ImpDevilFaceFilled,
  },
  {
    id: "imp-impish-grin",
    creatureHe: "שדון",
    styleHe: "חיוך שובב",
    note: "מילוי מלא; outline עם חיוך רחב.",
    impCandidate: true,
    Outline: ImpImpishGrinOutline,
    Filled: ImpImpishGrinFilled,
  },
  {
    id: "imp-pitchfork",
    creatureHe: "שדון",
    styleHe: "ראש + מזלג",
    note: "יותר «מסכה» — בולט בגלריה.",
    impCandidate: true,
    Outline: ImpPitchforkOutline,
    Filled: ImpPitchforkFilled,
  },
  {
    id: "ghost",
    creatureHe: "רוח",
    styleHe: "רוח מרחפת",
    note: "מתאים לחיות gem / רגישות.",
    Outline: CreatureGhostOutline,
    Filled: CreatureGhostFilled,
  },
  {
    id: "skull",
    creatureHe: "גולגולת",
    styleHe: "גולגולת",
    note: "קווי ברור; fill לסימון פעיל.",
    Outline: CreatureSkullOutline,
    Filled: CreatureSkullFilled,
  },
  {
    id: "bat",
    creatureHe: "עטלף",
    styleHe: "עטלף",
    note: "זהה לשפה של אייקוני פחד.",
    Outline: CreatureBatOutline,
    Filled: CreatureBatFilled,
  },
  {
    id: "spider",
    creatureHe: "עכביש",
    styleHe: "עכביש",
    note: "רגליים דקות — outline.",
    Outline: CreatureSpiderOutline,
    Filled: CreatureSpiderFilled,
  },
  {
    id: "pumpkin",
    creatureHe: "דלעת",
    styleHe: "Jack-o-lantern",
    note: "קשור לדלעות במפה.",
    Outline: CreaturePumpkinOutline,
    Filled: CreaturePumpkinFilled,
  },
  {
    id: "black-cat",
    creatureHe: "חתול",
    styleHe: "חתול ארched",
    note: "אוזניים חדות.",
    Outline: CreatureCatOutline,
    Filled: CreatureCatFilled,
  },
  {
    id: "mummy",
    creatureHe: "מומיה",
    styleHe: "תחבושות",
    note: "קווי אופקיים מסמנים בד.",
    Outline: CreatureMummyOutline,
    Filled: CreatureMummyFilled,
  },
  {
    id: "eyeball",
    creatureHe: "עין",
    styleHe: "גלגל עין",
    note: "מוקד אחד — קריא קטן.",
    Outline: CreatureEyeOutline,
    Filled: CreatureEyeFilled,
  },
  {
    id: "frankie",
    creatureHe: "פרנקי",
    styleHe: "בולטים בצד",
    note: "ראש מלבני.",
    Outline: CreatureFrankOutline,
    Filled: CreatureFrankFilled,
  },
  {
    id: "slime",
    creatureHe: "סליים",
    styleHe: "טיפה",
    note: "blob אחיד.",
    Outline: CreatureSlimeOutline,
    Filled: CreatureSlimeFilled,
  },
  {
    id: "reaper",
    creatureHe: "קוצר",
    styleHe: "ברדס",
    note: "שק כהה + חריץ עיניים.",
    Outline: CreatureReaperOutline,
    Filled: CreatureReaperFilled,
  },
  {
    id: "dragon",
    creatureHe: "דרקון",
    styleHe: "ראש + קשקשים",
    note: "קווי פנים + קשקשים.",
    Outline: CreatureDragonOutline,
    Filled: CreatureDragonFilled,
  },
  {
    id: "candy-corn",
    creatureHe: "תירס ממתק",
    styleHe: "משולש",
    note: "גיאומטרי — מזהה מיידי.",
    Outline: CreatureCandyOutline,
    Filled: CreatureCandyFilled,
  },
  {
    id: "raven",
    creatureHe: "עורב",
    styleHe: "מקור + ראש",
    note: "פרופיל.",
    Outline: CreatureRavenOutline,
    Filled: CreatureRavenFilled,
  },
  {
    id: "skeleton",
    creatureHe: "שלד",
    styleHe: "גולגולת + מסגרת",
    note: "מינימלי.",
    Outline: CreatureSkeletonOutline,
    Filled: CreatureSkeletonFilled,
  },
];

export const PREVIEW_ICON_SIZES = [
  { label: "size-4", className: "size-4" },
  { label: "size-7", className: "size-7" },
  { label: "size-8", className: "size-8" },
] as const;
