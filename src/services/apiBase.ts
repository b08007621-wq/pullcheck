import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function apiUrl(path: string): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return `${configured.replace(/\/$/, '')}${path}`;

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri && Platform.OS !== 'web') return `http://${hostUri}${path}`;

  return path;
}
