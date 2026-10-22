/** Percent of image width/height (0–1) for install-help overlays. */
export type HelpShotHighlight =
  | { kind: "ring"; cx: number; cy: number; r: number }
  | { kind: "row"; x: number; y: number; w: number; h: number };

/** iPhone 13-class Safari — share toolbar (1059×2000 reference). */
export const IOS_INSTALL_SHARE_HIGHLIGHT: HelpShotHighlight = {
  kind: "ring",
  cx: 0.479,
  cy: 0.929,
  r: 0.038,
};

/** iOS share sheet — «Add to Home Screen» row (924×2000 reference). */
export const IOS_INSTALL_ADD_HOME_HIGHLIGHT: HelpShotHighlight = {
  kind: "row",
  x: 0.035,
  y: 0.477,
  w: 0.93,
  h: 0.042,
};
