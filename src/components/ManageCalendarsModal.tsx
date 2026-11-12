import React, { useState } from 'react';
import { CalendarSource } from '../types';
import {
  X,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Globe,
  RefreshCw,
  Check,
  AlertCircle,
  ExternalLink,
  LogOut
} from 'lucide-react';
import { User } from 'firebase/auth';

interface ManageCalendarsModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendars: CalendarSource[];
  onAddCalendar: (calendar: CalendarSource) => void;
  onDeleteCalendar: (calendarId: string) => void;
  onToggleVisibility: (calendarId: string) => void;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  googleUser: User | null;
  googleToken: string | null;
  availableGoogleCalendars: CalendarSource[];
  onImportGoogleCalendar: (cal: CalendarSource) => void;
  onSyncAll: () => Promise<void>;
}

export const ManageCalendarsModal: React.FC<ManageCalendarsModalProps> = ({
  isOpen,
  onClose,
  calendars,
  onAddCalendar,
  onDeleteCalendar,
  onToggleVisibility,
  onGoogleSignIn,
  onGoogleSignOut,
  googleUser,
  googleToken,
  availableGoogleCalendars,
  onImportGoogleCalendar,
  onSyncAll
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'ical' | 'local'>('google');
  const [icalName, setIcalName] = useState('');
  const [icalUrl, setIcalUrl] = useState('');
  const [icalColor, setIcalColor] = useState('#10B981');
  const [isTestingIcal, setIsTestingIcal] = useState(false);
  const [icalError, setIcalError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const handleAddIcal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icalName.trim() || !icalUrl.trim()) return;

    try {
      setIsTestingIcal(true);
      setIcalError('');

      // Test feed with backend proxy
      const testRes = await fetch(
        `/api/ical/fetch?url=${encodeURIComponent(icalUrl.trim())}&calendarName=${encodeURIComponent(icalName.trim())}`
      );
      if (!testRes.ok) {
        throw new Error('Kon iCal feed niet verifiëren. Controleer de URL.');
      }
      const data = await testRes.json();
      if (data.error) {
        throw new Error(data.error);
      }

      onAddCalendar({
        id: 'ical-' + Math.random().toString(36).substring(2, 9),
        name: icalName.trim(),
        color: icalColor,
        type: 'ical',
        visible: true,
        url: icalUrl.trim(),
        description: `iCal feed (${data.count || 0} afspraken gevonden)`
      });

      setIcalName('');
      setIcalUrl('');
      alert(`iCal feed succesvol toegevoegd met ${data.count || 0} afspraken!`);
    } catch (err: any) {
      setIcalError(err.message || 'Fout bij toevoegen iCal feed.');
    } finally {
      setIsTestingIcal(false);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await onGoogleSignIn();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Agenda Koppelingen & Beheer
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync All button & Active Calendars Summary */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">
            {calendars.length} gekoppelde agenda('s) · {calendars.filter(c => c.visible).length} zichtbaar
          </span>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Nu synchroniseren</span>
          </button>
        </div>

        {/* Tabs: Google Agenda | iCal Feeds | Huidige Agenda's */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('google')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'google'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Google Agenda (OAuth)
          </button>
          <button
            onClick={() => setActiveTab('ical')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'ical'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            iCal / ICS Feed Toevoegen
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'local'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Alle Actieve Agenda's ({calendars.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {/* TAB: GOOGLE OAUTH */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              {!googleUser || !googleToken ? (
                <div className="p-6 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Koppel je Google Account
                    </h4>
                    <p className="text-slate-500 max-w-md mx-auto">
                      Log in om direct je persoonlijke en gezamenlijke Google Agenda's in te laden en afspraken tweerichtingsverkeer te synchroniseren.
                    </p>
                  </div>

                  {/* Material Design Google Sign In Button according to workspace-integration guidelines */}
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={handleLogin}
                      disabled={isLoggingIn}
                      className="inline-flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-semibold text-slate-700 dark:text-slate-200"
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      <span>{isLoggingIn ? 'Bezig met inloggen...' : 'Inloggen met Google'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Connected Profile Bar */}
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                        {googleUser.displayName?.charAt(0) || 'G'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {googleUser.displayName || 'Google Gebruiker'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {googleUser.email} · Verbonden met Google Calendar
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={onGoogleSignOut}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Uitloggen</span>
                    </button>
                  </div>

                  {/* List of Available Google Calendars */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-700 dark:text-slate-300">
                      Gevonden Google Agenda's in jouw account:
                    </h5>
                    {availableGoogleCalendars.length === 0 ? (
                      <p className="text-slate-400">
                        Geen extra Google agenda's gevonden of bezig met inladen...
                      </p>
                    ) : (
                      availableGoogleCalendars.map(gcal => {
                        const isAlreadyImported = calendars.some(c => c.id === gcal.id);

                        return (
                          <div
                            key={gcal.id}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: gcal.color }}
                              />
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {gcal.name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {gcal.description || 'Google Agenda'}
                                </div>
                              </div>
                            </div>

                            {isAlreadyImported ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                <Check className="w-3.5 h-3.5" />
                                <span>Gekoppeld</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => onImportGoogleCalendar(gcal)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors text-xs"
                              >
                                Toevoegen
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: ICAL FEED */}
          {activeTab === 'ical' && (
            <div className="space-y-4">
              <form onSubmit={handleAddIcal} className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  iCal / ICS Feed Toevoegen (Google, Apple, School, Sport)
                </h4>
                <p className="text-slate-500">
                  Voeg een openbaar of geheim iCal-adres toe. De afspraken worden automatisch via onze server gecached en getoond.
                </p>

                {icalError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{icalError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold mb-1">Naam van de agenda</label>
                  <input
                    type="text"
                    value={icalName}
                    onChange={e => setIcalName(e.target.value)}
                    placeholder="bijv. Google Privé Lode, Schoolrooster, Voetbalclub"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">iCal / ICS URL</label>
                  <input
                    type="url"
                    value={icalUrl}
                    onChange={e => setIcalUrl(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Kleurcode</label>
                  <div className="flex items-center gap-2">
                    {['#3B82F6', '#10B981', '#EC4899', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444'].map(color => (
                      <button
                        type="button"
                        key={color}
                        onClick={() => setIcalColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          icalColor === color ? 'scale-110 border-slate-900 dark:border-white shadow-xs' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isTestingIcal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    {isTestingIcal ? 'Bezig met ophalen en testen...' : 'iCal Agenda Toevoegen'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: LOCAL & ALL ACTIVE CALENDARS */}
          {activeTab === 'local' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Actieve Agenda's in HomeBoard:
              </h4>

              <div className="space-y-2">
                {calendars.map(cal => (
                  <div
                    key={cal.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleVisibility(cal.id)}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title={cal.visible ? 'Verbergen in kalender' : 'Tonen in kalender'}
                      >
                        <span
                          className={`w-4 h-4 rounded-full block border transition-all ${
                            cal.visible ? 'ring-2 ring-indigo-500' : 'opacity-30'
                          }`}
                          style={{ backgroundColor: cal.color }}
                        />
                      </button>

                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{cal.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {cal.type === 'google_oauth' ? '(Google OAuth)' : cal.type === 'ical' ? '(iCal Feed)' : '(Lokaal)'}
                          </span>
                        </div>
                        {cal.description && (
                          <div className="text-[11px] text-slate-500 truncate max-w-sm">
                            {cal.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
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
