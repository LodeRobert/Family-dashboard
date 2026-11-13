import React, { useState, useEffect } from 'react';
import {
  CalendarEvent,
  FamilyMember,
  Chore,
  CalendarSource,
  AppSettings,
  GeneralTask
} from '../types';
import { MemberAvatar } from './MemberAvatar';
import {
  getLocalDateStr,
  isChorePeriodActiveNow,
  getChorePeriodLabel,
  getChorePeriodTimeRange,
  isChoreCompletedOnDate,
  eventOccursOnDate,
  getEventStartDateStr,
  formatLocalDateNL
} from '../utils/dateTime';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Sparkles,
  MapPin,
  Plus,
  CloudSun,
  ChevronRight,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Lock,
  ListTodo
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DashboardViewProps {
  events: CalendarEvent[];
  calendars: CalendarSource[];
  familyMembers: FamilyMember[];
  chores: Chore[];
  choreCompletionsByDate: Record<string, string[]>;
  generalTasks: GeneralTask[];
  settings: AppSettings;
  todayStr: string;
  onOpenNewEvent: () => void;
  onNavigateToCalendar: () => void;
  onNavigateToChores: () => void;
  onNavigateToTasks: () => void;
  onNavigateToSettings: () => void;
  onToggleChore: (choreId: string, dateStr: string) => void;
  onToggleGeneralTask: (taskId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  events,
  calendars,
  familyMembers,
  chores,
  choreCompletionsByDate,
  generalTasks,
  settings,
  todayStr,
  onOpenNewEvent,
  onNavigateToCalendar,
  onNavigateToChores,
  onNavigateToTasks,
  onNavigateToSettings,
  onToggleChore,
  onToggleGeneralTask
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = currentTime.getHours();
  let greeting = 'Goedemorgen';
  let greetingPeriod = 'ochtend';
  if (hours >= 12 && hours < 18) {
    greeting = 'Goedemiddag';
    greetingPeriod = 'middag';
  } else if (hours >= 18 && hours < 23) {
    greeting = 'Goedenavond';
    greetingPeriod = 'avond';
  } else if (hours >= 23 || hours < 6) {
    greeting = 'Goedenacht';
    greetingPeriod = 'nacht';
  }

  const greetingLine =
    settings.showFamilyNameInGreeting && settings.familyGreetingName?.trim()
      ? `${greeting}, ${settings.familyGreetingName.trim()}! 👋`
      : `${greeting}! 👋`;

  const calendarMap = new Map<string, CalendarSource>(calendars.map(c => [c.id, c]));
  const visibleCalendarIds = new Set(calendars.filter(c => c.visible).map(c => c.id));

  const localToday = getLocalDateStr(currentTime);

  const todayEvents = events
    .filter(evt => visibleCalendarIds.has(evt.calendarId))
    .filter(evt => eventOccursOnDate(evt, localToday))
    .sort((a, b) => {
      if (Boolean(a.allDay) !== Boolean(b.allDay)) return a.allDay ? -1 : 1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

  const upcomingEvents = events
    .filter(evt => visibleCalendarIds.has(evt.calendarId))
    .filter(evt => getEventStartDateStr(evt) > localToday)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  const formattedDate = new Intl.DateTimeFormat('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(currentTime);

  const formattedTime = new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: !settings.timeFormat24h
  }).format(currentTime);

  const handleChoreClick = (chore: Chore) => {
    if (!isChorePeriodActiveNow(chore.period, currentTime)) return;
    const isCompleted = isChoreCompletedOnDate(choreCompletionsByDate, todayStr, chore.id);
    if (!isCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
    onToggleChore(chore.id, todayStr);
  };

  // Show active-period & all-day chores first on Dashboard
  const sortedChores = [...chores].sort((a, b) => {
    const aActive = isChorePeriodActiveNow(a.period, currentTime) ? 0 : 1;
    const bActive = isChorePeriodActiveNow(b.period, currentTime) ? 0 : 1;
    return aActive - bActive;
  });

  const openGeneralTasks = generalTasks.filter(t => !t.completed).slice(0, 4);

  const renderWeatherIcon = () => {
    const code = settings.weatherCode ?? 0;
    if (code === 0 || code === 1) {
      return hours >= 19 || hours < 6 ? (
        <CloudSun className="w-6 h-6 text-indigo-300" />
      ) : (
        <Sun className="w-6 h-6 text-amber-400" />
      );
    }
    if (code === 2) return <CloudSun className="w-6 h-6 text-amber-300" />;
    if (code === 3) return <Cloud className="w-6 h-6 text-slate-300" />;
    if (code === 45 || code === 48) return <CloudFog className="w-6 h-6 text-slate-300" />;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
      return <CloudRain className="w-6 h-6 text-sky-300" />;
    if ((code >= 71 && code <= 77) || code === 85 || code === 86)
      return <CloudSnow className="w-6 h-6 text-sky-100" />;
    if (code >= 95) return <CloudLightning className="w-6 h-6 text-amber-300" />;
    return <CloudSun className="w-6 h-6 text-amber-300" />;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Family Greeting & Clock Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-2xl p-5 sm:p-8 shadow-md relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="inline-flex items-center gap-2 text-indigo-300 text-xs font-semibold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span>{settings.dashboardName || 'HomeBoard'}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{greetingPeriod}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {greetingLine}
            </h1>
            <p className="text-slate-300 text-xs sm:text-base capitalize">
              {formattedDate}
            </p>
          </div>

          {/* Time & Live Weather Display */}
          <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-8 bg-white/10 backdrop-blur-md px-4 sm:px-5 py-3 sm:py-4 rounded-xl border border-white/10 w-full sm:w-auto">
            <div>
              <div className="text-2xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight">
                {formattedTime}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-300 font-medium">Lokale tijd</div>
            </div>

            <div className="h-8 sm:h-10 w-px bg-white/15"></div>

            <button
              type="button"
              onClick={onNavigateToSettings}
              className="flex items-center gap-3 text-left group hover:opacity-90 transition-opacity"
              title="Woonplaats aanpassen in Instellingen"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                {renderWeatherIcon()}
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums">
                  {settings.weatherTemp ?? 18}°C
                </div>
                <div className="text-xs text-slate-300 group-hover:underline">
                  {settings.cityName || 'Amsterdam'} · {settings.weatherCondition || 'Helder'}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Vandaag op de planning (Left) + Gezinsleden & Taken (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Vandaag op de agenda */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Vandaag op de planning
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                ({todayEvents.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenNewEvent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nieuwe afspraak</span>
              </button>
              <button
                onClick={onNavigateToCalendar}
                className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium inline-flex items-center gap-1"
              >
                <span>Hele week</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
            {todayEvents.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div className="text-slate-700 dark:text-slate-300 font-medium">
                  Geen afspraken gepland voor vandaag
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Een rustige dag! Voeg een gezinsactiviteit toe of plan alvast vooruit.
                </p>
                <button
                  onClick={onOpenNewEvent}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Afspraak toevoegen
                </button>
              </div>
            ) : (
              todayEvents.map(evt => {
                const calSource = calendarMap.get(evt.calendarId);
                const calColor = calSource?.color || evt.calendarColor || '#6366F1';
                const calName = calSource?.name || evt.calendarName || 'Agenda';
                const assignedMember = familyMembers.find(m => m.id === evt.assignedTo);

                const startTimeFormatted = evt.allDay
                  ? 'Hele dag'
                  : new Intl.DateTimeFormat('nl-NL', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: !settings.timeFormat24h
                    }).format(new Date(evt.startTime));

                const endTimeFormatted = evt.allDay
                  ? ''
                  : ` - ${new Intl.DateTimeFormat('nl-NL', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: !settings.timeFormat24h
                    }).format(new Date(evt.endTime))}`;

                return (
                  <div
                    key={evt.id}
                    className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: calColor }}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 dark:text-white text-sm">
                            {evt.title}
                          </span>
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
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                            {evt.description}
                          </p>
                        )}

                        {evt.location && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{evt.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                        {startTimeFormatted}
                        {endTimeFormatted}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        {calName}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Upcoming next days strip */}
          {upcomingEvents.length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Binnenkort op de agenda
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {upcomingEvents.map(evt => {
                  const calSource = calendarMap.get(evt.calendarId);
                  const calColor = calSource?.color || evt.calendarColor || '#6366F1';
                  const eventDate = formatLocalDateNL(getEventStartDateStr(evt), {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  });

                  return (
                    <div
                      key={evt.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: calColor }}
                        />
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {evt.title}
                        </span>
                      </div>
                      <span className="text-slate-500 font-mono shrink-0 capitalize">
                        {eventDate}
                        {evt.allDay ? ' · Hele dag' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Takenbord, Gezinsleden & Algemene Taken */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Routines & Taken
              </h2>
            </div>
            <button
              onClick={onNavigateToChores}
              className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium inline-flex items-center gap-1"
            >
              <span>Volledig takenbord</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Family members star cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3">
            {familyMembers.map(member => {
              const memberChores = chores.filter(c => c.memberId === member.id);
              const completedCount = memberChores.filter(c =>
                isChoreCompletedOnDate(choreCompletionsByDate, todayStr, c.id)
              ).length;

              return (
                <div
                  key={member.id}
                  className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <MemberAvatar member={member} size="md" />
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                        {member.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {memberChores.length > 0
                          ? `${completedCount}/${memberChores.length} taken`
                          : member.role === 'parent'
                          ? 'Ouder'
                          : 'Geen taken'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-sm bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-md shrink-0">
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span className="font-mono tabular-nums">{member.stars}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick routine check list (with time-of-day enforcement) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">
                Vandaag afvinken ({greetingPeriod})
              </span>
              <span>Alleen actief dagdeel & hele dag</span>
            </div>

            <div className="space-y-2">
              {sortedChores.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Nog geen taken aangemaakt. Voeg taken toe op het Takenbord.
                </p>
              ) : (
                sortedChores.slice(0, 5).map(chore => {
                  const member = familyMembers.find(m => m.id === chore.memberId);
                  const isCompleted = isChoreCompletedOnDate(
                    choreCompletionsByDate,
                    todayStr,
                    chore.id
                  );
                  const isActive = isChorePeriodActiveNow(chore.period, currentTime);

                  return (
                    <button
                      key={chore.id}
                      onClick={() => handleChoreClick(chore)}
                      disabled={!isActive}
                      title={
                        isActive
                          ? 'Tik om te voltooien'
                          : `Alleen af te vinken in ${getChorePeriodLabel(chore.period).toLowerCase()} (${getChorePeriodTimeRange(chore.period)})`
                      }
                      className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between gap-3 transition-all ${
                        !isActive
                          ? 'bg-slate-50/60 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-70'
                          : isCompleted
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                          : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {!isActive && !isCompleted ? (
                          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="text-base shrink-0">{chore.icon || '📌'}</span>
                        <span
                          className={`text-xs font-medium truncate ${
                            isCompleted
                              ? 'line-through text-emerald-700/70 dark:text-emerald-300/70'
                              : ''
                          }`}
                        >
                          {chore.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-xs">
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          {getChorePeriodLabel(chore.period)}
                        </span>
                        {member && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            {member.name}
                          </span>
                        )}
                        <span className="text-amber-500 font-semibold font-mono tabular-nums">
                          +{chore.stars}★
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Open General Tasks Widget */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                <span>Algemene taken ({generalTasks.filter(t => !t.completed).length})</span>
              </span>
              <button
                type="button"
                onClick={onNavigateToTasks}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Open takenlijsten
              </button>
            </div>

            {openGeneralTasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Geen openstaande algemene taken.</p>
            ) : (
              <div className="space-y-1.5">
                {openGeneralTasks.map(task => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onToggleGeneralTask(task.id)}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-300 bg-slate-50/70 dark:bg-slate-800/40 text-left flex items-center justify-between gap-2 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                      {task.listName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
