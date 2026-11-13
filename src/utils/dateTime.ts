import { ChorePeriod } from '../types';

/**
 * Returns YYYY-MM-DD in the user's LOCAL timezone (so day rollover happens cleanly at 00:00 local time).
 */
export function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Shifts a local YYYY-MM-DD date string by deltaDays without UTC drift.
 */
export function shiftLocalDateStr(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const shifted = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  return getLocalDateStr(shifted);
}

/**
 * Formats a YYYY-MM-DD local string cleanly in Dutch.
 */
export function formatLocalDateNL(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }
): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1);
  return new Intl.DateTimeFormat('nl-NL', options).format(dateObj);
}

/**
 * Returns the active routine period based on current local time:
 * - 00:00 - 11:59 -> morning (Ochtend)
 * - 12:00 - 17:59 -> afternoon (Middag)
 * - 18:00 - 23:59 -> evening (Avond)
 */
export function getCurrentDayPeriod(date: Date = new Date()): Exclude<ChorePeriod, 'all_day'> {
  const hours = date.getHours();
  if (hours < 12) return 'morning';
  if (hours < 18) return 'afternoon';
  return 'evening';
}

export function isChorePeriodActiveNow(period: ChorePeriod, date: Date = new Date()): boolean {
  if (period === 'all_day') return true;
  return period === getCurrentDayPeriod(date);
}

export function getChorePeriodLabel(period: ChorePeriod): string {
  switch (period) {
    case 'morning':
      return 'Ochtend';
    case 'afternoon':
      return 'Middag';
    case 'evening':
      return 'Avond';
    case 'all_day':
      return 'Hele dag';
  }
}

export function getChorePeriodTimeRange(period: ChorePeriod): string {
  switch (period) {
    case 'morning':
      return '00:00 – 12:00';
    case 'afternoon':
      return '12:00 – 18:00';
    case 'evening':
      return '18:00 – 00:00';
    case 'all_day':
      return 'Hele dag geldig';
  }
}

export function isChoreCompletedOnDate(
  completionsByDate: Record<string, string[]> | undefined,
  dateStr: string,
  choreId: string
): boolean {
  if (!completionsByDate) return false;
  const list = completionsByDate[dateStr];
  return Array.isArray(list) && list.includes(choreId);
}
