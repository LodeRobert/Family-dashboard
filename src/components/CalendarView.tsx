import React, { useState } from 'react';
import {
  CalendarEvent,
  CalendarSource,
  CalendarViewMode,
  FamilyMember
} from '../types';
import { MemberAvatar } from './MemberAvatar';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  List,
  Grid,
  Columns
} from 'lucide-react';

interface CalendarViewProps {
  events: CalendarEvent[];
  calendars: CalendarSource[];
  familyMembers: FamilyMember[];
  onOpenNewEvent: (initialDate?: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenManageCalendars: () => void;
  onToggleCalendarVisibility: (calendarId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  calendars,
  familyMembers,
  onOpenNewEvent,
  onSelectEvent,
  onOpenManageCalendars,
  onToggleCalendarVisibility
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Filter events by visible calendars and resolve live calendar metadata
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

    // Days in current month
    const totalDays = lastDayOfMonth.getDate();

    // Day of week of first day (0 = Sunday, 1 = Monday, etc.)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Monday as index 0

    const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];

    // Prev month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateStr: d.toISOString().split('T')[0]
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        dateStr: d.toISOString().split('T')[0]
      });
    }

    // Next month padding to make full 35 or 42 grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateStr: d.toISOString().split('T')[0]
      });
    }

    return days;
  };

  // Week Grid Calculation (7 days of current week, starting Monday)
  const getWeekDays = () => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));

    const week: { date: Date; dateStr: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push({
        date: nextDay,
        dateStr: nextDay.toISOString().split('T')[0]
      });
    }
    return week;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4 pb-12">
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

      {/* Calendars Filter Legend Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-medium shrink-0">Agenda's:</span>
        {calendars.map(cal => (
          <button
            key={cal.id}
            onClick={() => onToggleCalendarVisibility(cal.id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all shrink-0 ${
              cal.visible
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium'
                : 'bg-slate-100 dark:bg-slate-800/40 border-transparent text-slate-400 line-through opacity-60'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: cal.color }}
            />
            <span>{cal.name}</span>
            {cal.type === 'google_oauth' && (
              <span className="text-[10px] text-indigo-500 font-mono">(Google)</span>
            )}
            {cal.type === 'ical' && (
              <span className="text-[10px] text-emerald-500 font-mono">(iCal)</span>
            )}
          </button>
        ))}
      </div>

      {/* VIEW: MONTH */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Day Headers (Ma - Zo) */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center py-2.5 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div>Ma</div>
            <div>Di</div>
            <div>Wo</div>
            <div>Do</div>
            <div>Vr</div>
            <div>Za</div>
            <div>Zo</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
            {getMonthDays().map((dayObj, idx) => {
              const dayEvents = activeEvents.filter(e => {
                const s = e.startTime.split('T')[0];
                const end = e.endTime.split('T')[0];
                return s === dayObj.dateStr || (s <= dayObj.dateStr && end >= dayObj.dateStr);
              });

              const isToday = dayObj.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => onOpenNewEvent(dayObj.dateStr)}
                  className={`min-h-[70px] sm:min-h-[110px] p-1 sm:p-2 cursor-pointer transition-colors hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 ${
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
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                        +{dayEvents.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Day Events */}
                  <div className="space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map(evt => {
                      const liveColor =
                        calendarMap.get(evt.calendarId)?.color || evt.calendarColor || '#6366F1';
                      return (
                        <div
                          key={evt.id}
                          onClick={e => {
                            e.stopPropagation();
                            onSelectEvent(evt);
                          }}
                          style={{ borderLeftColor: liveColor }}
                          className="px-1.5 py-0.5 rounded text-[11px] font-medium truncate border-l-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                          title={evt.title}
                        >
                          {evt.title}
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

      {/* VIEW: WEEK */}
      {viewMode === 'week' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center bg-slate-50 dark:bg-slate-800/50">
            {getWeekDays().map((d, i) => {
              const isToday = d.dateStr === todayStr;
              const weekdayName = new Intl.DateTimeFormat('nl-NL', { weekday: 'short' }).format(d.date);

              return (
                <div key={i} className="py-3 px-1 border-r last:border-r-0 border-slate-200 dark:border-slate-800">
                  <div className="text-xs uppercase font-semibold text-slate-500">{weekdayName}</div>
                  <div
                    className={`text-sm font-bold font-mono tabular-nums mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full ${
                      isToday ? 'bg-indigo-600 text-white' : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {d.date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800/80 min-h-[380px]">
            {getWeekDays().map((d, i) => {
              const dayEvents = activeEvents.filter(e => {
                const s = e.startTime.split('T')[0];
                const end = e.endTime.split('T')[0];
                return s === d.dateStr || (s <= d.dateStr && end >= d.dateStr);
              });

              return (
                <div
                  key={i}
                  onClick={() => onOpenNewEvent(d.dateStr)}
                  className="p-2 space-y-2 cursor-pointer hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-colors"
                >
                  {dayEvents.map(evt => {
                    const timeStr = evt.allDay
                      ? 'Hele dag'
                      : new Intl.DateTimeFormat('nl-NL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }).format(new Date(evt.startTime));

                    const liveColor =
                      calendarMap.get(evt.calendarId)?.color || evt.calendarColor || '#6366F1';

                    return (
                      <div
                        key={evt.id}
                        onClick={e => {
                          e.stopPropagation();
                          onSelectEvent(evt);
                        }}
                        style={{ borderLeftColor: liveColor }}
                        className="p-2 rounded-lg border-l-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs"
                      >
                        <div className="text-[10px] font-mono tabular-nums text-indigo-600 dark:text-indigo-400 font-semibold">
                          {timeStr}
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                          {evt.title}
                        </div>
                        {evt.location && (
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            📍 {evt.location}
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
      )}

      {/* VIEW: DAY */}
      {viewMode === 'day' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {new Intl.DateTimeFormat('nl-NL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }).format(currentDate)}
              </h3>
              <p className="text-xs text-slate-500">
                Gedetailleerde dagplanning
              </p>
            </div>
            <button
              onClick={() => onOpenNewEvent(currentDate.toISOString().split('T')[0])}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              + Afspraak op deze dag
            </button>
          </div>

          {(() => {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayEvents = activeEvents
              .filter(e => {
                const s = e.startTime.split('T')[0];
                const end = e.endTime.split('T')[0];
                return s === dateStr || (s <= dateStr && end >= dateStr);
              })
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

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
                  const assignedMember = familyMembers.find(m => m.id === evt.assignedTo);
                  const timeFormatted = evt.allDay
                    ? 'Hele dag'
                    : `${new Intl.DateTimeFormat('nl-NL', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(new Date(evt.startTime))} - ${new Intl.DateTimeFormat('nl-NL', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(new Date(evt.endTime))}`;

                  const calSource = calendarMap.get(evt.calendarId);
                  const liveColor = calSource?.color || evt.calendarColor || '#6366F1';
                  const liveCalName = calSource?.name || evt.calendarName || 'Agenda';

                  return (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEvent(evt)}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex items-start justify-between gap-4 cursor-pointer bg-slate-50/50 dark:bg-slate-800/40"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className="w-3 h-3 rounded-full mt-1 shrink-0"
                          style={{ backgroundColor: liveColor }}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">
                              {evt.title}
                            </h4>
                            {assignedMember && (
                              <span
                                className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium text-white"
                                style={{ backgroundColor: assignedMember.color }}
                              >
                                <MemberAvatar member={assignedMember} size="xs" className="border-white/80" />
                                <span>{assignedMember.name}</span>
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

      {/* VIEW: AGENDA / LIST */}
      {viewMode === 'agenda' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
          {activeEvents.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Geen actieve afspraken gevonden.
            </div>
          ) : (
            activeEvents
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .map(evt => {
                const dateHeader = new Intl.DateTimeFormat('nl-NL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                }).format(new Date(evt.startTime));

                const timeFormatted = evt.allDay
                  ? 'Hele dag'
                  : new Intl.DateTimeFormat('nl-NL', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(new Date(evt.startTime));

                const calSource = calendarMap.get(evt.calendarId);
                const liveColor = calSource?.color || evt.calendarColor || '#6366F1';
                const liveCalName = calSource?.name || evt.calendarName || 'Agenda';

                return (
                  <div
                    key={evt.id}
                    onClick={() => onSelectEvent(evt)}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-center justify-between gap-4 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: liveColor }}
                      />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white text-sm">
                          {evt.title}
                        </div>
                        <div className="text-xs text-slate-500 capitalize">
                          {dateHeader} · {timeFormatted}
                          {evt.location && ` · 📍 ${evt.location}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-400 font-mono">
                        {liveCalName}
                      </span>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
};
