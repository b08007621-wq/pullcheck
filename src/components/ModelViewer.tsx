import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCardLayout } from '@/hooks/useCardLayout';
import { useHaptics } from '@/hooks/useHaptics';
import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useProductArt } from '@/hooks/useProductArt';
import { useSettings } from '@/hooks/useSettings';
import { useTexture } from '@/hooks/useTexture';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { CARD_BACKS, type CardBack } from '@/three/cardBack';
import { type CardFinish, needsArtWindow, withLayout } from '@/three/cardFinish';
import { isArtKind, type ModelKind } from '@/three/models';
import { createOrbit, flipOrbit, resetOrbit } from '@/three/orbit';
import { type AppTheme, spacing, typography } from '@/theme';

import { ActionButton } from './ActionButton';
import { ErrorState } from './ErrorState';
import { IconButton } from './IconButton';
import { LoadingState } from './LoadingState';
import { ModelMesh } from './ModelMesh';
import { ModelRig } from './ModelRig';
import { ModelStage } from './ModelStage';
import { OrbitSurface } from './OrbitSurface';

type Props = {
  kind: ModelKind;
  image: string;
  productId: number | null;
  title: string;
  subtitle?: string;
  finish: CardFinish;
  back: CardBack;
};


export function ModelViewer({ kind, image, productId, title, subtitle, finish, back: backKind }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const motion = useMotionEnabled();
  const { theme } = useSettings();
  const [orbit] = useState(() => createOrbit(motion));

  const boxed = isArtKind(kind);
  const isCard = kind === 'card';
  const productArt = useProductArt(kind, productId);
  const faces = productArt.data?.faces ?? null;
  const art = useTexture(boxed ? (faces?.front ?? null) : image);
  const back = useTexture(isCard ? CARD_BACKS[backKind] : null);
  const side = useTexture(boxed ? (faces?.side ?? null) : null);
  const top = useTexture(boxed ? (faces?.top ?? null) : null);

  const wantsLayout = isCard && needsArtWindow(finish);
  const layout = useCardLayout(wantsLayout ? image : null);
  const layoutSettled = !wantsLayout || layout.data !== null || layout.error !== null;
  const layoutWindow = layout.data ? layout.data.window : undefined;
  const resolvedFinish = useMemo(() => withLayout(finish, layoutWindow), [finish, layoutWindow]);

  const ready =
    art.texture !== null &&
    layoutSettled &&
    (!isCard || back.texture !== null) &&
    (!boxed || (side.texture !== null && top.texture !== null));
  const failed = Boolean(productArt.error) || art.error || back.error || side.error || top.error;
  const shape = productArt.data ? { aspect: productArt.data.aspect } : null;

  const flip = useCallback(() => {
    if (isCard) haptics.flip();
    else haptics.turn();
    flipOrbit(orbit);
  }, [haptics, orbit, isCard]);

  const reset = useCallback(() => {
    haptics.selection();
    resetOrbit(orbit);
  }, [haptics, orbit]);

  const retry = () => {
    if (productArt.error) productArt.retry();
    for (const texture of [art, back, side, top]) {
      if (texture.error) texture.retry();
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <IconButton icon="close" accessibilityLabel="Close 3D view" onPress={() => router.back()} />
      </View>

      <View style={styles.stage}>
        {ready && art.texture ? (
          <>
            <ModelStage background={theme.colors.background} accent={theme.colors.accent}>
              <ModelRig orbit={orbit} motion={motion} onSideChange={isCard ? haptics.flip : undefined}>
                <ModelMesh
                  kind={kind}
                  textures={{ art: art.texture, back: back.texture, side: side.texture, top: top.texture }}
                  finish={resolvedFinish}
                  shape={shape}
                />
              </ModelRig>
            </ModelStage>
            <OrbitSurface orbit={orbit} onDoubleTap={flip} />
          </>
        ) : failed ? (
          <ErrorState
            title="Couldn’t load the artwork"
            message={
              productArt.error
                ? 'The PullCheck server couldn’t prepare this product. Make sure it’s running, then try again.'
                : 'Check your connection and try again.'
            }
            onRetry={retry}
          />
        ) : (
          <LoadingState message="Loading 3D view…" />
        )}
      </View>

      {ready ? (
        <View style={styles.footer}>
          <Text style={styles.hint}>
            {isCard ? 'Drag to spin · Pinch to zoom · Double-tap to flip' : 'Drag to spin · Pinch to zoom'}
          </Text>
          <View style={styles.actions}>
            <ActionButton label={isCard ? 'Flip' : 'Turn around'} icon="sync" onPress={flip} />
            <ActionButton label="Reset" icon="refresh" variant="secondary" onPress={reset} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    stage: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    titles: {
      flex: 1,
    },
    title: {
      ...typography.heading,
      color: theme.colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    footer: {
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
    },
    hint: {
      ...typography.caption,
      color: theme.colors.textFaint,
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.md,
    },
  });
}
