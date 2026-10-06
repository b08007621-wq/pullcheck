import type { TextStyle } from 'react-native';

export const typography = {
  title: { fontSize: 34, fontWeight: '700', letterSpacing: 0.3 },
  heading: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  label: { fontSize: 16, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '400' },
} satisfies Record<string, TextStyle>;
