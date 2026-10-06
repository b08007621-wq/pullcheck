import { type CSSProperties, useEffect, useRef } from 'react';

import { createOcrBridge, type OcrState, READER_LOADING } from '@/services/ocrBridge';
import { OCR_PAGE_HTML } from '@/services/ocrPage';

type Props = {
  onState: (state: OcrState) => void;
};

type FrameWindow = Window & { eval: (code: string) => unknown };

export function OcrHost({ onState }: Props) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const bridge = createOcrBridge((script) => {
      const target = frameRef.current?.contentWindow as FrameWindow | null | undefined;
      target?.eval(script);
    }, onState);
    const listener = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { pullcheckOcr?: unknown } | null;
      if (data && typeof data.pullcheckOcr === 'string') bridge.receive(data.pullcheckOcr);
    };
    window.addEventListener('message', listener);
    return () => {
      window.removeEventListener('message', listener);
      bridge.dispose();
      onState(READER_LOADING);
    };
  }, [onState]);

  return <iframe ref={frameRef} srcDoc={OCR_PAGE_HTML} title="Card reader" aria-hidden tabIndex={-1} style={HIDDEN} />;
}

const HIDDEN: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: 2,
  height: 2,
  opacity: 0,
  border: 0,
  pointerEvents: 'none',
};
