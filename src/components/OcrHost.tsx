import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { createOcrBridge, type OcrBridge, type OcrState, READER_FAILED, READER_LOADING } from '@/services/ocrBridge';
import { MEASURE_PAGE_HTML, OCR_BASE_URL, OCR_PAGE_HTML, type ReaderPage } from '@/services/ocrPage';

type Props = {
  onState: (state: OcrState) => void;
  page?: ReaderPage;
};

export function OcrHost({ onState, page = 'scan' }: Props) {
  const webRef = useRef<WebView>(null);
  const bridgeRef = useRef<OcrBridge | null>(null);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const bridge = createOcrBridge((script) => webRef.current?.injectJavaScript(script), onState);
    bridgeRef.current = bridge;
    return () => {
      bridge.dispose();
      bridgeRef.current = null;
      onState(READER_LOADING);
    };
  }, [onState, generation]);

  const restart = () => setGeneration((value) => value + 1);

  return (
    <View style={styles.host} pointerEvents="none">
      <WebView
        key={generation}
        ref={webRef}
        source={{ html: page === 'scan' ? OCR_PAGE_HTML : MEASURE_PAGE_HTML, baseUrl: OCR_BASE_URL }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        onMessage={(event) => bridgeRef.current?.receive(event.nativeEvent.data)}
        onError={() => onState(READER_FAILED)}
        onContentProcessDidTerminate={restart}
        onRenderProcessGone={restart}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 2,
    height: 2,
    opacity: 0.01,
    overflow: 'hidden',
  },
  web: {
    width: 2,
    height: 2,
    backgroundColor: 'transparent',
  },
});
