/** Help illustrations live under /images/help — not /help/* (avoids App Router + SW 404 cache). */
export function helpImage(path: string) {
  return `/images/help/${path.replace(/^\//, "")}`;
}
