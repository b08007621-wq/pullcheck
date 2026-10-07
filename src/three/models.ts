import type { BufferGeometry } from 'three';

import blisterMesh from '../../assets/models/blister.json';
import blister2Mesh from '../../assets/models/blister2.json';
import blister3Mesh from '../../assets/models/blister3.json';
import boosterBoxMesh from '../../assets/models/boosterbox.json';
import bundleMesh from '../../assets/models/bundle.json';
import cardMesh from '../../assets/models/card.json';
import collectionMesh from '../../assets/models/collection.json';
import etbMesh from '../../assets/models/etb.json';
import largeMesh from '../../assets/models/large.json';
import miniTinMesh from '../../assets/models/minitin.json';
import packMesh from '../../assets/models/pack.json';
import pcEtbMesh from '../../assets/models/pcetb.json';
import posterMesh from '../../assets/models/poster.json';
import premiumMesh from '../../assets/models/premium.json';
import sleevedMesh from '../../assets/models/sleeved.json';
import specialMesh from '../../assets/models/special.json';
import tinMesh from '../../assets/models/tin.json';

import { buildGeometry, type MeshData } from './meshData';

const MESHES = {
  card: cardMesh,
  pack: packMesh,
  sleeved: sleevedMesh,
  blister: blisterMesh,
  blister2: blister2Mesh,
  blister3: blister3Mesh,
  bundle: bundleMesh,
  boosterbox: boosterBoxMesh,
  etb: etbMesh,
  pcetb: pcEtbMesh,
  tin: tinMesh,
  minitin: miniTinMesh,
  collection: collectionMesh,
  special: specialMesh,
  premium: premiumMesh,
  poster: posterMesh,
  large: largeMesh,
} satisfies Record<string, MeshData>;

export type ModelKind = keyof typeof MESHES;

export type ArtFamily = 'box' | 'flat' | 'tin';

const ART_FAMILY: Partial<Record<ModelKind, ArtFamily>> = {
  bundle: 'box',
  boosterbox: 'box',
  etb: 'box',
  pcetb: 'box',
  collection: 'box',
  special: 'box',
  premium: 'box',
  poster: 'box',
  large: 'box',
  blister: 'flat',
  blister2: 'flat',
  blister3: 'flat',
  tin: 'tin',
  minitin: 'tin',
};

export type ArtKind = Exclude<ModelKind, 'card' | 'pack' | 'sleeved'>;

const geometries = new Map<ModelKind, BufferGeometry>();

export function modelMesh(kind: ModelKind): MeshData {
  return MESHES[kind];
}

export function modelGeometry(kind: ModelKind): BufferGeometry {
  const cached = geometries.get(kind);
  if (cached) return cached;
  const geometry = buildGeometry(MESHES[kind]);
  geometries.set(kind, geometry);
  return geometry;
}

export function isModelKind(value: unknown): value is ModelKind {
  return typeof value === 'string' && value in MESHES;
}

export function isArtKind(kind: ModelKind): kind is ArtKind {
  return ART_FAMILY[kind] !== undefined;
}

export function artFamily(kind: ModelKind): ArtFamily | null {
  return ART_FAMILY[kind] ?? null;
}
