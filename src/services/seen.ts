const pending = new Set<string>();

export function queueSeen(keys: string[]): void {
  for (const key of keys) pending.add(key);
}

export function takeSeen(): string[] {
  const keys = [...pending];
  pending.clear();
  return keys;
}
