import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform } from 'react-native';

let cached: boolean | undefined;

export function supportsLiquidGlass(): boolean {
  if (cached === undefined) {
    cached = Platform.OS === 'ios' && safely(isGlassEffectAPIAvailable) && safely(isLiquidGlassAvailable);
  }
  return cached;
}

function safely(check: () => boolean): boolean {
  try {
    return check();
  } catch {
    return false;
  }
}
