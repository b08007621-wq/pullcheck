const DAY_MS = 24 * 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const slashed = /^(\d{4})\/(\d{2})\/(\d{2})/.exec(value);
  const date = slashed
    ? new Date(Number(slashed[1]), Number(slashed[2]) - 1, Number(slashed[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatDateTime(date: Date): string {
  return `${dateFormatter.format(date)} at ${timeFormatter.format(date)}`;
}

export function formatAge(date: Date, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - date.getTime()) / DAY_MS);
  if (days < 0) return 'upcoming';
  if (days === 0) return 'today';
  if (days < 31) return days === 1 ? '1 day ago' : `${days} days ago`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  const years = Math.floor(months / 12);
  const leftover = months % 12;
  const yearText = years === 1 ? '1 year' : `${years} years`;
  return leftover > 0 ? `${yearText}, ${leftover} mo ago` : `${yearText} ago`;
}

export function daysSince(date: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}

const shortFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

export function formatShortDate(date: Date): string {
  return shortFormatter.format(date);
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (Number.isNaN(minutes)) return '';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return hours < 48 ? 'yesterday' : formatShortDate(date);
}

export function daysUntil(date: Date, now: Date = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}
