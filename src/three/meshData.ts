import { BufferGeometry, Float32BufferAttribute } from 'three';

export type MeshGroup = {
  material: string;
  start: number;
  count: number;
};

export type MeshData = {
  name: string;
  size: number[];
  groups: MeshGroup[];
  position: number[];
  normal: number[];
  uv: number[];
  index: number[];
};

export function buildGeometry(data: MeshData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(data.position, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(data.normal, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(data.uv, 2));
  geometry.setIndex(data.index);
  data.groups.forEach((group, materialIndex) => geometry.addGroup(group.start, group.count, materialIndex));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
