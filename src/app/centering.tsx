import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { CameraPermissionPrompt } from '@/components/CameraPermissionPrompt';
import { CaptureFlash } from '@/components/CaptureFlash';
import { CenteringPhoto } from '@/components/CenteringPhoto';
import { DetailLayout } from '@/components/DetailLayout';
import { GradeCalculator } from '@/components/GradeCalculator';
import { IconButton } from '@/components/IconButton';
import { OcrHost } from '@/components/OcrHost';
import { ScannerControls, SCANNER_CONTROLS_HEIGHT } from '@/components/ScannerControls';
import { ScannerOverlay } from '@/components/ScannerOverlay';
import { SectionPanel } from '@/components/SectionPanel';
import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type CenteringRead, type OcrState, READER_LOADING } from '@/services/ocrBridge';
import { captureScanFrame, pickLibraryImage, prepareScanImage } from '@/services/scanImage';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { Size } from '@/types/scan';
import { capSummary, formatSplit, readCentering } from '@/utils/centering';
import { computeScanFrame } from '@/utils/scanFrame';

type Phase = 'camera' | 'measuring' | 'result';

const TOP_BAR_HEIGHT = 56;
const HINT_HEIGHT = 48;
const CAPTURE_MARGIN = 0.14;
const CAPTURE_WIDTH = 1600;
const CAPTURE_QUALITY = 0.92;
const LIBRARY_MARGIN = 0;
const ZOOM = 0.1;

const TIPS = [
  { icon: 'contrast-outline', text: 'Lay it on something dark and plain' },
  { icon: 'phone-portrait-outline', text: 'Hold the phone flat, straight above the card' },
  { icon: 'scan-outline', text: 'Keep all four edges inside the outline' },
  { icon: 'sunny-outline', text: 'Even light, no glare on the border' },
] as const;

export default function CenteringScreen() {
  const router = useRouter();
  const { id, variant } = useLocalSearchParams<{ id?: string; variant?: string }>();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [view, setView] = useState<Size | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [flash, setFlash] = useState(0);
  const [reader, setReader] = useState<OcrState>(READER_LOADING);
  const [phase, setPhase] = useState<Phase>('camera');
  const [read, setRead] = useState<CenteringRead | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const frame = useMemo(
    () =>
      view
        ? computeScanFrame(view, insets.top + TOP_BAR_HEIGHT + HINT_HEIGHT, insets.bottom + SCANNER_CONTROLS_HEIGHT)
        : null,
    [view, insets.top, insets.bottom],
  );
  const centering = read?.widths ? readCentering(read.widths) : null;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const measure = async (source: string | null, margin: number) => {
    const handle = reader.handle;
    if (!source || !handle) {
      setProblem(source ? 'The measuring tool is still starting. Try again in a moment.' : 'Couldn’t take the photo.');
      setPhase('camera');
      return;
    }
    try {
      await handle.load(source);
      const result = await handle.centering(margin);
      setRead(result);
      setProblem(null);
      setPhase('result');
      if (result.widths) haptics.collect();
      else haptics.hit();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Measuring failed. Try again.');
      setPhase('camera');
    }
  };

  const shoot = async () => {
    const camera = cameraRef.current;
    if (!camera || !frame || !view || phase !== 'camera') return;
    haptics.shutter();
    setFlash((value) => value + 1);
    setPhase('measuring');
    const source = await captureScanFrame(camera, frame, view, {
      margin: CAPTURE_MARGIN,
      width: CAPTURE_WIDTH,
      quality: CAPTURE_QUALITY,
    }).catch(() => null);
    await measure(source, CAPTURE_MARGIN);
  };

  const pickPhoto = async () => {
    if (phase !== 'camera') return;
    const picked = await pickLibraryImage().catch(() => null);
    if (!picked) return;
    setPhase('measuring');
    const prepared = await prepareScanImage(picked, null).catch(() => null);
    await measure(prepared?.base64 ? `data:image/jpeg;base64,${prepared.base64}` : null, LIBRARY_MARGIN);
  };

  const retake = () => {
    haptics.tap();
    setRead(null);
    setProblem(null);
    setCameraReady(false);
    setPhase('camera');
  };

  const host = <OcrHost onState={setReader} page="measure" />;

  if (phase === 'result' && read) {
    const summary = centering ? capSummary(centering) : null;
    return (
      <DetailLayout
        footer={
          <View style={styles.footerButtons}>
            <View style={styles.footerButton}>
              <ActionButton label="Measure again" icon="camera-outline" variant="secondary" onPress={retake} />
            </View>
            <View style={styles.footerButton}>
              <ActionButton label="Done" icon="checkmark" onPress={close} />
            </View>
          </View>
        }
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Centering
          </Text>
          <Text style={styles.subtitle}>
            {centering ? 'Measured from the silver or yellow border on the front.' : 'Couldn’t read the borders.'}
          </Text>
        </View>

        {read.image && read.aspect ? (
          <View style={styles.photoWrap}>
            <CenteringPhoto
              image={read.image}
              aspect={read.aspect}
              outer={read.outer}
              inner={read.inner}
              centering={centering}
            />
          </View>
        ) : null}

        {centering && summary ? (
          <>
            <View style={styles.splits}>
              <Split label="Left / right" value={formatSplit(centering.leftRight)} />
              <Split label="Top / bottom" value={formatSplit(centering.topBottom)} />
            </View>
            <View style={styles.cap}>
              <Ionicons
                name={centering.sure === 10 ? 'ribbon' : 'ribbon-outline'}
                size={22}
                color={centering.sure === 10 ? styles.gain.color : styles.accent.color}
              />
              <View style={styles.capText}>
                <Text style={styles.capTitle}>{summary.title}</Text>
                <Text style={styles.capDetail}>{summary.detail}</Text>
              </View>
            </View>
            <Text style={styles.footnote}>
              Front centering only. Corners, edges, surface and the back count toward the grade too.
            </Text>
          </>
        ) : (
          <SectionPanel title={read.found ? 'Borders didn’t line up' : 'No card found'}>
            <Text style={styles.body}>
              {read.found
                ? 'The edges of the card or its border weren’t clear enough to measure. Full-art cards with no border can’t be measured.'
                : 'Couldn’t find a card in the photo.'}
            </Text>
            <View style={styles.tips}>
              {TIPS.map((tip) => (
                <View key={tip.text} style={styles.tip}>
                  <Ionicons name={tip.icon} size={18} color={styles.accent.color} />
                  <Text style={styles.tipText}>{tip.text}</Text>
                </View>
              ))}
            </View>
          </SectionPanel>
        )}

        {id ? (
          <GradeCalculator cardId={id} variant={variant ?? null} centering={centering} />
        ) : null}
      </DetailLayout>
    );
  }

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setView({ width, height });
  };

  if (permission && !permission.granted) {
    return (
      <View style={[styles.root, styles.camera]} onLayout={onLayout}>
        <CameraPermissionPrompt
          canAskAgain={permission.canAskAgain}
          onRequest={requestPermission}
          onLibrary={pickPhoto}
          bottomInset={insets.bottom}
        />
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <IconButton icon="close" accessibilityLabel="Close" onPress={close} />
        </View>
        {host}
      </View>
    );
  }

  const measuring = phase === 'measuring';
  const hint = problem ?? (reader.handle ? 'Lay the card on a dark surface and fill the outline' : 'Getting the ruler ready…');

  return (
    <View style={[styles.root, styles.camera]} onLayout={onLayout}>
      <StatusBar style="light" />
      {permission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          autofocus="off"
          zoom={ZOOM}
          enableTorch={torchOn}
          animateShutter={false}
          active={!measuring}
          onCameraReady={() => setCameraReady(true)}
        />
      ) : null}
      {frame && view ? <ScannerOverlay frame={frame} view={view} locked={measuring} /> : null}
      <CaptureFlash trigger={flash} />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.cameraTitle} accessibilityRole="header">
          Check centering
        </Text>
        <IconButton icon="close" accessibilityLabel="Close" onPress={close} />
      </View>
      <View style={[styles.hint, { top: insets.top + TOP_BAR_HEIGHT }]} pointerEvents="none">
        <Text style={[styles.hintText, problem ? styles.hintProblem : null]} numberOfLines={2}>
          {hint}
        </Text>
      </View>

      {measuring ? (
        <View style={styles.measuring} pointerEvents="none">
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.measuringText}>Measuring the borders…</Text>
        </View>
      ) : null}

      <ScannerControls
        onShutter={shoot}
        onLibrary={pickPhoto}
        onTorch={() => {
          haptics.selection();
          setTorchOn((value) => !value);
        }}
        torchOn={torchOn}
        busy={measuring}
        cameraReady={cameraReady && reader.handle !== null}
        bottomInset={insets.bottom}
      />
      {host}
    </View>
  );
}

function Split({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.split}>
      <Text style={styles.splitLabel}>{label}</Text>
      <Text style={styles.splitValue}>{value}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    camera: {
      backgroundColor: '#000000',
    },
    topBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
    },
    cameraTitle: {
      ...typography.heading,
      color: '#FFFFFF',
    },
    hint: {
      position: 'absolute',
      left: spacing.xl,
      right: spacing.xl,
      height: HINT_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hintText: {
      ...typography.caption,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'center',
      textShadowColor: '#000000AA',
      textShadowRadius: 6,
    },
    hintProblem: {
      color: '#FFB4A8',
    },
    measuring: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    measuringText: {
      ...typography.label,
      color: '#FFFFFF',
    },
    header: {
      gap: spacing.xs,
    },
    title: {
      ...typography.title,
      color: theme.colors.text,
    },
    subtitle: {
      ...typography.body,
      color: theme.colors.textMuted,
    },
    photoWrap: {
      alignSelf: 'center',
      width: '78%',
      maxWidth: 360,
    },
    splits: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    split: {
      flex: 1,
      gap: 2,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.colors.surfaceRaised,
    },
    splitLabel: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    splitValue: {
      fontSize: 30,
      fontWeight: '700',
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    cap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.colors.surfaceRaised,
    },
    capText: {
      flex: 1,
      gap: 2,
    },
    capTitle: {
      ...typography.label,
      color: theme.colors.text,
    },
    capDetail: {
      ...typography.caption,
      color: theme.colors.textMuted,
      lineHeight: 18,
    },
    gain: {
      color: theme.colors.gain,
    },
    accent: {
      color: theme.colors.accent,
    },
    footnote: {
      ...typography.caption,
      color: theme.colors.textFaint,
    },
    body: {
      ...typography.body,
      color: theme.colors.textMuted,
    },
    tips: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    tip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    tipText: {
      ...typography.caption,
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
    },
    footerButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    footerButton: {
      flex: 1,
    },
  });
}
