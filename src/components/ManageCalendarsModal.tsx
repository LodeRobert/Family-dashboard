import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CalendarAssignmentMode,
  CalendarCategory,
  CalendarMultiDayMode,
  CalendarSource,
  FamilyMember,
  HaCalendarEntity,
  HaStatusInfo
} from '../types';
import { ColorPickerField } from './ColorPickerField';
import { CalendarAssignmentControls } from './CalendarAssignmentControls';
import { CalendarAssigneeBadge } from './CalendarAssigneeBadge';
import { getCalendarAssignees } from '../utils/calendarHelpers';
import {
  CALENDAR_ICONS,
  CALENDAR_PRESETS,
  CalendarPreset,
  createCalendarFromPreset,
  getCalendarPresetByKey,
  inferCalendarCategory
} from '../utils/calendarPresets';
import { apiUrl } from '../utils/api';
import {
  fetchHaCalendars,
  fetchHaStatus,
  fetchHaCalendarEvents
} from '../services/storage';
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
  Plus,
  Home,
  CheckSquare,
  Square
} from 'lucide-react';

interface ManageCalendarsModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendars: CalendarSource[];
  familyMembers: FamilyMember[];
  onAddCalendar: (calendar: CalendarSource) => void | Promise<void>;
  onAddCalendarsBatch?: (calendars: CalendarSource[]) => void | Promise<void>;
  onUpdateCalendar: (calendarId: string, patch: Partial<CalendarSource>) => void;
  onDeleteCalendar: (calendarId: string) => void;
  onToggleVisibility: (calendarId: string) => void;
  onSyncAll: () => Promise<void>;
}

const HA_PALETTE = [
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#14B8A6',
  '#6366F1'
];

function guessCalendarIcon(name: string, entityId = ''): string {
  const s = `${name} ${entityId}`.toLowerCase();
  if (s.includes('vuil') || s.includes('afval') || s.includes('trash') || s.includes('recycle') || s.includes('pmd') || s.includes('gft')) {
    return '🗑️';
  }
  if (s.includes('verjaardag') || s.includes('birthday')) return '🎂';
  if (s.includes('vakantie') || s.includes('holiday') || s.includes('verlof') || s.includes('feest')) return '✈️';
  if (s.includes('school') || s.includes('opvang') || s.includes('klas')) return '🏫';
  if (s.includes('dokter') || s.includes('arts') || s.includes('tand') || s.includes('zorg')) return '🏥';
  if (s.includes('sport') || s.includes('voetbal') || s.includes('zwem') || s.includes('fitness')) return '⚽';
  if (s.includes('brandweer') || s.includes('fire')) return '🚒';
  if (s.includes('werk') || s.includes('shift') || s.includes('work')) return '💼';
  return '📅';
}

export const ManageCalendarsModal: React.FC<ManageCalendarsModalProps> = ({
  isOpen,
  onClose,
  calendars,
  familyMembers,
  onAddCalendar,
  onAddCalendarsBatch,
  onUpdateCalendar,
  onDeleteCalendar,
  onToggleVisibility,
  onSyncAll
}) => {
  const [activeTab, setActiveTab] = useState<'ha' | 'ical' | 'local' | 'all'>('ha');

  // iCal form state
  const [icalUrl, setIcalUrl] = useState('');
  const [icalName, setIcalName] = useState('Mijn iCal Agenda');
  const [icalIcon, setIcalIcon] = useState('📅');
  const [icalColor, setIcalColor] = useState('#4285F4');
  const [icalCategory, setIcalCategory] = useState<CalendarCategory>('general');
  const [icalAssignmentMode, setIcalAssignmentMode] = useState<CalendarAssignmentMode>('family');
  const [icalMemberIds, setIcalMemberIds] = useState<string[]>([]);
  const [icalMultiDayMode, setIcalMultiDayMode] = useState<CalendarMultiDayMode>('smart_cutoff');
  const [isTestingIcal, setIsTestingIcal] = useState(false);
  const [icalError, setIcalError] = useState('');
  const [icalSuccess, setIcalSuccess] = useState('');

  // Home Assistant calendar connector state
  const [haStatus, setHaStatus] = useState<HaStatusInfo | null>(null);
  const [haCalendars, setHaCalendars] = useState<HaCalendarEntity[]>([]);
  const [isLoadingHa, setIsLoadingHa] = useState(false);
  const [haBulkSelection, setHaBulkSelection] = useState<string[]>([]);
  const [isAddingHaBulk, setIsAddingHaBulk] = useState(false);
  const [haSelectedEntityId, setHaSelectedEntityId] = useState('');
  const [haCalName, setHaCalName] = useState('');
  const [haCalIcon, setHaCalIcon] = useState('📅');
  const [haCalColor, setHaCalColor] = useState('#0EA5E9');
  const [haCalCategory, setHaCalCategory] = useState<CalendarCategory>('general');
  const [haAssignmentMode, setHaAssignmentMode] = useState<CalendarAssignmentMode>('family');
  const [haMemberIds, setHaMemberIds] = useState<string[]>([]);
  const [haMultiDayMode, setHaMultiDayMode] = useState<CalendarMultiDayMode>('smart_cutoff');
  const [isAddingHaCal, setIsAddingHaCal] = useState(false);
  const [haError, setHaError] = useState('');
  const [haSuccess, setHaSuccess] = useState('');

  // Standard Roles linking state + Local calendar form
  const [bindingPresetKey, setBindingPresetKey] = useState<CalendarCategory | null>(null);
  const [bindingMode, setBindingMode] = useState<'ha' | 'ical' | 'existing'>('ha');
  const [bindingHaEntityId, setBindingHaEntityId] = useState('');
  const [bindingIcalUrl, setBindingIcalUrl] = useState('');
  const [bindingExistingCalId, setBindingExistingCalId] = useState('');
  const [bindingRenameToPreset, setBindingRenameToPreset] = useState(true);
  const [isBindingPreset, setIsBindingPreset] = useState(false);
  const [bindingError, setBindingError] = useState('');

  const [localName, setLocalName] = useState('');
  const [localIcon, setLocalIcon] = useState('📅');
  const [localDescription, setLocalDescription] = useState('');
  const [localColor, setLocalColor] = useState('#8B5CF6');
  const [localAssignmentMode, setLocalAssignmentMode] = useState<CalendarAssignmentMode>('family');
  const [localMemberIds, setLocalMemberIds] = useState<string[]>([]);
  const [localMultiDayMode, setLocalMultiDayMode] = useState<CalendarMultiDayMode>('smart_cutoff');
  const [localSuccess, setLocalSuccess] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);

  // Keep latest calendars in a ref so loadHaInfo never depends on calendars/selection and never loops
  const calendarsRef = useRef(calendars);
  calendarsRef.current = calendars;

  const loadHaInfo = useCallback(async () => {
    try {
      setIsLoadingHa(true);
      setHaError('');
      const st = await fetchHaStatus();
      setHaStatus(st);
      if (st.connected) {
        const list = await fetchHaCalendars();
        setHaCalendars(list);

        const linkedSet = new Set(
          calendarsRef.current
            .filter(c => c.type === 'homeassistant' && c.haEntityId)
            .map(c => c.haEntityId!)
        );
        const unlinked = list.filter(c => !linkedSet.has(c.entityId));

        setHaBulkSelection(unlinked.map(c => c.entityId));

        const preferred = unlinked[0] || list[0];
        if (preferred) {
          setHaSelectedEntityId(preferred.entityId);
          setHaCalName(preferred.name);
          setHaCalIcon(guessCalendarIcon(preferred.name, preferred.entityId));
        }
      } else {
        setHaCalendars([]);
        setHaBulkSelection([]);
      }
    } catch (err: any) {
      setHaError(err.message || 'Kon Home Assistant niet bereiken.');
    } finally {
      setIsLoadingHa(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadHaInfo();
    }
  }, [isOpen, loadHaInfo]);

  if (!isOpen) return null;

  const linkedHaEntityIds = new Set(
    calendars.filter(c => c.type === 'homeassistant' && c.haEntityId).map(c => c.haEntityId!)
  );

  const toggleHaBulkEntity = (entityId: string) => {
    setHaBulkSelection(prev =>
      prev.includes(entityId) ? prev.filter(id => id !== entityId) : [...prev, entityId]
    );
  };

  const handleBulkAddHaCalendars = async () => {
    if (haBulkSelection.length === 0) return;

    try {
      setIsAddingHaBulk(true);
      setHaError('');
      setHaSuccess('');

      const newSources: CalendarSource[] = haBulkSelection.map((entityId, idx) => {
        const meta = haCalendars.find(c => c.entityId === entityId);
        const name = meta?.name || entityId;
        const colorIndex = (calendars.length + idx) % HA_PALETTE.length;
        return {
          id: 'ha-' + Math.random().toString(36).substring(2, 9),
          name,
          icon: guessCalendarIcon(name, entityId),
          color: HA_PALETTE[colorIndex],
          type: 'homeassistant',
          haEntityId: entityId,
          visible: true,
          isReadOnly: true,
          description: `Home Assistant (${entityId})`,
          assignmentMode: haAssignmentMode,
          memberIds: haAssignmentMode === 'members' ? haMemberIds : [],
          multiDayMode: haMultiDayMode
        };
      });

      if (onAddCalendarsBatch) {
        await onAddCalendarsBatch(newSources);
      } else {
        for (const src of newSources) {
          await onAddCalendar(src);
        }
      }

      setHaBulkSelection([]);
      setHaSuccess(
        `${newSources.length} Home Assistant ${newSources.length === 1 ? 'agenda' : "agenda's"} toegevoegd en gesynchroniseerd!`
      );
    } catch (err: any) {
      setHaError(err.message || "Kon Home Assistant agenda's niet koppelen.");
    } finally {
      setIsAddingHaBulk(false);
    }
  };

  const handleAddHaCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!haSelectedEntityId) {
      setHaError('Selecteer een Home Assistant kalender.');
      return;
    }

    try {
      setIsAddingHaCal(true);
      setHaError('');
      setHaSuccess('');

      const selectedMeta = haCalendars.find(c => c.entityId === haSelectedEntityId);
      const displayName = haCalName.trim() || selectedMeta?.name || haSelectedEntityId;
      const newCalId = 'ha-' + Math.random().toString(36).substring(2, 9);

      const tempCal: CalendarSource = {
        id: newCalId,
        name: displayName,
        icon: haCalIcon || guessCalendarIcon(displayName, haSelectedEntityId),
        color: haCalColor,
        category: haCalCategory !== 'general' ? haCalCategory : undefined,
        type: 'homeassistant',
        haEntityId: haSelectedEntityId,
        visible: true,
        isReadOnly: true,
        description: `Home Assistant (${haSelectedEntityId})`,
        assignmentMode: haAssignmentMode,
        memberIds: haAssignmentMode === 'members' ? haMemberIds : [],
        multiDayMode: haMultiDayMode
      };

      const fetched = await fetchHaCalendarEvents(tempCal);
      await onAddCalendar(tempCal);

      // Advance selection to next unlinked HA calendar so user can immediately add more
      const nextLinked = new Set([...linkedHaEntityIds, haSelectedEntityId]);
      const nextUnlinked = haCalendars.find(c => !nextLinked.has(c.entityId));
      setHaBulkSelection(prev => prev.filter(id => id !== haSelectedEntityId));
      if (nextUnlinked) {
        setHaSelectedEntityId(nextUnlinked.entityId);
        setHaCalName(nextUnlinked.name);
        setHaCalIcon(guessCalendarIcon(nextUnlinked.name, nextUnlinked.entityId));
        setHaCalColor(HA_PALETTE[(calendars.length + 1) % HA_PALETTE.length]);
      }
      setHaCalCategory('general');

      setHaSuccess(
        `Home Assistant agenda "${displayName}" gekoppeld! (${fetched.length} afspraken geladen)`
      );
    } catch (err: any) {
      setHaError(err.message || 'Kon Home Assistant kalender niet koppelen.');
    } finally {
      setIsAddingHaCal(false);
    }
  };

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
        apiUrl(
          `/api/ical/fetch?url=${encodeURIComponent(cleanUrl)}&calendarName=${encodeURIComponent(icalName.trim())}&calendarColor=${encodeURIComponent(icalColor)}`
        )
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
        icon: icalIcon || guessCalendarIcon(icalName),
        color: icalColor,
        category: icalCategory !== 'general' ? icalCategory : undefined,
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
      setIcalCategory('general');
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
      icon: localIcon || guessCalendarIcon(localName),
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
    setLocalIcon('📅');
    setLocalAssignmentMode('family');
    setLocalMemberIds([]);
    setLocalMultiDayMode('smart_cutoff');
    setLocalSuccess(`Lokale agenda "${newCal.name}" toegevoegd!`);
  };

  const openPresetBinding = (preset: CalendarPreset) => {
    setBindingError('');
    if (bindingPresetKey === preset.key) {
      setBindingPresetKey(null);
      return;
    }
    setBindingPresetKey(preset.key);
    setBindingRenameToPreset(true);
    setBindingIcalUrl('');

    if (haStatus?.connected && haCalendars.length > 0) {
      setBindingMode('ha');
      const unlinkedHa = haCalendars.find(hc => !linkedHaEntityIds.has(hc.entityId));
      setBindingHaEntityId(unlinkedHa?.entityId || haCalendars[0].entityId);
    } else if (calendars.length > 0) {
      setBindingMode('existing');
      setBindingExistingCalId(calendars[0].id);
    } else {
      setBindingMode('ical');
    }
  };

  const handleBindPresetSubmit = async (preset: CalendarPreset) => {
    setBindingError('');
    setLocalSuccess('');
    try {
      setIsBindingPreset(true);

      if (bindingMode === 'ha') {
        if (!bindingHaEntityId) {
          setBindingError('Kies eerst een Home Assistant agenda.');
          return;
        }
        const haMeta = haCalendars.find(c => c.entityId === bindingHaEntityId);
        // Check if this HA entity already exists on HomeBoard -> update it instead of duplicating if already present
        const existingHaCal = calendars.find(
          c => c.type === 'homeassistant' && c.haEntityId === bindingHaEntityId
        );
        if (existingHaCal) {
          onUpdateCalendar(existingHaCal.id, {
            category: preset.key,
            icon: preset.icon,
            color: preset.color,
            name: bindingRenameToPreset ? preset.name : existingHaCal.name,
            multiDayMode: preset.multiDayMode
          });
          setLocalSuccess(
            `Bestaande HA-agenda "${haMeta?.name || bindingHaEntityId}" gekoppeld aan "${preset.icon} ${preset.name}"!`
          );
        } else {
          const newCal = createCalendarFromPreset(preset, familyMembers, {
            type: 'homeassistant',
            haEntityId: bindingHaEntityId,
            name: bindingRenameToPreset ? preset.name : haMeta?.name || preset.name
          });
          const fetched = await fetchHaCalendarEvents(newCal);
          await onAddCalendar(newCal);
          setLocalSuccess(
            `"${preset.icon} ${preset.name}" gekoppeld aan Home Assistant (${bindingHaEntityId}, ${fetched.length} afspraken geladen)!`
          );
        }
        setBindingPresetKey(null);
        return;
      }

      if (bindingMode === 'ical') {
        const cleanUrl = bindingIcalUrl.trim();
        if (!cleanUrl) {
          setBindingError('Vul een geldige iCal (.ics) URL in.');
          return;
        }
        const testRes = await fetch(
          apiUrl(
            `/api/ical/fetch?url=${encodeURIComponent(cleanUrl)}&calendarName=${encodeURIComponent(preset.name)}&calendarColor=${encodeURIComponent(preset.color)}`
          )
        );
        if (!testRes.ok) {
          throw new Error('De server kon de iCal URL niet bereiken. Controleer of de link klopt.');
        }
        const data = await testRes.json();
        if (data.error) throw new Error(data.error);

        const newCal = createCalendarFromPreset(preset, familyMembers, {
          type: 'ical',
          url: cleanUrl,
          name: preset.name
        });
        await onAddCalendar(newCal);
        setLocalSuccess(
          `"${preset.icon} ${preset.name}" gekoppeld via iCal (${data.count || 0} afspraken geladen)!`
        );
        setBindingIcalUrl('');
        setBindingPresetKey(null);
        return;
      }

      if (bindingMode === 'existing') {
        const existing = calendars.find(c => c.id === bindingExistingCalId);
        if (!existing) {
          setBindingError('Selecteer een bestaande agenda.');
          return;
        }
        onUpdateCalendar(existing.id, {
          category: preset.key,
          icon: preset.icon,
          color: preset.color,
          name: bindingRenameToPreset ? preset.name : existing.name,
          multiDayMode: preset.multiDayMode
        });
        setLocalSuccess(
          `Agenda "${existing.name}" gekoppeld aan rol "${preset.icon} ${preset.name}"!`
        );
        setBindingPresetKey(null);
      }
    } catch (err: any) {
      setBindingError(err.message || 'Kon standaard agenda niet koppelen.');
    } finally {
      setIsBindingPreset(false);
    }
  };

  const handleAddLocalPresetFallback = async (preset: CalendarPreset) => {
    const newCal = createCalendarFromPreset(preset, familyMembers, { type: 'local' });
    await onAddCalendar(newCal);
    setLocalSuccess(`Lokale agenda "${preset.icon} ${preset.name}" toegevoegd.`);
  };

  const handleLoadSampleHolidays = () => {
    const holidayUrl =
      'https://calendar.google.com/calendar/ical/nl.dutch%23holiday%40group.v.calendar.google.com/public/basic.ics';
    setIcalName('Vakanties & Feestdagen');
    setIcalIcon('✈️');
    setIcalCategory('holidays');
    setIcalUrl(holidayUrl);
    setIcalColor('#8B5CF6');
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await onSyncAll();
    } finally {
      setIsSyncing(false);
    }
  };

  const renderIconPicker = (value: string, onChange: (ic: string) => void) => (
    <div>
      <label className="block font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
        Icoon voor herkenning
      </label>
      <div className="flex items-center gap-1.5 flex-wrap">
        {CALENDAR_ICONS.map(ic => (
          <button
            key={ic}
            type="button"
            onClick={() => onChange(ic)}
            className={`w-8 h-8 rounded-lg border text-base flex items-center justify-center transition-colors ${
              value === ic
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 ring-1 ring-indigo-500'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100'
            }`}
          >
            {ic}
          </button>
        ))}
      </div>
    </div>
  );

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
                Agenda's, Basis-agenda's & Home Assistant
              </h3>
              <p className="text-[11px] text-slate-500">
                Koppel meerdere Home Assistant kalenders, iCal-feeds of voeg basis-agenda's toe
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
            <span>Nu Verversen</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('ha')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ha'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home Assistant</span>
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'local'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Standaard & Lokaal</span>
          </button>

          <button
            onClick={() => setActiveTab('ical')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ical'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>iCal Feed</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Overzicht ({calendars.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* TAB 1: HOME ASSISTANT CALENDARS (MULTI-SELECT + INDIVIDUAL) */}
          {activeTab === 'ha' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Home className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      Meerdere Home Assistant kalenders koppelen
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Vink hieronder alle Home Assistant agenda's aan die je wilt tonen (bijv. vuilbakken, verjaardagen, schoolvakanties, gezinsagenda) en klik op toevoegen.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadHaInfo}
                  disabled={isLoadingHa}
                  className="px-2.5 py-1.5 rounded-lg border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-50 shrink-0 inline-flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingHa ? 'animate-spin' : ''}`} />
                  <span>Ververs</span>
                </button>
              </div>

              {haSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{haSuccess}</span>
                </div>
              )}

              {haError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{haError}</span>
                </div>
              )}

              {isLoadingHa ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  Home Assistant kalenders ophalen...
                </div>
              ) : !haStatus?.connected ? (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-2 text-xs text-amber-900 dark:text-amber-200">
                  <div className="font-bold">Home Assistant is nog niet gekoppeld</div>
                  <p className="text-[11px] leading-relaxed">
                    Vul je Home Assistant URL en Long-Lived Access Token in bij <strong>Instellingen → Home Assistant Koppeling</strong>, of start HomeBoard als HA Add-on.
                  </p>
                </div>
              ) : haCalendars.length === 0 ? (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center text-slate-500">
                  Geen kalenders (<code className="font-mono">calendar.*</code>) gevonden in Home Assistant.
                </div>
              ) : (
                <>
                  {/* Multi-select checklist to add multiple HA calendars in 1 click */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          1. Snel meerdere agenda's selecteren ({haCalendars.length} gevonden)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {linkedHaEntityIds.size} al gekoppeld · vink extra agenda's aan om in één keer toe te voegen
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const allUnlinked = haCalendars
                            .filter(c => !linkedHaEntityIds.has(c.entityId))
                            .map(c => c.entityId);
                          setHaBulkSelection(
                            haBulkSelection.length === allUnlinked.length ? [] : allUnlinked
                          );
                        }}
                        className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Alles in-/uitschakelen
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                      {haCalendars.map(hc => {
                        const alreadyLinked = linkedHaEntityIds.has(hc.entityId);
                        const isChecked = haBulkSelection.includes(hc.entityId);
                        const suggestedIcon = guessCalendarIcon(hc.name, hc.entityId);

                        return (
                          <button
                            key={hc.entityId}
                            type="button"
                            onClick={() => toggleHaBulkEntity(hc.entityId)}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                              isChecked
                                ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-slate-900 dark:text-white'
                                : alreadyLinked
                                ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 text-slate-700 dark:text-slate-300'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-sky-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className="text-base shrink-0">{suggestedIcon}</span>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate">{hc.name}</div>
                              <div className="text-[10px] font-mono text-slate-400 truncate">
                                {hc.entityId}
                              </div>
                            </div>
                            {alreadyLinked && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold shrink-0">
                                Actief
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500">
                        Kleuren en iconen kun je achteraf ook per agenda wijzigen in tab{' '}
                        <strong>Overzicht</strong>.
                      </span>
                      <button
                        type="button"
                        onClick={handleBulkAddHaCalendars}
                        disabled={haBulkSelection.length === 0 || isAddingHaBulk}
                        className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-semibold rounded-lg shadow-xs transition-colors shrink-0"
                      >
                        {isAddingHaBulk
                          ? 'Bezig met toevoegen...'
                          : `Geselecteerde toevoegen (${haBulkSelection.length})`}
                      </button>
                    </div>
                  </div>

                  {/* Single HA calendar detailed form */}
                  <form
                    onSubmit={handleAddHaCalendar}
                    className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      2. Of één kalender op maat toevoegen (eigen naam, icoon & kleur)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Kies Home Assistant kalender *
                        </label>
                        <select
                          value={haSelectedEntityId}
                          onChange={e => {
                            const nextId = e.target.value;
                            setHaSelectedEntityId(nextId);
                            const found = haCalendars.find(c => c.entityId === nextId);
                            if (found) {
                              setHaCalName(found.name);
                              setHaCalIcon(guessCalendarIcon(found.name, found.entityId));
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                          required
                        >
                          {haCalendars.map(hc => (
                            <option key={hc.entityId} value={hc.entityId}>
                              {hc.name} ({hc.entityId})
                              {linkedHaEntityIds.has(hc.entityId) ? ' — al gekoppeld' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Weergavenaam op HomeBoard
                        </label>
                        <input
                          type="text"
                          value={haCalName}
                          onChange={e => setHaCalName(e.target.value)}
                          placeholder="bijv. Vuilbakkenophaling, Verjaardagen"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Standaard rol / benaming (optioneel — licht extra op op Dashboard)
                      </label>
                      <select
                        value={haCalCategory}
                        onChange={e => {
                          const cat = e.target.value as CalendarCategory;
                          setHaCalCategory(cat);
                          const p = getCalendarPresetByKey(cat);
                          if (p) {
                            setHaCalIcon(p.icon);
                            setHaCalColor(p.color);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="general">📅 Gewone agenda (geen speciale rol)</option>
                        {CALENDAR_PRESETS.map(p => (
                          <option key={p.key} value={p.key}>
                            {p.icon} {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {renderIconPicker(haCalIcon, setHaCalIcon)}

                    <ColorPickerField
                      label="Kleur uit volledig spectrum"
                      value={haCalColor}
                      onChange={setHaCalColor}
                    />

                    <CalendarAssignmentControls
                      familyMembers={familyMembers}
                      assignmentMode={haAssignmentMode}
                      memberIds={haMemberIds}
                      multiDayMode={haMultiDayMode}
                      onChangeAssignment={(mode, ids) => {
                        setHaAssignmentMode(mode);
                        setHaMemberIds(ids);
                      }}
                      onChangeMultiDayMode={setHaMultiDayMode}
                    />

                    <div className="pt-1 flex justify-end">
                      <button
                        type="submit"
                        disabled={isAddingHaCal}
                        className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs transition-colors shrink-0"
                      >
                        {isAddingHaCal ? 'Bezig met koppelen...' : 'Deze HA Agenda Toevoegen'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {/* TAB 2: STANDAARD AGENDA'S KOPPELEN AAN ECHTE AGENDA'S & LOCAL CALENDAR */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              {localSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{localSuccess}</span>
                </div>
              )}

              {/* Link Standard Family Roles directly to Real HA / iCal / Existing Calendars */}
              <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/15 space-y-3">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Standaard agenda&apos;s koppelen aan echte agenda&apos;s</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Koppel een echte <strong>Home Assistant</strong> kalender, een <strong>iCal (.ics) feed</strong> of een al bestaande agenda aan deze duidelijke rollen. Afspraken hieruit worden extra opvallend uitgelicht op je Dashboard en in de Kalender.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {CALENDAR_PRESETS.map(preset => {
                    const linkedCals = calendars.filter(
                      c => inferCalendarCategory(c) === preset.key
                    );
                    const isExpanded = bindingPresetKey === preset.key;

                    return (
                      <div
                        key={preset.key}
                        className={`rounded-xl border transition-all ${
                          linkedCals.length > 0
                            ? 'border-emerald-200 dark:border-emerald-800/70 bg-white dark:bg-slate-900'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="p-3 flex items-center justify-between gap-2.5 flex-wrap">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                              style={{ backgroundColor: `${preset.color}22` }}
                            >
                              {preset.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                  {preset.name}
                                </span>
                                {preset.highlightOnDashboard && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-semibold">
                                    Uitgelicht op Dashboard
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {linkedCals.length > 0 ? (
                                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                                    Gekoppeld:{' '}
                                    {linkedCals
                                      .map(
                                        c =>
                                          `${c.name} (${
                                            c.type === 'homeassistant'
                                              ? 'Home Assistant'
                                              : c.type === 'ical'
                                              ? 'iCal'
                                              : 'Lokaal'
                                          })`
                                      )
                                      .join(', ')}
                                  </span>
                                ) : (
                                  preset.description
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openPresetBinding(preset)}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                                isExpanded
                                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              {isExpanded
                                ? 'Sluiten'
                                : linkedCals.length > 0
                                ? '+ Extra koppelen'
                                : 'Echte agenda koppelen'}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-3 pb-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-3 rounded-b-xl">
                            {/* Source type selector */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setBindingMode('ha');
                                  setBindingError('');
                                }}
                                className={`px-2.5 py-1.5 rounded-lg font-semibold border transition-colors ${
                                  bindingMode === 'ha'
                                    ? 'bg-sky-600 border-sky-600 text-white'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                🏠 Home Assistant
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBindingMode('ical');
                                  setBindingError('');
                                }}
                                className={`px-2.5 py-1.5 rounded-lg font-semibold border transition-colors ${
                                  bindingMode === 'ical'
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                🔗 iCal URL (.ics)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBindingMode('existing');
                                  setBindingError('');
                                  if (!bindingExistingCalId && calendars[0]) {
                                    setBindingExistingCalId(calendars[0].id);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-lg font-semibold border transition-colors ${
                                  bindingMode === 'existing'
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                📅 Bestaande agenda labelen
                              </button>
                            </div>

                            {bindingError && (
                              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-[11px]">
                                {bindingError}
                              </div>
                            )}

                            {bindingMode === 'ha' && (
                              <div className="space-y-2">
                                {!haStatus?.connected ? (
                                  <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                                    Home Assistant is nog niet verbonden. Koppel eerst je URL &amp; token bij <strong>Instellingen → Home Assistant Koppeling</strong>, of kies <strong>iCal URL</strong>.
                                  </div>
                                ) : haCalendars.length === 0 ? (
                                  <div className="text-[11px] text-slate-500">
                                    Geen Home Assistant kalenders gevonden.
                                  </div>
                                ) : (
                                  <select
                                    value={bindingHaEntityId}
                                    onChange={e => setBindingHaEntityId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                  >
                                    {haCalendars.map(hc => (
                                      <option key={hc.entityId} value={hc.entityId}>
                                        {hc.name} ({hc.entityId})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            )}

                            {bindingMode === 'ical' && (
                              <div>
                                <input
                                  type="url"
                                  value={bindingIcalUrl}
                                  onChange={e => setBindingIcalUrl(e.target.value)}
                                  placeholder="https://.../calendar.ics (plak hier je Google / RecycleApp / school iCal URL)"
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
                                />
                              </div>
                            )}

                            {bindingMode === 'existing' && (
                              <div>
                                <select
                                  value={bindingExistingCalId}
                                  onChange={e => setBindingExistingCalId(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                >
                                  {calendars.map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.icon || '📅'} {c.name} ({c.type === 'homeassistant' ? 'HA' : c.type === 'ical' ? 'iCal' : 'Lokaal'})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                              {bindingMode !== 'ical' ? (
                                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={bindingRenameToPreset}
                                    onChange={e => setBindingRenameToPreset(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-indigo-600"
                                  />
                                  <span>Naam ook instellen als &ldquo;{preset.name}&rdquo;</span>
                                </label>
                              ) : (
                                <span />
                              )}

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAddLocalPresetFallback(preset)}
                                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                                >
                                  Of lokaal aanmaken
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    isBindingPreset ||
                                    (bindingMode === 'ha' && (!haStatus?.connected || !bindingHaEntityId))
                                  }
                                  onClick={() => handleBindPresetSubmit(preset)}
                                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold"
                                >
                                  {isBindingPreset
                                    ? 'Bezig...'
                                    : `Koppel aan ${preset.icon} ${preset.name}`}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom local calendar form */}
              <form
                onSubmit={handleCreateLocal}
                className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Eigen lokale agenda aanmaken
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Naam van de agenda *
                  </label>
                  <input
                    type="text"
                    value={localName}
                    onChange={e => setLocalName(e.target.value)}
                    placeholder="bijv. Vrijwillige brandweer, Opvang Oma & Opa"
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

                {renderIconPicker(localIcon, setLocalIcon)}

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

          {/* TAB 3: ICAL CONNECTOR */}
          {activeTab === 'ical' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    Google Agenda / Apple / Afvalkalender koppelen via iCal
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Werkt betrouwbaar op elk thuisnetwerk. Plak het iCal-adres (.ics) van bijvoorbeeld je persoonlijke agenda of vuilbakkenophaling.
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

              <form
                onSubmit={handleAddIcal}
                className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Naam voor deze agenda
                  </label>
                  <input
                    type="text"
                    value={icalName}
                    onChange={e => setIcalName(e.target.value)}
                    placeholder="bijv. Vuilbakkenophaling, Google Privé, Werk"
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

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Standaard rol / benaming (optioneel)
                  </label>
                  <select
                    value={icalCategory}
                    onChange={e => {
                      const cat = e.target.value as CalendarCategory;
                      setIcalCategory(cat);
                      const p = getCalendarPresetByKey(cat);
                      if (p) {
                        setIcalIcon(p.icon);
                        setIcalColor(p.color);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="general">📅 Gewone agenda (geen speciale rol)</option>
                    {CALENDAR_PRESETS.map(p => (
                      <option key={p.key} value={p.key}>
                        {p.icon} {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {renderIconPicker(icalIcon, setIcalIcon)}

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

          {/* TAB 4: ALL ACTIVE CALENDARS + FULL SPECTRUM COLOR, ICON & PERSON EDITOR */}
          {activeTab === 'all' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Alle gekoppelde agenda's (pas naam, icoon, kleur, personen en nachtshift-weergave aan):
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
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <select
                            value={cal.icon || '📅'}
                            onChange={e => onUpdateCalendar(cal.id, { icon: e.target.value })}
                            className="w-10 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base text-center shrink-0"
                            aria-label="Agenda icoon"
                          >
                            {CALENDAR_ICONS.map(ic => (
                              <option key={ic} value={ic}>
                                {ic}
                              </option>
                            ))}
                          </select>

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
                              {cal.type === 'ical'
                                ? 'iCal Feed'
                                : cal.type === 'homeassistant'
                                ? `Home Assistant (${cal.haEntityId || 'calendar'})`
                                : 'Lokale agenda'}
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

                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="font-semibold text-slate-600 dark:text-slate-400">
                            Standaard benaming / categorie:
                          </label>
                          <select
                            value={cal.category || inferCalendarCategory(cal) || 'general'}
                            onChange={e => {
                              const cat = e.target.value as CalendarCategory;
                              if (cat === 'general') {
                                onUpdateCalendar(cal.id, { category: 'general' });
                              } else {
                                const p = getCalendarPresetByKey(cat);
                                onUpdateCalendar(cal.id, {
                                  category: cat,
                                  icon: p?.icon || cal.icon,
                                  color: p?.color || cal.color
                                });
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                          >
                            <option value="general">📅 Gewone agenda</option>
                            {CALENDAR_PRESETS.map(p => (
                              <option key={p.key} value={p.key}>
                                {p.icon} {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

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
