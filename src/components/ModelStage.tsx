import { Canvas } from '@react-three/fiber';
import type { ReactNode } from 'react';
import { NeutralToneMapping } from 'three';

type Props = {
  background: string;
  accent: string;
  children: ReactNode;
};

export function ModelStage({ background, accent, children }: Props) {
  return (
    <Canvas
      style={{ flex: 1 }}
      camera={{ position: [0, 0, 3.2], fov: 35, near: 0.1, far: 40 }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
    >
      <color attach="background" args={[background]} />
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#e4dcff', '#160f26', 0.9]} />
      <directionalLight position={[2.4, 3, 4]} intensity={2.6} />
      <directionalLight position={[-3, 1.4, -2.6]} intensity={1.4} color={accent} />
      <directionalLight position={[2.8, -1.2, -3]} intensity={0.9} color="#9fd2ff" />
      <pointLight position={[1.4, 1.1, 2.6]} intensity={0.8} decay={0} />
      {children}
    </Canvas>
  );
}
