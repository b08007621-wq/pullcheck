import { MeshPhysicalMaterial, type Texture } from 'three';

const AFTER_MAP = `
#include <map_fragment>
float tinRelief = dot(texture(map, vMapUv, 2.2).rgb, vec3(0.299, 0.587, 0.114));
float tinEdge = smoothstep(0.0, 0.035, min(min(vMapUv.x, 1.0 - vMapUv.x), min(vMapUv.y, 1.0 - vMapUv.y)));
`;

const AFTER_NORMAL = `
#include <normal_fragment_maps>
vec3 tinBaseNormal = normal;
float tinHeight = tinRelief * tinEdge * 0.0045;
vec3 tinDpx = dFdx(-vViewPosition);
vec3 tinDpy = dFdy(-vViewPosition);
vec2 tinDh = vec2(dFdx(tinHeight), dFdy(tinHeight));
vec3 tinR1 = cross(tinDpy, normal);
vec3 tinR2 = cross(normal, tinDpx);
float tinDet = dot(tinDpx, tinR1);
vec3 tinGrad = sign(tinDet) * (tinDh.x * tinR1 + tinDh.y * tinR2);
normal = normalize(abs(tinDet) * normal - tinGrad);
`;

const AFTER_EMISSIVE = `
#include <emissivemap_fragment>
float tinTilt = tinBaseNormal.x * 2.4 + tinBaseNormal.y * 1.7 + vMapUv.y * 1.2;
float tinSheen = pow(0.5 + 0.5 * sin(tinTilt * 5.5 + 0.8), 6.0);
float tinBrush = 0.85 + 0.15 * sin(vMapUv.y * 900.0 + sin(vMapUv.x * 40.0));
totalEmissiveRadiance += diffuseColor.rgb * tinSheen * 0.22 * tinBrush;
`;

export function createTinLidMaterial(map: Texture): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    map,
    roughness: 0.3,
    metalness: 0.45,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_fragment>', AFTER_MAP)
      .replace('#include <normal_fragment_maps>', AFTER_NORMAL)
      .replace('#include <emissivemap_fragment>', AFTER_EMISSIVE);
  };
  material.customProgramCacheKey = () => 'pullcheck-tin-lid';
  return material;
}
