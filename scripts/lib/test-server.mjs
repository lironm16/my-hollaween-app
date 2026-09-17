import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

export async function pickFreePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close((error) => (error ? reject(error) : resolve(port)));
    });
    probe.on("error", reject);
  });
}

export function serverBase(port = Number(process.env.PORT ?? 43127)) {
  return process.env.BASE_URL ?? `http://127.0.0.1:${port}`;
}

export function createTestServerManager({
  port = Number(process.env.PORT ?? 43127),
  dataDir = process.env.DATA_DIR,
  extraEnv = {},
  forceFresh = false,
  label = "test",
  startTimeoutMs = Number(process.env.TEST_START_TIMEOUT_MS ?? 90_000),
} = {}) {
  const base = serverBase(port);
  let server = null;
  let startedByUs = false;

  async function reachable() {
    try {
      const res = await fetch(`${base}/api/catalog`, { cache: "no-store" });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function ensureServer() {
    if (!forceFresh && (await reachable())) {
      console.log(`[${label}] Using running server at ${base}`);
      return base;
    }

    if (!existsSync(".next")) {
      console.error(`[${label}] No production build found. Run \`npm run build\` first.`);
      process.exit(1);
    }

    if (dataDir) {
      rmSync(dataDir, { recursive: true, force: true });
    }

    console.log(`[${label}] Starting server on port ${port}…`);
    startedByUs = true;
    server = spawn("npx", ["next", "start", "--hostname", "0.0.0.0", "--port", String(port)], {
      stdio: "inherit",
      env: {
        ...process.env,
        PORT: String(port),
        ...(dataDir ? { DATA_DIR: dataDir } : {}),
        ...extraEnv,
      },
    });
    server.on("error", (error) => {
      console.error(error);
      process.exit(1);
    });

    const deadline = Date.now() + startTimeoutMs;
    while (Date.now() < deadline) {
      if (await reachable()) {
        console.log(`[${label}] Server ready at ${base}`);
        return base;
      }
      await sleep(500);
    }

    console.error(`[${label}] Server did not become ready at ${base} within ${startTimeoutMs}ms`);
    shutdown();
    process.exit(1);
  }

  function shutdown() {
    if (!startedByUs || !server) return;
    server.kill("SIGTERM");
    server = null;
    startedByUs = false;
    if (dataDir) {
      rmSync(dataDir, { recursive: true, force: true });
    }
  }

  return { base, ensureServer, shutdown, port };
}

export function defaultApiDataDir() {
  return join(process.cwd(), "artifacts", "api-test-data");
}

export function defaultE2eDataDir() {
  return join(process.cwd(), "artifacts", "e2e-test-data");
}
