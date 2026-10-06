import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AutoScanButton } from '@/components/AutoScanButton';
import { CameraPermissionPrompt } from '@/components/CameraPermissionPrompt';
import { CaptureFlash } from '@/components/CaptureFlash';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { OcrHost } from '@/components/OcrHost';
import { RIP_BAR_HEIGHT, RipBar } from '@/components/RipBar';
import { RipButton } from '@/components/RipButton';
import { RipSetupSheet } from '@/components/RipSetupSheet';
import { ScanHeader, SCAN_HEADER_HEIGHT } from '@/components/ScanHeader';
import { ScannerControls, SCANNER_CONTROLS_HEIGHT } from '@/components/ScannerControls';
import { ScannerOverlay } from '@/components/ScannerOverlay';
import { ScanPreview } from '@/components/ScanPreview';
import { ScanResultSheet } from '@/components/ScanResultSheet';
import { Screen } from '@/components/Screen';
import { type AutoScanPhase, useAutoScan } from '@/hooks/useAutoScan';
import { useCardIdentify } from '@/hooks/useCardIdentify';
import { useHaptics } from '@/hooks/useHaptics';
import { useRip } from '@/hooks/useRip';
import { useScanSession } from '@/hooks/useScanSession';
import { useSettings } from '@/hooks/useSettings';
import type { OcrState } from '@/services/ocrBridge';
import type { Card } from '@/types/card';
import type { IconName } from '@/types/icon';
import type { Size } from '@/types/scan';
import { spacing } from '@/theme';
import { cardVersionPrice } from '@/utils/cardVersion';
import { variantForFinish } from '@/utils/rip';
import { computeScanFrame } from '@/utils/scanFrame';

const ERROR_VISIBLE_MS = 3500;
const OPEN_MATCH_DELAY_MS = 900;
const PULL_DELAY_MS = 1100;
const BIG_PULL_USD = 20;
const SCAN_ZOOM = 0.1;

export default function ScanScreen() {
  const router = useRouter();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const haptics = useHaptics();
  const session = useScanSession();
  const identify = useCardIdentify();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [view, setView] = useState<Size | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [flash, setFlash] = useState(0);
  const [mountError, setMountError] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const [ocr, setOcr] = useState<OcrState>({ status: 'loading', handle: null });
  const { settings, updateSettings } = useSettings();
  const autoOn = settings.autoScan;
  const { rip, start: startRip, addPull } = useRip();
  const ripping = rip !== null;
  const { error, clearError, retake, phase, photo } = session;
  const { stage, match, reading, reset: resetIdentify, identify: runIdentify } = identify;

  useFocusEffect(
    useCallback(
      () => () => {
        setCameraReady(false);
        setTorchOn(false);
      },
      [],
    ),
  );

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, ERROR_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  const finishScan = useCallback(() => {
    resetIdentify();
    retake();
  }, [resetIdentify, retake]);

  const openCard = useCallback(
    (card: Card) => {
      finishScan();
      router.push({ pathname: '/card/[id]', params: { id: card.id } });
    },
    [finishScan, router],
  );

  const keepPull = useCallback(
    (card: Card) => {
      addPull(card, reading?.finish ?? 'unknown');
      finishScan();
    },
    [addPull, reading, finishScan],
  );

  useEffect(() => {
    if (!ripping || phase !== 'preview' || stage !== 'idle' || !photo?.base64) return;
    runIdentify(photo.base64);
  }, [ripping, phase, stage, photo, runIdentify]);

  useEffect(() => {
    if (stage !== 'done' || match?.status !== 'single') return;
    const version = { variant: variantForFinish(match.card, reading?.finish), condition: 'NM' as const };
    const price = cardVersionPrice(match.card, version);
    if (price && price.currency === 'USD' && price.amount >= BIG_PULL_USD) haptics.hit();
    else haptics.collect();
    const timer = ripping
      ? setTimeout(() => keepPull(match.card), PULL_DELAY_MS)
      : setTimeout(() => openCard(match.card), OPEN_MATCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [stage, match, reading, ripping, haptics, openCard, keepPull]);

  const bottomReserve = tabBarHeight + SCANNER_CONTROLS_HEIGHT + (ripping ? RIP_BAR_HEIGHT : 0);
  const frame = useMemo(
    () => (view ? computeScanFrame(view, insets.top + SCAN_HEADER_HEIGHT, bottomReserve) : null),
    [view, insets.top, bottomReserve],
  );

  const auto = useAutoScan({
    camera: cameraRef,
    frame,
    view,
    ocr: ocr.handle,
    enabled:
      autoOn && focused && cameraReady && !mountError && !holding && !setupOpen && session.phase === 'camera',
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setView({ width, height });
  };

  const takePhoto = async () => {
    const camera = cameraRef.current;
    if (!camera || !frame || !view || session.phase !== 'camera' || holding) return;
    haptics.shutter();
    setFlash((value) => value + 1);
    setHolding(true);
    try {
      await auto.whenIdle();
      await session.capture(camera, frame, view);
    } finally {
      setHolding(false);
    }
  };

  const toggleAuto = () => {
    haptics.selection();
    updateSettings({ autoScan: !autoOn });
  };

  const toggleTorch = () => {
    haptics.selection();
    setTorchOn((value) => !value);
  };

  const retryCamera = () => {
    setMountError(null);
    setCameraKey((value) => value + 1);
  };

  const startIdentify = () => {
    const base64 = session.photo?.base64;
    if (!base64) return;
    haptics.tap();
    identify.identify(base64);
  };

  const searchName = (name: string) => {
    finishScan();
    router.navigate(name ? { pathname: '/search', params: { q: name } } : '/search');
  };

  const preview =
    session.phase === 'preview' && session.photo && view ? (
      <ScanPreview
        photo={session.photo}
        origin={session.photo.source === 'camera' ? frame : null}
        view={view}
        topInset={insets.top}
        bottomInset={tabBarHeight}
        identify={identify}
        onRetake={finishScan}
        onIdentify={startIdentify}
        onOpenCard={(card) => {
          if (ripping) {
            haptics.collect();
            keepPull(card);
          } else {
            haptics.tap();
            openCard(card);
          }
        }}
        onSearchName={searchName}
        ripTitle={rip?.title ?? null}
      />
    ) : null;

  const setup = setupOpen ? (
    <RipSetupSheet
      onStart={(source) => {
        haptics.collect();
        auto.forget();
        startRip(source);
      }}
      onClose={() => setSetupOpen(false)}
    />
  ) : null;

  if (!permission) {
    return (
      <Screen title="Scan">
        <LoadingState message="Checking camera access…" bottomInset={tabBarHeight} />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.root} onLayout={onLayout}>
        <CameraPermissionPrompt
          canAskAgain={permission.canAskAgain}
          onRequest={requestPermission}
          onLibrary={session.pickFromLibrary}
          bottomInset={tabBarHeight}
        />
        {preview}
      </View>
    );
  }

  const hint = resolveHint(error ?? mountError, session.phase, cameraReady, ripping, {
    on: autoOn,
    status: ocr.status,
    phase: auto.phase,
  });

  return (
    <View style={[styles.root, styles.camera]} onLayout={onLayout}>
      {focused ? <StatusBar style="light" /> : null}
      {focused && !mountError ? (
        <CameraView
          key={cameraKey}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          autofocus="off"
          zoom={SCAN_ZOOM}
          enableTorch={torchOn}
          animateShutter={false}
          active={session.phase !== 'preview'}
          onCameraReady={() => {
            setCameraReady(true);
            haptics.ready();
          }}
          onMountError={(event) => setMountError(event.message)}
        />
      ) : null}

      {mountError ? (
        <EmptyState
          icon="warning-outline"
          tone="danger"
          title="Camera didn’t start"
          message={mountError}
          bottomInset={tabBarHeight}
          action={{ label: 'Try again', icon: 'refresh', onPress: retryCamera }}
        />
      ) : null}

      {frame && view && !mountError ? (
        <ScannerOverlay
          frame={frame}
          view={view}
          locked={session.phase === 'processing' || (autoOn && auto.phase === 'reading')}
          scanning={cameraReady && session.phase === 'camera'}
        />
      ) : null}

      <CaptureFlash trigger={flash} />

      <ScanHeader
        topInset={insets.top}
        hint={hint.message}
        hintIcon={hint.icon}
        hintTone={hint.tone}
        action={
          <>
            <AutoScanButton on={autoOn} onPress={toggleAuto} />
            {ripping ? null : (
              <RipButton
                onPress={() => {
                  haptics.tap();
                  setSetupOpen(true);
                }}
              />
            )}
          </>
        }
      />

      {rip ? (
        <RipBar
          rip={rip}
          bottom={tabBarHeight + SCANNER_CONTROLS_HEIGHT - spacing.sm}
          onOpen={() => {
            haptics.tap();
            router.push('/rip');
          }}
        />
      ) : null}

      <ScannerControls
        onShutter={takePhoto}
        onLibrary={session.pickFromLibrary}
        onTorch={toggleTorch}
        torchOn={torchOn}
        busy={session.phase === 'processing'}
        cameraReady={cameraReady && !mountError}
        bottomInset={tabBarHeight}
      />

      {autoOn ? <OcrHost onState={setOcr} /> : null}
      {auto.result ? (
        <ScanResultSheet
          key={auto.result.id}
          result={auto.result}
          ripping={ripping}
          bottomInset={insets.bottom}
          onClose={auto.clear}
          onOpenCard={(card) => {
            auto.clear();
            router.push({ pathname: '/card/[id]', params: { id: card.id } });
          }}
          onAddPull={(card) => addPull(card, 'unknown')}
        />
      ) : null}
      {preview}
      {setup}
    </View>
  );
}

type AutoHint = {
  on: boolean;
  status: OcrState['status'];
  phase: AutoScanPhase;
};

function resolveHint(
  error: string | null,
  phase: string,
  cameraReady: boolean,
  ripping: boolean,
  auto: AutoHint,
): { message: string; icon: IconName; tone: 'neutral' | 'danger' } {
  if (error) return { message: error, icon: 'alert-circle', tone: 'danger' };
  if (phase === 'processing') return { message: 'Hold still…', icon: 'hourglass-outline', tone: 'neutral' };
  if (!cameraReady) return { message: 'Starting camera…', icon: 'camera-outline', tone: 'neutral' };
  if (auto.on && auto.status === 'loading') {
    return { message: 'Getting auto scan ready…', icon: 'sync-outline', tone: 'neutral' };
  }
  if (auto.on && auto.status === 'failed') {
    return { message: 'Auto scan is offline. Tap the shutter instead', icon: 'cloud-offline-outline', tone: 'neutral' };
  }
  if (auto.on && auto.phase === 'reading') {
    return { message: 'Reading the card…', icon: 'search', tone: 'neutral' };
  }
  if (auto.on && auto.phase === 'handled') {
    return { message: 'Swap in the next card', icon: 'checkmark-circle-outline', tone: 'neutral' };
  }
  if (ripping) return { message: 'Scan each card you pulled', icon: 'gift-outline', tone: 'neutral' };
  if (auto.on) return { message: 'Hold a card in the frame', icon: 'scan-outline', tone: 'neutral' };
  return { message: 'Fit the card inside the frame', icon: 'scan-outline', tone: 'neutral' };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  camera: {
    backgroundColor: '#000000',
  },
});
