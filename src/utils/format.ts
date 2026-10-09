import { toIsoDate } from './validation.js';

/** `from` + n days as YYYY-MM-DD in local time (month and year roll over correctly; never shifted by UTC). */
export function addDaysIso(days: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Keeps digits and one decimal point with up to 2 decimals. The stored value is never formatted. */
export function cleanMoneyInput(v: string): string {
  const cleaned = v.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

/** "650000" → "650,000" for display only. Empty stays empty, so 0 and "not entered" remain different. */
export function formatMoneyDisplay(raw: string): string {
  if (!raw) return '';
  const [whole, cents] = raw.split('.');
  const grouped = whole ? Number(whole).toLocaleString('en-AU') : '0';
  return cents !== undefined ? `${grouped}.${cents}` : grouped;
}
