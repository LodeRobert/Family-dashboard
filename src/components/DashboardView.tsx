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
import { CalendarAssigneeBadge } from './CalendarAssigneeBadge';
import {
  getLocalDateStr,
  isChoreActiveAtTime,
  getChorePeriodLabel,
  getChoreEffectiveTimeRange,
  hasCustomChoreHours,
  isChoreCompletedOnDate,
  getEventStartDateStr,
  formatLocalDateNL
} from '../utils/dateTime';
import {
  formatEventTimeDisplay,
  resolveEventAssignees,
  shouldEventShowOnDateList
} from '../utils/calendarHelpers';
import { getClothingAdvice } from '../utils/weatherClothing';
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
  Shirt,
  Droplets,
  Wind,
  SlidersHorizontal,
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
  onSelectEvent?: (event: CalendarEvent) => void;
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
  onSelectEvent,
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
    .filter(evt =>
      shouldEventShowOnDateList(evt, calendarMap.get(evt.calendarId), localToday)
    )
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
    const isCompleted = isChoreCompletedOnDate(choreCompletionsByDate, todayStr, chore.id);
    const isActive = isChoreActiveAtTime(chore, currentTime);
    if (!isCompleted && !isActive) return;

    if (!isCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
    onToggleChore(chore.id, todayStr);
  };

  // Show ONLY chores active right now (current dagdeel / custom hours) + whole-day chores.
  // Chores from other periods are only shown & doable on the Takenbord view.
  const activeChores = chores.filter(c => isChoreActiveAtTime(c, currentTime));
  const inactiveChoresCount = Math.max(0, chores.length - activeChores.length);

  const openGeneralTasks = generalTasks.filter(t => !t.completed).slice(0, 4);
  const clothingAdvice = getClothingAdvice(settings);
  const showClothingCard = settings.showClothingAdvice !== false;

  const renderWeatherIcon = (codeOverride?: number) => {
    const code = codeOverride ?? settings.weatherCode ?? 0;
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
                <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums flex items-baseline gap-2">
                  <span>{settings.weatherTemp ?? 18}°C</span>
                  {settings.weatherTempMin != null && settings.weatherTempMax != null && (
                    <span className="text-xs font-normal text-slate-300">
                      ({settings.weatherTempMin}° / {settings.weatherTempMax}°)
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-300 group-hover:underline">
                  {settings.cityName || 'Amsterdam'} · {settings.weatherCondition || 'Helder'}
                  {settings.weatherPrecipitationProb != null && settings.weatherPrecipitationProb > 0
                    ? ` · ☔ ${settings.weatherPrecipitationProb}%`
                    : ''}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Today's Weather Forecast & Kids' Clothing Advice */}
      {showClothingCard && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Today's weather forecast summary */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/70 dark:border-sky-800/60 flex items-center justify-center shrink-0">
              {renderWeatherIcon(settings.weatherDailyCode ?? settings.weatherCode)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                  Weer vandaag · {settings.cityName || 'Amsterdam'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({settings.weatherDailyCondition || settings.weatherCondition || 'Helder'})
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-700 dark:text-slate-300 flex-wrap font-mono tabular-nums">
                <span className="font-bold text-slate-900 dark:text-white">
                  {settings.weatherTempMin != null && settings.weatherTempMax != null
                    ? `${settings.weatherTempMin}°C – ${settings.weatherTempMax}°C`
                    : `Nu ${settings.weatherTemp ?? 18}°C`}
                </span>
                {settings.weatherPrecipitationProb != null && (
                  <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400">
                    <Droplets className="w-3.5 h-3.5" />
                    {settings.weatherPrecipitationProb}% regenkans
                  </span>
                )}
                {settings.weatherWindMax != null && settings.weatherWindMax > 0 && (
                  <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Wind className="w-3.5 h-3.5" />
                    {settings.weatherWindMax} km/u
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="hidden lg:block h-10 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

          {/* Right: Kids' Clothing Advice */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Shirt className="w-4 h-4 text-amber-500" />
                  Kleren kindjes vandaag:
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                  {clothingAdvice.headline}
                </span>
              </div>
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0 transition-colors"
                title="Kledingregels en eigen notitie aanpassen in Instellingen"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Aanpassen</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {clothingAdvice.items.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] font-medium text-slate-800 dark:text-slate-200"
                >
                  {item}
                </span>
              ))}
            </div>

            {(clothingAdvice.extras.length > 0 || clothingAdvice.customNote) && (
              <div className="flex flex-col gap-1 text-[11px]">
                {clothingAdvice.extras.map((ext, i) => (
                  <div key={i} className="text-sky-700 dark:text-sky-300 font-medium">
                    {ext}
                  </div>
                ))}
                {clothingAdvice.customNote && (
                  <div className="text-indigo-700 dark:text-indigo-300 font-semibold">
                    📝 {clothingAdvice.customNote}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
                const assignees = resolveEventAssignees(evt, calSource, familyMembers);
                const timeFormatted = formatEventTimeDisplay(
                  evt,
                  localToday,
                  settings.timeFormat24h
                );

                return (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => onSelectEvent?.(evt)}
                    className="w-full text-left p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: calColor }}
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-semibold text-slate-900 dark:text-white text-sm">
                            {evt.title}
                          </span>
                          <CalendarAssigneeBadge assignees={assignees} compact />
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
                        {timeFormatted}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        {calSource?.icon ? `${calSource.icon} ` : ''}
                        {calName}
                      </div>
                    </div>
                  </button>
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
                  const assignees = resolveEventAssignees(evt, calSource, familyMembers);
                  const eventDate = formatLocalDateNL(getEventStartDateStr(evt), {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  });

                  return (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => onSelectEvent?.(evt)}
                      className="w-full text-left p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-xs flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: calColor }}
                        />
                        <CalendarAssigneeBadge assignees={assignees} compact showText={false} />
                        {calSource?.icon && (
                          <span className="text-xs shrink-0" title={calSource.name}>
                            {calSource.icon}
                          </span>
                        )}
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {evt.title}
                        </span>
                      </div>
                      <span className="text-slate-500 font-mono shrink-0 capitalize">
                        {eventDate}
                        {evt.allDay ? ' · Hele dag' : ''}
                      </span>
                    </button>
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

          {/* Quick routine check list (strictly active dagdeel & hele dag only) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 flex-wrap">
              <span className="font-semibold uppercase tracking-wider">
                Nu te doen ({greetingPeriod} & hele dag)
              </span>
              {inactiveChoresCount > 0 && (
                <button
                  type="button"
                  onClick={onNavigateToChores}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  +{inactiveChoresCount} taken voor ander dagdeel →
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
              {activeChores.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4 space-y-1.5">
                  <p>Geen taken gepland voor dit dagdeel.</p>
                  {chores.length > 0 && (
                    <button
                      type="button"
                      onClick={onNavigateToChores}
                      className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                    >
                      Bekijk alle taken op het Takenbord
                    </button>
                  )}
                </div>
              ) : (
                activeChores.map(chore => {
                  const member = familyMembers.find(m => m.id === chore.memberId);
                  const isCompleted = isChoreCompletedOnDate(
                    choreCompletionsByDate,
                    todayStr,
                    chore.id
                  );
                  const effectiveRange = getChoreEffectiveTimeRange(chore);
                  const customHours = hasCustomChoreHours(chore);

                  return (
                    <button
                      key={chore.id}
                      onClick={() => handleChoreClick(chore)}
                      title={
                        isCompleted
                          ? 'Tik om taak weer uit te vinken (ontvinken)'
                          : 'Tik om te voltooien'
                      }
                      className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isCompleted
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200 hover:border-emerald-400'
                          : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {isCompleted ? (
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
                        <span className="text-[10px] text-slate-400 hidden sm:inline font-mono tabular-nums">
                          {customHours ? effectiveRange : getChorePeriodLabel(chore.period)}
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
