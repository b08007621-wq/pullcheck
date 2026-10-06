import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ModelViewer } from '@/components/ModelViewer';
import { useTheme } from '@/hooks/useTheme';
import { parseCardBack } from '@/three/cardBack';
import { parseFinish } from '@/three/cardFinish';
import { isModelKind } from '@/three/models';

type Params = {
  kind?: string;
  image?: string;
  product?: string;
  title?: string;
  subtitle?: string;
  foil?: string;
  border?: string;
  era?: string;
  pattern?: string;
  back?: string;
};

export default function ViewerScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<Params>();
  const finish = useMemo(
    () => parseFinish(params.foil, params.border, params.era, params.pattern),
    [params.foil, params.border, params.era, params.pattern],
  );
  const productId = params.product && /^\d+$/.test(params.product) ? Number(params.product) : null;

  if (!isModelKind(params.kind) || !params.image) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          icon="cube-outline"
          title="Nothing to show in 3D"
          message="Open a card or a pack and tap View in 3D."
          action={{ label: 'Go back', icon: 'arrow-back', onPress: () => router.back() }}
        />
      </View>
    );
  }

  return (
    <ModelViewer
      kind={params.kind}
      image={params.image}
      productId={productId}
      title={params.title ?? ''}
      subtitle={params.subtitle}
      finish={finish}
      back={parseCardBack(params.back)}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
  },
});
