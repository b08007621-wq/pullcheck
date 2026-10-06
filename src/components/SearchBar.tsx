import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';

import { GlassSurface } from './GlassSurface';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  isBusy?: boolean;
  placeholder?: string;
  onSubmit?: () => void;
};

export function SearchBar({ value, onChangeText, isBusy = false, placeholder, onSubmit }: Props) {
  const theme = useTheme();

  return (
    <GlassSurface style={styles.container}>
      <Ionicons name="search" size={18} color={theme.colors.textMuted} />
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textFaint}
        selectionColor={theme.colors.accent}
        keyboardAppearance={theme.mode}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        accessibilityLabel={placeholder ?? 'Search'}
      />
      {isBusy ? <ActivityIndicator size="small" color={theme.colors.textMuted} /> : null}
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 46,
    borderRadius: radius.md,
  },
  input: {
    ...typography.body,
    flex: 1,
    height: '100%',
  },
});
