import { readFileSync } from "node:fs";
import { join } from "node:path";

function readPublicCss(name: string) {
  try {
    return readFileSync(join(process.cwd(), "public", name), "utf8");
  } catch {
    return "";
  }
}

/** Read on each render so pin colors cannot stick to a stale server snapshot. */
export function getInlineThemeCss() {
  return [readPublicCss("app.css"), readPublicCss("shell.css")]
    .filter(Boolean)
    .join("\n");
}
