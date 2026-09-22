/** Semver from package.json, injected at build via next.config env. */
export function appVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "dev";
}

export function appVersionLabel(): string {
  return `v${appVersion()}`;
}
