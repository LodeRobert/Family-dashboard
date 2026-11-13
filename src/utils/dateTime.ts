import { Chore, ChorePeriod } from '../types';

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

export function getDefaultPeriodTimes(period: ChorePeriod): {
  startTime: string;
  endTime: string;
} {
  switch (period) {
    case 'morning':
      return { startTime: '00:00', endTime: '12:00' };
    case 'afternoon':
      return { startTime: '12:00', endTime: '18:00' };
    case 'evening':
      return { startTime: '18:00', endTime: '00:00' };
    case 'all_day':
      return { startTime: '00:00', endTime: '23:59' };
  }
}

function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 24 || m < 0 || m > 59 || (h === 24 && m > 0)) return null;
  return h * 60 + m;
}

export function isChoreActiveAtTime(
  chore: Pick<Chore, 'period' | 'startTime' | 'endTime'>,
  date: Date = new Date()
): boolean {
  const startMins = parseTimeToMinutes(chore.startTime);
  const rawEndMins = parseTimeToMinutes(chore.endTime);

  if (startMins !== null && rawEndMins !== null) {
    const nowMins = date.getHours() * 60 + date.getMinutes();
    let effectiveEnd = rawEndMins;
    if (chore.endTime === '00:00' && startMins > 0) {
      effectiveEnd = 24 * 60;
    } else if (chore.endTime === '23:59') {
      effectiveEnd = 24 * 60;
    }

    if (startMins === effectiveEnd) return true;
    if (startMins < effectiveEnd) {
      return nowMins >= startMins && nowMins < effectiveEnd;
    }
    // Overnight window (e.g. 20:00 - 06:00)
    return nowMins >= startMins || nowMins < effectiveEnd;
  }

  return isChorePeriodActiveNow(chore.period, date);
}

export function hasCustomChoreHours(
  chore: Pick<Chore, 'period' | 'startTime' | 'endTime'>
): boolean {
  if (!chore.startTime || !chore.endTime) return false;
  if (chore.period === 'all_day') {
    return !(
      chore.startTime === '00:00' &&
      (chore.endTime === '23:59' || chore.endTime === '00:00')
    );
  }
  const def = getDefaultPeriodTimes(chore.period);
  return chore.startTime !== def.startTime || chore.endTime !== def.endTime;
}

export function getChoreEffectiveTimeRange(
  chore: Pick<Chore, 'period' | 'startTime' | 'endTime'>
): string {
  if (chore.startTime && chore.endTime) {
    if (chore.period === 'all_day' && !hasCustomChoreHours(chore)) {
      return 'Hele dag geldig';
    }
    return `${chore.startTime} – ${chore.endTime}`;
  }
  return getChorePeriodTimeRange(chore.period);
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

export function getEventStartDateStr(evt: { startTime: string; allDay?: boolean }): string {
  if (evt.allDay) {
    return evt.startTime.split('T')[0];
  }
  const d = new Date(evt.startTime);
  return Number.isNaN(d.getTime()) ? evt.startTime.split('T')[0] : getLocalDateStr(d);
}

export function getEventEndDateStr(evt: {
  startTime: string;
  endTime: string;
  allDay?: boolean;
}): string {
  if (evt.allDay) {
    return (evt.endTime || evt.startTime).split('T')[0];
  }
  const start = new Date(evt.startTime);
  const end = new Date(evt.endTime || evt.startTime);
  if (Number.isNaN(end.getTime())) return getEventStartDateStr(evt);
  if (
    end.getTime() > start.getTime() &&
    end.getHours() === 0 &&
    end.getMinutes() === 0 &&
    end.getSeconds() === 0
  ) {
    return getLocalDateStr(new Date(end.getTime() - 1));
  }
  return getLocalDateStr(end);
}

export function eventOccursOnDate(
  evt: { startTime: string; endTime: string; allDay?: boolean },
  dateStr: string
): boolean {
  const s = getEventStartDateStr(evt);
  const e = getEventEndDateStr(evt);
  return s === dateStr || (s <= dateStr && e >= dateStr);
}
