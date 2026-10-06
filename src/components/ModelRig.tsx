import { useFrame } from '@react-three/fiber';
import { type ReactNode, useRef } from 'react';
import type { Group } from 'three';

import { displayPitch, displayYaw, type Orbit, stepOrbit } from '@/three/orbit';

type Props = {
  orbit: Orbit;
  motion: boolean;
  onSideChange?: (front: boolean) => void;
  children: ReactNode;
};

export function ModelRig({ orbit, motion, onSideChange, children }: Props) {
  const group = useRef<Group>(null);
  const facingFront = useRef(true);

  useFrame((_, delta) => {
    stepOrbit(orbit, delta, motion);
    const node = group.current;
    if (!node) return;
    const yaw = displayYaw(orbit);
    node.rotation.set(displayPitch(orbit), yaw, 0);
    node.scale.setScalar(orbit.zoom);
    const front = Math.cos(yaw) > 0;
    if (front !== facingFront.current) {
      facingFront.current = front;
      onSideChange?.(front);
    }
  });

  return <group ref={group}>{children}</group>;
}
