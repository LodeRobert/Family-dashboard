import React, { useState } from 'react';
import {
  AppSettings,
  AppState,
  CalendarSource,
  FamilyMember,
  WeatherLocationResult
} from '../types';
import { MemberAvatar } from './MemberAvatar';
import { ColorPickerField } from './ColorPickerField';
import {
  searchWeatherLocations,
  fetchCurrentWeather,
  uploadMemberAvatar
} from '../services/storage';
import {
  UserPlus,
  Trash2,
  Camera,
  MapPin,
  Search,
  RefreshCw,
  Calendar,
  Plus,
  Download,
  Upload,
  Check,
  Sparkles,
  Globe,
  Clock,
  Sliders,
  X
} from 'lucide-react';

interface SettingsViewProps {
  appState: AppState;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onUpdateFamilyMembers: (members: FamilyMember[]) => void;
  onUpdateCalendars: (calendars: CalendarSource[]) => void;
  onOpenManageCalendars: () => void;
  onRestoreState: (state: AppState) => Promise<void>;
}

const EMOJI_CHOICES = ['👨', '👩', '👦', '👧', '🧑', '👴', '👵', '🐶', '🐱', '⭐', '⚽', '🎨'];

export const SettingsView: React.FC<SettingsViewProps> = ({
  appState,
  onUpdateSettings,
  onUpdateFamilyMembers,
  onUpdateCalendars,
  onOpenManageCalendars,
  onRestoreState
}) => {
  const { settings, familyMembers, calendars } = appState;

  // Weather search state
  const [cityQuery, setCityQuery] = useState(settings.cityName || '');
  const [cityResults, setCityResults] = useState<WeatherLocationResult[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [isRefreshingWeather, setIsRefreshingWeather] = useState(false);
  const [weatherFeedback, setWeatherFeedback] = useState('');

  // New family member form
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'parent' | 'child'>('child');
  const [newMemberColor, setNewMemberColor] = useState('#10B981');
  const [newMemberEmoji, setNewMemberEmoji] = useState('🧑');
  const [newMemberPhotoFile, setNewMemberPhotoFile] = useState<File | null>(null);
  const [newMemberPhotoPreview, setNewMemberPhotoPreview] = useState<string | null>(null);
  const [uploadingMemberId, setUploadingMemberId] = useState<string | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState('');
  const [confirmDeleteMemberId, setConfirmDeleteMemberId] = useState<string | null>(null);

  // New local calendar form
  const [isAddingCalendar, setIsAddingCalendar] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [newCalColor, setNewCalColor] = useState('#8B5CF6');
  const [newCalDescription, setNewCalDescription] = useState('');

  // Live preview of greeting
  const previewGreetingText =
    settings.showFamilyNameInGreeting && settings.familyGreetingName.trim()
      ? `Goedemiddag, ${settings.familyGreetingName.trim()}! 👋`
      : 'Goedemiddag! 👋';

  // --- Weather handlers ---
  const handleSearchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityQuery.trim()) return;
    try {
      setIsSearchingCity(true);
      setWeatherFeedback('');
      const results = await searchWeatherLocations(cityQuery);
      setCityResults(results);
      if (results.length === 0) {
        setWeatherFeedback('Geen plaats gevonden. Probeer een andere naam.');
      }
    } catch {
      setWeatherFeedback('Kon plaatsen niet ophalen. Controleer je internetverbinding.');
    } finally {
      setIsSearchingCity(false);
    }
  };

  const handleSelectCity = async (loc: WeatherLocationResult) => {
    try {
      setIsRefreshingWeather(true);
      const weather = await fetchCurrentWeather(loc.latitude, loc.longitude);
      onUpdateSettings({
        cityName: loc.name,
        weatherLat: loc.latitude,
        weatherLon: loc.longitude,
        weatherTemp: weather.temp,
        weatherCondition: weather.condition,
        weatherCode: weather.weatherCode
      });
      setCityQuery(loc.name);
      setCityResults([]);
      setWeatherFeedback(`Weer bijgewerkt voor ${loc.name}: ${weather.temp}°C (${weather.condition})`);
    } catch {
      onUpdateSettings({
        cityName: loc.name,
        weatherLat: loc.latitude,
        weatherLon: loc.longitude
      });
      setCityResults([]);
      setWeatherFeedback('Plaats opgeslagen, maar actueel weer kon nu niet opgehaald worden.');
    } finally {
      setIsRefreshingWeather(false);
    }
  };

  const handleRefreshWeather = async () => {
    if (settings.weatherLat == null || settings.weatherLon == null) return;
    try {
      setIsRefreshingWeather(true);
      const weather = await fetchCurrentWeather(settings.weatherLat, settings.weatherLon);
      onUpdateSettings({
        weatherTemp: weather.temp,
        weatherCondition: weather.condition,
        weatherCode: weather.weatherCode
      });
      setWeatherFeedback(`Weer vernieuwd: ${weather.temp}°C (${weather.condition})`);
    } catch {
      setWeatherFeedback('Kon actueel weer niet verversen.');
    } finally {
      setIsRefreshingWeather(false);
    }
  };

  // --- Family Member handlers ---
  const handleMemberPhotoUpload = async (memberId: string, file: File) => {
    try {
      setUploadingMemberId(memberId);
      setPhotoUploadError('');
      const photoUrl = await uploadMemberAvatar(memberId, file);
      onUpdateFamilyMembers(
        familyMembers.map(m => (m.id === memberId ? { ...m, photoUrl } : m))
      );
    } catch (err: any) {
      setPhotoUploadError(err.message || 'Kon foto niet uploaden.');
    } finally {
      setUploadingMemberId(null);
    }
  };

  const handleRemoveMemberPhoto = (memberId: string) => {
    onUpdateFamilyMembers(
      familyMembers.map(m => (m.id === memberId ? { ...m, photoUrl: undefined } : m))
    );
  };

  const handleUpdateMemberField = (memberId: string, patch: Partial<FamilyMember>) => {
    onUpdateFamilyMembers(
      familyMembers.map(m => (m.id === memberId ? { ...m, ...patch } : m))
    );
  };

  const handleDeleteMember = (memberId: string) => {
    if (familyMembers.length <= 1) return;
    onUpdateFamilyMembers(familyMembers.filter(m => m.id !== memberId));
    setConfirmDeleteMemberId(null);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const id = 'fam-' + Math.random().toString(36).substring(2, 9);
    let photoUrl: string | undefined;

    if (newMemberPhotoFile) {
      try {
        photoUrl = await uploadMemberAvatar(id, newMemberPhotoFile);
      } catch {
        // ignore if upload fails
      }
    }

    const newMember: FamilyMember = {
      id,
      name: newMemberName.trim(),
      role: newMemberRole,
      color: newMemberColor,
      avatar: newMemberEmoji,
      photoUrl,
      stars: 0
    };

    onUpdateFamilyMembers([...familyMembers, newMember]);
    setNewMemberName('');
    setNewMemberPhotoFile(null);
    setNewMemberPhotoPreview(null);
    setIsAddingMember(false);
  };

  // --- Calendar handlers ---
  const handleUpdateCalendarField = (calId: string, patch: Partial<CalendarSource>) => {
    onUpdateCalendars(
      calendars.map(c => (c.id === calId ? { ...c, ...patch } : c))
    );
  };

  const handleCreateLocalCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalName.trim()) return;

    const newCal: CalendarSource = {
      id: 'cal-' + Math.random().toString(36).substring(2, 9),
      name: newCalName.trim(),
      color: newCalColor,
      type: 'local',
      visible: true,
      description: newCalDescription.trim() || 'Lokale gezinsagenda'
    };

    onUpdateCalendars([...calendars, newCal]);
    setNewCalName('');
    setNewCalDescription('');
    setIsAddingCalendar(false);
  };

  const handleDeleteCalendar = (calId: string) => {
    if (calendars.length <= 1) return;
    onUpdateCalendars(calendars.filter(c => c.id !== calId));
  };

  // --- Backup / Restore ---
  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(appState, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `homeboard-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.calendars && parsed.chores && parsed.familyMembers) {
          await onRestoreState(parsed);
        }
      } catch {
        // invalid JSON
      }
    };
    reader.readAsText(file);
  };

  const currentBrowserOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Instellingen
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Pas jouw dashboard, begroeting, woonplaats, gezinsleden en agenda's aan.
          </p>
        </div>
      </div>

      {/* SECTION 1: Begroeting & Dashboardnaam */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Begroeting & Dashboardnaam
            </h2>
            <p className="text-xs text-slate-500">
              Bepaal wat er bovenaan het startscherm wordt getoond.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div className="space-y-4">
            {/* Toggle showFamilyNameInGreeting */}
            <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white text-sm">
                  Familienaam tonen in begroeting
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Zet uit om alleen "Goedemorgen!" zonder naam weer te geven.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showFamilyNameInGreeting}
                onChange={e => onUpdateSettings({ showFamilyNameInGreeting: e.target.checked })}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
              />
            </label>

            {settings.showFamilyNameInGreeting && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Naam in begroeting (bijv. Familie De Vries, Huize Bakker, Team Thuis)
                </label>
                <input
                  type="text"
                  value={settings.familyGreetingName}
                  onChange={e => onUpdateSettings({ familyGreetingName: e.target.value })}
                  placeholder="bijv. Familie De Vries"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Naam van het bord (topbalk & badge)
              </label>
              <input
                type="text"
                value={settings.dashboardName}
                onChange={e => onUpdateSettings({ dashboardName: e.target.value })}
                placeholder="bijv. HomeBoard, Ons Huisbord"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Live Greeting Preview */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-xl p-5 flex flex-col justify-center space-y-2 border border-slate-800">
            <span className="text-[11px] text-indigo-300 uppercase tracking-wider font-semibold">
              Voorbeeld op dashboard · {settings.dashboardName || 'HomeBoard'}
            </span>
            <div className="text-2xl font-extrabold tracking-tight">
              {previewGreetingText}
            </div>
            <p className="text-xs text-slate-300">
              Deze tekst past zich automatisch aan naar ochtend, middag en avond.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: Woonplaats & Live Weer */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Woonplaats & Live Weer
              </h2>
              <p className="text-xs text-slate-500">
                Kies je eigen stad of gemeente voor automatische live weersvoorspellingen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
            <span className="font-semibold text-slate-900 dark:text-white">
              {settings.cityName}
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {settings.weatherTemp}°C
            </span>
            <span className="text-slate-500">({settings.weatherCondition})</span>
            <button
              type="button"
              onClick={handleRefreshWeather}
              disabled={isRefreshingWeather}
              className="ml-1 p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
              title="Weer nu verversen"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingWeather ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSearchCity} className="flex items-center gap-2 text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={cityQuery}
              onChange={e => setCityQuery(e.target.value)}
              placeholder="Typ je woonplaats (bijv. Antwerpen, Utrecht, Gent, Eindhoven)..."
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={isSearchingCity}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors shrink-0"
          >
            {isSearchingCity ? 'Zoeken...' : 'Zoek plaats'}
          </button>
        </form>

        {weatherFeedback && (
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            {weatherFeedback}
          </p>
        )}

        {cityResults.length > 0 && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden text-xs">
            {cityResults.map(loc => (
              <button
                key={loc.id}
                type="button"
                onClick={() => handleSelectCity(loc)}
                className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-between gap-2 transition-colors"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{loc.name}</span>
                  <span className="text-slate-500 ml-2">
                    {[loc.admin1, loc.country].filter(Boolean).join(', ')}
                  </span>
                </div>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  Selecteren
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: Gezin & Profielfoto's */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Gezinsleden & Profielfoto's
              </h2>
              <p className="text-xs text-slate-500">
                Stel samen wie er in jouw gezin zit voor het takenbord en de kalender. Foto's worden lokaal opgeslagen.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingMember(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Gezinslid toevoegen</span>
          </button>
        </div>

        {photoUploadError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
            {photoUploadError}
          </div>
        )}

        {/* Add Member Form */}
        {isAddingMember && (
          <form
            onSubmit={handleCreateMember}
            className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Nieuw gezinslid toevoegen
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Naam *</label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  placeholder="bijv. Sarah, Bram, Oma"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Rol</label>
                <select
                  value={newMemberRole}
                  onChange={e => setNewMemberRole(e.target.value as 'parent' | 'child')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  <option value="child">Kind (taken & sterren sparen)</option>
                  <option value="parent">Ouder / Volwassene</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1.5">Profielfoto uploaden (optioneel)</label>
                <div className="flex items-center gap-3">
                  <MemberAvatar
                    member={{
                      name: newMemberName || 'Nieuw',
                      avatar: newMemberEmoji,
                      photoUrl: newMemberPhotoPreview || undefined,
                      color: newMemberColor
                    }}
                    size="lg"
                  />
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 font-semibold">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Kies foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewMemberPhotoFile(file);
                          setNewMemberPhotoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <ColorPickerField
                label="Persoonlijke kleur (volledig spectrum)"
                value={newMemberColor}
                onChange={setNewMemberColor}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Emoji icoon (fallback zonder foto)</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {EMOJI_CHOICES.map(em => (
                  <button
                    type="button"
                    key={em}
                    onClick={() => setNewMemberEmoji(em)}
                    className={`text-lg p-1.5 rounded-lg border ${
                      newMemberEmoji === em
                        ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/60'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                Toevoegen aan gezin
              </button>
            </div>
          </form>
        )}

        {/* Existing Family Members List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {familyMembers.map(member => (
            <div
              key={member.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 text-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <MemberAvatar member={member} size="lg" />
                    <label
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center cursor-pointer shadow-xs"
                      title="Upload foto voor dit gezinslid"
                    >
                      <Camera className="w-3 h-3" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleMemberPhotoUpload(member.id, file);
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {member.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {uploadingMemberId === member.id
                        ? 'Foto wordt opgeslagen...'
                        : member.photoUrl
                        ? 'Eigen foto actief'
                        : 'Emoji als avatar'}
                    </div>
                    {member.photoUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMemberPhoto(member.id)}
                        className="text-[11px] text-red-500 hover:underline mt-0.5"
                      >
                        Foto verwijderen
                      </button>
                    )}
                  </div>
                </div>

                {familyMembers.length > 1 && (
                  <div>
                    {confirmDeleteMemberId === member.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(member.id)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-semibold"
                        >
                          Bevestig
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteMemberId(null)}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-[11px]"
                        >
                          Nee
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteMemberId(member.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Gezinslid verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Naam
                  </label>
                  <input
                    type="text"
                    value={member.name}
                    onChange={e => handleUpdateMemberField(member.id, { name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Rol
                  </label>
                  <select
                    value={member.role}
                    onChange={e =>
                      handleUpdateMemberField(member.id, {
                        role: e.target.value as 'parent' | 'child'
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="child">Kind</option>
                    <option value="parent">Ouder</option>
                  </select>
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 flex-wrap">
                <ColorPickerField
                  label="Kleur"
                  value={member.color}
                  onChange={color => handleUpdateMemberField(member.id, { color })}
                  compact
                />

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Emoji
                  </label>
                  <select
                    value={member.avatar}
                    onChange={e => handleUpdateMemberField(member.id, { avatar: e.target.value })}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base"
                  >
                    {EMOJI_CHOICES.map(em => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: Agenda's, Volledige Kleuren & Google OAuth */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Agenda's, Kleuren & Google OAuth
              </h2>
              <p className="text-xs text-slate-500">
                Pas elke agendakleur uit het volledige spectrum aan, voeg lokale agenda's toe of stel je eigen Google Client ID in.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddingCalendar(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Lokale agenda</span>
            </button>
            <button
              type="button"
              onClick={onOpenManageCalendars}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Google / iCal Koppelen</span>
            </button>
          </div>
        </div>

        {/* Add Local Calendar Form */}
        {isAddingCalendar && (
          <form
            onSubmit={handleCreateLocalCalendar}
            className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3 text-xs"
          >
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              Nieuwe lokale / gezinsagenda aanmaken
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Naam van agenda *</label>
                <input
                  type="text"
                  value={newCalName}
                  onChange={e => setNewCalName(e.target.value)}
                  placeholder="bijv. Werk Papa, Vakanties, Verjaardagen"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Omschrijving (optioneel)</label>
                <input
                  type="text"
                  value={newCalDescription}
                  onChange={e => setNewCalDescription(e.target.value)}
                  placeholder="bijv. Alle roosters en vrije dagen"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
            </div>

            <ColorPickerField
              label="Kleur van deze agenda (volledig kleurenspectrum)"
              value={newCalColor}
              onChange={setNewCalColor}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingCalendar(false)}
                className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                Agenda aanmaken
              </button>
            </div>
          </form>
        )}

        {/* Active Calendars with Full Color Picker per Calendar */}
        <div className="space-y-2.5 text-xs">
          {calendars.map(cal => (
            <div
              key={cal.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <ColorPickerField
                  value={cal.color}
                  onChange={color => handleUpdateCalendarField(cal.id, { color })}
                  compact
                />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={cal.name}
                    onChange={e => handleUpdateCalendarField(cal.id, { name: e.target.value })}
                    className="font-semibold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none w-full"
                  />
                  <div className="text-[11px] text-slate-500 truncate">
                    {cal.type === 'google_oauth'
                      ? 'Google Agenda (OAuth)'
                      : cal.type === 'ical'
                      ? 'iCal / ICS Feed'
                      : 'Lokale agenda'}{' '}
                    {cal.description ? `· ${cal.description}` : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleUpdateCalendarField(cal.id, { visible: !cal.visible })}
                  className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    cal.visible
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400'
                  }`}
                >
                  {cal.visible ? 'Zichtbaar' : 'Verborgen'}
                </button>
                {calendars.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCalendar(cal.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                    title="Agenda verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Custom Google OAuth Client ID & Local URL */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3 text-xs">
          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            <span>Eigen Google OAuth Client ID (voor rechtstreekse Google-login)</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Wil je in je eigen thuisnetwerk direct inloggen via <strong>Google OAuth</strong> (om afspraken vanuit HomeBoard terug te schrijven naar Google Agenda)? Vul hier jouw eigen Google Cloud OAuth 2.0 Client ID in. Voeg het onderstaande adres toe bij <em>Geautoriseerde JavaScript-oorsprongen</em> in Google Cloud Console.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Google OAuth Client ID
              </label>
              <input
                type="text"
                value={settings.googleClientId || ''}
                onChange={e => onUpdateSettings({ googleClientId: e.target.value })}
                placeholder="bijv. 1234567890-abc.apps.googleusercontent.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Jouw eigen App-adres (Origin)
                </label>
                {currentBrowserOrigin && (
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ customAppUrl: currentBrowserOrigin })}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Vul huidig adres in
                  </button>
                )}
              </div>
              <input
                type="url"
                value={settings.customAppUrl || ''}
                onChange={e => onUpdateSettings({ customAppUrl: e.target.value })}
                placeholder={currentBrowserOrigin || 'http://localhost:3000'}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Let op: Google Cloud Console accepteert voor OAuth <code className="bg-slate-200/70 dark:bg-slate-700 px-1 rounded">http://localhost:3000</code> of een domeinnaam (zoals <code className="bg-slate-200/70 dark:bg-slate-700 px-1 rounded">https://agenda.mijndomein.nl</code> of <code className="bg-slate-200/70 dark:bg-slate-700 px-1 rounded">http://192-168-1-50.sslip.io:3000</code>). Losse IP-adressen zoals <code className="bg-slate-200/70 dark:bg-slate-700 px-1 rounded">192.168.x.x</code> worden door Google OAuth geweigerd — in dat geval werkt de iCal-koppeling wél altijd direct.
          </p>
        </div>
      </section>

      {/* SECTION 5: Weergave & Gegevensback-up */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>Tijdweergave & Gegevensback-up</span>
          </div>
          <p className="text-slate-500">
            Bewaar een kopie van je gezinsleden, taken en agenda-instellingen als JSON-bestand.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => onUpdateSettings({ timeFormat24h: !settings.timeFormat24h })}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300"
          >
            Klok: {settings.timeFormat24h ? '24-uurs' : '12-uurs'}
          </button>

          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
            <Upload className="w-3.5 h-3.5" />
            <span>Back-up herstellen</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Back-up</span>
          </button>
        </div>
      </section>
    </div>
  );
};
