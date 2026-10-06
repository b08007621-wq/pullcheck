import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { Texture } from 'three';

import type { CardFinish } from '@/three/cardFinish';
import {
  createBoardMaterials,
  createCardMaterials,
  createPackMaterials,
  createSleeveMaterials,
  createTinMaterials,
  disposeMaterials,
  type MaterialSet,
  materialsFor,
} from '@/three/materials';
import type { MeshData } from '@/three/meshData';
import { artFamily, type ModelKind, modelGeometry, modelMesh } from '@/three/models';
import { createEdgeTexture, textureAspect } from '@/three/textures';

export type ModelTextures = {
  art: Texture;
  back: Texture | null;
  side: Texture | null;
  top: Texture | null;
};

export type ProductShape = {
  aspect: number;
};

type Props = {
  kind: ModelKind;
  textures: ModelTextures;
  finish: CardFinish;
  shape: ProductShape | null;
};

const FIXED_FRONT: ModelKind[] = ['etb', 'pcetb'];

export function ModelMesh({ kind, textures, finish, shape }: Props) {
  const viewport = useThree((state) => state.viewport);
  const mesh = modelMesh(kind);
  const geometry = modelGeometry(kind);
  const edge = useMemo(() => createEdgeTexture(), []);
  const { art, back, side, top } = textures;

  const materials = useMemo(() => {
    const family = artFamily(kind);
    const set: MaterialSet =
      kind === 'card'
        ? createCardMaterials({ front: art, back: back ?? art, edge, finish })
        : kind === 'pack'
          ? createPackMaterials(art)
          : kind === 'sleeved'
            ? createSleeveMaterials(art)
            : family === 'tin'
              ? createTinMaterials({ front: art, side: side ?? art })
              : createBoardMaterials({ front: art, side: side ?? art, top: top ?? art });
    return materialsFor(mesh, set);
  }, [kind, mesh, art, back, side, top, edge, finish]);

  useEffect(() => () => disposeMaterials(materials), [materials]);
  useEffect(() => () => edge.dispose(), [edge]);

  const scale = shapeScale(kind, mesh, art, shape);
  const [width = 1, height = 1, depth = 0] = mesh.size;
  const shown = { width: width * scale[0], height: height * scale[1], depth: depth * scale[2] };
  const depthRatio = shown.depth / Math.max(shown.width, 0.001);
  const fit = Math.min(
    (viewport.width * 0.84) / (Math.hypot(shown.width, shown.depth) * (1 + depthRatio * 0.7)),
    (viewport.height * 0.8) / (shown.height * (1 + depthRatio * 0.25)),
  );

  return (
    <mesh
      geometry={geometry}
      material={materials}
      scale={[fit * scale[0], fit * scale[1], fit * scale[2]]}
      dispose={null}
    />
  );
}

function shapeScale(kind: ModelKind, mesh: MeshData, art: Texture, shape: ProductShape | null): [number, number, number] {
  const [width = 1, height = 1] = mesh.size;
  if (kind === 'card' || FIXED_FRONT.includes(kind)) return [1, 1, 1];
  const family = artFamily(kind);
  if (family === 'box' && shape) return [1, stretch(width / shape.aspect / height, 0.72, 1.4), 1];
  if (family && shape) return [1, stretch(width / shape.aspect / height, 0.55, 1.8), 1];
  const aspect = textureAspect(art);
  if (!aspect) return [1, 1, 1];
  return [1, stretch(aspect / (height / width), 0.6, 1.6), 1];
}

function stretch(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
