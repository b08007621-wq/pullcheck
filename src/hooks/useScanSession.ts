import type { CameraView } from 'expo-camera';
import { useCallback, useState } from 'react';

import { pickLibraryImage, prepareScanImage } from '@/services/scanImage';
import type { Rect, ScanPhase, ScanPhoto, Size } from '@/types/scan';
import { frameToPhotoCrop } from '@/utils/scanFrame';

const CAPTURE_ERROR = 'Couldn’t take the photo. Hold steady and try again.';
const LIBRARY_ERROR = 'Couldn’t open that photo. Try a different one.';

export function useScanSession() {
  const [phase, setPhase] = useState<ScanPhase>('camera');
  const [photo, setPhoto] = useState<ScanPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async (camera: CameraView, frame: Rect, view: Size) => {
    setError(null);
    setPhase('processing');
    try {
      const picture = await camera.takePictureAsync({ quality: 0.92 });
      const crop = frameToPhotoCrop(frame, view, picture);
      const prepared = await prepareScanImage(picture, crop);
      setPhoto({
        ...prepared,
        source: 'camera',
        capturedAt: new Date().toISOString(),
        cropped: crop !== null,
      });
      setPhase('preview');
    } catch {
      setError(CAPTURE_ERROR);
      setPhase('camera');
    }
  }, []);

  const pickFromLibrary = useCallback(async () => {
    setError(null);
    try {
      const picked = await pickLibraryImage();
      if (!picked) return;
      setPhase('processing');
      const prepared = await prepareScanImage(picked, null);
      setPhoto({
        ...prepared,
        source: 'library',
        capturedAt: new Date().toISOString(),
        cropped: false,
      });
      setPhase('preview');
    } catch {
      setError(LIBRARY_ERROR);
      setPhase('camera');
    }
  }, []);

  const retake = useCallback(() => {
    setPhoto(null);
    setError(null);
    setPhase('camera');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { phase, photo, error, capture, pickFromLibrary, retake, clearError };
}
