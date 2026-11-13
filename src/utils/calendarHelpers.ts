import {
  CalendarEvent,
  CalendarMultiDayMode,
  CalendarSource,
  FamilyMember
} from '../types';
import {
  getEventEndDateStr,
  getEventStartDateStr,
  getLocalDateStr
} from './dateTime';

export interface ResolvedAssignees {
  isFamily: boolean;
  members: FamilyMember[];
  label: string;
}

export function getCalendarAssignees(
  calendar: CalendarSource | undefined,
  familyMembers: FamilyMember[]
): ResolvedAssignees {
  if (!calendar) {
    return { isFamily: true, members: [], label: 'Gezin' };
  }

  const ids = Array.isArray(calendar.memberIds) ? calendar.memberIds : [];
  const wantsMembers =
    calendar.assignmentMode === 'members' ||
    (calendar.assignmentMode === undefined && ids.length > 0);

  if (wantsMembers && ids.length > 0) {
    const matched = familyMembers.filter(m => ids.includes(m.id));
    if (matched.length > 0) {
      const label =
        matched.length === 1
          ? matched[0].name
          : matched.length === 2
          ? `${matched[0].name} & ${matched[1].name}`
          : `${matched[0].name} +${matched.length - 1}`;
      return { isFamily: false, members: matched, label };
    }
  }

  return { isFamily: true, members: [], label: 'Gezin' };
}

export function resolveEventAssignees(
  evt: CalendarEvent,
  calendar: CalendarSource | undefined,
  familyMembers: FamilyMember[]
): ResolvedAssignees {
  if (evt.assignedTo) {
    const explicit = familyMembers.find(m => m.id === evt.assignedTo);
    if (explicit) {
      return { isFamily: false, members: [explicit], label: explicit.name };
    }
  }
  return getCalendarAssignees(calendar, familyMembers);
}

export function calendarMatchesPersonFilter(
  calendar: CalendarSource,
  personFilter: string,
  familyMembers: FamilyMember[]
): boolean {
  if (personFilter === 'all') return true;
  const resolved = getCalendarAssignees(calendar, familyMembers);
  if (personFilter === 'family') return resolved.isFamily;
  return !resolved.isFamily && resolved.members.some(m => m.id === personFilter);
}

export function eventMatchesPersonFilter(
  evt: CalendarEvent,
  calendar: CalendarSource | undefined,
  personFilter: string,
  familyMembers: FamilyMember[]
): boolean {
  if (personFilter === 'all') return true;
  const resolved = resolveEventAssignees(evt, calendar, familyMembers);
  if (personFilter === 'family') return resolved.isFamily;
  return !resolved.isFamily && resolved.members.some(m => m.id === personFilter);
}

export function isOvernightShiftEvent(evt: CalendarEvent): boolean {
  if (evt.allDay) return false;
  const startStr = getEventStartDateStr(evt);
  const endStr = getEventEndDateStr(evt);
  if (endStr <= startStr) return false;

  const start = new Date(evt.startTime);
  const end = new Date(evt.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  // Typical night shift / evening-to-morning event: < 20h and ends by 12:00 next day
  const endHour = end.getHours() + end.getMinutes() / 60;
  return durationHours > 0 && durationHours < 20 && endHour <= 12;
}

export function getEffectiveMultiDayMode(
  evt: CalendarEvent,
  calendar?: CalendarSource
): CalendarMultiDayMode {
  if (evt.multiDayOverride === 'all_days') return 'all_days';
  if (evt.multiDayOverride === 'start_day_only') return 'start_day_only';
  return calendar?.multiDayMode || 'smart_cutoff';
}

/**
 * Determines whether an event should appear on `dateStr` in Day/Month/Dashboard list views.
 * - Night shifts (e.g. 19:00 -> 07:00) only show on their start date under 'smart_cutoff' or 'start_day_only'.
 * - Genuine multi-day events (vacations, all-day spans, >= 20h) show on every day unless 'start_day_only'.
 */
export function shouldEventShowOnDateList(
  evt: CalendarEvent,
  calendar: CalendarSource | undefined,
  dateStr: string
): boolean {
  const startStr = getEventStartDateStr(evt);
  const endStr = getEventEndDateStr(evt);
  if (dateStr < startStr || dateStr > endStr) return false;
  if (startStr === endStr) return dateStr === startStr;

  const mode = getEffectiveMultiDayMode(evt, calendar);
  if (mode === 'all_days') return true;
  if (mode === 'start_day_only') return dateStr === startStr;

  // 'smart_cutoff'
  if (evt.allDay) return true;
  if (isOvernightShiftEvent(evt)) {
    return dateStr === startStr;
  }
  return true;
}

export function formatEventTimeDisplay(
  evt: CalendarEvent,
  dateStr: string,
  timeFormat24h: boolean = true
): string {
  if (evt.allDay) {
    const startStr = getEventStartDateStr(evt);
    const endStr = getEventEndDateStr(evt);
    if (endStr > startStr) {
      return 'Hele dag (meerdaags)';
    }
    return 'Hele dag';
  }

  const start = new Date(evt.startTime);
  const end = new Date(evt.endTime);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !timeFormat24h
    }).format(d);

  const startStr = getEventStartDateStr(evt);
  const endStr = getEventEndDateStr(evt);

  if (endStr <= startStr) {
    return `${fmt(start)} – ${fmt(end)}`;
  }

  if (dateStr === startStr) {
    return `${fmt(start)} – ${fmt(end)} (+1d)`;
  }

  if (dateStr === endStr) {
    return `00:00 – ${fmt(end)}`;
  }

  return 'Hele dag (loopt door)';
}

export interface TimedDaySegment {
  id: string;
  event: CalendarEvent;
  startMinutes: number; // 0..1440
  endMinutes: number; // 0..1440
  isContinuation: boolean;
  isOvernightStart: boolean;
  colIndex: number;
  totalCols: number;
}

/**
 * Extracts timed segments for the 00:00–24:00 Google-style weekly hourly grid.
 * Multi-day timed events span cleanly from startTime..24:00 on start day and 00:00..endTime on end day
 * unless multiDayMode === 'start_day_only' (in which case only the start day renders).
 */
export function getDayHourGridData(
  events: CalendarEvent[],
  calendarMap: Map<string, CalendarSource>,
  dateStr: string
): {
  allDayEvents: CalendarEvent[];
  timedSegments: TimedDaySegment[];
} {
  const allDayEvents: CalendarEvent[] = [];
  const rawSegments: Omit<TimedDaySegment, 'colIndex' | 'totalCols'>[] = [];

  for (const evt of events) {
    const cal = calendarMap.get(evt.calendarId);
    const startStr = getEventStartDateStr(evt);
    const endStr = getEventEndDateStr(evt);
    if (dateStr < startStr || dateStr > endStr) continue;

    if (evt.allDay) {
      if (shouldEventShowOnDateList(evt, cal, dateStr)) {
        allDayEvents.push(evt);
      }
      continue;
    }

    const mode = getEffectiveMultiDayMode(evt, cal);
    if (endStr > startStr && dateStr > startStr && mode === 'start_day_only') {
      continue;
    }

    const start = new Date(evt.startTime);
    const end = new Date(evt.endTime);
    if (Number.isNaN(start.getTime())) continue;

    const startMins =
      dateStr === startStr ? start.getHours() * 60 + start.getMinutes() : 0;

    let endMins = 1440;
    if (dateStr === endStr && !Number.isNaN(end.getTime())) {
      const m = end.getHours() * 60 + end.getMinutes();
      endMins = m === 0 && end.getTime() > start.getTime() ? 1440 : Math.max(m, startMins + 30);
    }

    if (endMins <= startMins) {
      endMins = Math.min(1440, startMins + 30);
    }

    // Ignore 0-minute continuation right at midnight
    if (dateStr > startStr && endMins <= 5) continue;

    rawSegments.push({
      id: `${evt.id}-${dateStr}`,
      event: evt,
      startMinutes: Math.max(0, Math.min(1410, startMins)),
      endMinutes: Math.max(startMins + 25, Math.min(1440, endMins)),
      isContinuation: dateStr > startStr,
      isOvernightStart: endStr > startStr && dateStr === startStr
    });
  }

  // Sort for cluster overlap layout
  rawSegments.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return b.endMinutes - a.endMinutes;
  });

  // Group into overlapping clusters and assign column indices
  const positioned: TimedDaySegment[] = [];
  let cluster: Omit<TimedDaySegment, 'colIndex' | 'totalCols'>[] = [];
  let clusterMaxEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const colEndTimes: number[] = [];
    const colIndices: number[] = [];

    for (const seg of cluster) {
      let placedCol = -1;
      for (let c = 0; c < colEndTimes.length; c++) {
        if (colEndTimes[c] <= seg.startMinutes) {
          placedCol = c;
          colEndTimes[c] = seg.endMinutes;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = colEndTimes.length;
        colEndTimes.push(seg.endMinutes);
      }
      colIndices.push(placedCol);
    }

    const totalCols = Math.max(1, colEndTimes.length);
    for (let i = 0; i < cluster.length; i++) {
      positioned.push({
        ...cluster[i],
        colIndex: colIndices[i],
        totalCols
      });
    }
    cluster = [];
    clusterMaxEnd = -1;
  };

  for (const seg of rawSegments) {
    if (cluster.length > 0 && seg.startMinutes >= clusterMaxEnd) {
      flushCluster();
    }
    cluster.push(seg);
    clusterMaxEnd = Math.max(clusterMaxEnd, seg.endMinutes);
  }
  flushCluster();

  allDayEvents.sort((a, b) => a.title.localeCompare(b.title));

  return { allDayEvents, timedSegments: positioned };
}

export function hexToRgba(hex: string, alpha: number): string {
  const cleaned = (hex || '#6366F1').replace('#', '').trim();
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `rgba(99, 102, 241, ${alpha})`;
}

export function getTodayLocalStr(): string {
  return getLocalDateStr();
}
