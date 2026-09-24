/**
 * Renders static PNG posters from gem hunt GLBs (same framing as in-app GemModel3D).
 * Posters are build artifacts — never use itch.io marketing cover art in the app.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public", "gem-monsters");
const threeRoot = join(root, "node_modules", "three");

const SKIP_GLB = new Set(["HalloweenSpookyPetPack18.glb"]);

/** Discovered from public/gem-monsters/*.glb (see src/lib/gem-monsters.ts ids). */
function listModels() {
  return readdirSync(publicDir)
    .filter((name) => name.endsWith(".glb") && !SKIP_GLB.has(name))
    .sort()
    .map((glbFile) => {
      const id = glbFile.replace(/\.glb$/i, "");
      return { id, glbFile, posterFile: `${id}-poster.png` };
    });
}

const SIZE = 512;

const RENDER_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<script type="importmap">
{
  "imports": {
    "three": "https://local.gem-render/three.module.js",
    "three/addons/": "https://local.gem-render/addons/"
  }
}
</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function frameModel(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scale = 1.35 / maxDim;
  object.scale.setScalar(scale);
  object.position.sub(center.multiplyScalar(scale));
  object.position.y -= 0.08;
}

window.__renderGlbPoster = async (glbBytes) => {
  const canvas = document.createElement('canvas');
  canvas.width = ${SIZE};
  canvas.height = ${SIZE};
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(${SIZE}, ${SIZE});
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.35, 2.4);
  camera.lookAt(0, 0.05, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.95));
  const key = new THREE.DirectionalLight(0xffe7ba, 1.2);
  key.position.set(2, 3, 4);
  const rim = new THREE.DirectionalLight(0xc4b5fd, 0.65);
  rim.position.set(-2, 1, -3);
  scene.add(key, rim);

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const loader = new GLTFLoader();
  const blob = new Blob([glbBytes], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);
  const gltf = await loader.loadAsync(url);
  URL.revokeObjectURL(url);

  const model = gltf.scene;
  frameModel(model);
  rootGroup.add(model);
  rootGroup.rotation.y = 0.45;
  renderer.render(scene, camera);

  const dataUrl = canvas.toDataURL('image/png');
  renderer.dispose();
  return dataUrl;
};
</script>
</body></html>`;

function serveThreeModule(url) {
  const prefix = "https://local.gem-render/";
  if (!url.startsWith(prefix)) return null;
  const rel = url.slice(prefix.length);
  const buildChunk = join(threeRoot, "build", rel);
  if (rel === "three.module.js" || rel === "three.core.js") {
    return { path: buildChunk, type: "text/javascript" };
  }
  if (rel.startsWith("addons/")) {
    return {
      path: join(threeRoot, "examples", "jsm", rel.slice("addons/".length)),
      type: "text/javascript",
    };
  }
  return null;
}

async function renderPoster(page, glbPath, outPath) {
  const glbBytes = readFileSync(glbPath);
  const dataUrl = await page.evaluate(async (bytes) => {
    const u8 = new Uint8Array(bytes);
    return window.__renderGlbPoster(u8);
  }, [...glbBytes]);

  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  writeFileSync(outPath, Buffer.from(base64, "base64"));
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    process.stdout.write(
      "render-gem-monster-posters: skip (Chromium unavailable — using committed PNGs). " +
        `${err instanceof Error ? err.message : err}\n`,
    );
    return;
  }
  const page = await browser.newPage();
  await page.route("https://local.gem-render/**", async (route) => {
    const file = serveThreeModule(route.request().url());
    if (!file) {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: file.type,
      body: readFileSync(file.path),
    });
  });

  await page.setContent(RENDER_PAGE, { waitUntil: "load" });
  await page.waitForFunction(() => typeof window.__renderGlbPoster === "function");

  const models = listModels();
  if (models.length === 0) {
    process.stdout.write("render-gem-monster-posters: no GLBs found — skip\n");
    await browser.close();
    return;
  }

  for (const model of models) {
    const glbPath = join(publicDir, model.glbFile);
    const outPath = join(publicDir, model.posterFile);
    if (!existsSync(glbPath)) {
      process.stdout.write(`render-gem-monster-posters: skip missing ${model.glbFile}\n`);
      continue;
    }
    process.stdout.write(`render-gem-monster-posters: ${model.id} → ${model.posterFile}\n`);
    await renderPoster(page, glbPath, outPath);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
