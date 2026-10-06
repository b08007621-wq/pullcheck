import * as DocumentPicker from 'expo-document-picker';

export type PickedText = {
  name: string;
  text: string;
};

export async function shareTextFile(name: string, text: string): Promise<void> {
  const blob = new Blob([text], { type: name.endsWith('.csv') ? 'text/csv' : 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function pickTextFile(types: string[]): Promise<PickedText | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: types, multiple: false });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const text = asset.file ? await asset.file.text() : await (await fetch(asset.uri)).text();
  return { name: asset.name, text };
}
