import React, { useState, useEffect, useCallback } from 'react';
import {
  AppSettings,
  AppState,
  CalendarAssignmentMode,
  CalendarCategory,
  CalendarEvent,
  CalendarMultiDayMode,
  CalendarSource,
  Chore,
  ChorePeriod,
  ClothingAdviceRule,
  DailyAutomationRule,
  FamilyMember,
  HaStatusInfo,
  RewardItem,
  WeatherLocationResult
} from '../types';
import { MemberAvatar } from './MemberAvatar';
import { ColorPickerField } from './ColorPickerField';
import { CalendarAssignmentControls } from './CalendarAssignmentControls';
import { CalendarAssigneeBadge } from './CalendarAssigneeBadge';
import { HomeAssistantSettingsSection } from './HomeAssistantSettingsSection';
import { getCalendarAssignees } from '../utils/calendarHelpers';
import {
  CALENDAR_ICONS,
  CALENDAR_PRESETS,
  getCalendarPresetByKey,
  inferCalendarCategory
} from '../utils/calendarPresets';
import {
  DEFAULT_CLOTHING_RAIN_ADVICE,
  DEFAULT_CLOTHING_RAIN_THRESHOLD,
  DEFAULT_CLOTHING_RULES,
  DEFAULT_CLOTHING_WIND_ADVICE,
  DEFAULT_CLOTHING_WIND_THRESHOLD
} from '../utils/weatherClothing';
import {
  searchWeatherLocations,
  fetchCurrentWeather,
  uploadMemberAvatar,
  changeSettingsPassword
} from '../services/storage';
import {
  getLocalDateStr,
  formatLocalDateNL,
  getDefaultPeriodTimes,
  getChorePeriodLabel,
  getChoreEffectiveTimeRange,
  hasCustomChoreHours
} from '../utils/dateTime';
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
  Sparkles,
  Clock,
  Sliders,
  X,
  Lock,
  KeyRound,
  Minus,
  Check,
  AlertCircle,
  Link,
  Pencil,
  History,
  RotateCcw,
  Shirt,
  Trophy,
  Save,
  ChevronRight,
  ChevronDown,
  Home,
  CheckCircle2,
  Undo2,
  ChevronsDownUp,
  ChevronsUpDown
} from 'lucide-react';

interface SettingsViewProps {
  appState: AppState;
  allEvents: CalendarEvent[];
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onUpdateFamilyMembers: (members: FamilyMember[]) => void;
  onSaveSettingsBundle?: (patch: {
    settings?: Partial<AppSettings>;
    familyMembers?: FamilyMember[];
    calendars?: CalendarSource[];
  }) => Promise<void> | void;
  onAddFamilyMember: (member: FamilyMember) => void;
  onAdjustMemberStars: (memberId: string, delta: number, reason?: string, dateStr?: string) => void;
  onUpdateStarLog: (logId: string, updates: { title: string; stars: number; date: string }) => void;
  onDeleteStarLog: (logId: string) => void;
  onClearMemberStars: (memberId: string) => void;
  onAddChore: (chore: Omit<Chore, 'id' | 'completedToday'>) => void;
  onUpdateChore: (choreId: string, updates: Partial<Chore>) => void;
  onDeleteChore: (choreId: string) => void;
  onAddReward: (reward: Omit<RewardItem, 'id' | 'claimedCount'>) => void;
  onUpdateReward: (rewardId: string, patch: Partial<RewardItem>) => void;
  onDeleteReward: (rewardId: string) => void;
  onUpdateCalendars: (calendars: CalendarSource[]) => void;
  onOpenManageCalendars: () => void;
  onAddDailyRule: (rule: Omit<DailyAutomationRule, 'id'>) => void;
  onUpdateDailyRule: (ruleId: string, patch: Partial<DailyAutomationRule>) => void;
  onDeleteDailyRule: (ruleId: string) => void;
  onHaStatusChanged?: (status?: HaStatusInfo) => void;
  onLockSettings: () => void;
  onRestoreState: (state: AppState) => Promise<void>;
}

const EMOJI_CHOICES = ['👨', '👩', '👦', '👧', '🧑', '👴', '👵', '🐶', '🐱', '⭐', '⚽', '🎨'];
const CHORE_EMOJIS = ['🪥', '🎒', '📚', '🧸', '🍽️', '✨', '🐾', '🚴', '⚽', '🛏️', '🚿', '🧹'];

type TreeGroupId = 'general' | 'family' | 'calendars' | 'ha' | 'security';
type TreeNodeId =
  | 'general.greeting'
  | 'general.weather'
  | 'general.clock'
  | 'family.members'
  | 'family.stars'
  | 'family.chores'
  | 'family.rewards'
  | 'calendars.roles'
  | 'calendars.manage'
  | 'ha.connection'
  | 'ha.automations'
  | 'security.password';

const ALL_GROUP_IDS: TreeGroupId[] = ['general', 'family', 'calendars', 'ha', 'security'];
const ALL_NODE_IDS: TreeNodeId[] = [
  'general.greeting',
  'general.weather',
  'general.clock',
  'family.members',
  'family.stars',
  'family.chores',
  'family.rewards',
  'calendars.roles',
  'calendars.manage',
  'ha.connection',
  'ha.automations',
  'security.password'
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  appState,
  allEvents,
  onUpdateSettings,
  onUpdateFamilyMembers,
  onSaveSettingsBundle,
  onAddFamilyMember,
  onAdjustMemberStars,
  onUpdateStarLog,
  onDeleteStarLog,
  onClearMemberStars,
  onAddChore,
  onUpdateChore,
  onDeleteChore,
  onAddReward,
  onUpdateReward,
  onDeleteReward,
  onUpdateCalendars,
  onOpenManageCalendars,
  onAddDailyRule,
  onUpdateDailyRule,
  onDeleteDailyRule,
  onHaStatusChanged,
  onLockSettings,
  onRestoreState
}) => {
  const { settings, familyMembers, calendars, starLogs, chores, rewards } = appState;
  const dailyRules = appState.dailyAutomationRules || [];

  // --- Collapsible Boomstructuur (Tree) state ---
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: TreeGroupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleNode = (nodeId: TreeNodeId) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const anyGroupExpanded = ALL_GROUP_IDS.some(id => Boolean(expandedGroups[id]));

  const expandAllTree = () => {
    const g: Record<string, boolean> = {};
    ALL_GROUP_IDS.forEach(id => {
      g[id] = true;
    });
    const n: Record<string, boolean> = {};
    ALL_NODE_IDS.forEach(id => {
      n[id] = true;
    });
    setExpandedGroups(g);
    setExpandedNodes(n);
  };

  const collapseAllTree = () => {
    setExpandedGroups({});
    setExpandedNodes({});
  };

  // --- Draft state & explicit Opslaan tracking ---
  const [draftSettings, setDraftSettings] = useState<AppSettings>(settings);
  const [draftMembers, setDraftMembers] = useState<FamilyMember[]>(familyMembers);
  const [draftCalendars, setDraftCalendars] = useState<CalendarSource[]>(calendars);

  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  const [isMembersDirty, setIsMembersDirty] = useState(false);
  const [isCalendarsDirty, setIsCalendarsDirty] = useState(false);

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const hasUnsavedChanges = isSettingsDirty || isMembersDirty || isCalendarsDirty;

  // Keep non-dirty slices synced with live props & preserve live stars/new IDs when dirty
  useEffect(() => {
    if (!isSettingsDirty) {
      setDraftSettings(settings);
    } else {
      // Keep live weather/HA status fields fresh if updated asynchronously
      setDraftSettings(prev => ({
        ...prev,
        weatherTemp: settings.weatherTemp,
        weatherCondition: settings.weatherCondition,
        weatherCode: settings.weatherCode,
        weatherTempMin: settings.weatherTempMin,
        weatherTempMax: settings.weatherTempMax,
        weatherPrecipitationProb: settings.weatherPrecipitationProb,
        weatherWindMax: settings.weatherWindMax,
        weatherDailyCode: settings.weatherDailyCode,
        weatherDailyCondition: settings.weatherDailyCondition,
        haUrl: settings.haUrl,
        hasHaToken: settings.hasHaToken,
        haAddonMode: settings.haAddonMode,
        hasSettingsPassword: settings.hasSettingsPassword
      }));
    }
  }, [settings, isSettingsDirty]);

  useEffect(() => {
    if (!isMembersDirty) {
      setDraftMembers(familyMembers);
    } else {
      // Sync live star balances and added/deleted member IDs without discarding edited names/roles/colors
      setDraftMembers(prev => {
        const liveById = new Map(familyMembers.map(m => [m.id, m]));
        const kept = prev
          .filter(m => liveById.has(m.id))
          .map(m => ({ ...m, stars: liveById.get(m.id)!.stars }));
        const prevIds = new Set(kept.map(m => m.id));
        const added = familyMembers.filter(m => !prevIds.has(m.id));
        return [...kept, ...added];
      });
    }
  }, [familyMembers, isMembersDirty]);

  useEffect(() => {
    if (!isCalendarsDirty) {
      setDraftCalendars(calendars);
    } else {
      setDraftCalendars(prev => {
        const liveById = new Map(calendars.map(c => [c.id, c]));
        const kept = prev.filter(c => liveById.has(c.id));
        const prevIds = new Set(kept.map(c => c.id));
        const added = calendars.filter(c => !prevIds.has(c.id));
        return [...kept, ...added];
      });
    }
  }, [calendars, isCalendarsDirty]);

  const updateDraftSettings = useCallback((partial: Partial<AppSettings>) => {
    setDraftSettings(prev => ({ ...prev, ...partial }));
    setIsSettingsDirty(true);
    setSaveSuccessMsg('');
  }, []);

  const handleSaveDrafts = async () => {
    if (!hasUnsavedChanges) return;
    try {
      setIsSavingDraft(true);
      if (onSaveSettingsBundle) {
        await onSaveSettingsBundle({
          settings: isSettingsDirty ? draftSettings : undefined,
          familyMembers: isMembersDirty ? draftMembers : undefined,
          calendars: isCalendarsDirty ? draftCalendars : undefined
        });
      } else {
        if (isSettingsDirty) onUpdateSettings(draftSettings);
        if (isMembersDirty) onUpdateFamilyMembers(draftMembers);
        if (isCalendarsDirty) onUpdateCalendars(draftCalendars);
      }
      setIsSettingsDirty(false);
      setIsMembersDirty(false);
      setIsCalendarsDirty(false);
      setSaveSuccessMsg('Alle wijzigingen zijn opgeslagen!');
      setTimeout(() => {
        setSaveSuccessMsg(prev => (prev === 'Alle wijzigingen zijn opgeslagen!' ? '' : prev));
      }, 4500);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleDiscardDrafts = () => {
    setDraftSettings(settings);
    setDraftMembers(familyMembers);
    setDraftCalendars(calendars);
    setIsSettingsDirty(false);
    setIsMembersDirty(false);
    setIsCalendarsDirty(false);
    setSaveSuccessMsg('');
  };

  // Weather search state
  const [cityQuery, setCityQuery] = useState(settings.cityName || '');
  const [cityResults, setCityResults] = useState<WeatherLocationResult[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [isRefreshingWeather, setIsRefreshingWeather] = useState(false);
  const [weatherFeedback, setWeatherFeedback] = useState('');

  useEffect(() => {
    if (!isSettingsDirty) {
      setCityQuery(settings.cityName || '');
    }
  }, [settings.cityName, isSettingsDirty]);

  // New family member form
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'parent' | 'child'>('child');
  const [newMemberColor, setNewMemberColor] = useState('#10B981');
  const [newMemberEmoji, setNewMemberEmoji] = useState('🧑');
  const [newMemberStartingStars, setNewMemberStartingStars] = useState('0');
  const [newMemberPhotoFile, setNewMemberPhotoFile] = useState<File | null>(null);
  const [newMemberPhotoPreview, setNewMemberPhotoPreview] = useState<string | null>(null);
  const [uploadingMemberId, setUploadingMemberId] = useState<string | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState('');
  const [confirmDeleteMemberId, setConfirmDeleteMemberId] = useState<string | null>(null);

  // Per-member manual star adjustment input
  const [starReasons, setStarReasons] = useState<Record<string, string>>({});
  const [customStarAmounts, setCustomStarAmounts] = useState<Record<string, string>>({});

  // Star history management section state
  const [starHistoryMemberFilter, setStarHistoryMemberFilter] = useState<string>('all');
  const [looseStarMemberId, setLooseStarMemberId] = useState<string>(
    familyMembers.find(m => m.role === 'child')?.id || familyMembers[0]?.id || ''
  );
  const [looseStarMode, setLooseStarMode] = useState<'add' | 'subtract'>('add');
  const [looseStarAmount, setLooseStarAmount] = useState<string>('2');
  const [looseStarReason, setLooseStarReason] = useState<string>('');
  const [looseStarDate, setLooseStarDate] = useState<string>(() => getLocalDateStr());
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editLogTitle, setEditLogTitle] = useState<string>('');
  const [editLogStars, setEditLogStars] = useState<string>('1');
  const [editLogDate, setEditLogDate] = useState<string>('');
  const [confirmClearMemberId, setConfirmClearMemberId] = useState<string | null>(null);

  // Routines / Takenbord management state (password-protected)
  const [choreMemberFilter, setChoreMemberFilter] = useState<string>('all');
  const [newChoreMemberId, setNewChoreMemberId] = useState<string>(
    familyMembers.find(m => m.role === 'child')?.id || familyMembers[0]?.id || ''
  );
  const [newChoreTitle, setNewChoreTitle] = useState('');
  const [newChorePeriod, setNewChorePeriod] = useState<ChorePeriod>('morning');
  const [newChoreUseHours, setNewChoreUseHours] = useState<boolean>(true);
  const [newChoreStartTime, setNewChoreStartTime] = useState<string>('00:00');
  const [newChoreEndTime, setNewChoreEndTime] = useState<string>('12:00');
  const [newChoreStars, setNewChoreStars] = useState<number>(1);
  const [newChoreIcon, setNewChoreIcon] = useState<string>('🪥');
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  const [editChoreMemberId, setEditChoreMemberId] = useState<string>('');
  const [editChoreTitle, setEditChoreTitle] = useState<string>('');
  const [editChorePeriod, setEditChorePeriod] = useState<ChorePeriod>('morning');
  const [editChoreUseHours, setEditChoreUseHours] = useState<boolean>(true);
  const [editChoreStartTime, setEditChoreStartTime] = useState<string>('00:00');
  const [editChoreEndTime, setEditChoreEndTime] = useState<string>('12:00');
  const [editChoreStars, setEditChoreStars] = useState<number>(1);
  const [editChoreIcon, setEditChoreIcon] = useState<string>('✨');
  const [confirmDeleteChoreId, setConfirmDeleteChoreId] = useState<string | null>(null);

  // Rewards management state (password-protected)
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardStars, setNewRewardStars] = useState<string>('10');
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [editRewardTitle, setEditRewardTitle] = useState('');
  const [editRewardStars, setEditRewardStars] = useState<string>('10');
  const [editRewardClaimed, setEditRewardClaimed] = useState<string>('0');
  const [confirmDeleteRewardId, setConfirmDeleteRewardId] = useState<string | null>(null);

  // Clothing advice rules editor toggle
  const [showClothingRulesEditor, setShowClothingRulesEditor] = useState(false);

  // New local calendar form
  const [isAddingCalendar, setIsAddingCalendar] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [newCalIcon, setNewCalIcon] = useState('📅');
  const [newCalColor, setNewCalColor] = useState('#8B5CF6');
  const [newCalDescription, setNewCalDescription] = useState('');
  const [newCalCategory, setNewCalCategory] = useState<CalendarCategory>('general');
  const [newCalAssignmentMode, setNewCalAssignmentMode] = useState<CalendarAssignmentMode>('family');
  const [newCalMemberIds, setNewCalMemberIds] = useState<string[]>([]);
  const [newCalMultiDayMode, setNewCalMultiDayMode] = useState<CalendarMultiDayMode>('smart_cutoff');

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const previewGreetingText =
    draftSettings.showFamilyNameInGreeting && draftSettings.familyGreetingName.trim()
      ? `Goedemiddag, ${draftSettings.familyGreetingName.trim()}! 👋`
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
      const weatherPatch: Partial<AppSettings> = {
        cityName: loc.name,
        weatherLat: loc.latitude,
        weatherLon: loc.longitude,
        weatherTemp: weather.temp,
        weatherCondition: weather.condition,
        weatherCode: weather.weatherCode,
        weatherTempMin: weather.tempMin,
        weatherTempMax: weather.tempMax,
        weatherPrecipitationProb: weather.precipitationProb,
        weatherWindMax: weather.windSpeedMax,
        weatherDailyCode: weather.dailyWeatherCode,
        weatherDailyCondition: weather.dailyCondition
      };
      onUpdateSettings(weatherPatch);
      setDraftSettings(prev => ({ ...prev, ...weatherPatch }));
      setCityQuery(loc.name);
      setCityResults([]);
      setWeatherFeedback(`Weer bijgewerkt voor ${loc.name}: ${weather.temp}°C (${weather.condition})`);
    } catch {
      const locPatch: Partial<AppSettings> = {
        cityName: loc.name,
        weatherLat: loc.latitude,
        weatherLon: loc.longitude
      };
      onUpdateSettings(locPatch);
      setDraftSettings(prev => ({ ...prev, ...locPatch }));
      setCityQuery(loc.name);
      setCityResults([]);
      setWeatherFeedback('Plaats opgeslagen, maar actueel weer kon nu niet opgehaald worden.');
    } finally {
      setIsRefreshingWeather(false);
    }
  };

  const handleRefreshWeather = async () => {
    const lat = draftSettings.weatherLat ?? settings.weatherLat;
    const lon = draftSettings.weatherLon ?? settings.weatherLon;
    if (lat == null || lon == null) return;
    try {
      setIsRefreshingWeather(true);
      const weather = await fetchCurrentWeather(lat, lon);
      const patch: Partial<AppSettings> = {
        weatherTemp: weather.temp,
        weatherCondition: weather.condition,
        weatherCode: weather.weatherCode,
        weatherTempMin: weather.tempMin,
        weatherTempMax: weather.tempMax,
        weatherPrecipitationProb: weather.precipitationProb,
        weatherWindMax: weather.windSpeedMax,
        weatherDailyCode: weather.dailyWeatherCode,
        weatherDailyCondition: weather.dailyCondition
      };
      onUpdateSettings(patch);
      setDraftSettings(prev => ({ ...prev, ...patch }));
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
      setDraftMembers(prev => prev.map(m => (m.id === memberId ? { ...m, photoUrl } : m)));
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
    setDraftMembers(prev =>
      prev.map(m => (m.id === memberId ? { ...m, photoUrl: undefined } : m))
    );
    onUpdateFamilyMembers(
      familyMembers.map(m => (m.id === memberId ? { ...m, photoUrl: undefined } : m))
    );
  };

  const handleUpdateMemberField = (memberId: string, patch: Partial<FamilyMember>) => {
    setDraftMembers(prev => prev.map(m => (m.id === memberId ? { ...m, ...patch } : m)));
    setIsMembersDirty(true);
    setSaveSuccessMsg('');
  };

  const handleDeleteMember = (memberId: string) => {
    if (draftMembers.length <= 1) return;
    setDraftMembers(prev => prev.filter(m => m.id !== memberId));
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

    const startingStars = Math.max(0, parseInt(newMemberStartingStars || '0', 10) || 0);
    const newMember: FamilyMember = {
      id,
      name: newMemberName.trim(),
      role: newMemberRole,
      color: newMemberColor,
      avatar: newMemberEmoji,
      photoUrl,
      stars: startingStars
    };

    onAddFamilyMember(newMember);
    setNewMemberName('');
    setNewMemberStartingStars('0');
    setNewMemberPhotoFile(null);
    setNewMemberPhotoPreview(null);
    setIsAddingMember(false);
  };

  const handleStarAdjust = (memberId: string, delta: number) => {
    if (!delta || Number.isNaN(delta)) return;
    const reason = (starReasons[memberId] || '').trim();
    onAdjustMemberStars(memberId, delta, reason || undefined);
    if (reason) {
      setStarReasons(prev => ({ ...prev, [memberId]: '' }));
    }
  };

  const handleAddLooseStarsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = looseStarMemberId || draftMembers[0]?.id;
    const amt = Math.abs(parseInt(looseStarAmount || '0', 10) || 0);
    if (!targetId || amt <= 0) return;

    const delta = looseStarMode === 'add' ? amt : -amt;
    const defaultReason =
      looseStarMode === 'add'
        ? 'Extra sterren toegevoegd (zonder taak)'
        : 'Sterren afgetrokken';

    onAdjustMemberStars(
      targetId,
      delta,
      looseStarReason.trim() || defaultReason,
      looseStarDate || getLocalDateStr()
    );
    setLooseStarReason('');
  };

  const startEditingLog = (entry: { id: string; title: string; stars: number; date: string }) => {
    setEditingLogId(entry.id);
    setEditLogTitle(entry.title);
    setEditLogStars(String(entry.stars));
    setEditLogDate(entry.date);
  };

  const handleSaveLogEdit = (logId: string) => {
    const parsedStars = parseInt(editLogStars, 10);
    if (Number.isNaN(parsedStars)) return;
    onUpdateStarLog(logId, {
      title: editLogTitle,
      stars: parsedStars,
      date: editLogDate
    });
    setEditingLogId(null);
  };

  // --- Chore / Routine handlers (password-protected) ---
  const handleNewChorePeriodChange = (period: ChorePeriod) => {
    setNewChorePeriod(period);
    if (period === 'all_day') {
      setNewChoreUseHours(false);
      setNewChoreStartTime('00:00');
      setNewChoreEndTime('23:59');
    } else {
      const def = getDefaultPeriodTimes(period);
      setNewChoreUseHours(true);
      setNewChoreStartTime(def.startTime);
      setNewChoreEndTime(def.endTime);
    }
  };

  const handleAddChoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetMemberId = newChoreMemberId || draftMembers[0]?.id;
    if (!newChoreTitle.trim() || !targetMemberId) return;

    const shouldSaveHours = newChorePeriod !== 'all_day' || newChoreUseHours;
    onAddChore({
      memberId: targetMemberId,
      title: newChoreTitle.trim(),
      period: newChorePeriod,
      startTime: shouldSaveHours ? newChoreStartTime : undefined,
      endTime: shouldSaveHours ? newChoreEndTime : undefined,
      stars: Math.max(1, Number(newChoreStars) || 1),
      icon: newChoreIcon || '✨'
    });
    setNewChoreTitle('');
  };

  const startEditingChore = (chore: Chore) => {
    const def = getDefaultPeriodTimes(chore.period);
    setEditingChoreId(chore.id);
    setConfirmDeleteChoreId(null);
    setEditChoreMemberId(chore.memberId);
    setEditChoreTitle(chore.title);
    setEditChorePeriod(chore.period);
    setEditChoreUseHours(
      chore.period !== 'all_day' || Boolean(chore.startTime && chore.endTime)
    );
    setEditChoreStartTime(chore.startTime || def.startTime);
    setEditChoreEndTime(chore.endTime || def.endTime);
    setEditChoreStars(chore.stars);
    setEditChoreIcon(chore.icon || '✨');
  };

  const handleEditChorePeriodChange = (period: ChorePeriod) => {
    setEditChorePeriod(period);
    if (period === 'all_day') {
      setEditChoreUseHours(false);
      setEditChoreStartTime('00:00');
      setEditChoreEndTime('23:59');
    } else {
      const def = getDefaultPeriodTimes(period);
      setEditChoreUseHours(true);
      setEditChoreStartTime(def.startTime);
      setEditChoreEndTime(def.endTime);
    }
  };

  const handleSaveChoreEdit = (choreId: string) => {
    if (!editChoreTitle.trim()) return;
    const shouldSaveHours = editChorePeriod !== 'all_day' || editChoreUseHours;
    onUpdateChore(choreId, {
      memberId: editChoreMemberId || draftMembers[0]?.id,
      title: editChoreTitle.trim(),
      period: editChorePeriod,
      startTime: shouldSaveHours ? editChoreStartTime : undefined,
      endTime: shouldSaveHours ? editChoreEndTime : undefined,
      stars: Math.max(1, Number(editChoreStars) || 1),
      icon: editChoreIcon || '✨'
    });
    setEditingChoreId(null);
  };

  // --- Reward handlers ---
  const handleAddRewardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRewardTitle.trim()) return;
    onAddReward({
      title: newRewardTitle.trim(),
      starsRequired: Math.max(1, parseInt(newRewardStars || '10', 10) || 10)
    });
    setNewRewardTitle('');
    setNewRewardStars('10');
  };

  const startEditingReward = (reward: RewardItem) => {
    setEditingRewardId(reward.id);
    setConfirmDeleteRewardId(null);
    setEditRewardTitle(reward.title);
    setEditRewardStars(String(reward.starsRequired));
    setEditRewardClaimed(String(reward.claimedCount || 0));
  };

  const handleSaveRewardEdit = (rewardId: string) => {
    if (!editRewardTitle.trim()) return;
    onUpdateReward(rewardId, {
      title: editRewardTitle.trim(),
      starsRequired: Math.max(1, parseInt(editRewardStars || '1', 10) || 1),
      claimedCount: Math.max(0, parseInt(editRewardClaimed || '0', 10) || 0)
    });
    setEditingRewardId(null);
  };

  // --- Clothing rules helpers (drafted + saved with Opslaan) ---
  const activeClothingRules: ClothingAdviceRule[] =
    Array.isArray(draftSettings.clothingRules) && draftSettings.clothingRules.length > 0
      ? draftSettings.clothingRules
      : DEFAULT_CLOTHING_RULES;

  const handleUpdateClothingRule = (
    ruleId: string,
    patch: Partial<ClothingAdviceRule>
  ) => {
    const next = activeClothingRules.map(r => (r.id === ruleId ? { ...r, ...patch } : r));
    updateDraftSettings({ clothingRules: next });
  };

  const handleResetClothingDefaults = () => {
    updateDraftSettings({
      showClothingAdvice: true,
      clothingRules: DEFAULT_CLOTHING_RULES,
      clothingRainThreshold: DEFAULT_CLOTHING_RAIN_THRESHOLD,
      clothingRainAdvice: DEFAULT_CLOTHING_RAIN_ADVICE,
      clothingWindThreshold: DEFAULT_CLOTHING_WIND_THRESHOLD,
      clothingWindAdvice: DEFAULT_CLOTHING_WIND_ADVICE,
      clothingCustomNote: ''
    });
  };

  // --- Calendar handlers (drafted + saved with Opslaan) ---
  const handleUpdateCalendarField = (calId: string, patch: Partial<CalendarSource>) => {
    setDraftCalendars(prev => prev.map(c => (c.id === calId ? { ...c, ...patch } : c)));
    setIsCalendarsDirty(true);
    setSaveSuccessMsg('');
  };

  const handleCreateLocalCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalName.trim()) return;

    const newCal: CalendarSource = {
      id: 'cal-' + Math.random().toString(36).substring(2, 9),
      name: newCalName.trim(),
      icon: newCalIcon || '📅',
      color: newCalColor,
      category: newCalCategory !== 'general' ? newCalCategory : undefined,
      type: 'local',
      visible: true,
      description: newCalDescription.trim() || 'Lokale gezinsagenda',
      assignmentMode: newCalAssignmentMode,
      memberIds: newCalAssignmentMode === 'members' ? newCalMemberIds : [],
      multiDayMode: newCalMultiDayMode
    };

    const nextCals = [...draftCalendars, newCal];
    setDraftCalendars(nextCals);
    onUpdateCalendars(nextCals);
    setIsCalendarsDirty(false);
    setNewCalName('');
    setNewCalIcon('📅');
    setNewCalDescription('');
    setNewCalCategory('general');
    setNewCalAssignmentMode('family');
    setNewCalMemberIds([]);
    setNewCalMultiDayMode('smart_cutoff');
    setIsAddingCalendar(false);
  };

  const handleAssignCalendarCategory = (calId: string, catVal: CalendarCategory) => {
    if (catVal === 'general') {
      handleUpdateCalendarField(calId, { category: 'general' });
      return;
    }
    const preset = getCalendarPresetByKey(catVal);
    if (!preset) return;
    handleUpdateCalendarField(calId, {
      category: catVal,
      icon: preset.icon,
      color: preset.color
    });
  };

  const handleDeleteCalendar = (calId: string) => {
    if (draftCalendars.length <= 1) return;
    const nextCals = draftCalendars.filter(c => c.id !== calId);
    setDraftCalendars(nextCals);
    onUpdateCalendars(nextCals);
  };

  // --- Change password ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    if (newPassword.length < 4) {
      setPasswordFeedback({ type: 'err', msg: 'Nieuw wachtwoord moet minimaal 4 tekens zijn.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordFeedback({ type: 'err', msg: 'Nieuwe wachtwoorden komen niet overeen.' });
      return;
    }

    try {
      setIsChangingPassword(true);
      await changeSettingsPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordFeedback({ type: 'ok', msg: 'Wachtwoord succesvol gewijzigd.' });
    } catch (err: any) {
      setPasswordFeedback({ type: 'err', msg: err.message || 'Kon wachtwoord niet wijzigen.' });
    } finally {
      setIsChangingPassword(false);
    }
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
          setIsSettingsDirty(false);
          setIsMembersDirty(false);
          setIsCalendarsDirty(false);
        }
      } catch {
        // invalid JSON
      }
    };
    reader.readAsText(file);
  };

  // Helper: inline Save button bar inside draft-editable tree nodes
  const renderSectionSaveFooter = (dirty: boolean) => (
    <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
      <div className="text-[11px] font-medium">
        {dirty ? (
          <span className="text-amber-600 dark:text-amber-400">
            ● Niet-opgeslagen wijzigingen in deze sectie
          </span>
        ) : (
          <span className="text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Alle instellingen in deze sectie zijn opgeslagen</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {dirty && (
          <button
            type="button"
            onClick={handleDiscardDrafts}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Herstellen</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleSaveDrafts}
          disabled={!hasUnsavedChanges || isSavingDraft}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs ${
            dirty
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : hasUnsavedChanges
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSavingDraft ? 'Opslaan...' : dirty ? 'Opslaan' : 'Opgeslagen ✓'}</span>
        </button>
      </div>
    </div>
  );

  // Reusable Tree Branch Card + Leaf Child Wrapper
  const renderTreeGroup = (opts: {
    id: TreeGroupId;
    icon: React.ReactNode;
    emoji: string;
    title: string;
    subtitle: string;
    badge?: string;
    isDirty?: boolean;
    children: React.ReactNode;
  }) => {
    const isOpen = Boolean(expandedGroups[opts.id]);
    return (
      <div
        className={`rounded-2xl border transition-colors ${
          opts.isDirty
            ? 'border-amber-300 dark:border-amber-700/80 bg-white dark:bg-slate-900'
            : isOpen
            ? 'border-indigo-200 dark:border-indigo-900/70 bg-white dark:bg-slate-900'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
        } shadow-xs overflow-hidden`}
      >
        <button
          type="button"
          onClick={() => toggleGroup(opts.id)}
          className="w-full px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-base">
              {opts.emoji}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {opts.title}
                </span>
                {opts.isDirty && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                    Gewijzigd
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {opts.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {opts.badge && (
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                {opts.badge}
              </span>
            )}
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 bg-slate-100/70 dark:bg-slate-800/70">
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          </div>
        </button>

        {isOpen && (
          <div className="px-3 sm:px-5 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/20">
            <div className="ml-2 sm:ml-3.5 pl-3.5 sm:pl-5 border-l-2 border-indigo-200 dark:border-indigo-900/70 space-y-2.5 pt-2">
              {opts.children}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTreeNode = (opts: {
    id: TreeNodeId;
    icon: React.ReactNode;
    title: string;
    summary: string;
    isDirty?: boolean;
    rightBadge?: string;
    children: React.ReactNode;
  }) => {
    const isOpen = Boolean(expandedNodes[opts.id]);
    return (
      <div className="relative">
        {/* Horizontal tree connector line */}
        <span
          aria-hidden="true"
          className="absolute -left-3.5 sm:-left-5 top-5 w-3.5 sm:w-5 h-0.5 bg-indigo-200 dark:bg-indigo-900/70"
        />
        <div
          className={`rounded-xl border transition-colors bg-white dark:bg-slate-900 ${
            opts.isDirty
              ? 'border-amber-300 dark:border-amber-700/70'
              : isOpen
              ? 'border-indigo-200 dark:border-indigo-800/70 shadow-xs'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <button
            type="button"
            onClick={() => toggleNode(opts.id)}
            className="w-full px-3.5 sm:px-4 py-3 flex items-center justify-between gap-2.5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/30 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0">{opts.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {opts.title}
                  </span>
                  {opts.isDirty && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      Niet opgeslagen
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {opts.summary}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {opts.rightBadge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {opts.rightBadge}
                </span>
              )}
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {isOpen && (
            <div className="px-3.5 sm:px-5 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
              {opts.children}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-24 max-w-5xl mx-auto">
      {/* Page Title + Tree Controls + Lock Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Instellingen
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Klik een categorie in de boomstructuur open om instellingen te bekijken of aan te passen.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={anyGroupExpanded ? collapseAllTree : expandAllTree}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs transition-colors"
          >
            {anyGroupExpanded ? (
              <>
                <ChevronsDownUp className="w-3.5 h-3.5 text-indigo-500" />
                <span>Alles inklappen</span>
              </>
            ) : (
              <>
                <ChevronsUpDown className="w-3.5 h-3.5 text-indigo-500" />
                <span>Alles openklikken</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onLockSettings}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Vergrendelen</span>
          </button>
        </div>
      </div>

      {/* Prominent Global Save Status Bar */}
      <div
        className={`rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
          hasUnsavedChanges
            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
            : saveSuccessMsg
            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 text-xs">
          {hasUnsavedChanges ? (
            <>
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  Er zijn niet-opgeslagen wijzigingen.
                </span>{' '}
                <span className="text-amber-800/80 dark:text-amber-300/80">
                  Klik op &ldquo;Wijzigingen opslaan&rdquo; om ze definitief te bewaren.
                </span>
              </div>
            </>
          ) : saveSuccessMsg ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-800 dark:text-emerald-200">
                {saveSuccessMsg}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                Alle instellingen zijn opgeslagen.
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleDiscardDrafts}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Annuleren</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveDrafts}
            disabled={!hasUnsavedChanges || isSavingDraft}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSavingDraft ? 'Bezig met opslaan...' : 'Wijzigingen opslaan'}</span>
          </button>
        </div>
      </div>

      {/* BOOMSTRUCTUUR: 5 Collapsible Root Branches */}
      <div className="space-y-3">
        {/* BRANCH 1: Algemeen, Begroeting & Weer */}
        {renderTreeGroup({
          id: 'general',
          emoji: '🏠',
          icon: <Sliders className="w-4 h-4 text-indigo-500" />,
          title: 'Algemeen, Begroeting & Weer',
          subtitle: 'Dashboardnaam, begroeting, woonplaats, live weer & kledingadvies, klok en back-up',
          badge: `${draftSettings.cityName || 'Plaats'} · ${draftSettings.timeFormat24h ? '24u' : '12u'}`,
          isDirty: isSettingsDirty,
          children: (
            <>
              {/* 1.1 Begroeting & Dashboardnaam */}
              {renderTreeNode({
                id: 'general.greeting',
                icon: <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                title: 'Begroeting & Dashboardnaam',
                summary: `Titel: "${draftSettings.dashboardName || 'HomeBoard'}" · Begroeting ${draftSettings.showFamilyNameInGreeting ? `met "${draftSettings.familyGreetingName}"` : 'zonder familienaam'}`,
                isDirty: isSettingsDirty,
                children: (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-4">
                        <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white text-sm">
                              Familienaam tonen in begroeting
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Zet uit om alleen &ldquo;Goedemorgen!&rdquo; zonder naam weer te geven.
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={draftSettings.showFamilyNameInGreeting}
                            onChange={e =>
                              updateDraftSettings({ showFamilyNameInGreeting: e.target.checked })
                            }
                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
                          />
                        </label>

                        {draftSettings.showFamilyNameInGreeting && (
                          <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Naam in begroeting (bijv. Familie De Vries, Huize Bakker)
                            </label>
                            <input
                              type="text"
                              value={draftSettings.familyGreetingName}
                              onChange={e =>
                                updateDraftSettings({ familyGreetingName: e.target.value })
                              }
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
                            value={draftSettings.dashboardName}
                            onChange={e => updateDraftSettings({ dashboardName: e.target.value })}
                            placeholder="bijv. HomeBoard, Ons Huisbord"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-xl p-5 flex flex-col justify-center space-y-2 border border-slate-800">
                        <span className="text-[11px] text-indigo-300 uppercase tracking-wider font-semibold">
                          Voorbeeld op dashboard · {draftSettings.dashboardName || 'HomeBoard'}
                        </span>
                        <div className="text-2xl font-extrabold tracking-tight">
                          {previewGreetingText}
                        </div>
                        <p className="text-xs text-slate-300">
                          Deze tekst past zich automatisch aan naar ochtend, middag en avond.
                        </p>
                      </div>
                    </div>

                    {renderSectionSaveFooter(isSettingsDirty)}
                  </div>
                )
              })}

              {/* 1.2 Woonplaats, Live Weer & Kledingadvies */}
              {renderTreeNode({
                id: 'general.weather',
                icon: <MapPin className="w-4 h-4 text-amber-500" />,
                title: 'Woonplaats, Live Weer & Kledingadvies',
                summary: `${draftSettings.cityName || 'Geen stad'} (${draftSettings.weatherTemp ?? '--'}°C) · Kledingadvies ${draftSettings.showClothingAdvice !== false ? 'aan' : 'uit'}`,
                rightBadge: `${draftSettings.weatherTemp ?? '--'}°C`,
                isDirty: isSettingsDirty,
                children: (
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-slate-500">
                        Kies je eigen stad of gemeente voor automatische live weersvoorspellingen.
                      </p>
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {draftSettings.cityName}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {draftSettings.weatherTemp}°C
                        </span>
                        <span className="text-slate-500">({draftSettings.weatherCondition})</span>
                        <button
                          type="button"
                          onClick={handleRefreshWeather}
                          disabled={isRefreshingWeather}
                          className="ml-1 p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                          title="Weer nu verversen"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isRefreshingWeather ? 'animate-spin' : ''}`}
                          />
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleSearchCity} className="flex items-center gap-2">
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
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                        {cityResults.map(loc => (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => handleSelectCity(loc)}
                            className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-between gap-2 transition-colors"
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {loc.name}
                              </span>
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

                    {/* Kids' Clothing Advice Customization */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <label className="inline-flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draftSettings.showClothingAdvice !== false}
                            onChange={e =>
                              updateDraftSettings({ showClothingAdvice: e.target.checked })
                            }
                            className="w-4 h-4 rounded text-indigo-600"
                          />
                          <Shirt className="w-4 h-4 text-amber-500" />
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            Weer & kledingadvies voor de kindjes tonen op het dashboard
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setShowClothingRulesEditor(p => !p)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200"
                        >
                          {showClothingRulesEditor ? 'Regels verbergen' : 'Kledingregels aanpassen'}
                        </button>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Eigen notitie op het kledingbord vandaag (optioneel, bijv. &ldquo;Vandaag sportkleren of zwemgerief mee!&rdquo;)
                        </label>
                        <input
                          type="text"
                          value={draftSettings.clothingCustomNote || ''}
                          onChange={e => updateDraftSettings({ clothingCustomNote: e.target.value })}
                          placeholder="bijv. Vergeet de turnzak of kaplaarzen niet!"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>

                      {showClothingRulesEditor && (
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Temperatuurzones & kledingsuggesties aanpassen
                            </span>
                            <button
                              type="button"
                              onClick={handleResetClothingDefaults}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Standaardadvies herstellen</span>
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {[...activeClothingRules]
                              .sort((a, b) => a.maxTemp - b.maxTemp)
                              .map(rule => (
                                <div
                                  key={rule.id}
                                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                                >
                                  <div className="sm:col-span-3">
                                    <label className="block font-semibold text-slate-500 mb-1">
                                      Zone
                                    </label>
                                    <input
                                      type="text"
                                      value={rule.label}
                                      onChange={e =>
                                        handleUpdateClothingRule(rule.id, { label: e.target.value })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                    />
                                  </div>

                                  <div className="sm:col-span-2">
                                    <label className="block font-semibold text-slate-500 mb-1">
                                      T/m (°C)
                                    </label>
                                    <input
                                      type="number"
                                      value={rule.maxTemp}
                                      onChange={e =>
                                        handleUpdateClothingRule(rule.id, {
                                          maxTemp: parseInt(e.target.value || '20', 10)
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-center"
                                    />
                                  </div>

                                  <div className="sm:col-span-3">
                                    <label className="block font-semibold text-slate-500 mb-1">
                                      Hoofdadvies
                                    </label>
                                    <input
                                      type="text"
                                      value={rule.advice}
                                      onChange={e =>
                                        handleUpdateClothingRule(rule.id, { advice: e.target.value })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                    />
                                  </div>

                                  <div className="sm:col-span-4">
                                    <label className="block font-semibold text-slate-500 mb-1">
                                      Kledingstukken (komma-gescheiden)
                                    </label>
                                    <input
                                      type="text"
                                      value={(rule.items || []).join(', ')}
                                      onChange={e =>
                                        handleUpdateClothingRule(rule.id, {
                                          items: e.target.value
                                            .split(',')
                                            .map(s => s.trim())
                                            .filter(Boolean)
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                    />
                                  </div>
                                </div>
                              ))}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                  Regenwaarschuwing vanaf (% kans)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={
                                    draftSettings.clothingRainThreshold ??
                                    DEFAULT_CLOTHING_RAIN_THRESHOLD
                                  }
                                  onChange={e =>
                                    updateDraftSettings({
                                      clothingRainThreshold: Math.max(
                                        0,
                                        Math.min(100, Number(e.target.value))
                                      )
                                    })
                                  }
                                  className="w-16 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center"
                                />
                              </div>
                              <input
                                type="text"
                                value={
                                  draftSettings.clothingRainAdvice ?? DEFAULT_CLOTHING_RAIN_ADVICE
                                }
                                onChange={e =>
                                  updateDraftSettings({ clothingRainAdvice: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                  Windwaarschuwing vanaf (km/u)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={150}
                                  value={
                                    draftSettings.clothingWindThreshold ??
                                    DEFAULT_CLOTHING_WIND_THRESHOLD
                                  }
                                  onChange={e =>
                                    updateDraftSettings({
                                      clothingWindThreshold: Math.max(0, Number(e.target.value))
                                    })
                                  }
                                  className="w-16 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center"
                                />
                              </div>
                              <input
                                type="text"
                                value={
                                  draftSettings.clothingWindAdvice ?? DEFAULT_CLOTHING_WIND_ADVICE
                                }
                                onChange={e =>
                                  updateDraftSettings({ clothingWindAdvice: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {renderSectionSaveFooter(isSettingsDirty)}
                  </div>
                )
              })}

              {/* 1.3 Tijdweergave & Gegevensback-up */}
              {renderTreeNode({
                id: 'general.clock',
                icon: <Clock className="w-4 h-4 text-indigo-500" />,
                title: 'Tijdweergave & Gegevensback-up',
                summary: `Klok: ${draftSettings.timeFormat24h ? '24-uurs weergave' : '12-uurs weergave'} · JSON export/import`,
                rightBadge: draftSettings.timeFormat24h ? '24-uurs' : '12-uurs',
                isDirty: isSettingsDirty,
                children: (
                  <div className="space-y-4 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <p className="text-slate-500">
                        Kies de tijdnotatie voor het bord en bewaar of herstel een kopie van al je HomeBoard gegevens.
                      </p>

                      <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            updateDraftSettings({ timeFormat24h: !draftSettings.timeFormat24h })
                          }
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300"
                        >
                          Klok: {draftSettings.timeFormat24h ? '24-uurs' : '12-uurs'}
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
                    </div>

                    {renderSectionSaveFooter(isSettingsDirty)}
                  </div>
                )
              })}
            </>
          )
        })}

        {/* BRANCH 2: Gezin, Sterren, Routines & Beloningen */}
        {renderTreeGroup({
          id: 'family',
          emoji: '👨‍👩‍👧‍👦',
          icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
          title: 'Gezin, Sterren, Routines & Beloningen',
          subtitle: 'Gezinsleden & profielfoto’s, sterrenhistoriek, takenbord per dagdeel en beloningen',
          badge: `${draftMembers.length} leden · ${chores.length} taken · ${rewards.length} beloningen`,
          isDirty: isMembersDirty,
          children: (
            <>
              {/* 2.1 Gezinsleden, Profielfoto's & Snel Sterren */}
              {renderTreeNode({
                id: 'family.members',
                icon: <UserPlus className="w-4 h-4 text-emerald-500" />,
                title: "Gezinsleden, Profielfoto's & Snel Sterren",
                summary: draftMembers.map(m => `${m.name} (${m.stars}★)`).join(' · '),
                rightBadge: `${draftMembers.length} personen`,
                isDirty: isMembersDirty,
                children: (
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-slate-500">
                        Pas namen, kleuren en avatars aan (vergeet niet op Opslaan te klikken), of upload direct profielfoto&apos;s.
                      </p>

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
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300">
                        {photoUploadError}
                      </div>
                    )}

                    {/* Add Member Form */}
                    {isAddingMember && (
                      <form
                        onSubmit={handleCreateMember}
                        className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4"
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

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                              onChange={e =>
                                setNewMemberRole(e.target.value as 'parent' | 'child')
                              }
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                            >
                              <option value="child">Kind (taken & sterren sparen)</option>
                              <option value="parent">Ouder / Volwassene</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-semibold mb-1">Startsterren (optioneel)</label>
                            <input
                              type="number"
                              min={0}
                              max={999}
                              value={newMemberStartingStars}
                              onChange={e => setNewMemberStartingStars(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block font-semibold mb-1.5">
                              Profielfoto uploaden (optioneel)
                            </label>
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
                          <label className="block font-semibold mb-1">
                            Emoji icoon (fallback zonder foto)
                          </label>
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
                      {draftMembers.map(member => {
                        const customAmt = parseInt(customStarAmounts[member.id] || '1', 10) || 1;
                        return (
                          <div
                            key={member.id}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3.5"
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

                              {draftMembers.length > 1 && (
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
                                  onChange={e =>
                                    handleUpdateMemberField(member.id, { name: e.target.value })
                                  }
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
                                  onChange={e =>
                                    handleUpdateMemberField(member.id, { avatar: e.target.value })
                                  }
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

                            {/* Quick Star Adjustment per Member */}
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700/70 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  Snel sterren bijzetten of aftrekken
                                </span>
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                                  <Sparkles className="w-3 h-3 fill-current" />
                                  {member.stars} sterren
                                </span>
                              </div>

                              <input
                                type="text"
                                value={starReasons[member.id] || ''}
                                onChange={e =>
                                  setStarReasons(prev => ({
                                    ...prev,
                                    [member.id]: e.target.value
                                  }))
                                }
                                placeholder="Optionele reden (bijv. Flinke dag, Startsaldo, Afspraak niet nagekomen)"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-800 dark:text-slate-200"
                              />

                              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStarAdjust(member.id, -5)}
                                    disabled={member.stars === 0}
                                    className="px-2 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-mono font-bold hover:bg-red-100 disabled:opacity-40"
                                  >
                                    -5★
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStarAdjust(member.id, -1)}
                                    disabled={member.stars === 0}
                                    className="px-2 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-mono font-bold hover:bg-red-100 disabled:opacity-40"
                                  >
                                    -1★
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStarAdjust(member.id, 1)}
                                    className="px-2 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono font-bold hover:bg-emerald-100"
                                  >
                                    +1★
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStarAdjust(member.id, 5)}
                                    className="px-2 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono font-bold hover:bg-emerald-100"
                                  >
                                    +5★
                                  </button>
                                </div>

                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={customStarAmounts[member.id] ?? '3'}
                                    onChange={e =>
                                      setCustomStarAmounts(prev => ({
                                        ...prev,
                                        [member.id]: e.target.value
                                      }))
                                    }
                                    className="w-12 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center"
                                    aria-label="Aantal sterren"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleStarAdjust(member.id, -customAmt)}
                                    disabled={member.stars === 0}
                                    title="Aftrekken"
                                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 disabled:opacity-40"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStarAdjust(member.id, customAmt)}
                                    title="Toevoegen"
                                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {renderSectionSaveFooter(isMembersDirty)}
                  </div>
                )
              })}

              {/* 2.2 Sterrenhistoriek & Losse Sterren */}
              {renderTreeNode({
                id: 'family.stars',
                icon: <History className="w-4 h-4 text-amber-500" />,
                title: 'Sterrenhistoriek & Losse Sterren',
                summary: 'Losse sterren toevoegen, sterren-items aanpassen, verwijderen of saldo naar 0 resetten',
                rightBadge: `${starLogs.length} items`,
                children: (
                  <div className="space-y-4 text-xs">
                    {/* Add loose stars without a task */}
                    <form
                      onSubmit={handleAddLooseStarsSubmit}
                      className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/15 space-y-3"
                    >
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Sterren toevoegen of weghalen zonder taak</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end">
                        <div>
                          <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Persoon
                          </label>
                          <select
                            value={looseStarMemberId || draftMembers[0]?.id || ''}
                            onChange={e => setLooseStarMemberId(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          >
                            {draftMembers.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.stars}★)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Actie & Aantal
                          </label>
                          <div className="flex items-center gap-1">
                            <select
                              value={looseStarMode}
                              onChange={e =>
                                setLooseStarMode(e.target.value as 'add' | 'subtract')
                              }
                              className="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                            >
                              <option value="add">+ Erbij</option>
                              <option value="subtract">- Eraf</option>
                            </select>
                            <input
                              type="number"
                              min={1}
                              max={500}
                              value={looseStarAmount}
                              onChange={e => setLooseStarAmount(e.target.value)}
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-center"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Datum
                          </label>
                          <input
                            type="date"
                            value={looseStarDate}
                            max={getLocalDateStr()}
                            onChange={e => setLooseStarDate(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Reden / Omschrijving
                          </label>
                          <input
                            type="text"
                            value={looseStarReason}
                            onChange={e => setLooseStarReason(e.target.value)}
                            placeholder="bijv. Flinke dag!, Startsaldo"
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>

                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                        >
                          Sterren toepassen
                        </button>
                      </div>
                    </form>

                    {/* Filter by Person + Reset Member to 0 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <button
                          type="button"
                          onClick={() => {
                            setStarHistoryMemberFilter('all');
                            setConfirmClearMemberId(null);
                          }}
                          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
                            starHistoryMemberFilter === 'all'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          Iedereen ({starLogs.length})
                        </button>
                        {draftMembers.map(m => (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => {
                              setStarHistoryMemberFilter(m.id);
                              setConfirmClearMemberId(null);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
                              starHistoryMemberFilter === m.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <span>{m.name}</span>
                            <span className="font-mono opacity-80">({m.stars}★)</span>
                          </button>
                        ))}
                      </div>

                      {starHistoryMemberFilter !== 'all' &&
                        (() => {
                          const selectedMem = draftMembers.find(
                            m => m.id === starHistoryMemberFilter
                          );
                          if (!selectedMem) return null;
                          const hasEntries =
                            selectedMem.stars > 0 ||
                            starLogs.some(l => l.memberId === selectedMem.id);
                          if (!hasEntries) return null;

                          return confirmClearMemberId === selectedMem.id ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-red-600 dark:text-red-400 font-semibold">
                                Zeker saldo op 0 zetten?
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onClearMemberStars(selectedMem.id);
                                  setConfirmClearMemberId(null);
                                }}
                                className="px-2.5 py-1 bg-red-600 text-white font-semibold rounded-lg"
                              >
                                Ja, wis alles
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmClearMemberId(null)}
                                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg"
                              >
                                Annuleren
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmClearMemberId(selectedMem.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Saldo van {selectedMem.name} naar 0 wissen</span>
                            </button>
                          );
                        })()}
                    </div>

                    {/* Editable & Deletable Star History List */}
                    {(() => {
                      const filteredLogs = [...starLogs]
                        .filter(
                          l =>
                            starHistoryMemberFilter === 'all' ||
                            l.memberId === starHistoryMemberFilter
                        )
                        .sort((a, b) => {
                          if (a.date !== b.date) return b.date.localeCompare(a.date);
                          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                        });

                      if (filteredLogs.length === 0) {
                        return (
                          <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            Geen sterren-items gevonden voor deze selectie.
                          </div>
                        );
                      }

                      return (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
                          {filteredLogs.map(entry => {
                            const mem = draftMembers.find(m => m.id === entry.memberId);
                            const isEditing = editingLogId === entry.id;
                            const timeStr = new Intl.DateTimeFormat('nl-NL', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }).format(new Date(entry.timestamp));

                            if (isEditing) {
                              return (
                                <div
                                  key={entry.id}
                                  className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center gap-2.5"
                                >
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <input
                                      type="text"
                                      value={editLogTitle}
                                      onChange={e => setEditLogTitle(e.target.value)}
                                      placeholder="Omschrijving / Reden"
                                      className="sm:col-span-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    />
                                    <input
                                      type="date"
                                      value={editLogDate}
                                      onChange={e => setEditLogDate(e.target.value)}
                                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                                    />
                                    <input
                                      type="number"
                                      value={editLogStars}
                                      onChange={e => setEditLogStars(e.target.value)}
                                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                                      title="Aantal sterren (positief of negatief)"
                                    />
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveLogEdit(entry.id)}
                                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                                    >
                                      Opslaan
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingLogId(null)}
                                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                                    >
                                      Annuleren
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={entry.id}
                                className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {mem && <MemberAvatar member={mem} size="sm" />}
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                                      {entry.title}
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                      <span className="font-medium text-slate-700 dark:text-slate-300">
                                        {mem?.name || 'Gezinslid'}
                                      </span>
                                      <span>·</span>
                                      <span className="capitalize">
                                        {formatLocalDateNL(entry.date, {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric'
                                        })}
                                      </span>
                                      <span>·</span>
                                      <span className="font-mono">{timeStr}</span>
                                      <span>·</span>
                                      <span>
                                        {entry.type === 'chore'
                                          ? 'Taak'
                                          : entry.type === 'manual_adjustment'
                                          ? 'Handmatig'
                                          : 'Beloning'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={`font-mono font-bold text-sm tabular-nums ${
                                      entry.stars >= 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-500'
                                    }`}
                                  >
                                    {entry.stars >= 0 ? `+${entry.stars}` : entry.stars}★
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => startEditingLog(entry)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                    title="Dit item aanpassen"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteStarLog(entry.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                    title="Dit item verwijderen (past saldo aan)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )
              })}

              {/* 2.3 Takenbord & Dagroutines Beheren */}
              {renderTreeNode({
                id: 'family.chores',
                icon: <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                title: 'Takenbord & Dagroutines',
                summary: 'Routines toevoegen, verwijderen en per taak de exacte afvink-uren kiezen',
                rightBadge: `${chores.length} taken`,
                children: (
                  <div className="space-y-4 text-xs">
                    {/* Add New Routine Form */}
                    <form
                      onSubmit={handleAddChoreSubmit}
                      className="p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/15 space-y-3"
                    >
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Nieuwe routine toevoegen</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Gezinslid
                          </label>
                          <select
                            value={newChoreMemberId || draftMembers[0]?.id || ''}
                            onChange={e => setNewChoreMemberId(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          >
                            {draftMembers.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Titel van de taak *
                          </label>
                          <input
                            type="text"
                            value={newChoreTitle}
                            onChange={e => setNewChoreTitle(e.target.value)}
                            placeholder="bijv. Tanden poetsen, Huiswerk maken, Tafel dekken"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            required
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Sterren beloning
                          </label>
                          <select
                            value={newChoreStars}
                            onChange={e => setNewChoreStars(Number(e.target.value))}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                          >
                            {[1, 2, 3, 4, 5, 10].map(val => (
                              <option key={val} value={val}>
                                {val} {val === 1 ? 'ster' : 'sterren'} ★
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Dagdeel
                          </label>
                          <select
                            value={newChorePeriod}
                            onChange={e =>
                              handleNewChorePeriodChange(e.target.value as ChorePeriod)
                            }
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          >
                            <option value="morning">Ochtend</option>
                            <option value="afternoon">Middag</option>
                            <option value="evening">Avond</option>
                            <option value="all_day">Hele dag</option>
                          </select>
                        </div>

                        {newChorePeriod === 'all_day' ? (
                          <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pb-1">
                            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={newChoreUseHours}
                                onChange={e => setNewChoreUseHours(e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600"
                              />
                              <span>Toch vaste uren instellen voor deze taak</span>
                            </label>
                            {!newChoreUseHours && (
                              <span className="text-[11px] text-slate-500">
                                Standaard altijd af te vinken (hele dag)
                              </span>
                            )}
                          </div>
                        ) : null}

                        {(newChorePeriod !== 'all_day' || newChoreUseHours) && (
                          <>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Af te vinken vanaf (uur)
                              </label>
                              <input
                                type="time"
                                value={newChoreStartTime}
                                onChange={e => setNewChoreStartTime(e.target.value)}
                                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                                required
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Tot (uur)
                              </label>
                              <input
                                type="time"
                                value={newChoreEndTime}
                                onChange={e => setNewChoreEndTime(e.target.value)}
                                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                                required
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-600 dark:text-slate-400 mr-1">
                            Icoon:
                          </span>
                          {CHORE_EMOJIS.map(emoji => (
                            <button
                              type="button"
                              key={emoji}
                              onClick={() => setNewChoreIcon(emoji)}
                              className={`text-base p-1.5 rounded-lg border transition-colors ${
                                newChoreIcon === emoji
                                  ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/60'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shrink-0 self-end sm:self-auto"
                        >
                          Routine toevoegen
                        </button>
                      </div>
                    </form>

                    {/* Filter Existing Routines by Member */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      <button
                        type="button"
                        onClick={() => setChoreMemberFilter('all')}
                        className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
                          choreMemberFilter === 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Iedereen ({chores.length})
                      </button>
                      {draftMembers.map(m => {
                        const count = chores.filter(c => c.memberId === m.id).length;
                        return (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => setChoreMemberFilter(m.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
                              choreMemberFilter === m.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <span>{m.name}</span>
                            <span className="font-mono opacity-80">({count})</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Existing Routines List */}
                    {(() => {
                      const periodOrder: Record<ChorePeriod, number> = {
                        morning: 0,
                        afternoon: 1,
                        evening: 2,
                        all_day: 3
                      };
                      const filteredChores = [...chores]
                        .filter(
                          c => choreMemberFilter === 'all' || c.memberId === choreMemberFilter
                        )
                        .sort((a, b) => {
                          if (a.memberId !== b.memberId) return a.memberId.localeCompare(b.memberId);
                          return periodOrder[a.period] - periodOrder[b.period];
                        });

                      if (filteredChores.length === 0) {
                        return (
                          <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            Geen routines gevonden voor deze selectie.
                          </div>
                        );
                      }

                      return (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredChores.map(chore => {
                            const mem = draftMembers.find(m => m.id === chore.memberId);
                            const isEditing = editingChoreId === chore.id;
                            const effectiveRange = getChoreEffectiveTimeRange(chore);
                            const customHours = hasCustomChoreHours(chore);

                            if (isEditing) {
                              return (
                                <div
                                  key={chore.id}
                                  className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3"
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                    <div>
                                      <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Gezinslid
                                      </label>
                                      <select
                                        value={editChoreMemberId}
                                        onChange={e => setEditChoreMemberId(e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                      >
                                        {draftMembers.map(m => (
                                          <option key={m.id} value={m.id}>
                                            {m.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="sm:col-span-2">
                                      <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Titel
                                      </label>
                                      <input
                                        type="text"
                                        value={editChoreTitle}
                                        onChange={e => setEditChoreTitle(e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                      />
                                    </div>

                                    <div>
                                      <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Sterren
                                      </label>
                                      <select
                                        value={editChoreStars}
                                        onChange={e => setEditChoreStars(Number(e.target.value))}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                                      >
                                        {[1, 2, 3, 4, 5, 10].map(val => (
                                          <option key={val} value={val}>
                                            {val} ★
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                                    <div>
                                      <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Dagdeel
                                      </label>
                                      <select
                                        value={editChorePeriod}
                                        onChange={e =>
                                          handleEditChorePeriodChange(
                                            e.target.value as ChorePeriod
                                          )
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                      >
                                        <option value="morning">Ochtend</option>
                                        <option value="afternoon">Middag</option>
                                        <option value="evening">Avond</option>
                                        <option value="all_day">Hele dag</option>
                                      </select>
                                    </div>

                                    {editChorePeriod === 'all_day' && (
                                      <div className="sm:col-span-2 flex items-center gap-2 pb-1.5">
                                        <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                                          <input
                                            type="checkbox"
                                            checked={editChoreUseHours}
                                            onChange={e =>
                                              setEditChoreUseHours(e.target.checked)
                                            }
                                            className="w-4 h-4 rounded text-indigo-600"
                                          />
                                          <span>Toch specifieke uren instellen</span>
                                        </label>
                                      </div>
                                    )}

                                    {(editChorePeriod !== 'all_day' || editChoreUseHours) && (
                                      <>
                                        <div>
                                          <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                            Vanaf (uur)
                                          </label>
                                          <input
                                            type="time"
                                            value={editChoreStartTime}
                                            onChange={e => setEditChoreStartTime(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                                          />
                                        </div>
                                        <div>
                                          <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                            Tot (uur)
                                          </label>
                                          <input
                                            type="time"
                                            value={editChoreEndTime}
                                            onChange={e => setEditChoreEndTime(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {CHORE_EMOJIS.map(emoji => (
                                        <button
                                          type="button"
                                          key={emoji}
                                          onClick={() => setEditChoreIcon(emoji)}
                                          className={`text-base p-1 rounded-lg border ${
                                            editChoreIcon === emoji
                                              ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/60'
                                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                          }`}
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveChoreEdit(chore.id)}
                                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                                      >
                                        Opslaan
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingChoreId(null)}
                                        className="px-3.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                                      >
                                        Annuleren
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={chore.id}
                                className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-xl shrink-0">{chore.icon || '✨'}</span>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                      {chore.title}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 mt-0.5">
                                      {mem && (
                                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                          <MemberAvatar member={mem} size="xs" />
                                          <span>{mem.name}</span>
                                        </span>
                                      )}
                                      <span>·</span>
                                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                                        {getChorePeriodLabel(chore.period)}
                                      </span>
                                      <span>·</span>
                                      <span className="font-mono tabular-nums">
                                        {effectiveRange}
                                        {customHours ? ' (aangepast)' : ''}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono font-bold text-amber-500">
                                    +{chore.stars}★
                                  </span>

                                  {confirmDeleteChoreId === chore.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onDeleteChore(chore.id);
                                          setConfirmDeleteChoreId(null);
                                        }}
                                        className="px-2 py-1 bg-red-600 text-white rounded font-semibold"
                                      >
                                        Verwijder
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteChoreId(null)}
                                        className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded"
                                      >
                                        Nee
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => startEditingChore(chore)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                        title="Taak & uren aanpassen"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteChoreId(chore.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                        title="Taak verwijderen"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )
              })}

              {/* 2.4 Beloningen Beheren & Teller Resetten */}
              {renderTreeNode({
                id: 'family.rewards',
                icon: <Trophy className="w-4 h-4 text-amber-500" />,
                title: 'Beloningen & Teller Resetten',
                summary: 'Beloningen toevoegen, sterrenprijs wijzigen, verwijderen of teller naar 0 resetten',
                rightBadge: `${rewards.length} beloningen`,
                children: (
                  <div className="space-y-4 text-xs">
                    <form
                      onSubmit={handleAddRewardSubmit}
                      className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/15 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                    >
                      <div className="sm:col-span-6">
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Nieuwe beloning *
                        </label>
                        <input
                          type="text"
                          value={newRewardTitle}
                          onChange={e => setNewRewardTitle(e.target.value)}
                          placeholder="bijv. IJsje gaan eten 🍦, Extra schermtijd"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          required
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Benodigde sterren ★
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={newRewardStars}
                          onChange={e => setNewRewardStars(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-center"
                          required
                        />
                      </div>

                      <div className="sm:col-span-3 flex justify-end">
                        <button
                          type="submit"
                          className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
                        >
                          + Beloning toevoegen
                        </button>
                      </div>
                    </form>

                    {rewards.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        Nog geen beloningen aangemaakt.
                      </div>
                    ) : (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                        {rewards.map(reward => {
                          const isEditing = editingRewardId === reward.id;

                          if (isEditing) {
                            return (
                              <div
                                key={reward.id}
                                className="p-4 bg-amber-50/50 dark:bg-amber-950/20 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                              >
                                <div className="sm:col-span-5">
                                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Titel beloning
                                  </label>
                                  <input
                                    type="text"
                                    value={editRewardTitle}
                                    onChange={e => setEditRewardTitle(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Sterren ★
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={999}
                                    value={editRewardStars}
                                    onChange={e => setEditRewardStars(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Aantal x ingewisseld
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={9999}
                                    value={editRewardClaimed}
                                    onChange={e => setEditRewardClaimed(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center"
                                  />
                                </div>

                                <div className="sm:col-span-3 flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRewardEdit(reward.id)}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                                  >
                                    Opslaan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingRewardId(null)}
                                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                                  >
                                    Annuleer
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={reward.id}
                              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                  {reward.title}
                                </div>
                                <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                    {reward.starsRequired}★ nodig
                                  </span>
                                  <span>·</span>
                                  <span>
                                    <strong>{reward.claimedCount || 0}x</strong> ingewisseld
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                {(reward.claimedCount || 0) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateReward(reward.id, { claimedCount: 0 })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-100 transition-colors"
                                    title="Zet 'x ingewisseld' teller terug naar 0"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reset naar 0x</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => startEditingReward(reward)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                  title="Beloning, sterren of teller aanpassen"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>

                                {confirmDeleteRewardId === reward.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onDeleteReward(reward.id);
                                        setConfirmDeleteRewardId(null);
                                      }}
                                      className="px-2 py-1 bg-red-600 text-white rounded font-semibold"
                                    >
                                      Verwijder
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteRewardId(null)}
                                      className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded"
                                    >
                                      Nee
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteRewardId(reward.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                    title="Beloning verwijderen"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )
        })}

        {/* BRANCH 3: Agenda's & Standaard Rollen */}
        {renderTreeGroup({
          id: 'calendars',
          emoji: '📅',
          icon: <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          title: "Agenda's & Standaard Rollen",
          subtitle: "Koppel HA/iCal/openbare URL's/Agenda-ID's, stel gezinsrollen in en pas kleuren & shiften aan",
          badge: `${draftCalendars.length} agenda's (${draftCalendars.filter(c => c.visible).length} zichtbaar)`,
          isDirty: isCalendarsDirty,
          children: (
            <>
              {/* 3.1 Standaard gezinsrollen */}
              {renderTreeNode({
                id: 'calendars.roles',
                icon: <Sparkles className="w-4 h-4 text-amber-500" />,
                title: "Standaard gezinsagenda's koppelen aan echte agenda's",
                summary:
                  'Vuilbakkenophaling, Verjaardagen, Vakanties, School, Dokter, Sport & Werk toewijzen',
                rightBadge: `${CALENDAR_PRESETS.filter(p => draftCalendars.some(c => inferCalendarCategory(c) === p.key)).length}/${CALENDAR_PRESETS.length} gekoppeld`,
                children: (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[11px] text-slate-500">
                        Koppel je echte Home Assistant, openbare URL, Google Agenda-ID of iCal agenda&apos;s aan standaard rollen zodat ze extra duidelijk oplichten op Dashboard en Kalender.
                      </p>
                      <button
                        type="button"
                        onClick={onOpenManageCalendars}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold shrink-0"
                      >
                        Rollen & bronnen koppelen
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {CALENDAR_PRESETS.map(preset => {
                        const linked = draftCalendars.filter(
                          c => inferCalendarCategory(c) === preset.key
                        );
                        const realLinked = linked.filter(c => c.type !== 'local');
                        return (
                          <div
                            key={preset.key}
                            onClick={onOpenManageCalendars}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                              linked.length > 0
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                                style={{ backgroundColor: `${preset.color}22` }}
                              >
                                {preset.icon}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate">
                                  {preset.name}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {linked.length > 0
                                    ? realLinked.length > 0
                                      ? `Gekoppeld: ${realLinked.map(c => c.name).join(', ')}`
                                      : `Lokaal: ${linked.map(c => c.name).join(', ')}`
                                    : 'Nog niet gekoppeld — klik om te koppelen'}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                                realLinked.length > 0
                                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                                  : linked.length > 0
                                  ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              {realLinked.length > 0
                                ? realLinked[0].type === 'homeassistant'
                                  ? 'HA ✓'
                                  : 'Extern ✓'
                                : linked.length > 0
                                ? 'Lokaal'
                                : 'Koppelen'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              })}

              {/* 3.2 Gekoppelde agenda's beheren & aanmaken */}
              {renderTreeNode({
                id: 'calendars.manage',
                icon: <Link className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                title: "Gekoppelde agenda's beheren & toevoegen",
                summary:
                  "Kleur, icoon, naam, zichtbaarheid, personen en dag-/nachtshift per agenda instellen",
                rightBadge: `${draftCalendars.length} agenda's`,
                isDirty: isCalendarsDirty,
                children: (
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-slate-500">
                        Voeg nieuwe externe agenda&apos;s toe (HA, openbare URL, Google Agenda-ID of iCal) of bewerk bestaande agenda&apos;s.
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingCalendar(prev => !prev)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Lokale agenda</span>
                        </button>
                        <button
                          type="button"
                          onClick={onOpenManageCalendars}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                        >
                          <Link className="w-3.5 h-3.5" />
                          <span>URL / ID / HA Koppelen</span>
                        </button>
                      </div>
                    </div>

                    {/* Add Local Calendar Form */}
                    {isAddingCalendar && (
                      <form
                        onSubmit={handleCreateLocalCalendar}
                        className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3"
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
                            <label className="block font-semibold mb-1">
                              Omschrijving (optioneel)
                            </label>
                            <input
                              type="text"
                              value={newCalDescription}
                              onChange={e => setNewCalDescription(e.target.value)}
                              placeholder="bijv. Alle roosters en vrije dagen"
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold mb-1">Icoon</label>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {CALENDAR_ICONS.map(ic => (
                              <button
                                key={ic}
                                type="button"
                                onClick={() => setNewCalIcon(ic)}
                                className={`w-8 h-8 rounded-lg border text-base flex items-center justify-center ${
                                  newCalIcon === ic
                                    ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/60'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                }`}
                              >
                                {ic}
                              </button>
                            ))}
                          </div>
                        </div>

                        <ColorPickerField
                          label="Kleur van deze agenda (volledig kleurenspectrum)"
                          value={newCalColor}
                          onChange={setNewCalColor}
                        />

                        <CalendarAssignmentControls
                          familyMembers={draftMembers}
                          assignmentMode={newCalAssignmentMode}
                          memberIds={newCalMemberIds}
                          multiDayMode={newCalMultiDayMode}
                          onChangeAssignment={(mode, ids) => {
                            setNewCalAssignmentMode(mode);
                            setNewCalMemberIds(ids);
                          }}
                          onChangeMultiDayMode={setNewCalMultiDayMode}
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

                    {/* Active Calendars */}
                    <div className="space-y-3">
                      {draftCalendars.map(cal => {
                        const assignees = getCalendarAssignees(cal, draftMembers);
                        return (
                          <div
                            key={cal.id}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <select
                                  value={cal.icon || '📅'}
                                  onChange={e =>
                                    handleUpdateCalendarField(cal.id, { icon: e.target.value })
                                  }
                                  className="w-10 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base text-center shrink-0"
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
                                  onChange={color =>
                                    handleUpdateCalendarField(cal.id, { color })
                                  }
                                  compact
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <input
                                      type="text"
                                      value={cal.name}
                                      onChange={e =>
                                        handleUpdateCalendarField(cal.id, { name: e.target.value })
                                      }
                                      className="font-semibold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none min-w-[140px] flex-1"
                                    />
                                    <CalendarAssigneeBadge assignees={assignees} />
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                    {cal.type === 'ical'
                                      ? 'Externe URL / iCal Feed'
                                      : cal.type === 'homeassistant'
                                      ? `Home Assistant (${cal.haEntityId || 'calendar'})`
                                      : 'Lokale agenda'}{' '}
                                    {cal.description ? `· ${cal.description}` : ''}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateCalendarField(cal.id, { visible: !cal.visible })
                                  }
                                  className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                                    cal.visible
                                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                                      : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400'
                                  }`}
                                >
                                  {cal.visible ? 'Zichtbaar' : 'Verborgen'}
                                </button>
                                {draftCalendars.length > 1 && (
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

                            <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 space-y-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <label className="font-semibold text-slate-600 dark:text-slate-400">
                                  Standaard benaming / categorie:
                                </label>
                                <select
                                  value={cal.category || inferCalendarCategory(cal) || 'general'}
                                  onChange={e =>
                                    handleAssignCalendarCategory(
                                      cal.id,
                                      e.target.value as CalendarCategory
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                                >
                                  <option value="general">
                                    📅 Gewone agenda (geen speciale highlight)
                                  </option>
                                  {CALENDAR_PRESETS.map(preset => (
                                    <option key={preset.key} value={preset.key}>
                                      {preset.icon} {preset.name}
                                      {preset.highlightOnDashboard ? ' (Uitgelicht)' : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <CalendarAssignmentControls
                                compact
                                familyMembers={draftMembers}
                                assignmentMode={
                                  cal.assignmentMode ||
                                  (cal.memberIds && cal.memberIds.length > 0
                                    ? 'members'
                                    : 'family')
                                }
                                memberIds={cal.memberIds || []}
                                multiDayMode={cal.multiDayMode || 'smart_cutoff'}
                                onChangeAssignment={(mode, ids) =>
                                  handleUpdateCalendarField(cal.id, {
                                    assignmentMode: mode,
                                    memberIds: ids
                                  })
                                }
                                onChangeMultiDayMode={mode =>
                                  handleUpdateCalendarField(cal.id, { multiDayMode: mode })
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {renderSectionSaveFooter(isCalendarsDirty)}
                  </div>
                )
              })}
            </>
          )
        })}

        {/* BRANCH 4: Home Assistant & Automaties */}
        {renderTreeGroup({
          id: 'ha',
          emoji: '🏡',
          icon: <Home className="w-4 h-4 text-sky-500" />,
          title: 'Home Assistant & Automaties',
          subtitle: 'Verbinding (URL & token) en dagelijkse afspraken die HA-automaties starten',
          badge: settings.haAddonMode
            ? 'Add-on actief'
            : settings.hasHaToken && settings.haUrl
            ? 'Gekoppeld'
            : `${dailyRules.length} automaties`,
          children: (
            <>
              {renderTreeNode({
                id: 'ha.connection',
                icon: <Home className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
                title: 'Home Assistant Koppeling',
                summary: settings.haAddonMode
                  ? 'Add-on Supervisor koppeling actief'
                  : settings.hasHaToken && settings.haUrl
                  ? `Verbonden met ${settings.haUrl}`
                  : 'URL & Long-Lived Access Token instellen',
                rightBadge:
                  settings.haAddonMode || (settings.hasHaToken && settings.haUrl)
                    ? 'Actief'
                    : 'Instellen',
                children: (
                  <HomeAssistantSettingsSection
                    sectionFilter="connection"
                    embedded
                    calendars={draftCalendars}
                    allEvents={allEvents}
                    rules={dailyRules}
                    initialHaUrl={settings.haUrl || ''}
                    onAddRule={onAddDailyRule}
                    onUpdateRule={onUpdateDailyRule}
                    onDeleteRule={onDeleteDailyRule}
                    onHaStatusChanged={onHaStatusChanged}
                  />
                )
              })}

              {renderTreeNode({
                id: 'ha.automations',
                icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
                title: 'Dagelijkse Afspraken & HA Automaties',
                summary:
                  'Plan vaste dagelijkse triggers (bijv. 08:00 School) en pauzeer ze op vakantiedagen',
                rightBadge: `${dailyRules.length} regels`,
                children: (
                  <HomeAssistantSettingsSection
                    sectionFilter="automations"
                    embedded
                    calendars={draftCalendars}
                    allEvents={allEvents}
                    rules={dailyRules}
                    initialHaUrl={settings.haUrl || ''}
                    onAddRule={onAddDailyRule}
                    onUpdateRule={onUpdateDailyRule}
                    onDeleteRule={onDeleteDailyRule}
                    onHaStatusChanged={onHaStatusChanged}
                  />
                )
              })}
            </>
          )
        })}

        {/* BRANCH 5: Beveiliging & Wachtwoord */}
        {renderTreeGroup({
          id: 'security',
          emoji: '🔒',
          icon: <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          title: 'Beveiliging & Wachtwoord',
          subtitle: 'Pas het wachtwoord aan waarmee dit instellingenmenu is vergrendeld',
          badge: settings.hasSettingsPassword ? 'Ingesteld' : 'Open',
          children: (
            <>
              {renderTreeNode({
                id: 'security.password',
                icon: <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                title: 'Instellingen-wachtwoord wijzigen',
                summary: 'Bescherm instellingen, routines en beloningen tegen aanpassingen',
                children: (
                  <div className="space-y-4 text-xs">
                    {passwordFeedback && (
                      <div
                        className={`p-3 rounded-xl border flex items-center gap-2 ${
                          passwordFeedback.type === 'ok'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                            : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {passwordFeedback.type === 'ok' ? (
                          <Check className="w-4 h-4 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0" />
                        )}
                        <span>{passwordFeedback.msg}</span>
                      </div>
                    )}

                    <form
                      onSubmit={handleChangePassword}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                    >
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Huidig wachtwoord
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Nieuw wachtwoord
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Bevestig nieuw wachtwoord
                        </label>
                        <input
                          type="password"
                          value={confirmNewPassword}
                          onChange={e => setConfirmNewPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="px-4 py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        {isChangingPassword ? 'Opslaan...' : 'Wachtwoord opslaan'}
                      </button>
                    </form>
                  </div>
                )
              })}
            </>
          )
        })}
      </div>

      {/* Floating Bottom Save Bar when user has unsaved draft changes */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-16 md:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-2xl">
          <div className="bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
              <span className="font-semibold truncate">
                Je hebt niet-opgeslagen wijzigingen in de instellingen
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDiscardDrafts}
                className="px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleSaveDrafts}
                disabled={isSavingDraft}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingDraft ? 'Opslaan...' : 'Wijzigingen opslaan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
