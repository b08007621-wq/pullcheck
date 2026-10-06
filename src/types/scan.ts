export type Size = {
  width: number;
  height: number;
};

export type Rect = Size & {
  x: number;
  y: number;
};

export type ScanSource = 'camera' | 'library';

export type ScanPhoto = Size & {
  uri: string;
  base64: string | null;
  source: ScanSource;
  capturedAt: string;
  cropped: boolean;
};

export type ScanPhase = 'camera' | 'processing' | 'preview';
