import { CalendarEvent, CalendarSource, DailyAutomationRule } from '../types';
import { eventOccursOnDate, getLocalDateStr, shiftLocalDateStr } from './dateTime';

export interface RuleSkipMatch {
  skipped: boolean;
  reason?: string;
}

/**
 * Checks whether a DailyAutomationRule should be paused/suppressed on dateStr
 * because one of its linked skipCalendarIds has an event on that date.
 */
export function getRuleSkipMatchOnDate(
  rule: DailyAutomationRule,
  dateStr: string,
  allEvents: CalendarEvent[],
  calendars: CalendarSource[]
): RuleSkipMatch {
  const skipIds = new Set(rule.skipCalendarIds || []);
  if (skipIds.size === 0) {
    return { skipped: false };
  }

  const keywords = (rule.skipKeywords || '')
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);

  const calendarMap = new Map(calendars.map(c => [c.id, c]));

  for (const evt of allEvents) {
    if (evt.isDailyRule) continue;
    if (!skipIds.has(evt.calendarId)) continue;
    if (!eventOccursOnDate(evt, dateStr)) continue;

    if (keywords.length > 0) {
      const haystack = `${evt.title || ''} ${evt.description || ''}`.toLowerCase();
      const matched = keywords.some(kw => haystack.includes(kw));
      if (!matched) continue;
    }

    const calName = calendarMap.get(evt.calendarId)?.name || evt.calendarName || 'Agenda';
    return {
      skipped: true,
      reason: `${calName}: ${evt.title}`
    };
  }

  return { skipped: false };
}

/**
 * Expands enabled daily automation rules with showOnCalendar=true into concrete CalendarEvent
 * instances across [today - daysPast, today + daysFuture], automatically omitting days where
 * a linked skip/vacation calendar suppresses the rule.
 */
export function expandDailyRulesToCalendarEvents(
  rules: DailyAutomationRule[] | undefined,
  calendars: CalendarSource[],
  nonRuleEvents: CalendarEvent[],
  anchorDateStr: string = getLocalDateStr(),
  daysPast = 3,
  daysFuture = 30
): CalendarEvent[] {
  if (!Array.isArray(rules) || rules.length === 0) return [];

  const result: CalendarEvent[] = [];
  const calMap = new Map(calendars.map(c => [c.id, c]));
  const fallbackCal = calendars[0];

  for (const rule of rules) {
    if (!rule.enabled || !rule.showOnCalendar) continue;
    const daysSet = new Set(rule.daysOfWeek || []);
    if (daysSet.size === 0) continue;

    const targetCal = (rule.calendarId && calMap.get(rule.calendarId)) || fallbackCal;
    if (!targetCal) continue;

    const [hhRaw, mmRaw] = (rule.time || '08:00').split(':');
    const hh = String(Math.min(23, Math.max(0, Number(hhRaw) || 0))).padStart(2, '0');
    const mm = String(Math.min(59, Math.max(0, Number(mmRaw) || 0))).padStart(2, '0');
    const duration = Math.max(5, Number(rule.durationMinutes) || 15);

    for (let offset = -daysPast; offset <= daysFuture; offset++) {
      const dateStr = shiftLocalDateStr(anchorDateStr, offset);
      const [y, m, d] = dateStr.split('-').map(Number);
      const localDate = new Date(y, (m || 1) - 1, d || 1);
      const dayOfWeek = localDate.getDay();
      if (!daysSet.has(dayOfWeek)) continue;

      const skipCheck = getRuleSkipMatchOnDate(rule, dateStr, nonRuleEvents, calendars);
      if (skipCheck.skipped) continue;

      const startLocal = new Date(`${dateStr}T${hh}:${mm}:00`);
      if (Number.isNaN(startLocal.getTime())) continue;
      const endLocal = new Date(startLocal.getTime() + duration * 60 * 1000);

      const actionLines: string[] = [];
      actionLines.push('Dagelijkse geplande afspraak (HomeBoard).');
      if (rule.haTargetEntityId) {
        actionLines.push(`Home Assistant actie: ${rule.haTargetEntityId}`);
      } else {
        actionLines.push('Vuurt Home Assistant event "homeboard_daily_trigger" af.');
      }
      if (rule.skipCalendarIds && rule.skipCalendarIds.length > 0) {
        const skipNames = rule.skipCalendarIds
          .map(id => calMap.get(id)?.name)
          .filter(Boolean)
          .join(', ');
        if (skipNames) {
          actionLines.push(`Gepauzeerd tijdens afspraken in: ${skipNames}`);
        }
      }

      result.push({
        id: `rule-${rule.id}-${dateStr}`,
        calendarId: targetCal.id,
        calendarName: targetCal.name,
        calendarColor: targetCal.color,
        title: `⏰ ${rule.title}`,
        description: actionLines.join('\n'),
        startTime: startLocal.toISOString(),
        endTime: endLocal.toISOString(),
        allDay: false,
        isExternal: true,
        isDailyRule: true,
        dailyRuleId: rule.id
      });
    }
  }

  return result;
}
