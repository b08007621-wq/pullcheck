import { useCallback, useEffect, useState } from 'react';
import type { Texture } from 'three';

import { loadTexture, type TextureSource } from '@/three/textures';

type Loaded = {
  source: TextureSource;
  texture: Texture;
};

export function useTexture(source: TextureSource | null) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<TextureSource | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (source === null) return;
    let active = true;
    loadTexture(source)
      .then((texture) => {
        if (!active) {
          texture.dispose();
          return;
        }
        setFailed(null);
        setLoaded({ source, texture });
      })
      .catch(() => {
        if (active) setFailed(source);
      });
    return () => {
      active = false;
    };
  }, [source, attempt]);

  useEffect(() => {
    const texture = loaded?.texture;
    return () => texture?.dispose();
  }, [loaded]);

  const retry = useCallback(() => {
    setFailed(null);
    setAttempt((value) => value + 1);
  }, []);

  return {
    texture: source === null ? null : (loaded?.texture ?? null),
    isCurrent: loaded?.source === source,
    error: source !== null && failed === source,
    retry,
  };
}
