import { Color, MeshPhysicalMaterial, type Texture, Vector4 } from 'three';

import { artWindow, type BorderFoil, type CardFinish, type FoilKind, type HoloPattern } from './cardFinish';

type Look = {
  area: number;
  pattern: number | null;
  strength: number;
  etch: number;
  etchKind: number;
  glitter: number;
  glitterScale: number;
  glitterTone: number;
  pastel: number;
  tint: Color;
  tintMix: number;
  metal: number;
  rough: number;
};

const AREA = { none: 0, art: 1, inner: 2, outside: 3, pikachu: 4, card: 5 };
const ETCH = { none: 0, lines: 1, contour: 2, grain: 3 };
const TONE = { white: 0, rainbow: 1, tint: 2 };
const PATTERN: Record<HoloPattern | 'swirl' | 'chrome', number> = {
  mirage: 0,
  line: 1,
  cosmos: 2,
  swirl: 3,
  chrome: 4,
  starlight: 5,
  tinsel: 6,
  sheen: 7,
  waterweb: 8,
};

const WHITE = new Color(1, 1, 1);
const GOLD = new Color(1, 0.78, 0.36);
const OPAL = new Color(0.86, 0.9, 1);

const BASE: Look = {
  area: AREA.art,
  pattern: null,
  strength: 0.8,
  etch: 0,
  etchKind: ETCH.none,
  glitter: 0.06,
  glitterScale: 150,
  glitterTone: TONE.white,
  pastel: 0,
  tint: WHITE,
  tintMix: 0,
  metal: 0.22,
  rough: 0.24,
};

const LOOKS: Record<FoilKind, Partial<Look>> = {
  plain: { area: AREA.none },
  window: {},
  cosmos: { pattern: PATTERN.cosmos, glitter: 0.05 },
  reverse: { area: AREA.outside, strength: 0.75, glitter: 0.05 },
  full: { area: AREA.inner, strength: 0.75, glitter: 0.05 },
  textured: {
    area: AREA.card,
    strength: 0.55,
    etch: 0.9,
    etchKind: ETCH.lines,
    glitter: 0.04,
  },
  illustration: {
    area: AREA.card,
    pattern: PATTERN.sheen,
    strength: 0.34,
    etch: 0.35,
    etchKind: ETCH.grain,
    glitter: 0.05,
    glitterScale: 220,
  },
  special: {
    area: AREA.card,
    strength: 0.48,
    etch: 1,
    etchKind: ETCH.contour,
    glitter: 0.07,
    glitterScale: 220,
    glitterTone: TONE.rainbow,
  },
  gold: {
    area: AREA.card,
    pattern: PATTERN.sheen,
    strength: 0.6,
    etch: 0.95,
    etchKind: ETCH.contour,
    glitter: 0.32,
    glitterScale: 210,
    glitterTone: TONE.tint,
    tint: GOLD,
    tintMix: 0.78,
    metal: 0.55,
    rough: 0.2,
  },
  rainbow: {
    area: AREA.card,
    pattern: PATTERN.sheen,
    strength: 0.62,
    etch: 0.7,
    etchKind: ETCH.contour,
    glitter: 0.34,
    glitterScale: 200,
    glitterTone: TONE.rainbow,
    pastel: 0.42,
  },
  chrome: {
    area: AREA.card,
    pattern: PATTERN.chrome,
    strength: 0.7,
    etch: 0.45,
    etchKind: ETCH.contour,
    glitter: 0.02,
    pastel: 0.3,
    tint: OPAL,
    tintMix: 0.15,
    metal: 0.6,
    rough: 0.16,
  },
  shiny: {
    area: AREA.card,
    pattern: PATTERN.sheen,
    strength: 0.42,
    etch: 0.25,
    etchKind: ETCH.grain,
    glitter: 0.42,
    glitterScale: 240,
  },
  pikachu: { area: AREA.pikachu, pattern: PATTERN.swirl, glitter: 0 },
};

const BORDER_TINT: Record<BorderFoil, Color> = {
  none: new Color(1, 1, 1),
  silver: new Color(0.88, 0.91, 1),
  gold: new Color(1, 0.8, 0.38),
};
const PIKACHU_SYMBOL = new Vector4(0.47, 0.335, 0.27, 0.13);

const HEADER = `
uniform float pcArea;
uniform float pcPattern;
uniform float pcStrength;
uniform float pcEtch;
uniform float pcEtchKind;
uniform float pcGlitter;
uniform float pcGlitterScale;
uniform float pcGlitterTone;
uniform float pcPastel;
uniform vec3 pcTint;
uniform float pcTintMix;
uniform float pcMetal;
uniform float pcRough;
uniform vec4 pcWindow;
uniform float pcBorder;
uniform vec3 pcBorderTint;
uniform vec4 pcBorderInset;
uniform vec4 pcSymbol;
float pcFoil;
float pcMask;
float pcArtMask;
float pcBorderMask;
float pcLum;
float pcBlur;
vec2 pcSlope;
float pcFine;
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

float pcNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 s = f * f * (3.0 - 2.0 * f);
  float a = pcHash(cell);
  float b = pcHash(cell + vec2(1.0, 0.0));
  float c = pcHash(cell + vec2(0.0, 1.0));
  float d = pcHash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
}

vec3 pcPalette(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

float pcDetail(vec2 uv, float frequency) {
  return 1.0 - smoothstep(0.5, 1.4, fwidth(uv.y * frequency));
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

const MAP_HELPERS = `
#include <map_pars_fragment>
float pcBlurAt(vec2 uv) {
  return dot(texture(map, uv, 1.5).rgb, vec3(0.299, 0.587, 0.114));
}

float pcReliefAt(vec2 uv) {
  float blur = pcBlurAt(uv);
  if (pcEtchKind < 1.5) {
    return sin((uv.x * 0.58 + uv.y) * 1150.0 + blur * 5.0) * 0.1 * pcFine + blur * 0.8;
  }
  if (pcEtchKind < 2.5) {
    return blur * 1.3 + sin(blur * 38.0) * 0.07 + (pcNoise(uv * vec2(150.0, 210.0)) - 0.5) * 0.1 * pcFine;
  }
  return (pcNoise(uv * vec2(420.0, 590.0)) - 0.5) * 0.3 * pcFine + blur * 0.4;
}
`;

const AFTER_MAP = `
#include <map_fragment>
pcLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
pcBlur = dot(texture(map, vMapUv, 2.5).rgb, vec3(0.299, 0.587, 0.114));
float pcInner = pcRect(vMapUv, pcBorderInset, 0.003);
pcArtMask = pcRect(vMapUv, pcWindow, 0.005);
pcMask = pcArea < 0.5 ? 0.0
  : pcArea < 1.5 ? pcArtMask
  : pcArea < 2.5 ? pcInner
  : pcArea < 3.5 ? (1.0 - pcArtMask) * pcInner
  : pcArea < 4.5 ? pcInner
  : 1.0;
pcBorderMask = pcArea > 4.5 ? 0.0 : (1.0 - pcInner) * pcBorder;
pcFoil = max(pcMask, pcBorderMask);
pcFine = pcDetail(vMapUv, 420.0);
pcSlope = vec2(0.0);
if (pcEtch > 0.0 && pcMask > 0.001) {
  vec2 pcStep = vec2(1.0 / 640.0, 1.0 / 900.0);
  float pcHere = pcReliefAt(vMapUv);
  pcSlope = vec2(pcReliefAt(vMapUv + vec2(pcStep.x, 0.0)) - pcHere, pcReliefAt(vMapUv + vec2(0.0, pcStep.y)) - pcHere) / pcStep;
  pcSlope *= pcMask * pcEtch;
}
`;

const AFTER_ROUGHNESS = `
#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, mix(pcRough, 0.16, pcBorderMask), pcFoil);
`;

const AFTER_METALNESS = `
#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, mix(pcMetal, 0.62, pcBorderMask), pcFoil);
`;

const AFTER_NORMAL = `
#include <normal_fragment_maps>
pcBaseNormal = normal;
if (dot(pcSlope, pcSlope) > 0.0) {
  vec3 pcQ0 = dFdx(-vViewPosition);
  vec3 pcQ1 = dFdy(-vViewPosition);
  vec2 pcSt0 = dFdx(vMapUv);
  vec2 pcSt1 = dFdy(vMapUv);
  vec3 pcQ1Perp = cross(pcQ1, normal);
  vec3 pcQ0Perp = cross(normal, pcQ0);
  vec3 pcT = pcQ1Perp * pcSt0.x + pcQ0Perp * pcSt1.x;
  vec3 pcB = pcQ1Perp * pcSt0.y + pcQ0Perp * pcSt1.y;
  float pcScale = inversesqrt(max(1e-12, max(dot(pcT, pcT), dot(pcB, pcB))));
  normal = normalize(normal - (pcSlope.x * pcT + pcSlope.y * pcB) * pcScale * 0.0045);
}
`;

const AFTER_EMISSIVE = `
#include <emissivemap_fragment>
if (pcFoil > 0.001) {
  vec2 pcUv = vMapUv;
  vec2 pcBend = (normal.xy - pcBaseNormal.xy) * 3.0;
  float pcTilt = pcBaseNormal.x * 2.2 + pcBaseNormal.y * 1.6;
  float pcPhase = pcTilt + pcUv.x * 0.9 + pcUv.y * 1.5 + pcBend.x * 0.6 + pcBend.y * 0.4;
  float pcBand = pow(0.5 + 0.5 * sin(pcPhase * 8.17 + 1.1), 2.0);
  float pcSparkle = 0.0;
  float pcDots = 0.0;
  if (pcPattern > 2.5 && pcPattern < 3.5) {
    vec2 pcD = (pcUv - pcSymbol.xy) * vec2(1.0, 1.4);
    float pcR = log(length(pcD) + 0.03);
    float pcA = atan(pcD.y, pcD.x);
    float pcSpiral = sin(pcA * 6.0 + pcR * 15.0 - pcTilt * 5.0);
    float pcSwirlPhase = pcA / 6.28318 + pcR * 0.6 + pcTilt * 0.7 + pcSpiral * 0.18;
    float pcSwirlBand = 0.3 + 0.7 * pow(0.5 + 0.5 * pcSpiral, 1.5);
    vec2 pcCells = pcUv * vec2(70.0, 98.0);
    float pcDot = smoothstep(0.36, 0.2, length(fract(pcCells) - 0.5));
    float pcSeed = pcHash(floor(pcCells));
    float pcDotBand = pcDot * (0.3 + 0.7 * pow(0.5 + 0.5 * sin(pcTilt * 4.0 + pcSeed * 6.28318 + pcUv.y * 5.0), 2.0));
    float pcOutside = (1.0 - pcArtMask) * pcMask;
    pcDots = max(pcArtMask * pcMask, pcBorderMask);
    pcPhase = mix(pcPhase + pcSeed * 0.35, pcSwirlPhase, pcOutside);
    pcBand = mix(pcDotBand, pcSwirlBand, pcOutside);
    pcSparkle += pcDots * pcDot * pcSparkleField(pcUv, vec2(70.0, 98.0), 0.5, 8.0, 5.0) * 1.4;
  } else if (pcPattern > 0.5 && pcPattern < 1.5) {
    float pcLine = 0.5 + 0.5 * smoothstep(0.3, 0.7, abs(fract(pcUv.x * 210.0) - 0.5) * 2.0) * pcDetail(pcUv, 210.0);
    float pcBars = smoothstep(0.8, 1.0, sin(pcUv.x * 34.0 - pcTilt * 6.0 + pcUv.y * 4.0));
    pcBand = pcBand * pcLine + pcBars * 0.4;
  } else if (pcPattern > 1.5 && pcPattern < 2.5) {
    vec2 pcBubble = pcCosmos(pcUv);
    pcPhase += pcBubble.y * 2.3 + pcBubble.x * 0.35;
    pcBand = 0.25 + 0.75 * pcBubble.x * pow(0.5 + 0.5 * sin(pcTilt * 3.0 + pcBubble.y * 30.0), 1.4);
  } else if (pcPattern > 3.5 && pcPattern < 4.5) {
    float pcFresnel = 1.0 - abs(pcBaseNormal.z);
    pcPhase = pcFresnel * 2.2 + pcTilt * 0.45 + pcBlur * 0.9 + pcUv.y * 0.5 - pcUv.x * 0.3;
    pcBand = 0.6 + 0.4 * sin(pcPhase * 2.4);
  } else if (pcPattern > 4.5 && pcPattern < 5.5) {
    pcBand = 0.35 + 0.65 * pcBand;
    pcSparkle += pcSparkleField(pcUv, vec2(120.0, 168.0), 0.1, 10.0, 11.0) * pcMask * 1.2;
  } else if (pcPattern > 5.5 && pcPattern < 6.5) {
    float pcShred = pcHash(vec2(floor(pcUv.x * 150.0), 7.0));
    pcBand *= 0.35 + 0.65 * pow(0.5 + 0.5 * sin(pcShred * 40.0 + pcTilt * 7.0 + pcUv.y * 3.0), 3.0);
  } else if (pcPattern > 6.5 && pcPattern < 7.5) {
    pcBand = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(pcPhase * 3.2 + 0.6), 1.6);
  } else if (pcPattern > 7.5) {
    float pcWarp = pcNoise(pcUv * vec2(14.0, 20.0) + pcTilt * 0.6) * 0.35;
    float pcWeb = abs(sin((pcUv.x + pcWarp) * 70.0) * sin((pcUv.y - pcWarp) * 96.0));
    pcBand *= 0.35 + 0.65 * smoothstep(0.15, 0.85, pcWeb);
  } else {
    float pcWave = sin((pcUv.x - pcUv.y * 0.6) * 22.0 + sin(pcUv.y * 9.0) * 1.5 + pcTilt * 3.0);
    pcBand *= 0.6 + 0.4 * pcWave;
  }
  vec3 pcGlitterLight = vec3(0.0);
  if (pcGlitter > 0.0) {
    vec2 pcGrid = vec2(pcGlitterScale, pcGlitterScale * 1.4);
    float pcGleam = pcSparkleField(pcUv + pcBend * 0.002, pcGrid, pcGlitter, 14.0, 3.0);
    vec3 pcGleamColor = pcGlitterTone < 0.5 ? vec3(1.0)
      : pcGlitterTone < 1.5 ? 0.55 + 0.45 * pcPalette(pcHash(floor(pcUv * pcGrid)) + pcTilt)
      : pcTint;
    pcGlitterLight = pcGleamColor * pcGleam * pcMask;
  }
  vec3 pcRainbow = pcPalette(pcPhase);
  pcRainbow = mix(pcRainbow, vec3(1.0), pcPastel);
  pcRainbow = mix(pcRainbow, pcTint * (0.72 + 0.4 * pcRainbow), pcTintMix);
  pcRainbow = mix(pcRainbow, pcBorderTint * (0.82 + 0.18 * pcRainbow), pcBorderMask * (1.0 - pcDots));
  float pcAmount = pcMask * pcStrength + pcBorderMask * 0.9;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (0.68 + 0.62 * pcRainbow * (0.4 + 0.6 * pcBand)), min(1.0, pcAmount));
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * pcTint * 1.12, pcTintMix * 0.3 * pcMask);
  totalEmissiveRadiance += pcRainbow * pcBand * 0.14 * pcAmount + pcGlitterLight * 0.9 + vec3(pcSparkle) * 0.9;
}
`;

export function createFoilFrontMaterial(map: Texture, finish: CardFinish): MeshPhysicalMaterial {
  const look: Look = { ...BASE, ...LOOKS[finish.foil] };
  const foiled = look.area !== AREA.none || finish.border !== 'none';
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
    pcArea: { value: look.area },
    pcPattern: { value: look.pattern ?? PATTERN[finish.pattern] },
    pcStrength: { value: look.strength },
    pcEtch: { value: look.etch },
    pcEtchKind: { value: look.etchKind },
    pcGlitter: { value: look.glitter },
    pcGlitterScale: { value: look.glitterScale },
    pcGlitterTone: { value: look.glitterTone },
    pcPastel: { value: look.pastel },
    pcTint: { value: look.tint },
    pcTintMix: { value: look.tintMix },
    pcMetal: { value: look.metal },
    pcRough: { value: look.rough },
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
        .replace('#include <map_pars_fragment>', MAP_HELPERS)
        .replace('#include <map_fragment>', AFTER_MAP)
        .replace('#include <roughnessmap_fragment>', AFTER_ROUGHNESS)
        .replace('#include <metalnessmap_fragment>', AFTER_METALNESS)
        .replace('#include <normal_fragment_maps>', AFTER_NORMAL)
        .replace('#include <emissivemap_fragment>', AFTER_EMISSIVE);
  };
  material.customProgramCacheKey = () => 'pullcheck-foil-5';
  return material;
}
