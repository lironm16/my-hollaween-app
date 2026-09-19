/** Real app screenshots (PNG) under /images/help — not /help/* (avoids App Router route clash). */
const HELP_IMAGES_VERSION = "3";

export function helpImage(path: string) {
  const file = path.replace(/^\//, "");
  return `/images/help/${file}?v=${HELP_IMAGES_VERSION}`;
}
