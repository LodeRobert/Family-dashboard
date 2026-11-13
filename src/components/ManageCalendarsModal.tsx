import React, { useState } from 'react';
import { CalendarSource } from '../types';
import { GoogleAccountProfile } from '../services/firebaseAuth';
import { ColorPickerField } from './ColorPickerField';
import {
  X,
  Trash2,
  Calendar as CalendarIcon,
  Globe,
  RefreshCw,
  Check,
  AlertCircle,
  LogOut,
  Sparkles,
  Info,
  Link,
  Settings
} from 'lucide-react';

interface ManageCalendarsModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendars: CalendarSource[];
  onAddCalendar: (calendar: CalendarSource) => void;
  onUpdateCalendar: (calendarId: string, patch: Partial<CalendarSource>) => void;
  onDeleteCalendar: (calendarId: string) => void;
  onToggleVisibility: (calendarId: string) => void;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  googleUser: GoogleAccountProfile | null;
  googleToken: string | null;
  availableGoogleCalendars: CalendarSource[];
  onImportGoogleCalendar: (cal: CalendarSource) => void;
  onSyncAll: () => Promise<void>;
  customGoogleClientId?: string;
  onNavigateToSettings: () => void;
}

export const ManageCalendarsModal: React.FC<ManageCalendarsModalProps> = ({
  isOpen,
  onClose,
  calendars,
  onAddCalendar,
  onUpdateCalendar,
  onDeleteCalendar,
  onToggleVisibility,
  onGoogleSignIn,
  onGoogleSignOut,
  googleUser,
  googleToken,
  availableGoogleCalendars,
  onImportGoogleCalendar,
  onSyncAll,
  customGoogleClientId,
  onNavigateToSettings
}) => {
  const [activeTab, setActiveTab] = useState<'quick_google' | 'oauth' | 'all'>('quick_google');
  const [googleIcalUrl, setGoogleIcalUrl] = useState('');
  const [googleCalName, setGoogleCalName] = useState('Mijn Google Agenda');
  const [googleCalColor, setGoogleCalColor] = useState('#4285F4');
  const [isTestingIcal, setIsTestingIcal] = useState(false);
  const [icalError, setIcalError] = useState('');
  const [icalSuccess, setIcalSuccess] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddGoogleIcal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleIcalUrl.trim()) {
      setIcalError('Vul een geldige Google Agenda iCal URL in.');
      return;
    }

    try {
      setIsTestingIcal(true);
      setIcalError('');
      setIcalSuccess('');

      const cleanUrl = googleIcalUrl.trim();
      const testRes = await fetch(
        `/api/ical/fetch?url=${encodeURIComponent(cleanUrl)}&calendarName=${encodeURIComponent(googleCalName.trim())}&calendarColor=${encodeURIComponent(googleCalColor)}`
      );

      if (!testRes.ok) {
        throw new Error('De server kon de iCal URL niet bereiken. Controleer of de link klopt.');
      }

      const data = await testRes.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const newCal: CalendarSource = {
        id: 'gcal-ical-' + Math.random().toString(36).substring(2, 9),
        name: googleCalName.trim() || 'Google Agenda',
        color: googleCalColor,
        type: 'ical',
        visible: true,
        url: cleanUrl,
        description: `Google Agenda feed (${data.count || 0} afspraken gesynchroniseerd)`
      };

      onAddCalendar(newCal);
      setGoogleIcalUrl('');
      setIcalSuccess(`Agenda succesvol gekoppeld! (${data.count || 0} afspraken geladen)`);
    } catch (err: any) {
      setIcalError(err.message || 'Fout bij het ophalen van de agenda.');
    } finally {
      setIsTestingIcal(false);
    }
  };

  const handleLoadSampleHolidays = () => {
    const holidayUrl =
      'https://calendar.google.com/calendar/ical/nl.dutch%23holiday%40group.v.calendar.google.com/public/basic.ics';
    setGoogleCalName('Nederlandse Feestdagen (Google)');
    setGoogleIcalUrl(holidayUrl);
    setGoogleCalColor('#F59E0B');
  };

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setOauthError(null);
      await onGoogleSignIn();
    } catch (err: any) {
      setOauthError(err.message || 'Inloggen met Google mislukt.');
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
                Agenda Koppelingen & Kleuren
              </h3>
              <p className="text-[11px] text-slate-500">
                Koppel Google Agenda's of iCal-feeds en kies kleuren uit het volledige spectrum
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
            {calendars.length} gekoppelde agenda('s) · {calendars.filter(c => c.visible).length} actief
          </span>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1 font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Nu verversen</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('quick_google')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'quick_google'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>iCal Feed Toevoegen</span>
          </button>

          <button
            onClick={() => setActiveTab('oauth')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Inloggen met Google (OAuth)</span>
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
          {/* TAB 1: QUICK GOOGLE ICAL CONNECTOR */}
          {activeTab === 'quick_google' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    Snelle Google Agenda / iCal Koppeling
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Werkt op elk lokaal IP-adres zonder cloud-configuratie. Plak het geheime iCal-adres van je Google Agenda en kies een kleur uit het volledige kleurenspectrum.
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

              <form onSubmit={handleAddGoogleIcal} className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Naam voor deze agenda
                  </label>
                  <input
                    type="text"
                    value={googleCalName}
                    onChange={e => setGoogleCalName(e.target.value)}
                    placeholder="bijv. Google Privé Agenda, Werk, Sportclub"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Geheime iCal URL
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
                    value={googleIcalUrl}
                    onChange={e => setGoogleIcalUrl(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
                    required
                  />
                </div>

                <ColorPickerField
                  label="Kleur uit volledig spectrum"
                  value={googleCalColor}
                  onChange={setGoogleCalColor}
                />

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={isTestingIcal}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    {isTestingIcal ? 'Bezig met ophalen...' : 'Agenda Koppelen'}
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

          {/* TAB 2: GOOGLE OAUTH */}
          {activeTab === 'oauth' && (
            <div className="space-y-4">
              {/* Show whether custom Client ID is configured */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  {customGoogleClientId?.trim() ? (
                    <span>
                      ✓ Gebruikt jouw eigen Google Client ID:{' '}
                      <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">
                        {customGoogleClientId.slice(0, 18)}...
                      </code>
                    </span>
                  ) : (
                    <span>
                      Geen eigen Google Client ID ingesteld. Voor eigen domeinen raden we aan jouw Client ID in te vullen bij Instellingen.
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToSettings();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold hover:bg-slate-100 shrink-0"
                >
                  <Settings className="w-3 h-3" />
                  <span>Instellingen</span>
                </button>
              </div>

              {oauthError && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2 text-amber-900 dark:text-amber-200">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Google login kon niet worden voltooid</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{oauthError}</p>
                  <div className="pt-1 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveTab('quick_google')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold"
                    >
                      Gebruik iCal Koppeling
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToSettings();
                      }}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-[11px] font-semibold"
                    >
                      Eigen Client ID invullen
                    </button>
                  </div>
                </div>
              )}

              {!googleUser || !googleToken ? (
                <div className="p-6 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Inloggen met Google Account (OAuth)
                    </h4>
                    <p className="text-slate-500 max-w-md mx-auto text-[11px]">
                      Maakt rechtstreeks verbinding met Google Calendar zodat je ook vanuit HomeBoard afspraken terug kunt schrijven.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={handleLogin}
                      disabled={isLoggingIn}
                      className="inline-flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-semibold text-slate-700 dark:text-slate-200 text-xs"
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      <span>{isLoggingIn ? 'Bezig met openen...' : 'Inloggen met Google'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
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
                          {googleUser.email} · Actief verbonden
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={onGoogleSignOut}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:text-red-700 rounded-lg font-medium text-xs"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Uitloggen</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-700 dark:text-slate-300">
                      Gevonden Google Agenda's:
                    </h5>
                    {availableGoogleCalendars.map(gcal => {
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
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs"
                            >
                              Toevoegen
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ALL ACTIVE CALENDARS + FULL SPECTRUM COLOR EDITOR */}
          {activeTab === 'all' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Alle gekoppelde agenda's (pas naam of kleur aan):
              </h4>

              <div className="space-y-2.5">
                {calendars.map(cal => (
                  <div
                    key={cal.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <ColorPickerField
                        value={cal.color}
                        onChange={color => onUpdateCalendar(cal.id, { color })}
                        compact
                      />

                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={cal.name}
                          onChange={e => onUpdateCalendar(cal.id, { name: e.target.value })}
                          className="font-semibold text-slate-900 dark:text-white bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none w-full"
                        />
                        <div className="text-[11px] text-slate-500 truncate">
                          {cal.type === 'google_oauth'
                            ? 'Google OAuth'
                            : cal.type === 'ical'
                            ? 'iCal Feed'
                            : 'Lokale agenda'}
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
                ))}
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
