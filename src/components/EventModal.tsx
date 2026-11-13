import React, { useState, useEffect } from 'react';
import { CalendarEvent, CalendarSource, FamilyMember } from '../types';
import { X, Calendar, Clock, MapPin, User, Trash2, AlertCircle } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: (eventId: string, calendarId: string) => Promise<void>;
  editingEvent?: CalendarEvent | null;
  calendars: CalendarSource[];
  familyMembers: FamilyMember[];
  initialDate?: string;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingEvent,
  calendars,
  familyMembers,
  initialDate
}) => {
  const [title, setTitle] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('11:00');
  const [allDay, setAllDay] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setShowDeleteConfirm(false);
    setErrorMessage('');

    if (editingEvent) {
      setTitle(editingEvent.title);
      setCalendarId(editingEvent.calendarId);

      const start = new Date(editingEvent.startTime);
      const end = new Date(editingEvent.endTime);

      setStartDate(editingEvent.startTime.split('T')[0]);
      setEndDate(editingEvent.endTime.split('T')[0]);
      setStartTime(start.toTimeString().substring(0, 5));
      setEndTime(end.toTimeString().substring(0, 5));
      setAllDay(!!editingEvent.allDay);
      setAssignedTo(editingEvent.assignedTo || '');
      setLocation(editingEvent.location || '');
      setDescription(editingEvent.description || '');
    } else {
      const defaultDate = initialDate || new Date().toISOString().split('T')[0];
      setTitle('');
      setCalendarId(calendars[0]?.id || 'cal-family');
      setStartDate(defaultDate);
      setEndDate(defaultDate);
      setStartTime('10:00');
      setEndTime('11:00');
      setAllDay(false);
      setAssignedTo('');
      setLocation('');
      setDescription('');
    }
  }, [isOpen, editingEvent, initialDate, calendars]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Geef een titel op voor de afspraak.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      let startIso: string;
      let endIso: string;

      if (allDay) {
        startIso = `${startDate}T00:00:00.000Z`;
        endIso = `${endDate || startDate}T23:59:59.000Z`;
      } else {
        startIso = new Date(`${startDate}T${startTime}:00`).toISOString();
        endIso = new Date(`${endDate || startDate}T${endTime}:00`).toISOString();
      }

      await onSave({
        id: editingEvent ? editingEvent.id : undefined,
        title: title.trim(),
        calendarId,
        startTime: startIso,
        endTime: endIso,
        allDay,
        assignedTo: assignedTo || undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined
      });

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Kon afspraak niet opslaan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent || !onDelete) return;
    try {
      setIsSaving(true);
      await onDelete(editingEvent.id, editingEvent.calendarId);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Kon afspraak niet verwijderen.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCalendar = calendars.find(c => c.id === calendarId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {editingEvent ? 'Afspraak bewerken' : 'Nieuwe afspraak'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Delete Confirmation Step (Mandatory for Destructive Workspace/Calendar Actions) */}
        {showDeleteConfirm ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2 text-xs text-amber-900 dark:text-amber-200">
              <div className="font-bold text-sm">Afspraak definitief verwijderen?</div>
              <p>
                Weet je zeker dat je "{editingEvent?.title}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors"
              >
                {isSaving ? 'Bezig met verwijderen...' : 'Definitief verwijderen'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {/* Title */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Titel van afspraak *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="bijv. Tandartscontrole, Voetbaltraining, Verjaardag"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            {/* Calendar Selection & Assigned Member */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Doelagenda
                </label>
                <select
                  value={calendarId}
                  onChange={e => setCalendarId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {calendars
                    .filter(cal => cal.type === 'local' || cal.id === calendarId)
                    .map(cal => (
                      <option key={cal.id} value={cal.id}>
                        {cal.name} {cal.type === 'ical' ? '(Alleen-lezen iCal)' : ''}
                      </option>
                    ))}
                </select>
                {selectedCalendar?.type === 'ical' && (
                  <span className="text-[10px] text-amber-500 mt-1 block">
                    iCal-feeds worden gesynchroniseerd vanuit je externe agenda.
                  </span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gezinslid (optioneel)
                </label>
                <select
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Iedereen / Geen specifiek lid</option>
                  {familyMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.avatar} {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={allDay}
                onChange={e => setAllDay(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              >
              </input>
              <label htmlFor="allDay" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Hele dag
              </label>
            </div>

            {/* Date & Time Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Startdatum
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              {!allDay && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Starttijd
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              )}
            </div>

            {!allDay && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Einddatum
                  </label>
                  <input
                    type="date"
                    value={endDate || startDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Eindtijd
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Locatie (optioneel)
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="bijv. Sportpark De Toekomst, School, Thuis"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Notes / Description */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notities / Omschrijving (optioneel)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Bijzonderheden, wat mee te nemen, etc."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              {editingEvent && onDelete ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Verwijderen</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
                >
                  {isSaving ? 'Opslaan...' : editingEvent ? 'Wijzigingen opslaan' : 'Afspraak toevoegen'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
