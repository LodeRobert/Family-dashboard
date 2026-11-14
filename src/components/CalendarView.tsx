import React, { useEffect, useState } from 'react';
import {
  CalendarEvent,
  CalendarSource,
  CalendarViewMode,
  FamilyMember
} from '../types';
import { MemberAvatar } from './MemberAvatar';
import { CalendarAssigneeBadge } from './CalendarAssigneeBadge';
import {
  getLocalDateStr,
  getEventStartDateStr,
  getEventEndDateStr,
  formatLocalDateNL,
  shiftLocalDateStr
} from '../utils/dateTime';
import {
  formatEventTimeDisplay,
  getCalendarAssignees,
  getDayHourGridData,
  hexToRgba,
  resolveEventAssignees,
  shouldEventShowOnDateList
} from '../utils/calendarHelpers';
import {
  getCalendarPresetByKey,
  inferCalendarCategory
} from '../utils/calendarPresets';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Settings,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  History,
  Sun,
  Home,
  Users,
  Check,
  Minus
} from 'lucide-react';

interface CalendarViewProps {
  events: CalendarEvent[];
  calendars: CalendarSource[];
  familyMembers: FamilyMember[];
  timeFormat24h?: boolean;
  onOpenNewEvent: (initialDate?: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenManageCalendars: () => void;
  onToggleCalendarVisibility: (calendarId: string) => void;
  onSetCalendarsVisibility?: (updates: Record<string, boolean>) => void;
}

const HOUR_HEIGHT = 44; // 44px per hour -> 24h = 1056px
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface OwnerGroup {
  key: string;
  label: string;
  sublabel: string;
  accentColor: string;
  members: FamilyMember[];
  isFamily: boolean;
  calendars: CalendarSource[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  calendars,
  familyMembers,
  timeFormat24h = true,
  onOpenNewEvent,
  onSelectEvent,
  onOpenManageCalendars,
  onToggleCalendarVisibility,
  onSetCalendarsVisibility
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [showPastInAgenda, setShowPastInAgenda] = useState(false);
  const [isSelectorExpanded, setIsSelectorExpanded] = useState(true);
  const [nowTick, setNowTick] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNowTick(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Resolve live calendar metadata & filter events strictly by selected/visible calendars
  const calendarMap = new Map<string, CalendarSource>(calendars.map(c => [c.id, c]));
  const visibleCalendarIds = new Set(calendars.filter(c => c.visible).map(c => c.id));
  const activeEvents = events.filter(e => visibleCalendarIds.has(e.calendarId));

  // Date Navigation
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setShowPastInAgenda(false);
  };

  // Month Title
  const formattedMonthYear = new Intl.DateTimeFormat('nl-NL', {
    month: 'long',
    year: 'numeric'
  }).format(currentDate);

  // Month Grid Calculation (Monday as first day)
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateStr: getLocalDateStr(d)
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        dateStr: getLocalDateStr(d)
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateStr: getLocalDateStr(d)
      });
    }

    return days;
  };

  // Week Grid Calculation (7 days starting Monday)
  const getWeekDays = () => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);

    const week: { date: Date; dateStr: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push({
        date: nextDay,
        dateStr: getLocalDateStr(nextDay)
      });
    }
    return week;
  };

  const todayStr = getLocalDateStr(nowTick);
  const nowMinutes = nowTick.getHours() * 60 + nowTick.getMinutes();

  // Build structured owner groups (Hele gezin + each person + multi-member shared groups)
  const ownerGroups: OwnerGroup[] = [];
  const familyCals: CalendarSource[] = [];
  const perMemberCals = new Map<string, CalendarSource[]>(familyMembers.map(m => [m.id, []]));
  const sharedGroupMap = new Map<string, { members: FamilyMember[]; calendars: CalendarSource[] }>();

  for (const cal of calendars) {
    const resolved = getCalendarAssignees(cal, familyMembers);
    if (resolved.isFamily || resolved.members.length === 0) {
      familyCals.push(cal);
    } else if (resolved.members.length === 1) {
      const mId = resolved.members[0].id;
      const list = perMemberCals.get(mId) || [];
      list.push(cal);
      perMemberCals.set(mId, list);
    } else {
      const sortedIds = [...resolved.members]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(m => m.id)
        .join('|');
      const existing = sharedGroupMap.get(sortedIds);
      if (existing) {
        existing.calendars.push(cal);
      } else {
        sharedGroupMap.set(sortedIds, {
          members: resolved.members,
          calendars: [cal]
        });
      }
    }
  }

  ownerGroups.push({
    key: 'family',
    label: 'Hele gezin',
    sublabel: 'Gezamenlijke & standaard agenda’s',
    accentColor: '#6366F1',
    members: [],
    isFamily: true,
    calendars: familyCals
  });

  for (const member of familyMembers) {
    ownerGroups.push({
      key: `member-${member.id}`,
      label: member.name,
      sublabel: member.role === 'parent' ? 'Ouder' : 'Kind',
      accentColor: member.color,
      members: [member],
      isFamily: false,
      calendars: perMemberCals.get(member.id) || []
    });
  }

  for (const [groupKey, groupData] of sharedGroupMap.entries()) {
    ownerGroups.push({
      key: `shared-${groupKey}`,
      label: groupData.members.map(m => m.name).join(' & '),
      sublabel: 'Gedeelde groep',
      accentColor: groupData.members[0]?.color || '#10B981',
      members: groupData.members,
      isFamily: false,
      calendars: groupData.calendars
    });
  }

  const handleSetGroupVisibility = (targetCals: CalendarSource[], makeVisible: boolean) => {
    if (targetCals.length === 0) return;
    if (onSetCalendarsVisibility) {
      const updates: Record<string, boolean> = {};
      for (const c of targetCals) {
        updates[c.id] = makeVisible;
      }
      onSetCalendarsVisibility(updates);
    } else {
      for (const c of targetCals) {
        if (c.visible !== makeVisible) {
          onToggleCalendarVisibility(c.id);
        }
      }
    }
  };

  const visibleCount = calendars.filter(c => c.visible).length;

  return (
    <div className="space-y-3.5 pb-12">
      {/* Calendar Top Controls & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              aria-label="Vorige periode"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Vandaag
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              aria-label="Volgende periode"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white capitalize">
            {formattedMonthYear}
          </h2>
        </div>

        {/* View mode toggle + Add Event + Manage Calendars */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setViewMode('day')}
              className={`px-2 sm:px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Dag
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2 sm:px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-2 sm:px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Maand
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-2 sm:px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Agenda
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenManageCalendars}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Koppelingen</span>
            </button>

            <button
              onClick={() => onOpenNewEvent()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Afspraak</span>
            </button>
          </div>
        </div>
      </div>

      {/* Per-Person & Group Calendar Selection Panel (Columns/Rows with Multi-Select) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs space-y-3">
        {/* Top Bar: Title + Quick Global Toggles + Collapse */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="font-bold text-slate-900 dark:text-white">
              Agenda&apos;s per persoon &amp; groep selecteren
            </span>
            <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {visibleCount}/{calendars.length} actief
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleSetGroupVisibility(calendars, true)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 font-semibold transition-colors"
            >
              Alles aan
            </button>
            <button
              type="button"
              onClick={() => handleSetGroupVisibility(calendars, false)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold transition-colors"
            >
              Alles uit
            </button>
            <button
              type="button"
              onClick={() => setIsSelectorExpanded(p => !p)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
            >
              <span>{isSelectorExpanded ? 'Inklappen' : 'Kiezen'}</span>
              {isSelectorExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Compact Quick Chips when Collapsed */}
        {!isSelectorExpanded && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            {ownerGroups
              .filter(g => g.calendars.length > 0)
              .map(group => {
                const activeInGroup = group.calendars.filter(c => c.visible).length;
                const allActive = activeInGroup === group.calendars.length;
                const someActive = activeInGroup > 0 && !allActive;
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => handleSetGroupVisibility(group.calendars, !allActive)}
                    style={
                      activeInGroup > 0
                        ? {
                            borderColor: group.accentColor,
                            backgroundColor: hexToRgba(group.accentColor, 0.12)
                          }
                        : undefined
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                      activeInGroup > 0
                        ? 'text-slate-900 dark:text-white'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded flex items-center justify-center border"
                      style={
                        allActive || someActive
                          ? {
                              backgroundColor: group.accentColor,
                              borderColor: group.accentColor,
                              color: '#fff'
                            }
                          : undefined
                      }
                    >
                      {allActive ? (
                        <Check className="w-2.5 h-2.5" />
                      ) : someActive ? (
                        <Minus className="w-2.5 h-2.5" />
                      ) : null}
                    </span>
                    <span>{group.label}</span>
                    <span className="text-[10px] font-mono opacity-75">
                      ({activeInGroup}/{group.calendars.length})
                    </span>
                  </button>
                );
              })}
          </div>
        )}

        {/* Responsive Columns Grid by Person & Group */}
        {isSelectorExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {ownerGroups.map(group => {
              const total = group.calendars.length;
              const activeCount = group.calendars.filter(c => c.visible).length;
              const allActive = total > 0 && activeCount === total;
              const someActive = activeCount > 0 && activeCount < total;

              return (
                <div
                  key={group.key}
                  className={`rounded-xl border transition-all flex flex-col overflow-hidden ${
                    activeCount > 0
                      ? 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50'
                  }`}
                >
                  {/* Group / Person Master Toggle Header */}
                  <button
                    type="button"
                    disabled={total === 0}
                    onClick={() => handleSetGroupVisibility(group.calendars, !allActive)}
                    className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-left border-b border-slate-200/70 dark:border-slate-700/60 transition-colors ${
                      total > 0
                        ? 'hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer'
                        : 'opacity-70 cursor-default'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {group.isFamily ? (
                        <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Home className="w-3.5 h-3.5" />
                        </span>
                      ) : group.members.length === 1 ? (
                        <MemberAvatar member={group.members[0]} size="xs" />
                      ) : (
                        <div className="flex items-center -space-x-1.5 shrink-0">
                          {group.members.slice(0, 3).map(m => (
                            <MemberAvatar key={m.id} member={m} size="xs" />
                          ))}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {group.label}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {group.sublabel}
                        </div>
                      </div>
                    </div>

                    {total > 0 ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono tabular-nums text-slate-500">
                          {activeCount}/{total}
                        </span>
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            allActive || someActive
                              ? 'text-white border-transparent'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                          }`}
                          style={
                            allActive || someActive
                              ? { backgroundColor: group.accentColor }
                              : undefined
                          }
                        >
                          {allActive ? (
                            <Check className="w-3 h-3" />
                          ) : someActive ? (
                            <Minus className="w-3 h-3" />
                          ) : null}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">0</span>
                    )}
                  </button>

                  {/* Individual Calendars inside this Person/Group Column */}
                  <div className="p-2 space-y-1 flex-1">
                    {total === 0 ? (
                      <button
                        type="button"
                        onClick={onOpenManageCalendars}
                        className="w-full py-2 px-2 text-[11px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-left rounded-lg transition-colors"
                      >
                        Geen eigen agenda — + koppelen
                      </button>
                    ) : (
                      group.calendars.map(cal => {
                        const cat = inferCalendarCategory(cal);
                        const preset = getCalendarPresetByKey(cat);
                        const displayIcon = cal.icon || preset?.icon;
                        const sourceShort =
                          cal.type === 'homeassistant'
                            ? 'HA'
                            : cal.type === 'ical'
                            ? 'iCal'
                            : 'Lokaal';

                        return (
                          <button
                            key={cal.id}
                            type="button"
                            onClick={() => onToggleCalendarVisibility(cal.id)}
                            className={`w-full px-2 py-1.5 rounded-lg border text-left flex items-center justify-between gap-2 text-xs transition-all cursor-pointer ${
                              cal.visible
                                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                                : 'bg-transparent border-transparent text-slate-400 dark:text-slate-500 opacity-65 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                  cal.visible
                                    ? 'text-white border-transparent'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                }`}
                                style={cal.visible ? { backgroundColor: cal.color } : undefined}
                              >
                                {cal.visible && <Check className="w-2.5 h-2.5" />}
                              </span>
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: cal.color }}
                              />
                              {displayIcon && (
                                <span className="text-xs leading-none shrink-0">
                                  {displayIcon}
                                </span>
                              )}
                              <span
                                className={`truncate font-medium ${
                                  !cal.visible ? 'line-through' : ''
                                }`}
                              >
                                {cal.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {preset && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded font-bold hidden sm:inline"
                                  style={{
                                    backgroundColor: hexToRgba(preset.color, 0.14),
                                    color: preset.color
                                  }}
                                >
                                  {preset.name.split(' ')[0]}
                                </span>
                              )}
                              <span className="text-[9px] text-slate-400 font-mono">
                                {sourceShort}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VIEW: MONTH */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center py-2.5 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div>Ma</div>
            <div>Di</div>
            <div>Wo</div>
            <div>Do</div>
            <div>Vr</div>
            <div>Za</div>
            <div>Zo</div>
          </div>

          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
            {getMonthDays().map((dayObj, idx) => {
              const dayEvents = activeEvents
                .filter(e =>
                  shouldEventShowOnDateList(e, calendarMap.get(e.calendarId), dayObj.dateStr)
                )
                .sort((a, b) => {
                  if (Boolean(a.allDay) !== Boolean(b.allDay)) return a.allDay ? -1 : 1;
                  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                });

              const isToday = dayObj.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => onOpenNewEvent(dayObj.dateStr)}
                  className={`min-h-[82px] sm:min-h-[118px] p-1 sm:p-2 cursor-pointer transition-colors hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 ${
                    !dayObj.isCurrentMonth
                      ? 'bg-slate-50/50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold font-mono tabular-nums inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {dayObj.date.getDate()}
                    </span>
                    {dayEvents.length > 4 && (
                      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                        +{dayEvents.length - 4}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 4).map(evt => {
                      const cal = calendarMap.get(evt.calendarId);
                      const liveColor = cal?.color || evt.calendarColor || '#6366F1';
                      const preset = cal ? getCalendarPresetByKey(inferCalendarCategory(cal)) : undefined;
                      const calIcon = cal?.icon || preset?.icon;
                      const assignees = resolveEventAssignees(evt, cal, familyMembers);
                      const timeLabel = evt.allDay
                        ? 'Hele dag'
                        : formatEventTimeDisplay(evt, dayObj.dateStr, timeFormat24h);

                      return (
                        <div
                          key={`${evt.id}-${dayObj.dateStr}`}
                          onClick={e => {
                            e.stopPropagation();
                            onSelectEvent(evt);
                          }}
                          style={{
                            borderLeftColor: liveColor,
                            backgroundColor: hexToRgba(liveColor, evt.allDay || preset ? 0.18 : 0.1)
                          }}
                          className="px-1.5 py-0.5 rounded text-[11px] font-medium border-l-3 transition-all cursor-pointer hover:brightness-95 flex items-center justify-between gap-1"
                          title={`${cal?.name || 'Agenda'} · ${timeLabel} · ${evt.title} (${assignees.label})`}
                        >
                          <div className="truncate min-w-0 text-slate-900 dark:text-slate-100">
                            {calIcon && <span className="mr-1">{calIcon}</span>}
                            {evt.allDay ? (
                              <span className="text-[9px] font-bold uppercase text-indigo-700 dark:text-indigo-300 mr-1">
                                [Hele dag]
                              </span>
                            ) : (
                              <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 mr-1">
                                {new Intl.DateTimeFormat('nl-NL', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: !timeFormat24h
                                }).format(new Date(evt.startTime))}
                              </span>
                            )}
                            <span>{evt.title}</span>
                          </div>
                          <span className="hidden sm:inline-flex shrink-0">
                            <CalendarAssigneeBadge assignees={assignees} compact showText={false} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: WEEK (Google Calendar-stijl Urenrooster 00:00 bovenin t/m 23:00 onderin) */}
      {viewMode === 'week' && (() => {
        const weekDays = getWeekDays();
        const weekData = weekDays.map(d => ({
          ...d,
          ...getDayHourGridData(activeEvents, calendarMap, d.dateStr)
        }));
        const hasAnyAllDay = weekData.some(wd => wd.allDayEvents.length > 0);
        const nowTopPx = (nowMinutes / 60) * HOUR_HEIGHT;

        return (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                {/* Day Headers Row */}
                <div className="grid grid-cols-[58px_repeat(7,minmax(0,1fr))] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                  <div className="py-2.5 px-1 text-center text-[10px] font-mono font-semibold text-slate-400 border-r border-slate-200 dark:border-slate-800 flex items-end justify-center">
                    Uur
                  </div>
                  {weekData.map((d, i) => {
                    const isToday = d.dateStr === todayStr;
                    const weekdayName = new Intl.DateTimeFormat('nl-NL', {
                      weekday: 'short'
                    }).format(d.date);

                    return (
                      <div
                        key={i}
                        className={`py-2.5 px-1.5 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800 ${
                          isToday ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : ''
                        }`}
                      >
                        <div className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                          {weekdayName}
                        </div>
                        <div
                          className={`text-sm font-bold font-mono tabular-nums mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full ${
                            isToday
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {d.date.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* All-Day Banner Row (Hele dag) */}
                {hasAnyAllDay && (
                  <div className="grid grid-cols-[58px_repeat(7,minmax(0,1fr))] border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60">
                    <div className="p-1.5 text-[10px] font-semibold text-slate-500 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center text-center leading-tight">
                      Hele dag
                    </div>
                    {weekData.map((d, i) => (
                      <div
                        key={i}
                        onClick={() => onOpenNewEvent(d.dateStr)}
                        className="p-1.5 space-y-1 border-r last:border-r-0 border-slate-100 dark:border-slate-800 cursor-pointer min-h-[38px]"
                      >
                        {d.allDayEvents.map(evt => {
                          const cal = calendarMap.get(evt.calendarId);
                          const liveColor = cal?.color || evt.calendarColor || '#6366F1';
                          const preset = cal ? getCalendarPresetByKey(inferCalendarCategory(cal)) : undefined;
                          const calIcon = cal?.icon || preset?.icon;
                          const assignees = resolveEventAssignees(evt, cal, familyMembers);
                          return (
                            <div
                              key={`${evt.id}-allday-${d.dateStr}`}
                              onClick={e => {
                                e.stopPropagation();
                                onSelectEvent(evt);
                              }}
                              style={{
                                borderLeftColor: liveColor,
                                backgroundColor: hexToRgba(liveColor, 0.18)
                              }}
                              className="px-1.5 py-1 rounded text-[11px] font-semibold border-l-3 text-slate-900 dark:text-white flex items-center justify-between gap-1 hover:brightness-95"
                              title={`${cal?.name || 'Agenda'} · Hele dag · ${evt.title} (${assignees.label})`}
                            >
                              <div className="flex items-center gap-1 truncate min-w-0">
                                {calIcon ? (
                                  <span className="shrink-0">{calIcon}</span>
                                ) : (
                                  <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                                )}
                                <span className="truncate">{evt.title}</span>
                              </div>
                              <CalendarAssigneeBadge assignees={assignees} compact showText={false} />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}

                {/* 24-Hour Scrollable Grid (00:00 at top -> 23:00 at bottom) */}
                <div className="max-h-[70vh] overflow-y-auto relative">
                  <div
                    className="grid grid-cols-[58px_repeat(7,minmax(0,1fr))] relative"
                    style={{ height: `${24 * HOUR_HEIGHT}px` }}
                  >
                    {/* Left Hour Gutter: 00:00 t/m 23:00 */}
                    <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 select-none">
                      {HOURS.map(hour => (
                        <div
                          key={hour}
                          style={{ height: `${HOUR_HEIGHT}px` }}
                          className="border-b border-slate-100 dark:border-slate-800/70 px-1.5 pt-1 text-right text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400"
                        >
                          {String(hour).padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>

                    {/* 7 Day Columns */}
                    {weekData.map((d, dayIdx) => {
                      const isToday = d.dateStr === todayStr;

                      return (
                        <div
                          key={dayIdx}
                          className={`relative border-r last:border-r-0 border-slate-200 dark:border-slate-800 ${
                            isToday ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                          }`}
                        >
                          {/* 24 Hour Clickable Slots */}
                          {HOURS.map(hour => (
                            <div
                              key={hour}
                              onClick={() =>
                                onOpenNewEvent(
                                  `${d.dateStr}T${String(hour).padStart(2, '0')}:00`
                                )
                              }
                              style={{ height: `${HOUR_HEIGHT}px` }}
                              className="relative border-b border-slate-200/70 dark:border-slate-800/80 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 cursor-pointer transition-colors"
                              title={`Afspraak toevoegen op ${formatLocalDateNL(d.dateStr, {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short'
                              })} om ${String(hour).padStart(2, '0')}:00`}
                            >
                              {/* Half-hour subtle hairline */}
                              <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-100 dark:border-slate-800/40 pointer-events-none" />
                            </div>
                          ))}

                          {/* Live Current Time Line on Today's Column */}
                          {isToday && (
                            <div
                              className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                              style={{ top: `${nowTopPx}px` }}
                            >
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shadow-xs" />
                              <div className="flex-1 h-[2px] bg-red-500 shadow-2xs" />
                            </div>
                          )}

                          {/* Positioned Timed Event Blocks */}
                          {d.timedSegments.map(seg => {
                            const evt = seg.event;
                            const cal = calendarMap.get(evt.calendarId);
                            const liveColor = cal?.color || evt.calendarColor || '#6366F1';
                            const preset = cal ? getCalendarPresetByKey(inferCalendarCategory(cal)) : undefined;
                            const calIcon = cal?.icon || preset?.icon;
                            const assignees = resolveEventAssignees(evt, cal, familyMembers);
                            const topPx = (seg.startMinutes / 60) * HOUR_HEIGHT + 1;
                            const heightPx = Math.max(
                              22,
                              ((seg.endMinutes - seg.startMinutes) / 60) * HOUR_HEIGHT - 2
                            );
                            const widthPct = 100 / seg.totalCols;
                            const leftPct = seg.colIndex * widthPct;

                            const timeDisplay = seg.isContinuation
                              ? `↳ tot ${new Intl.DateTimeFormat('nl-NL', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: !timeFormat24h
                                }).format(new Date(evt.endTime))}`
                              : formatEventTimeDisplay(evt, d.dateStr, timeFormat24h);

                            return (
                              <div
                                key={seg.id}
                                onClick={e => {
                                  e.stopPropagation();
                                  onSelectEvent(evt);
                                }}
                                style={{
                                  top: `${topPx}px`,
                                  height: `${heightPx}px`,
                                  left: `calc(${leftPct}% + 2px)`,
                                  width: `calc(${widthPct}% - 4px)`,
                                  borderColor: liveColor,
                                  borderLeftColor: liveColor,
                                  backgroundColor: hexToRgba(
                                    liveColor,
                                    seg.isContinuation ? 0.1 : 0.18
                                  )
                                }}
                                className={`absolute z-10 rounded-md border border-l-4 px-1.5 py-1 overflow-hidden cursor-pointer shadow-2xs transition-all hover:z-30 hover:shadow-md flex flex-col justify-between ${
                                  seg.isContinuation ? 'border-dashed opacity-85' : ''
                                }`}
                                title={`${evt.title}\n${timeDisplay}\n${cal?.name || 'Agenda'} (${assignees.label})${evt.location ? `\n📍 ${evt.location}` : ''}`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-mono tabular-nums font-bold text-slate-700 dark:text-slate-200 truncate">
                                      {timeDisplay}
                                    </span>
                                    <CalendarAssigneeBadge
                                      assignees={assignees}
                                      compact
                                      showText={false}
                                    />
                                  </div>
                                  <div className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                                    {calIcon && <span className="mr-1">{calIcon}</span>}
                                    {evt.title}
                                  </div>
                                  {heightPx >= 56 && evt.location && (
                                    <div className="text-[10px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                                      📍 {evt.location}
                                    </div>
                                  )}
                                </div>

                                {heightPx >= 48 && (
                                  <div className="flex items-center justify-between gap-1 pt-0.5 text-[10px] text-slate-700 dark:text-slate-200 truncate">
                                    <span className="font-semibold truncate">{assignees.label}</span>
                                    {cal?.name && heightPx >= 70 && (
                                      <span className="text-slate-500 dark:text-slate-400 truncate">
                                        · {calIcon ? `${calIcon} ` : ''}
                                        {cal.name}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* VIEW: DAY */}
      {viewMode === 'day' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                {new Intl.DateTimeFormat('nl-NL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }).format(currentDate)}
              </h3>
              <p className="text-xs text-slate-500">Gedetailleerde dagplanning</p>
            </div>
            <button
              onClick={() => onOpenNewEvent(getLocalDateStr(currentDate))}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              + Afspraak op deze dag
            </button>
          </div>

          {(() => {
            const dateStr = getLocalDateStr(currentDate);
            const dayEvents = activeEvents
              .filter(e => shouldEventShowOnDateList(e, calendarMap.get(e.calendarId), dateStr))
              .sort((a, b) => {
                if (Boolean(a.allDay) !== Boolean(b.allDay)) return a.allDay ? -1 : 1;
                return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
              });

            if (dayEvents.length === 0) {
              return (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-sm">Geen afspraken op deze dag.</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {dayEvents.map(evt => {
                  const calSource = calendarMap.get(evt.calendarId);
                  const liveColor = calSource?.color || evt.calendarColor || '#6366F1';
                  const liveCalName = calSource?.name || evt.calendarName || 'Agenda';
                  const preset = calSource
                    ? getCalendarPresetByKey(inferCalendarCategory(calSource))
                    : undefined;
                  const calIcon = calSource?.icon || preset?.icon;
                  const assignees = resolveEventAssignees(evt, calSource, familyMembers);
                  const timeFormatted = formatEventTimeDisplay(evt, dateStr, timeFormat24h);

                  return (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEvent(evt)}
                      style={
                        preset
                          ? {
                              borderLeftColor: liveColor,
                              backgroundColor: hexToRgba(liveColor, 0.08)
                            }
                          : undefined
                      }
                      className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex items-start justify-between gap-4 cursor-pointer ${
                        preset ? 'border-l-4' : 'bg-slate-50/50 dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: liveColor }}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {calIcon && <span className="text-base">{calIcon}</span>}
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">
                              {evt.title}
                            </h4>
                            <CalendarAssigneeBadge assignees={assignees} />
                            {preset && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded font-bold"
                                style={{
                                  backgroundColor: hexToRgba(liveColor, 0.15),
                                  color: liveColor
                                }}
                              >
                                {preset.icon} {liveCalName}
                              </span>
                            )}
                          </div>
                          {evt.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {evt.description}
                            </p>
                          )}
                          {evt.location && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{evt.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {timeFormatted}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {calIcon ? `${calIcon} ` : ''}
                          {liveCalName}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* VIEW: AGENDA / LIST (defaults to today + upcoming, with Past toggle) */}
      {viewMode === 'agenda' && (() => {
        const sortedAll = [...activeEvents].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        const isVisibleUpcoming = (evt: CalendarEvent) => {
          const cal = calendarMap.get(evt.calendarId);
          const startStr = getEventStartDateStr(evt);
          const endStr = getEventEndDateStr(evt);
          if (startStr >= todayStr) return true;
          if (endStr < todayStr) return false;
          return shouldEventShowOnDateList(evt, cal, todayStr);
        };
        const upcomingOrToday = sortedAll.filter(isVisibleUpcoming);
        const pastEvents = sortedAll.filter(evt => !isVisibleUpcoming(evt));
        const displayedEvents = showPastInAgenda ? sortedAll : upcomingOrToday;
        const tomorrowStr = shiftLocalDateStr(todayStr, 1);

        return (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-4 sm:px-5 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                <CalendarIcon className="w-4 h-4 text-indigo-500" />
                <span>
                  {showPastInAgenda
                    ? `Alle afspraken inclusief verleden (${displayedEvents.length})`
                    : `Vanaf vandaag & komende dagen (${upcomingOrToday.length})`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowPastInAgenda(p => !p)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors self-start sm:self-auto ${
                  showPastInAgenda
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>
                  {showPastInAgenda
                    ? 'Alleen vanaf vandaag tonen'
                    : `Verleden tonen (${pastEvents.length})`}
                </span>
              </button>
            </div>

            {displayedEvents.length === 0 ? (
              <div className="p-10 text-center text-slate-500 space-y-2 text-xs">
                <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Geen geplande afspraken vanaf vandaag.
                </p>
                {pastEvents.length > 0 && !showPastInAgenda && (
                  <button
                    type="button"
                    onClick={() => setShowPastInAgenda(true)}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Bekijk {pastEvents.length} eerdere afspraken in het verleden
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {displayedEvents.map(evt => {
                  const startDateStr = getEventStartDateStr(evt);
                  const endDateStr = getEventEndDateStr(evt);
                  const calSource = calendarMap.get(evt.calendarId);
                  const isPast = endDateStr < todayStr;
                  const isOngoingToday = shouldEventShowOnDateList(evt, calSource, todayStr);
                  const isTomorrow = startDateStr === tomorrowStr;

                  const formattedStartDate = formatLocalDateNL(startDateStr, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  });

                  const isMultiDay = endDateStr > startDateStr;
                  const formattedEndShort = isMultiDay
                    ? formatLocalDateNL(endDateStr, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : '';

                  const timeFormatted = evt.allDay
                    ? isMultiDay
                      ? `Hele dag (t/m ${formattedEndShort})`
                      : 'Hele dag'
                    : formatEventTimeDisplay(evt, startDateStr, timeFormat24h);

                  const liveColor = calSource?.color || evt.calendarColor || '#6366F1';
                  const preset = calSource
                    ? getCalendarPresetByKey(inferCalendarCategory(calSource))
                    : undefined;
                  const calIcon = calSource?.icon || preset?.icon;
                  const liveCalName = calSource?.name || evt.calendarName || 'Agenda';
                  const assignees = resolveEventAssignees(evt, calSource, familyMembers);

                  return (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEvent(evt)}
                      style={
                        preset
                          ? {
                              borderLeftColor: liveColor,
                              backgroundColor: hexToRgba(liveColor, 0.06)
                            }
                          : undefined
                      }
                      className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        preset ? 'border-l-4' : ''
                      } ${isPast ? 'opacity-65' : ''}`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: liveColor }}
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {calIcon && <span className="text-sm">{calIcon}</span>}
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {evt.title}
                            </span>

                            <CalendarAssigneeBadge assignees={assignees} />

                            {preset && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded font-bold"
                                style={{
                                  backgroundColor: hexToRgba(liveColor, 0.14),
                                  color: liveColor
                                }}
                              >
                                {preset.icon} {liveCalName}
                              </span>
                            )}

                            {evt.allDay && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                                <Sun className="w-3 h-3 text-amber-500" />
                                Hele dag
                              </span>
                            )}

                            {isOngoingToday && (
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                · Vandaag
                              </span>
                            )}

                            {!isOngoingToday && isTomorrow && (
                              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                · Morgen
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                            <span className="capitalize font-medium">{formattedStartDate}</span>
                            <span>·</span>
                            <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                              {timeFormatted}
                            </span>
                            {evt.location && (
                              <>
                                <span>·</span>
                                <span>📍 {evt.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0 pl-6 sm:pl-0">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {calIcon ? `${calIcon} ` : ''}
                          {liveCalName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
