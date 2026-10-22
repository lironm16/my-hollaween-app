/** Percent of image width/height (0–1) for install-help overlays. */
export type HelpShotHighlight =
  | { kind: "ring"; cx: number; cy: number; r: number }
  | { kind: "row"; x: number; y: number; w: number; h: number };

/** iPhone Safari — Share icon in bottom toolbar (1059×2000 reference). */
export const IOS_INSTALL_SHARE_HIGHLIGHT: HelpShotHighlight = {
  kind: "ring",
  cx: 0.495,
  cy: 0.923,
  r: 0.058,
};

/** iOS share sheet — **Add to Home Screen** row (924×2000 reference). */
export const IOS_INSTALL_ADD_HOME_HIGHLIGHT: HelpShotHighlight = {
  kind: "row",
  x: 0.02,
  y: 0.465,
  w: 0.96,
  h: 0.062,
};

/** iOS **Add to Home Screen** confirm — **Add** (969×2000 reference). */
export const IOS_INSTALL_ADD_CONFIRM_HIGHLIGHT: HelpShotHighlight = {
  kind: "row",
  x: 0.772,
  y: 0.028,
  w: 0.21,
  h: 0.052,
};

/** Android header — download / install button (1082×200 reference). */
export const ANDROID_INSTALL_DOWNLOAD_HIGHLIGHT: HelpShotHighlight = {
  kind: "ring",
  cx: 0.118,
  cy: 0.48,
  r: 0.095,
};
