import {
  AppState,
  CalendarEvent,
  CalendarSource,
  HaActionEntity,
  HaCalendarEntity,
  HaStatusInfo,
  HaTodoEntity,
  HaTodoItem,
  WeatherLocationResult
} from '../types';
import { getLocalDateStr } from '../utils/dateTime';
import { apiUrl } from '../utils/api';
import {
  DEFAULT_CLOTHING_RAIN_ADVICE,
  DEFAULT_CLOTHING_RAIN_THRESHOLD,
  DEFAULT_CLOTHING_RULES,
  DEFAULT_CLOTHING_WIND_ADVICE,
  DEFAULT_CLOTHING_WIND_THRESHOLD
} from '../utils/weatherClothing';

const LOCAL_STORAGE_KEY = 'homeboard_state_v1';

const FALLBACK_DEFAULT_STATE: AppState = {
  familyMembers: [
    { id: 'fam-1', name: 'Papa', role: 'parent', color: '#3B82F6', avatar: '👨‍💼', stars: 0 },
    { id: 'fam-2', name: 'Mama', role: 'parent', color: '#EC4899', avatar: '👩‍💼', stars: 0 },
    { id: 'fam-3', name: 'Lucas', role: 'child', color: '#10B981', avatar: '👦', stars: 0 },
    { id: 'fam-4', name: 'Emma', role: 'child', color: '#F59E0B', avatar: '👧', stars: 0 }
  ],
  calendars: [
    {
      id: 'cal-family',
      name: 'Gezinsagenda',
      color: '#6366F1',
      type: 'local',
      visible: true,
      description: 'Gezamenlijke afspraken en uitjes',
      assignmentMode: 'family',
      memberIds: [],
      multiDayMode: 'smart_cutoff'
    },
    {
      id: 'cal-school',
      name: 'School & Sport',
      color: '#10B981',
      type: 'local',
      visible: true,
      description: 'Lessen, trainingen en wedstrijden',
      assignmentMode: 'members',
      memberIds: ['fam-3', 'fam-4'],
      multiDayMode: 'smart_cutoff'
    }
  ],
  events: [
    {
      id: 'evt-1',
      calendarId: 'cal-family',
      title: 'Pannenkoeken bakken 🥞',
      description: 'Gezellig samen koken in het weekend',
      startTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      endTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      allDay: false,
      assignedTo: 'fam-3',
      location: 'Keuken'
    },
    {
      id: 'evt-2',
      calendarId: 'cal-school',
      title: 'Zwemles Emma 🏊‍♀️',
      description: 'Niet vergeten: badmuts en handdoek mee',
      startTime: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
      endTime: new Date(Date.now() + 27.5 * 3600 * 1000).toISOString(),
      allDay: false,
      assignedTo: 'fam-4',
      location: 'Sportcomplex De Waterlelie'
    }
  ],
  chores: [
    {
      id: 'chr-1',
      memberId: 'fam-3',
      title: 'Tanden poetsen & gezicht wassen',
      period: 'morning',
      stars: 1,
      icon: '🪥'
    },
    {
      id: 'chr-2',
      memberId: 'fam-3',
      title: 'Schooltas inpakken & drinkbus vullen',
      period: 'morning',
      stars: 1,
      icon: '🎒'
    },
    {
      id: 'chr-3',
      memberId: 'fam-3',
      title: 'Huiswerk / 15 min lezen 📖',
      period: 'afternoon',
      stars: 2,
      icon: '📚'
    },
    {
      id: 'chr-5',
      memberId: 'fam-3',
      title: 'Drinkfles en brooddoos op het aanrecht zetten',
      period: 'all_day',
      stars: 1,
      icon: '✨'
    },
    {
      id: 'chr-7',
      memberId: 'fam-4',
      title: 'Tafel dekken voor het avondeten',
      period: 'evening',
      stars: 2,
      icon: '🍽️'
    }
  ],
  choreCompletionsByDate: {},
  starLogs: [],
  starLogsReconciled: true,
  taskLists: ['Algemeen', 'Boodschappen', 'Herinneringen', "To-do's"],
  generalTasks: [
    {
      id: 'gt-1',
      title: 'Melk, brood en vers fruit halen',
      notes: 'Appels en bananen voor in de broodtrommel',
      listName: 'Boodschappen',
      completed: false,
      createdAt: new Date().toISOString(),
      priority: 'normal'
    },
    {
      id: 'gt-2',
      title: 'Batterijen voor zaklamp meebrengen',
      listName: 'Algemeen',
      completed: false,
      createdAt: new Date().toISOString(),
      priority: 'low'
    }
  ],
  haLinkedTodoEntities: [],
  dailyAutomationRules: [],
  rewards: [
    { id: 'rew-1', title: '1 uur gamen / schermtijd 🎮', starsRequired: 10, claimedCount: 0 },
    { id: 'rew-2', title: 'Pannenkoeken of pizza kiezen 🍕', starsRequired: 20, claimedCount: 0 },
    { id: 'rew-3', title: 'Middagje speeltuin of bioscoop 🍿', starsRequired: 35, claimedCount: 0 }
  ],
  settings: {
    dashboardName: 'HomeBoard',
    showFamilyNameInGreeting: true,
    familyGreetingName: 'familie',
    cityName: 'Amsterdam',
    weatherLat: 52.3676,
    weatherLon: 4.9041,
    weatherTemp: 18,
    weatherCondition: 'Zonnig',
    weatherCode: 0,
    showClothingAdvice: true,
    clothingRules: DEFAULT_CLOTHING_RULES,
    clothingRainThreshold: DEFAULT_CLOTHING_RAIN_THRESHOLD,
    clothingRainAdvice: DEFAULT_CLOTHING_RAIN_ADVICE,
    clothingWindThreshold: DEFAULT_CLOTHING_WIND_THRESHOLD,
    clothingWindAdvice: DEFAULT_CLOTHING_WIND_ADVICE,
    clothingCustomNote: '',
    hasSettingsPassword: false,
    kioskAutoDim: false,
    kioskDimAfterMinutes: 10,
    kioskTheme: 'auto',
    timeFormat24h: true
  }
};

function normalizeState(raw: any): AppState {
  const rawCalendars = Array.isArray(raw?.calendars)
    ? raw.calendars
        .filter((c: any) => c.type !== 'google_oauth')
        .map((c: any) => ({
          ...c,
          assignmentMode:
            c.assignmentMode ||
            (Array.isArray(c.memberIds) && c.memberIds.length > 0 ? 'members' : 'family'),
          memberIds: Array.isArray(c.memberIds) ? c.memberIds : [],
          multiDayMode: c.multiDayMode || 'smart_cutoff'
        }))
    : FALLBACK_DEFAULT_STATE.calendars;

  let choreCompletionsByDate = raw?.choreCompletionsByDate;
  if (!choreCompletionsByDate || typeof choreCompletionsByDate !== 'object') {
    choreCompletionsByDate = {};
    const todayStr = getLocalDateStr();
    const completedIds = (raw?.chores || [])
      .filter((c: any) => c.completedToday)
      .map((c: any) => c.id);
    if (completedIds.length > 0) {
      choreCompletionsByDate[todayStr] = completedIds;
    }
  }

  const familyMembers = Array.isArray(raw?.familyMembers)
    ? raw.familyMembers
    : FALLBACK_DEFAULT_STATE.familyMembers;
  const starLogs = Array.isArray(raw?.starLogs) ? [...raw.starLogs] : [];

  if (!raw?.starLogsReconciled) {
    const todayStr = getLocalDateStr();
    const nowIso = new Date().toISOString();
    for (const member of familyMembers) {
      const loggedSum = starLogs
        .filter((l: any) => l.memberId === member.id)
        .reduce((acc: number, l: any) => acc + (Number(l.stars) || 0), 0);
      const diff = (Number(member.stars) || 0) - loggedSum;
      if (diff !== 0) {
        starLogs.push({
          id: `slog-init-${member.id}`,
          date: todayStr,
          timestamp: nowIso,
          memberId: member.id,
          title: 'Startsaldo (bij opstart)',
          stars: diff,
          type: 'manual_adjustment'
        });
      }
    }
  }

  const generalTasks = Array.isArray(raw?.generalTasks)
    ? raw.generalTasks
    : FALLBACK_DEFAULT_STATE.generalTasks;
  const baseLists = Array.isArray(raw?.taskLists)
    ? raw.taskLists
    : FALLBACK_DEFAULT_STATE.taskLists || ['Algemeen', 'Boodschappen', 'Herinneringen', "To-do's"];
  const taskLists = Array.from(
    new Set([
      ...baseLists,
      ...generalTasks.map((t: any) => t?.listName).filter(Boolean)
    ])
  );

  const haLinkedTodoEntities = Array.isArray(raw?.haLinkedTodoEntities)
    ? raw.haLinkedTodoEntities
    : [];
  const dailyAutomationRules = Array.isArray(raw?.dailyAutomationRules)
    ? raw.dailyAutomationRules
    : [];

  return {
    ...FALLBACK_DEFAULT_STATE,
    ...raw,
    familyMembers,
    calendars: rawCalendars.length > 0 ? rawCalendars : FALLBACK_DEFAULT_STATE.calendars,
    choreCompletionsByDate,
    starLogs,
    starLogsReconciled: true,
    taskLists,
    generalTasks,
    haLinkedTodoEntities,
    dailyAutomationRules,
    settings: {
      ...FALLBACK_DEFAULT_STATE.settings,
      ...(raw?.settings || {}),
      showClothingAdvice:
        raw?.settings?.showClothingAdvice !== undefined ? raw.settings.showClothingAdvice : true,
      clothingRules:
        Array.isArray(raw?.settings?.clothingRules) && raw.settings.clothingRules.length > 0
          ? raw.settings.clothingRules
          : DEFAULT_CLOTHING_RULES
    }
  };
}

export async function loadAppState(): Promise<AppState> {
  try {
    const res = await fetch(apiUrl('/api/storage/state'));
    if (res.ok) {
      const data = normalizeState(await res.json());
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Backend storage unavailable, falling back to localStorage:', err);
  }

  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      return normalizeState(JSON.parse(cached));
    } catch {
      // parse error
    }
  }

  return FALLBACK_DEFAULT_STATE;
}

export async function saveAppState(state: AppState): Promise<void> {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

  try {
    await fetch(apiUrl('/api/storage/state'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(state)
    });
  } catch (err) {
    console.warn('Could not sync state to server:', err);
  }
}

export async function setupSettingsPassword(password: string): Promise<void> {
  const res = await fetch(apiUrl('/api/settings/password/setup'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kon wachtwoord niet instellen.');
  }
}

export async function verifySettingsPassword(password: string): Promise<boolean> {
  const res = await fetch(apiUrl('/api/settings/password/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  if (res.status === 401) {
    return false;
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Fout bij controleren van wachtwoord.');
  }
  return Boolean(data.valid);
}

export async function changeSettingsPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(apiUrl('/api/settings/password/change'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kon wachtwoord niet wijzigen.');
  }
}

export async function fetchICalFeedEvents(cal: CalendarSource): Promise<CalendarEvent[]> {
  if (!cal.url) return [];
  try {
    const url = apiUrl(
      `/api/ical/fetch?url=${encodeURIComponent(cal.url)}&calendarId=${encodeURIComponent(cal.id)}&calendarName=${encodeURIComponent(cal.name)}&calendarColor=${encodeURIComponent(cal.color)}`
    );
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Server status ${res.status}`);
    }
    const data = await res.json();
    return data.events || [];
  } catch (error) {
    console.error(`Fout bij ophalen iCal feed voor ${cal.name}:`, error);
    return [];
  }
}

export async function fetchHaCalendarEvents(cal: CalendarSource): Promise<CalendarEvent[]> {
  if (!cal.haEntityId) return [];
  try {
    const url = apiUrl(
      `/api/ha/calendars/events?entityId=${encodeURIComponent(cal.haEntityId)}&calendarId=${encodeURIComponent(cal.id)}&calendarName=${encodeURIComponent(cal.name)}&calendarColor=${encodeURIComponent(cal.color)}`
    );
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Server status ${res.status}`);
    }
    const data = await res.json();
    return data.events || [];
  } catch (error) {
    console.error(`Fout bij ophalen Home Assistant agenda voor ${cal.name}:`, error);
    return [];
  }
}

export async function fetchHaStatus(): Promise<HaStatusInfo> {
  const res = await fetch(apiUrl('/api/ha/status'));
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kon Home Assistant status niet ophalen.');
  }
  return data;
}

export async function saveHaConfig(payload: {
  haUrl: string;
  haToken?: string;
  clearToken?: boolean;
}): Promise<HaStatusInfo> {
  const res = await fetch(apiUrl('/api/ha/config'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kon Home Assistant koppeling niet opslaan.');
  }
  return data;
}

export async function testHaConnection(payload?: {
  haUrl?: string;
  haToken?: string;
}): Promise<{
  connected: boolean;
  mode: string;
  locationName?: string;
  version?: string;
  calendarCount?: number;
  todoCount?: number;
}> {
  const res = await fetch(apiUrl('/api/ha/test'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Verbinding met Home Assistant mislukt.');
  }
  return data;
}

export async function fetchHaCalendars(): Promise<HaCalendarEntity[]> {
  const res = await fetch(apiUrl('/api/ha/calendars'));
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kon Home Assistant agenda\'s niet ophalen.');
  }
  return data.calendars || [];
}

export async function fetchHaTodoEntities(): Promise<HaTodoEntity[]> {
  const res = await fetch(apiUrl('/api/ha/todos'));
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kon Home Assistant takenlijsten niet ophalen.');
  }
  return data.todos || [];
}

export async function fetchHaTodoItems(entityId: string): Promise<HaTodoItem[]> {
  const res = await fetch(apiUrl(`/api/ha/todos/items?entityId=${encodeURIComponent(entityId)}`));
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kon Home Assistant taken niet ophalen.');
  }
  return data.items || [];
}

export async function addHaTodoItem(payload: {
  entityId: string;
  item: string;
  dueDate?: string;
  description?: string;
}): Promise<void> {
  const res = await fetch(apiUrl('/api/ha/todos/items/add'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kon taak niet toevoegen in Home Assistant.');
  }
}

export async function updateHaTodoItem(payload: {
  entityId: string;
  uid: string;
  rename?: string;
  status?: 'needs_action' | 'completed';
  dueDate?: string | null;
  description?: string;
}): Promise<void> {
  const res = await fetch(apiUrl('/api/ha/todos/items/update'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kon taak in Home Assistant niet bijwerken.');
  }
}

export async function removeHaTodoItem(entityId: string, uid: string): Promise<void> {
  const res = await fetch(apiUrl('/api/ha/todos/items/remove'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityId, uid })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kon taak niet verwijderen uit Home Assistant.');
  }
}

export async function clearCompletedHaTodoItems(entityId: string): Promise<void> {
  const res = await fetch(apiUrl('/api/ha/todos/items/clear-completed'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityId })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kon afgeronde taken niet wissen.');
  }
}

export async function fetchHaActionEntities(): Promise<HaActionEntity[]> {
  const res = await fetch(apiUrl('/api/ha/entities'));
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kon Home Assistant entiteiten niet ophalen.');
  }
  return data.entities || [];
}

export async function testDailyAutomationRule(ruleId: string): Promise<{
  success: boolean;
  skippedTodayWouldBe: boolean;
  skipReason: string | null;
}> {
  const res = await fetch(apiUrl(`/api/ha/rules/${encodeURIComponent(ruleId)}/test`), {
    method: 'POST'
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kon automatie niet testen in Home Assistant.');
  }
  return data;
}

export async function searchWeatherLocations(query: string): Promise<WeatherLocationResult[]> {
  if (!query || query.trim().length < 2) return [];
  const res = await fetch(apiUrl(`/api/weather/search?q=${encodeURIComponent(query.trim())}`));
  if (!res.ok) {
    throw new Error('Kon woonplaatsen niet ophalen');
  }
  const data = await res.json();
  return data.results || [];
}

export interface LiveWeatherResponse {
  temp: number;
  condition: string;
  weatherCode: number;
  tempMin?: number;
  tempMax?: number;
  precipitationProb?: number;
  windSpeedMax?: number;
  dailyWeatherCode?: number;
  dailyCondition?: string;
}

export async function fetchCurrentWeather(
  lat: number,
  lon: number
): Promise<LiveWeatherResponse> {
  const res = await fetch(apiUrl(`/api/weather/current?lat=${lat}&lon=${lon}`));
  if (!res.ok) {
    throw new Error('Kon actueel weer niet ophalen');
  }
  return await res.json();
}

function resizeImageFileToDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Kon bestand niet lezen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Ongeldige afbeelding'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        // Center-crop square
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadMemberAvatar(memberId: string, file: File): Promise<string> {
  const imageDataUrl = await resizeImageFileToDataUrl(file, 256);

  try {
    const res = await fetch(apiUrl('/api/avatars'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, imageDataUrl })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.photoUrl) {
        return data.photoUrl;
      }
    }
  } catch (err) {
    console.warn('Server avatar upload failed, falling back to inline data URL:', err);
  }

  return imageDataUrl;
}
