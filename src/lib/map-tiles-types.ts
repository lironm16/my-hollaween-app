export type MapTilesConfig = {
  url: string;
  lightUrl?: string;
  /** CARTO voyager_only_labels — use on event-creator map over nolabels base. */
  labelsUrl?: string;
  subdomains?: string;
  attribution: string;
  invert: boolean;
  maxNativeZoom: number;
};
