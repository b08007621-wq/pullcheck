import { Color, MeshPhysicalMaterial, type Texture, Vector4 } from 'three';

import { artWindow, type BorderFoil, type CardFinish, type FoilKind } from './cardFinish';

const MODE: Record<FoilKind, number> = {
  plain: 0,
  window: 1,
  full: 2,
  textured: 3,
  gold: 4,
  pikachu: 5,
  reverse: 6,
  cosmos: 7,
};
const BORDER_TINT: Record<BorderFoil, Color> = {
  none: new Color(1, 1, 1),
  silver: new Color(0.88, 0.91, 1),
  gold: new Color(1, 0.8, 0.38),
};
const PIKACHU_SYMBOL = new Vector4(0.47, 0.335, 0.27, 0.13);

const HEADER = `
uniform float pcMode;
uniform vec4 pcWindow;
uniform float pcBorder;
uniform vec3 pcBorderTint;
uniform vec4 pcBorderInset;
uniform vec4 pcSymbol;
float pcFoil;
float pcArea;
float pcLum;
float pcRidge;
float pcBorderMask;
float pcTexture;
vec3 pcBaseNormal;

float pcRect(vec2 uv, vec4 rect, float soft) {
  vec2 lower = smoothstep(rect.xy - soft, rect.xy + soft, uv);
  vec2 upper = 1.0 - smoothstep(rect.zw - soft, rect.zw + soft, uv);
  return lower.x * lower.y * upper.x * upper.y;
}

float pcHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float pcHeight(vec2 uv, float lum) {
  float ridges = sin(lum * 20.0 + (uv.x + uv.y) * 8.0);
  float swirl = sin(uv.x * 64.0 + sin(uv.y * 22.0) * 3.0) * sin(uv.y * 80.0 + sin(uv.x * 16.0) * 3.0);
  float detail = 1.0 - smoothstep(0.5, 1.4, fwidth(uv.x * 80.0));
  return ridges * 0.65 + swirl * 0.35 * detail;
}

vec2 pcCosmos(vec2 uv) {
  float best = 0.0;
  float tone = 0.0;
  for (int layer = 0; layer < 3; layer++) {
    float scale = 9.0 + float(layer) * 7.0;
    vec2 cell = uv * vec2(scale, scale * 1.4);
    vec2 id = floor(cell) + float(layer) * 17.0;
    float seed = pcHash(id);
    vec2 center = vec2(pcHash(id + 3.7), pcHash(id + 9.2)) * 0.5 + 0.25;
    float radius = 0.16 + seed * 0.24;
    float disc = smoothstep(radius, radius - 0.05, length(fract(cell) - center)) * step(0.35, seed);
    if (disc > best) {
      best = disc;
      tone = seed;
    }
  }
  return vec2(best, tone);
}

float pcSparkleField(vec2 uv, vec2 grid, float density, float sharpness, float salt) {
  vec2 cell = uv * grid;
  float seed = pcHash(floor(cell) + salt);
  float shape = smoothstep(0.34, 0.0, length(fract(cell) - 0.5));
  float twinkle = pow(max(0.0, sin(dot(pcBaseNormal.xy, vec2(31.0, 23.0)) * 1.4 + seed * 80.0)), sharpness);
  return step(1.0 - density, seed) * shape * twinkle;
}
`;

const AFTER_MAP = `
#include <map_fragment>
pcLum = dot(texture(map, vMapUv, 3.0).rgb, vec3(0.299, 0.587, 0.114));
float pcInner = pcRect(vMapUv, pcBorderInset, 0.003);
float pcArt = pcRect(vMapUv, pcWindow, 0.005);
pcBorderMask = (1.0 - pcInner) * pcBorder;
pcArea = pcMode < 0.5 ? 0.0 : (pcMode < 1.5 || pcMode > 6.5) ? pcArt : pcMode < 4.5 ? pcInner : (1.0 - pcArt) * pcInner;
pcFoil = max(pcArea, pcBorderMask);
pcTexture = pcMode > 2.5 && pcMode < 4.5 ? pcArea : 0.0;
`;

const AFTER_ROUGHNESS = `
#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, mix(0.24, 0.16, pcBorderMask), pcFoil);
`;

const AFTER_METALNESS = `
#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, mix(pcMode > 3.5 && pcMode < 4.5 ? 0.42 : 0.22, 0.62, pcBorderMask), pcFoil);
`;

const AFTER_NORMAL = `
#include <normal_fragment_maps>
pcBaseNormal = normal;
pcRidge = pcHeight(vMapUv, pcLum) * pcTexture;
float pcH = pcRidge * 0.0017;
vec3 pcDpx = dFdx(-vViewPosition);
vec3 pcDpy = dFdy(-vViewPosition);
vec2 pcDh = vec2(dFdx(pcH), dFdy(pcH));
vec3 pcR1 = cross(pcDpy, normal);
vec3 pcR2 = cross(normal, pcDpx);
float pcDet = dot(pcDpx, pcR1);
vec3 pcGrad = sign(pcDet) * (pcDh.x * pcR1 + pcDh.y * pcR2);
normal = normalize(abs(pcDet) * normal - pcGrad);
`;

const AFTER_EMISSIVE = `
#include <emissivemap_fragment>
if (pcFoil > 0.001) {
  vec2 pcUv = vMapUv;
  float pcTilt = pcBaseNormal.x * 2.2 + pcBaseNormal.y * 1.6;
  float pcPhase = pcTilt + pcUv.x * 0.9 + pcUv.y * 1.5 + pcRidge * 0.08;
  float pcBand = pow(0.5 + 0.5 * sin(pcPhase * 8.17 + 1.1), 2.0);
  float pcSparkle = 0.0;
  if (pcMode > 4.5 && pcMode < 5.5) {
    vec2 pcD = (pcUv - vec2(0.5, 0.52)) * vec2(1.0, 1.4);
    float pcR = log(length(pcD) + 0.03);
    float pcA = atan(pcD.y, pcD.x);
    float pcSpiral = sin(pcA * 5.0 + pcR * 16.0 - pcTilt * 5.0);
    pcPhase = pcA / 6.28318 + pcR * 0.6 + pcTilt * 0.7 + pcSpiral * 0.18;
    pcBand = 0.3 + 0.7 * pow(0.5 + 0.5 * pcSpiral, 1.5);
    float pcSymbolMask = 1.0 - smoothstep(0.8, 1.0, length((pcUv - pcSymbol.xy) / pcSymbol.zw));
    pcSparkle += pcSymbolMask * pcSparkleField(pcUv, vec2(95.0, 133.0), 0.68, 6.0, 7.0) * 1.9;
    vec4 pcOuter = pcWindow + vec4(-0.02, -0.015, 0.02, 0.015);
    vec4 pcEdge = pcWindow + vec4(-0.004, -0.003, 0.004, 0.003);
    float pcRing = pcRect(pcUv, pcOuter, 0.002) * (1.0 - pcRect(pcUv, pcEdge, 0.002));
    vec2 pcDots = pcUv * vec2(120.0, 168.0);
    float pcDot = smoothstep(0.3, 0.05, length(fract(pcDots) - 0.5));
    float pcGlint = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(dot(pcBaseNormal.xy, vec2(19.0, 13.0)) + pcHash(floor(pcDots)) * 40.0), 6.0);
    pcSparkle += pcRing * pcDot * pcGlint * 1.5;
  } else if (pcMode > 6.5) {
    vec2 pcBubble = pcCosmos(pcUv);
    pcPhase += pcBubble.y * 2.3 + pcBubble.x * 0.35;
    pcBand = 0.25 + 0.75 * pcBubble.x * pow(0.5 + 0.5 * sin(pcTilt * 3.0 + pcBubble.y * 30.0), 1.4);
    pcSparkle += pcSparkleField(pcUv, vec2(150.0, 210.0), 0.05, 26.0, 0.0) * pcArea * 0.9;
  } else {
    float pcDensity = pcMode < 1.5 ? 0.07 : pcMode > 5.5 ? 0.05 : 0.04;
    pcSparkle += pcSparkleField(pcUv, vec2(150.0, 210.0), pcDensity, 26.0, 0.0) * pcArea * 1.1;
  }
  vec3 pcRainbow = 0.5 + 0.5 * cos(6.28318 * (pcPhase + vec3(0.0, 0.33, 0.67)));
  if (pcMode > 3.5 && pcMode < 4.5) pcRainbow = mix(pcRainbow, vec3(1.0, 0.83, 0.45), 0.8);
  pcRainbow = mix(pcRainbow, pcBorderTint * (0.82 + 0.18 * pcRainbow), pcBorderMask);
  float pcStrength = pcArea * (pcTexture > 0.5 ? 0.5 : 0.8) + pcBorderMask * 0.9;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (0.68 + 0.62 * pcRainbow * (0.4 + 0.6 * pcBand)), min(1.0, pcStrength));
  totalEmissiveRadiance += pcRainbow * pcBand * 0.11 * pcFoil + vec3(pcSparkle) * 0.9;
}
`;

export function createFoilFrontMaterial(map: Texture, finish: CardFinish): MeshPhysicalMaterial {
  const foiled = finish.foil !== 'plain' || finish.border !== 'none';
  const material = new MeshPhysicalMaterial({
    map,
    roughness: 0.4,
    metalness: 0.02,
    clearcoat: foiled ? 0.9 : 0.7,
    clearcoatRoughness: 0.08,
    alphaTest: 0.5,
  });
  if (!foiled) return material;

  const [u0, v0, u1, v1] = finish.window ?? artWindow(finish.era);
  const uniforms = {
    pcMode: { value: MODE[finish.foil] },
    pcWindow: { value: new Vector4(u0, v0, u1, v1) },
    pcBorder: { value: finish.border === 'none' ? 0 : 1 },
    pcBorderTint: { value: BORDER_TINT[finish.border] },
    pcBorderInset: { value: new Vector4(0.047, 0.034, 0.953, 0.966) },
    pcSymbol: { value: PIKACHU_SYMBOL },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader =
      HEADER +
      shader.fragmentShader
        .replace('#include <map_fragment>', AFTER_MAP)
        .replace('#include <roughnessmap_fragment>', AFTER_ROUGHNESS)
        .replace('#include <metalnessmap_fragment>', AFTER_METALNESS)
        .replace('#include <normal_fragment_maps>', AFTER_NORMAL)
        .replace('#include <emissivemap_fragment>', AFTER_EMISSIVE);
  };
  material.customProgramCacheKey = () => 'pullcheck-foil-4';
  return material;
}
