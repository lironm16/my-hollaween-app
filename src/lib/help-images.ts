/** Help illustrations live under /images/help — not /help/* (avoids App Router + SW 404 cache). */
const HELP_IMAGES_VERSION = "2";

export function helpImage(path: string) {
  const file = path.replace(/^\//, "");
  return `/images/help/${file}?v=${HELP_IMAGES_VERSION}`;
}
