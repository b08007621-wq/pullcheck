import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export async function importBackdropImage(previous: string | null): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85 });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const folder = new Directory(Paths.document, 'backdrops');
  if (!folder.exists) folder.create({ intermediates: true });
  const target = new File(folder, `backdrop-${Date.now()}.jpg`);
  await new File(asset.uri).copy(target);
  if (previous) {
    try {
      const old = new File(previous);
      if (old.exists) old.delete();
    } catch {}
  }
  return target.uri;
}
