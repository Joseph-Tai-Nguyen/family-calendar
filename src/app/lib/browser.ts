/** Browser helpers: downloads, file picking, PIN lock, notifications. */
import { addDays, todayISO } from '../../shared/date';
import { buildReminders } from '../../shared/events/events';
import type { AppData } from '../../shared/model';

export function downloadBlob(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- PIN lock
// A privacy screen for shared devices — not encryption. Stored per device only.
const PIN_KEY = 'fc:pin';
const UNLOCK_KEY = 'fc:unlocked';

async function digest(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function hasPin(): boolean {
  return !!localStorage.getItem(PIN_KEY);
}

export async function setPin(pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16)).join('.');
  localStorage.setItem(PIN_KEY, JSON.stringify({ salt, hash: await digest(salt + pin) }));
  sessionStorage.setItem(UNLOCK_KEY, '1');
}

export function clearPin(): void {
  localStorage.removeItem(PIN_KEY);
}

export async function checkPin(pin: string): Promise<boolean> {
  const raw = localStorage.getItem(PIN_KEY);
  if (!raw) return true;
  const { salt, hash } = JSON.parse(raw) as { salt: string; hash: string };
  const ok = (await digest(salt + pin)) === hash;
  if (ok) sessionStorage.setItem(UNLOCK_KEY, '1');
  return ok;
}

export function isUnlocked(): boolean {
  return !hasPin() || sessionStorage.getItem(UNLOCK_KEY) === '1';
}

// ---------------------------------------------------------------- notifications
const NOTIFY_PREF = 'fc:notify';
const NOTIFIED_KEY = 'fc:notified';

export function notificationsEnabled(): boolean {
  return localStorage.getItem(NOTIFY_PREF) === '1' && 'Notification' in window && Notification.permission === 'granted';
}

export async function enableNotifications(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const perm = await Notification.requestPermission();
  if (perm === 'granted') localStorage.setItem(NOTIFY_PREF, '1');
  return perm === 'granted';
}

export function disableNotifications() {
  localStorage.removeItem(NOTIFY_PREF);
}

export async function showNotification(title: string, body?: string) {
  const reg = await navigator.serviceWorker?.getRegistration?.();
  if (reg) await reg.showNotification(title, { body, icon: '/icon.svg', badge: '/icon.svg' });
  else new Notification(title, { body, icon: '/icon.svg' });
}

/** Fire due reminders for today (each once per device). */
export function checkDueReminders(data: AppData): void {
  if (!notificationsEnabled()) return;
  const today = todayISO();
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  let shown: string[] = [];
  try {
    shown = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]');
  } catch {
    shown = [];
  }
  const yesterday = addDays(today, -1);
  shown = shown.filter((id) => id.endsWith(today) || id.endsWith(yesterday));
  const lang = data.settings.language;
  for (const r of buildReminders(data, today, today)) {
    const key = `${r.id}@${today}`;
    if (r.remindTime > hhmm || shown.includes(key)) continue;
    shown.push(key);
    const when = r.daysBefore === 0 ? '' : lang === 'vi' ? ` (còn ${r.daysBefore} ngày, ${r.date})` : ` (in ${r.daysBefore} days, ${r.date})`;
    void showNotification(r.title[lang] + when, r.detail?.[lang]);
  }
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(shown));
}
