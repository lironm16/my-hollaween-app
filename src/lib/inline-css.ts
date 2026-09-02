import { readFileSync } from "node:fs";
import { join } from "node:path";

function readPublicCss(name: string) {
  try {
    return readFileSync(join(process.cwd(), "public", name), "utf8");
  } catch {
    return "";
  }
}

/** Full theme CSS inlined into HTML so Preview iframes still look like Halloween
 *  when Next.js blocks `/_next/static/css` as a cross-origin dev resource. */
export const inlineThemeCss = [readPublicCss("app.css"), readPublicCss("shell.css")]
  .filter(Boolean)
  .join("\n");
