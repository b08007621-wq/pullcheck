import * as DocumentPicker from 'expo-document-picker';
import { cacheDirectory, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { Share } from 'react-native';

export type PickedText = {
  name: string;
  text: string;
};

export async function shareTextFile(name: string, text: string): Promise<void> {
  const uri = `${cacheDirectory ?? ''}${name}`;
  await writeAsStringAsync(uri, text);
  await Share.share({ url: uri, title: name });
}

export async function pickTextFile(types: string[]): Promise<PickedText | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: false });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  return { name: asset.name, text: await readAsStringAsync(asset.uri) };
}
