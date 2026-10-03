import type { MeshStandardMaterial } from "three";
import type { GemMonsterTint } from "@/lib/gem-poi-practice";

/** Shared body tint + emissive glow for GLB hunt models. */
export function applyGemMaterialTint(mat: MeshStandardMaterial, tint: GemMonsterTint) {
  mat.metalness = 0.05;
  mat.roughness = 0.55;
  mat.color.offsetHSL(tint.hue, tint.saturation, tint.lightness);
  if (tint.glow > 0) {
    mat.emissive.setHSL(tint.hue, 0.55, 0.42);
    mat.emissiveIntensity = tint.glow;
  } else {
    mat.emissive.setHex(0x000000);
    mat.emissiveIntensity = 0;
  }
}
