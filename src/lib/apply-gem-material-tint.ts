import type { MeshStandardMaterial } from "three";
import type { GemMonsterTint } from "@/lib/gem-school-campus";

/** Shared body tint + emissive glow for GLB hunt models. */
export function applyGemMaterialTint(mat: MeshStandardMaterial, tint: GemMonsterTint) {
  mat.metalness = 0;
  mat.roughness = 0.92;
  mat.flatShading = false;
  mat.color.offsetHSL(tint.hue, tint.saturation, tint.lightness);
  const baseGlow = 0.22;
  if (tint.glow > 0) {
    mat.emissive.setHSL(tint.hue, 0.55, 0.42);
    mat.emissiveIntensity = Math.max(tint.glow, baseGlow);
  } else {
    mat.emissive.copy(mat.color);
    mat.emissiveIntensity = baseGlow;
  }
}
