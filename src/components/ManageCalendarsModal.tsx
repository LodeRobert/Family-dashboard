import React, { useState } from 'react';
import {
  CalendarAssignmentMode,
  CalendarMultiDayMode,
  CalendarSource,
  FamilyMember
} from '../types';
import { ColorPickerField } from './ColorPickerField';
import { CalendarAssignmentControls } from './CalendarAssignmentControls';
import { CalendarAssigneeBadge } from './CalendarAssigneeBadge';
import { getCalendarAssignees } from '../utils/calendarHelpers';
import {
  X,
  Trash2,
  Calendar as CalendarIcon,
  RefreshCw,
  Check,
  AlertCircle,
  Sparkles,
  Info,
  Link,
  Plus
} from 'lucide-react';

interface ManageCalendarsModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendars: CalendarSource[];
  familyMembers: FamilyMember[];
  onAddCalendar: (calendar: CalendarSource) => void;
  onUpdateCalendar: (calendarId: string, patch: Partial<CalendarSource>) => void;
  onDeleteCalendar: (calendarId: string) => void;
  onToggleVisibility: (calendarId: string) => void;
  onSyncAll: () => Promise<void>;
}

export const ManageCalendarsModal: React.FC<ManageCalendarsModalProps> = ({
  isOpen,
  onClose,
  calendars,
  familyMembers,
  onAddCalendar,
  onUpdateCalendar,
  onDeleteCalendar,
  onToggleVisibility,
  onSyncAll
}) => {
  const [activeTab, setActiveTab] = useState<'ical' | 'local' | 'all'>('ical');
  const [icalUrl, setIcalUrl] = useState('');
  const [icalName, setIcalName] = useState('Mijn iCal Agenda');
  const [icalColor, setIcalColor] = useState('#4285F4');
  const [icalAssignmentMode, setIcalAssignmentMode] = useState<CalendarAssignmentMode>('family');
  const [icalMemberIds, setIcalMemberIds] = useState<string[]>([]);
  const [icalMultiDayMode, setIcalMultiDayMode] = useState<CalendarMultiDayMode>('smart_cutoff');
  const [isTestingIcal, setIsTestingIcal] = useState(false);
  const [icalError, setIcalError] = useState('');
  const [icalSuccess, setIcalSuccess] = useState('');

  // Local calendar form
  const [localName, setLocalName] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localColor, setLocalColor] = useState('#8B5CF6');
  const [localAssignmentMode, setLocalAssignmentMode] = useState<CalendarAssignmentMode>('family');
  const [localMemberIds, setLocalMemberIds] = useState<string[]>([]);
  const [localMultiDayMode, setLocalMultiDayMode] = useState<CalendarMultiDayMode>('smart_cutoff');
  const [localSuccess, setLocalSuccess] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handleAddIcal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icalUrl.trim()) {
      setIcalError('Vul een geldige iCal URL in.');
      return;
    }

    try {
      setIsTestingIcal(true);
      setIcalError('');
      setIcalSuccess('');

      const cleanUrl = icalUrl.trim();
      const testRes = await fetch(
        `/api/ical/fetch?url=${encodeURIComponent(cleanUrl)}&calendarName=${encodeURIComponent(icalName.trim())}&calendarColor=${encodeURIComponent(icalColor)}`
      );

      if (!testRes.ok) {
        throw new Error('De server kon de iCal URL niet bereiken. Controleer of de link klopt.');
      }

      const data = await testRes.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const newCal: CalendarSource = {
        id: 'ical-' + Math.random().toString(36).substring(2, 9),
        name: icalName.trim() || 'iCal Agenda',
        color: icalColor,
        type: 'ical',
        visible: true,
        url: cleanUrl,
        description: `iCal feed (${data.count || 0} afspraken gesynchroniseerd)`,
        assignmentMode: icalAssignmentMode,
        memberIds: icalAssignmentMode === 'members' ? icalMemberIds : [],
        multiDayMode: icalMultiDayMode
      };

      onAddCalendar(newCal);
      setIcalUrl('');
      setIcalAssignmentMode('family');
      setIcalMemberIds([]);
      setIcalMultiDayMode('smart_cutoff');
      setIcalSuccess(`Agenda succesvol gekoppeld! (${data.count || 0} afspraken geladen)`);
    } catch (err: any) {
      setIcalError(err.message || 'Fout bij het ophalen van de agenda.');
    } finally {
      setIsTestingIcal(false);
    }
  };

  const handleCreateLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName.trim()) return;

    const newCal: CalendarSource = {
      id: 'cal-' + Math.random().toString(36).substring(2, 9),
      name: localName.trim(),
      color: localColor,
      type: 'local',
      visible: true,
      description: localDescription.trim() || 'Lokale gezinsagenda',
      assignmentMode: localAssignmentMode,
      memberIds: localAssignmentMode === 'members' ? localMemberIds : [],
      multiDayMode: localMultiDayMode
    };

    onAddCalendar(newCal);
    setLocalName('');
    setLocalDescription('');
    setLocalAssignmentMode('family');
    setLocalMemberIds([]);
    setLocalMultiDayMode('smart_cutoff');
    setLocalSuccess(`Lokale agenda "${newCal.name}" toegevoegd!`);
  };

  const handleLoadSampleHolidays = () => {
    const holidayUrl =
      'https://calendar.google.com/calendar/ical/nl.dutch%23holiday%40group.v.calendar.google.com/public/basic.ics';
    setIcalName('Nederlandse Feestdagen (Google)');
    setIcalUrl(holidayUrl);
    setIcalColor('#F59E0B');
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await onSyncAll();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Agenda's & iCal Koppelingen
              </h3>
              <p className="text-[11px] text-slate-500">
                Koppel agenda's via iCal (Google, Apple, Outlook) of maak lokale gezinsagenda's aan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync All button & Active Calendars Summary */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-600 dark:text-slate-400 font-medium">
            {calendars.length} agenda('s) · {calendars.filter(c => c.visible).length} zichtbaar
          </span>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1 font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>iCal Nu Verversen</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('ical')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ical'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>iCal Feed Koppelen</span>
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'local'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lokale Agenda Maken</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Kleuren & Overzicht ({calendars.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* TAB 1: ICAL CONNECTOR */}
          {activeTab === 'ical' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    Google Agenda / Apple / Outlook koppelen via iCal
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Werkt betrouwbaar op elk thuisnetwerk en IP-adres. Plak het geheime iCal-adres (.ics) van je agenda en kies een kleur uit het volledige kleurenspectrum.
                  </p>
                </div>
              </div>

              {icalSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{icalSuccess}</span>
                </div>
              )}

              {icalError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{icalError}</span>
                </div>
              )}

              <form onSubmit={handleAddIcal} className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Naam voor deze agenda
                  </label>
                  <input
                    type="text"
                    value={icalName}
                    onChange={e => setIcalName(e.target.value)}
                    placeholder="bijv. Google Privé Agenda, Werk, Sportclub"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Geheime iCal URL (.ics)
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadSampleHolidays}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      Probeer test-agenda (NL Feestdagen)
                    </button>
                  </div>
                  <input
                    type="url"
                    value={icalUrl}
                    onChange={e => setIcalUrl(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
                    required
                  />
                </div>

                <ColorPickerField
                  label="Kleur uit volledig spectrum"
                  value={icalColor}
                  onChange={setIcalColor}
                />

                <CalendarAssignmentControls
                  familyMembers={familyMembers}
                  assignmentMode={icalAssignmentMode}
                  memberIds={icalMemberIds}
                  multiDayMode={icalMultiDayMode}
                  onChangeAssignment={(mode, ids) => {
                    setIcalAssignmentMode(mode);
                    setIcalMemberIds(ids);
                  }}
                  onChangeMultiDayMode={setIcalMultiDayMode}
                />

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={isTestingIcal}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    {isTestingIcal ? 'Bezig met ophalen...' : 'iCal Agenda Koppelen'}
                  </button>
                </div>
              </form>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Geheime iCal-link vinden in Google Agenda:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Ga op je computer naar <strong>calendar.google.com</strong>.</li>
                  <li>Klik links naast je agenda op de <strong>3 puntjes</strong> → <strong>Instellingen en delen</strong>.</li>
                  <li>Scroll naar <strong>Agenda integreren</strong> en kopieer het <strong>Geheim adres in iCal-indeling</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: LOCAL CALENDAR */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              {localSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{localSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateLocal} className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Nieuwe lokale / gezinsagenda aanmaken
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Naam van de agenda *
                  </label>
                  <input
                    type="text"
                    value={localName}
                    onChange={e => setLocalName(e.target.value)}
                    placeholder="bijv. Werk, Sport & Hobby, Vakanties"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Omschrijving (optioneel)
                  </label>
                  <input
                    type="text"
                    value={localDescription}
                    onChange={e => setLocalDescription(e.target.value)}
                    placeholder="bijv. Afspraken en uitjes"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <ColorPickerField
                  label="Kleur uit volledig spectrum"
                  value={localColor}
                  onChange={setLocalColor}
                />

                <CalendarAssignmentControls
                  familyMembers={familyMembers}
                  assignmentMode={localAssignmentMode}
                  memberIds={localMemberIds}
                  multiDayMode={localMultiDayMode}
                  onChangeAssignment={(mode, ids) => {
                    setLocalAssignmentMode(mode);
                    setLocalMemberIds(ids);
                  }}
                  onChangeMultiDayMode={setLocalMultiDayMode}
                />

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    Agenda aanmaken
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: ALL ACTIVE CALENDARS + FULL SPECTRUM COLOR & PERSON EDITOR */}
          {activeTab === 'all' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Alle gekoppelde agenda's (pas naam, kleur, personen en nachtshift-weergave aan):
              </h4>

              <div className="space-y-3">
                {calendars.map(cal => {
                  const assignees = getCalendarAssignees(cal, familyMembers);
                  return (
                    <div
                      key={cal.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <ColorPickerField
                            value={cal.color}
                            onChange={color => onUpdateCalendar(cal.id, { color })}
                            compact
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="text"
                                value={cal.name}
                                onChange={e => onUpdateCalendar(cal.id, { name: e.target.value })}
                                className="font-semibold text-slate-900 dark:text-white bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none min-w-[140px] flex-1"
                              />
                              <CalendarAssigneeBadge assignees={assignees} />
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {cal.type === 'ical' ? 'iCal Feed' : 'Lokale agenda'}
                              {cal.description ? ` · ${cal.description}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onToggleVisibility(cal.id)}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            {cal.visible ? 'Zichtbaar' : 'Verborgen'}
                          </button>

                          {calendars.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onDeleteCalendar(cal.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="Agenda ontkoppelen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
                        <CalendarAssignmentControls
                          compact
                          familyMembers={familyMembers}
                          assignmentMode={
                            cal.assignmentMode ||
                            (cal.memberIds && cal.memberIds.length > 0 ? 'members' : 'family')
                          }
                          memberIds={cal.memberIds || []}
                          multiDayMode={cal.multiDayMode || 'smart_cutoff'}
                          onChangeAssignment={(mode, ids) =>
                            onUpdateCalendar(cal.id, { assignmentMode: mode, memberIds: ids })
                          }
                          onChangeMultiDayMode={mode =>
                            onUpdateCalendar(cal.id, { multiDayMode: mode })
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};
