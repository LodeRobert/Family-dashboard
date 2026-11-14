import React, { useEffect } from 'react';
import { CalendarEvent, CalendarSource, FamilyMember } from '../types';
import { CalendarAssigneeBadge } from './CalendarAssigneeBadge';
import { resolveEventAssignees } from '../utils/calendarHelpers';
import {
  formatLocalDateNL,
  getEventEndDateStr,
  getEventStartDateStr
} from '../utils/dateTime';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  AlignLeft,
  Pencil,
  Lock,
  Sun
} from 'lucide-react';

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  calendar?: CalendarSource;
  familyMembers: FamilyMember[];
  timeFormat24h?: boolean;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
}

function formatCleanDescription(raw: string): string {
  return raw
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  calendar,
  familyMembers,
  timeFormat24h = true,
  onClose,
  onEdit
}) => {
  useEffect(() => {
    if (!event) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [event, onClose]);

  if (!event) return null;

  const calColor = calendar?.color || event.calendarColor || '#6366F1';
  const baseCalName = calendar?.name || event.calendarName || 'Agenda';
  const calName = calendar?.icon ? `${calendar.icon} ${baseCalName}` : baseCalName;
  const assignees = resolveEventAssignees(event, calendar, familyMembers);
  const isReadOnly = Boolean(
    event.isExternal ||
      event.isDailyRule ||
      calendar?.type === 'ical' ||
      calendar?.type === 'homeassistant'
  );
  const sourceLabel = event.isDailyRule
    ? 'Dagelijkse afspraak & automatie'
    : calendar?.type === 'homeassistant'
    ? 'Home Assistant agenda'
    : calendar?.type === 'ical' || event.isExternal
    ? 'iCal-agenda'
    : 'Lokale agenda';

  const startDateStr = getEventStartDateStr(event);
  const endDateStr = getEventEndDateStr(event);
  const isMultiDay = endDateStr > startDateStr;

  const startDateFull = formatLocalDateNL(startDateStr, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const endDateFull = formatLocalDateNL(endDateStr, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !timeFormat24h
    }).format(d);
  };

  const startTimeLabel = formatTime(event.startTime);
  const endTimeLabel = formatTime(event.endTime);
  const cleanedDescription = event.description ? formatCleanDescription(event.description) : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-details-title"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg overflow-hidden"
      >
        {/* Top Calendar Color Accent Strip */}
        <div className="h-2 w-full" style={{ backgroundColor: calColor }} />

        {/* Header: Calendar Name & Source + Close */}
        <div className="flex items-center justify-between gap-3 px-6 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: calColor }}
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
              {calName}
            </span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
              ·
            </span>
            {isReadOnly ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                <Lock className="w-3 h-3" />
                <span>{sourceLabel}</span>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                {sourceLabel}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="min-w-[40px] min-h-[40px] -mr-2 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Full Unwrapped Title & Assignees */}
          <div className="space-y-2.5">
            <h3
              id="event-details-title"
              className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug break-words"
            >
              {event.title}
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              <CalendarAssigneeBadge assignees={assignees} />
            </div>
          </div>

          {/* Structured Event Details */}
          <div className="space-y-3.5 text-sm border-t border-slate-100 dark:border-slate-800 pt-4">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                {event.allDay ? <Sun className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>

              <div className="min-w-0 space-y-1">
                {event.allDay ? (
                  <>
                    <div className="font-semibold text-slate-900 dark:text-white capitalize">
                      {isMultiDay ? `${startDateFull} t/m ${endDateFull}` : startDateFull}
                    </div>
                    <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {isMultiDay ? 'Hele dag (meerdaags)' : 'Hele dag'}
                    </div>
                  </>
                ) : isMultiDay ? (
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 w-11">
                        Start
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white capitalize">
                        {startDateFull}
                      </span>
                      {startTimeLabel && (
                        <span className="font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
                          {startTimeLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 w-11">
                        Einde
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white capitalize">
                        {endDateFull}
                      </span>
                      {endTimeLabel && (
                        <span className="font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
                          {endTimeLabel}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-semibold text-slate-900 dark:text-white capitalize">
                      {startDateFull}
                    </div>
                    {(startTimeLabel || endTimeLabel) && (
                      <div className="text-sm font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
                        {startTimeLabel}
                        {endTimeLabel && endTimeLabel !== startTimeLabel ? ` – ${endTimeLabel}` : ''}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Location */}
            {event.location && event.location.trim() && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 pt-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Locatie
                  </div>
                  <div className="text-sm text-slate-800 dark:text-slate-200 break-words">
                    {event.location}
                  </div>
                </div>
              </div>
            )}

            {/* Description / Notes */}
            {cleanedDescription && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <AlignLeft className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                    Omschrijving / Notities
                  </div>
                  <div className="max-h-56 overflow-y-auto pr-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                    {cleanedDescription}
                  </div>
                </div>
              </div>
            )}

            {!event.location?.trim() && !cleanedDescription && (
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 pt-1">
                <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Geen extra locatie of notities toegevoegd.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {event.isDailyRule ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Automatische dagelijkse regel — aanpassen kan in Instellingen.
            </p>
          ) : isReadOnly ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Gesynchroniseerd ({sourceLabel}) — wijzigen kan in je externe agenda.
            </p>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Lokale gezinsafspraak
            </span>
          )}

          <div className="flex items-center justify-end gap-2 shrink-0">
            {!isReadOnly && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(event)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Bewerken</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Sluiten
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
