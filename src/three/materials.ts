import { type Material, MeshPhysicalMaterial, MeshStandardMaterial, type Texture } from 'three';

import type { CardFinish } from './cardFinish';
import { createFoilFrontMaterial } from './foilMaterial';
import type { MeshData } from './meshData';
import { createTinLidMaterial } from './tinMaterial';

export type MaterialSet = Record<string, Material>;

export type CardTextures = {
  front: Texture;
  back: Texture;
  edge: Texture;
  finish: CardFinish;
};

export type ProductTextures = {
  front: Texture;
  side: Texture;
  top: Texture;
};

const PRINT = {
  roughness: 0.42,
  clearcoat: 0.5,
  clearcoatRoughness: 0.16,
};

const FOIL = {
  roughness: 0.3,
  metalness: 0.28,
  clearcoat: 1,
  clearcoatRoughness: 0.06,
};

const BACK_TINT = '#8a8590';

export function createCardMaterials({ front, back, edge, finish }: CardTextures): MaterialSet {
  return {
    CardFront: createFoilFrontMaterial(front, finish),
    CardBack: new MeshPhysicalMaterial({
      map: back,
      roughness: 0.46,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
    }),
    CardEdge: new MeshStandardMaterial({ map: edge, roughness: 0.85 }),
  };
}

export function createPackMaterials(art: Texture): MaterialSet {
  return {
    FoilFront: new MeshPhysicalMaterial({ ...FOIL, map: art }),
    FoilBack: new MeshPhysicalMaterial({ ...FOIL, map: art, color: '#8d8794' }),
    FoilEdge: new MeshPhysicalMaterial({ ...FOIL, map: art, roughness: 0.42 }),
  };
}

export function createSleeveMaterials(art: Texture): MaterialSet {
  const film = {
    map: art,
    roughness: 0.34,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  };
  return {
    BoardFront: new MeshPhysicalMaterial(film),
    BoardBack: new MeshPhysicalMaterial({ ...film, color: '#8f8a96' }),
    BoardEdge: new MeshPhysicalMaterial({ color: '#d9d8dc', roughness: 0.4, clearcoat: 0.6 }),
  };
}

export function createBoardMaterials({ front, side, top }: ProductTextures): MaterialSet {
  return {
    BoardFront: new MeshPhysicalMaterial({ ...PRINT, map: front }),
    BoardBack: new MeshPhysicalMaterial({ ...PRINT, map: front, color: BACK_TINT }),
    BoardSide: new MeshPhysicalMaterial({ ...PRINT, map: side }),
    BoardTop: new MeshPhysicalMaterial({ ...PRINT, map: top }),
    FoilFront: new MeshPhysicalMaterial({ ...FOIL, map: front }),
    Plastic: createPlasticMaterial(),
  };
}

export function createTinMaterials({ front, side }: Pick<ProductTextures, 'front' | 'side'>): MaterialSet {
  return {
    TinLid: createTinLidMaterial(front),
    TinSide: new MeshPhysicalMaterial({ map: side, roughness: 0.3, metalness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.12 }),
    TinBottom: new MeshPhysicalMaterial({ color: '#c9ccd3', roughness: 0.34, metalness: 0.7, clearcoat: 0.3 }),
  };
}

function createPlasticMaterial(): Material {
  return new MeshPhysicalMaterial({
    color: '#f4f6ff',
    roughness: 0.06,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
}

export function materialsFor(mesh: MeshData, set: MaterialSet): Material[] {
  const names = Object.keys(set);
  return mesh.groups.map((group) => {
    const name = names.find((key) => group.material === key) ?? names.find((key) => group.material.endsWith(key));
    const material = name ? set[name] : undefined;
    if (!material) throw new Error(`Missing material ${group.material}`);
    return material;
  });
}

export function disposeMaterials(materials: Material[]) {
  for (const material of new Set(materials)) material.dispose();
}
