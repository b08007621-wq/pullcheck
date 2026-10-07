import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { IconButton } from '@/components/IconButton';
import { useHaptics } from '@/hooks/useHaptics';
import { findProductByBarcode } from '@/services/barcode';
import { spacing, typography } from '@/theme';
import { parseMarket } from '@/utils/market';

type Phase = 'scanning' | 'looking' | 'missing' | 'failed';

const FRAME_WIDTH = 280;
const FRAME_HEIGHT = 150;

export default function BarcodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ market?: string }>();
  const market = parseMarket(params.market);
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [code, setCode] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  const lookup = useCallback(
    async (value: string) => {
      setCode(value);
      setPhase('looking');
      haptics.shutter();
      try {
        const product = await findProductByBarcode(value, market);
        if (!product) {
          setPhase('missing');
          return;
        }
        haptics.collect();
        router.replace({
          pathname: '/sealed/[id]',
          params: { id: String(product.productId), groupId: String(product.groupId), market: product.market ?? market },
        });
      } catch {
        setPhase('failed');
      }
    },
    [haptics, router, market],
  );

  const onScanned = useCallback(
    (result: { data: string }) => {
      if (handled.current) return;
      handled.current = true;
      lookup(result.data);
    },
    [lookup],
  );

  const retry = () => {
    handled.current = false;
    setCode('');
    setPhase('scanning');
  };

  const message =
    phase === 'looking'
      ? 'Looking it up…'
      : phase === 'missing'
        ? `No sealed product matches ${code}.`
        : phase === 'failed'
          ? 'Couldn’t reach the price service. Try again.'
          : 'Point the camera at the barcode on the box';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          autofocus="off"
          zoom={0.08}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={phase === 'scanning' ? onScanned : undefined}
        />
      ) : null}
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title} accessibilityRole="header">
          Scan a barcode
        </Text>
        <IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />
      </View>
      <View style={styles.center} pointerEvents="none">
        <View style={styles.frame} />
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Text style={styles.message}>
          {permission && !permission.granted && !permission.canAskAgain
            ? 'Turn on camera access in Settings to scan barcodes.'
            : message}
        </Text>
        {permission && !permission.granted && !permission.canAskAgain ? (
          <ActionButton label="Open Settings" icon="settings-outline" onPress={() => Linking.openSettings()} />
        ) : phase === 'missing' || phase === 'failed' ? (
          <ActionButton label="Scan again" icon="scan" onPress={retry} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.title,
    color: '#FFFFFF',
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    opacity: 0.85,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  message: {
    ...typography.label,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: '#000000AA',
    textShadowRadius: 6,
  },
});
