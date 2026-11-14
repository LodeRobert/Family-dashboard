import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import ical from 'node-ical';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));

// Ensure persistent data and avatars directories exist
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const AVATARS_DIR = path.join(DATA_DIR, 'avatars');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}
const DATA_FILE = path.join(DATA_DIR, 'homeboard-data.json');
const HA_OPTIONS_FILE = '/data/options.json';

interface HaAddonOptions {
  ha_url?: string;
  ha_token?: string;
  tz?: string;
}

function readHaAddonOptions(): HaAddonOptions {
  try {
    if (fs.existsSync(HA_OPTIONS_FILE)) {
      const raw = fs.readFileSync(HA_OPTIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
  } catch {
    // Not running inside HA Add-on or options.json not readable
  }
  return {};
}

const initialAddonOpts = readHaAddonOptions();
if (initialAddonOpts.tz && !process.env.TZ) {
  process.env.TZ = initialAddonOpts.tz;
}

function getLocalTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasswordHash(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, keyHex] = parts;
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedBuf = crypto.scryptSync(password, salt, 64);
    if (keyBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedBuf);
  } catch {
    return false;
  }
}

// Default initial state matching Home-Board style
const DEFAULT_INITIAL_STATE = {
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
    },
    {
      id: 'evt-3',
      calendarId: 'cal-family',
      title: 'Familiedag Oma & Opa 🎂',
      description: 'Verjaardag vieren met taart',
      startTime: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      endTime: new Date(Date.now() + 76 * 3600 * 1000).toISOString(),
      allDay: false,
      assignedTo: 'fam-1',
      location: 'Bij Opa & Oma'
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
      id: 'chr-4',
      memberId: 'fam-3',
      title: 'Speelgoed opruimen & pyjama aan',
      period: 'evening',
      stars: 1,
      icon: '🧸'
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
      id: 'chr-6',
      memberId: 'fam-4',
      title: 'Tanden poetsen ochtend',
      period: 'morning',
      stars: 1,
      icon: '🪥'
    },
    {
      id: 'chr-7',
      memberId: 'fam-4',
      title: 'Tafel dekken voor het avondeten',
      period: 'evening',
      stars: 2,
      icon: '🍽️'
    },
    {
      id: 'chr-8',
      memberId: 'fam-4',
      title: 'Kamer netjes maken',
      period: 'all_day',
      stars: 1,
      icon: '✨'
    }
  ],
  choreCompletionsByDate: {} as Record<string, string[]>,
  starLogs: [] as any[],
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
  haLinkedTodoEntities: [] as any[],
  dailyAutomationRules: [] as any[],
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
    settingsPasswordHash: '',
    haUrl: '',
    haToken: '',
    kioskAutoDim: false,
    kioskDimAfterMinutes: 10,
    kioskTheme: 'auto',
    timeFormat24h: true
  }
};

// Initialize file if not existing
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_INITIAL_STATE, null, 2), 'utf-8');
}

function getRawStoredData(): any {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    // Strip any legacy google_oauth calendars gracefully (only local & ical supported now)
    const rawCalendars = Array.isArray(parsed.calendars)
      ? parsed.calendars.filter((c: any) => c.type !== 'google_oauth')
      : DEFAULT_INITIAL_STATE.calendars;

    const calendars = rawCalendars.length > 0 ? rawCalendars : DEFAULT_INITIAL_STATE.calendars;

    // One-time migration from legacy chore.completedToday to choreCompletionsByDate
    let choreCompletionsByDate = parsed.choreCompletionsByDate;
    if (!choreCompletionsByDate || typeof choreCompletionsByDate !== 'object') {
      choreCompletionsByDate = {};
      const todayStr = getLocalTodayStr();
      const completedIds = (parsed.chores || [])
        .filter((c: any) => c.completedToday)
        .map((c: any) => c.id);
      if (completedIds.length > 0) {
        choreCompletionsByDate[todayStr] = completedIds;
      }
    }

    // One-time migration: convert any untracked legacy member stars into explicit editable StarLogEntry items
    const familyMembers = Array.isArray(parsed.familyMembers)
      ? parsed.familyMembers
      : DEFAULT_INITIAL_STATE.familyMembers;
    let starLogs = Array.isArray(parsed.starLogs) ? [...parsed.starLogs] : [];
    if (!parsed.starLogsReconciled) {
      const todayStr = getLocalTodayStr();
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

    const generalTasks = Array.isArray(parsed.generalTasks)
      ? parsed.generalTasks
      : DEFAULT_INITIAL_STATE.generalTasks;
    const baseLists = Array.isArray(parsed.taskLists)
      ? parsed.taskLists
      : DEFAULT_INITIAL_STATE.taskLists;
    const taskLists = Array.from(
      new Set([
        ...baseLists,
        ...generalTasks.map((t: any) => t?.listName).filter(Boolean)
      ])
    );

    const haLinkedTodoEntities = Array.isArray(parsed.haLinkedTodoEntities)
      ? parsed.haLinkedTodoEntities
      : [];
    const dailyAutomationRules = Array.isArray(parsed.dailyAutomationRules)
      ? parsed.dailyAutomationRules
      : [];

    return {
      ...DEFAULT_INITIAL_STATE,
      ...parsed,
      familyMembers,
      calendars,
      choreCompletionsByDate,
      starLogs,
      starLogsReconciled: true,
      taskLists,
      generalTasks,
      haLinkedTodoEntities,
      dailyAutomationRules,
      settings: {
        ...DEFAULT_INITIAL_STATE.settings,
        ...(parsed.settings || {})
      }
    };
  } catch (err) {
    console.error('Error reading data file, falling back to initial:', err);
    return DEFAULT_INITIAL_STATE;
  }
}

function sanitizeStateForClient(data: any) {
  const {
    settingsPasswordHash,
    haToken,
    googleClientId: _gcid,
    customAppUrl: _cau,
    ...safeSettings
  } = data.settings || {};
  const addonOpts = readHaAddonOptions();
  const hasToken = Boolean(
    (haToken && String(haToken).trim()) ||
      process.env.SUPERVISOR_TOKEN ||
      (addonOpts.ha_token && String(addonOpts.ha_token).trim())
  );
  return {
    ...data,
    settings: {
      ...safeSettings,
      haUrl: safeSettings.haUrl || addonOpts.ha_url || '',
      hasSettingsPassword: Boolean(settingsPasswordHash),
      hasHaToken: hasToken,
      haAddonMode: Boolean(process.env.SUPERVISOR_TOKEN)
    }
  };
}

function saveStoredData(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function translateWeatherCode(code: number): string {
  if (code === 0) return 'Helder';
  if (code === 1) return 'Overwegend helder';
  if (code === 2) return 'Licht bewolkt';
  if (code === 3) return 'Bewolkt';
  if (code === 45 || code === 48) return 'Mist';
  if (code >= 51 && code <= 57) return 'Motregen';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'Regen';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Sneeuw';
  if (code >= 95) return 'Onweer';
  return 'Wisselend';
}

// --- API ROUTES ---

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dataFile: DATA_FILE,
    isDocker: fs.existsSync('/.dockerenv')
  });
});

// Get all persisted state (never exposes password hash)
app.get('/api/storage/state', (_req: Request, res: Response) => {
  const data = getRawStoredData();
  res.json(sanitizeStateForClient(data));
});

// Update state (preserves server-side settingsPasswordHash, haUrl and haToken)
app.post('/api/storage/state', (req: Request, res: Response) => {
  try {
    const updated = req.body;
    if (!updated || typeof updated !== 'object') {
      return res.status(400).json({ error: 'Ongeldige data' });
    }
    const current = getRawStoredData();
    const {
      hasSettingsPassword: _ignorePw,
      settingsPasswordHash: _ignorePwHash,
      hasHaToken: _ignoreHa,
      haAddonMode: _ignoreAddon,
      haToken: _ignoreRawToken,
      haUrl: _ignoreHaUrl,
      ...incomingSettings
    } = updated.settings || {};
    const mergedToSave = {
      ...updated,
      settings: {
        ...current.settings,
        ...incomingSettings,
        settingsPasswordHash: current.settings?.settingsPasswordHash || '',
        haUrl: current.settings?.haUrl || '',
        haToken: current.settings?.haToken || ''
      }
    };
    saveStoredData(mergedToSave);
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- SETTINGS PASSWORD ROUTES ---

// Set password for the very first time
app.post('/api/settings/password/setup', (req: Request, res: Response) => {
  try {
    const password = String(req.body?.password || '');
    if (password.length < 4) {
      return res.status(400).json({ error: 'Wachtwoord moet minimaal 4 tekens lang zijn.' });
    }

    const data = getRawStoredData();
    if (data.settings?.settingsPasswordHash) {
      return res.status(409).json({ error: 'Er is al een wachtwoord ingesteld.' });
    }

    data.settings = {
      ...data.settings,
      settingsPasswordHash: hashPassword(password)
    };
    saveStoredData(data);

    res.json({ success: true, hasSettingsPassword: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Kon wachtwoord niet instellen.' });
  }
});

// Verify password to unlock Instellingen
app.post('/api/settings/password/verify', (req: Request, res: Response) => {
  try {
    const password = String(req.body?.password || '');
    const data = getRawStoredData();
    const storedHash = data.settings?.settingsPasswordHash;

    if (!storedHash) {
      return res.json({ valid: true, hasSettingsPassword: false });
    }

    const valid = verifyPasswordHash(password, storedHash);
    if (!valid) {
      return res.status(401).json({ valid: false, error: 'Onjuist wachtwoord.' });
    }

    res.json({ valid: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fout bij controleren van wachtwoord.' });
  }
});

// Change existing password from within unlocked Instellingen
app.post('/api/settings/password/change', (req: Request, res: Response) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Het nieuwe wachtwoord moet minimaal 4 tekens lang zijn.' });
    }

    const data = getRawStoredData();
    const storedHash = data.settings?.settingsPasswordHash;

    if (storedHash && !verifyPasswordHash(currentPassword, storedHash)) {
      return res.status(401).json({ error: 'Huidig wachtwoord klopt niet.' });
    }

    data.settings = {
      ...data.settings,
      settingsPasswordHash: hashPassword(newPassword)
    };
    saveStoredData(data);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Kon wachtwoord niet wijzigen.' });
  }
});

// Upload member avatar photo to persistent /data/avatars folder
app.post('/api/avatars', (req: Request, res: Response) => {
  try {
    const { memberId, imageDataUrl } = req.body;
    if (!memberId || typeof imageDataUrl !== 'string') {
      return res.status(400).json({ error: 'memberId en imageDataUrl zijn verplicht' });
    }

    const match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i);
    if (!match) {
      return res.status(400).json({ error: 'Ongeldig afbeeldingsformaat' });
    }

    const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Afbeelding is te groot (max 5MB)' });
    }

    const safeMemberId = String(memberId).replace(/[^a-zA-Z0-9_-]/g, '');

    try {
      const existing = fs.readdirSync(AVATARS_DIR);
      for (const file of existing) {
        if (file.startsWith(`${safeMemberId}-`)) {
          fs.unlinkSync(path.join(AVATARS_DIR, file));
        }
      }
    } catch {
      // ignore cleanup error
    }

    const filename = `${safeMemberId}-${Date.now()}.${ext}`;
    const targetPath = path.join(AVATARS_DIR, filename);
    fs.writeFileSync(targetPath, buffer);

    res.json({
      success: true,
      photoUrl: `/api/avatars/${filename}`
    });
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: error.message || 'Kon foto niet opslaan' });
  }
});

// Serve uploaded member avatar photos
app.get('/api/avatars/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(AVATARS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Foto niet gevonden' });
  }

  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.sendFile(filePath);
});

// Open-Meteo Geocoding Search (free, no API key required)
app.get('/api/weather/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  if (!query || query.length < 2) {
    return res.json({ results: [] });
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=nl&format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding status ${response.status}`);
    }
    const data = await response.json();
    const results = (data.results || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      country: item.country || '',
      admin1: item.admin1 || '',
      latitude: item.latitude,
      longitude: item.longitude
    }));

    res.json({ results });
  } catch (error: any) {
    console.error('Weather search error:', error);
    res.status(500).json({ error: 'Kon plaatsnamen niet ophalen' });
  }
});

// Open-Meteo Current Weather & Today Forecast (free, no API key required)
app.get('/api/weather/current', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: 'Ongeldige coördinaten' });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&forecast_days=1&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API status ${response.status}`);
    }
    const data = await response.json();
    const temp = Math.round(data.current?.temperature_2m ?? 18);
    const weatherCode = Number(data.current?.weather_code ?? 0);
    const condition = translateWeatherCode(weatherCode);

    const rawMin = data.daily?.temperature_2m_min?.[0];
    const rawMax = data.daily?.temperature_2m_max?.[0];
    const rawPrecip = data.daily?.precipitation_probability_max?.[0];
    const rawWindMax = data.daily?.wind_speed_10m_max?.[0];
    const rawDailyCode = data.daily?.weather_code?.[0];

    const tempMin = rawMin != null ? Math.round(Number(rawMin)) : temp;
    const tempMax = rawMax != null ? Math.round(Number(rawMax)) : temp;
    const precipitationProb = rawPrecip != null ? Math.round(Number(rawPrecip)) : 0;
    const windSpeedMax = rawWindMax != null ? Math.round(Number(rawWindMax)) : 0;
    const dailyWeatherCode = rawDailyCode != null ? Number(rawDailyCode) : weatherCode;
    const dailyCondition = translateWeatherCode(dailyWeatherCode);

    res.json({
      temp,
      weatherCode,
      condition,
      tempMin,
      tempMax,
      precipitationProb,
      windSpeedMax,
      dailyWeatherCode,
      dailyCondition
    });
  } catch (error: any) {
    console.error('Weather current error:', error);
    res.status(500).json({ error: 'Kon actueel weer niet ophalen' });
  }
});

function extractICalText(field: any): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && typeof field.val === 'string') return field.val;
  return String(field);
}

function formatDateYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Parse iCal / ICS feed with full RRULE, TZID, EXDATE & RFC 5545 all-day support
function parseICS(icsText: string, calendarId: string, calendarName: string, calendarColor: string) {
  const events: any[] = [];
  const parsed = ical.sync.parseICS(icsText);

  // Rolling window: 180 days in the past (for "Toon verleden") up to 365 days in the future
  const nowMs = Date.now();
  const from = new Date(nowMs - 180 * 24 * 60 * 60 * 1000);
  const to = new Date(nowMs + 365 * 24 * 60 * 60 * 1000);

  let seq = 0;
  for (const key of Object.keys(parsed)) {
    const component = parsed[key];
    if (!component || component.type !== 'VEVENT') continue;
    if (component.status === 'CANCELLED') continue;

    let instances: any[] = [];
    try {
      instances = ical.expandRecurringEvent(component, {
        from,
        to,
        includeOverrides: true,
        excludeExdates: true,
        expandOngoing: true
      });
    } catch (err) {
      console.warn('Could not expand iCal event, skipping:', component.uid, err);
      continue;
    }

    for (const instance of instances) {
      const ev = instance.event || component;
      if (ev.status === 'CANCELLED') continue;

      const title = extractICalText(instance.summary || ev.summary).trim();
      if (!title || !instance.start) continue;

      const isAllDay = Boolean(instance.isFullDay || ev.datetype === 'date');
      let startTime: string;
      let endTime: string;

      if (isAllDay) {
        const startDateStr = formatDateYYYYMMDD(instance.start);
        let endDateStr = startDateStr;

        if (instance.end && instance.end.getTime() > instance.start.getTime()) {
          // RFC 5545 DTEND for DATE events is exclusive (day after), so subtract 1ms for inclusive end day
          const inclusiveEnd = new Date(instance.end.getTime() - 1);
          const candidateEndStr = formatDateYYYYMMDD(inclusiveEnd);
          if (candidateEndStr >= startDateStr) {
            endDateStr = candidateEndStr;
          }
        }

        // Local ISO strings (without Z) prevent UTC offset shifting across 2 days
        startTime = `${startDateStr}T00:00:00`;
        endTime = `${endDateStr}T23:59:59`;
      } else {
        startTime = instance.start.toISOString();
        endTime = (instance.end || instance.start).toISOString();
      }

      const rawUid = String(ev.uid || key || seq);
      const safeUid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || String(seq);
      seq += 1;

      events.push({
        id: `ics-${safeUid}-${instance.start.getTime()}-${seq}`,
        calendarId,
        calendarName,
        calendarColor,
        isExternal: true,
        title,
        description: extractICalText(ev.description) || undefined,
        location: extractICalText(ev.location) || undefined,
        startTime,
        endTime,
        allDay: isAllDay
      });
    }
  }

  events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return events;
}

// Proxy endpoint to fetch iCal feed (bypasses browser CORS)
app.get('/api/ical/fetch', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  const calendarId = (req.query.calendarId as string) || 'ical-default';
  const calendarName = (req.query.calendarName as string) || 'iCal Agenda';
  const calendarColor = (req.query.calendarColor as string) || '#3B82F6';

  if (!url) {
    return res.status(400).json({ error: 'URL parameter ontbreekt' });
  }

  try {
    const normalizedUrl = url.replace(/^webcal:\/\//i, 'https://');
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'HomeBoard-Family-Dashboard/1.0 (+https://home-board.local)'
      }
    });

    if (!response.ok) {
      throw new Error(`iCal server reageerde met status ${response.status}`);
    }

    const icsText = await response.text();
    const events = parseICS(icsText, calendarId, calendarName, calendarColor);

    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (error: any) {
    console.error('Error fetching iCal feed:', error);
    res.status(500).json({
      error: 'Kan iCal agenda niet ophalen: ' + error.message
    });
  }
});

// --- HOME ASSISTANT INTEGRATIE (Supervisor Add-on & Standalone Docker) ---

interface HaConnectionConfig {
  mode: 'supervisor' | 'manual' | 'none';
  addonMode: boolean;
  baseApiUrl: string;
  baseRootUrl: string;
  haUrlDisplay: string;
  token: string;
  hasToken: boolean;
}

function normalizeHaUrl(rawUrl: string): string {
  let clean = String(rawUrl || '').trim();
  if (!clean) return '';
  if (!/^https?:\/\//i.test(clean)) {
    clean = `http://${clean}`;
  }
  clean = clean.replace(/\/+$/, '');
  return clean;
}

function getHaConnectionConfig(
  data?: any,
  overrideUrl?: string,
  overrideToken?: string
): HaConnectionConfig {
  const supervisorToken = (process.env.SUPERVISOR_TOKEN || '').trim();
  const addonOpts = readHaAddonOptions();
  const storedUrl = normalizeHaUrl(overrideUrl ?? data?.settings?.haUrl ?? addonOpts.ha_url ?? '');
  const storedToken = (overrideToken ?? data?.settings?.haToken ?? addonOpts.ha_token ?? '').trim();

  if (storedUrl && storedToken) {
    return {
      mode: 'manual',
      addonMode: Boolean(supervisorToken),
      baseApiUrl: `${storedUrl}/api`,
      baseRootUrl: storedUrl,
      haUrlDisplay: storedUrl,
      token: storedToken,
      hasToken: true
    };
  }

  if (supervisorToken) {
    return {
      mode: 'supervisor',
      addonMode: true,
      baseApiUrl: 'http://supervisor/core/api',
      baseRootUrl: 'http://supervisor/core',
      haUrlDisplay: storedUrl || 'http://supervisor/core',
      token: supervisorToken,
      hasToken: true
    };
  }

  return {
    mode: 'none',
    addonMode: false,
    baseApiUrl: '',
    baseRootUrl: '',
    haUrlDisplay: storedUrl,
    token: storedToken,
    hasToken: Boolean(storedToken)
  };
}

async function haFetch(
  apiPath: string,
  options: RequestInit = {},
  overrideConfig?: HaConnectionConfig
): Promise<any> {
  const cfg = overrideConfig || getHaConnectionConfig(getRawStoredData());
  if (cfg.mode === 'none' || !cfg.baseApiUrl || !cfg.token) {
    throw new Error('Home Assistant is nog niet gekoppeld.');
  }

  const normalizedPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const url = `${cfg.baseApiUrl}${normalizedPath}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Home Assistant fout (${response.status}): ${errText || response.statusText}`);
    }

    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } finally {
    clearTimeout(timeout);
  }
}

function mapHaCalendarEvent(
  ev: any,
  idx: number,
  calendarId: string,
  calendarName: string,
  calendarColor: string
) {
  const isAllDay = Boolean(ev?.start?.date && !ev?.start?.dateTime);
  let startTime = '';
  let endTime = '';

  if (isAllDay) {
    const startDateStr = String(ev.start.date).slice(0, 10);
    let endDateStr = startDateStr;
    if (ev.end?.date) {
      const rawEnd = String(ev.end.date).slice(0, 10);
      if (rawEnd > startDateStr) {
        // Home Assistant / RFC 5545 all-day end.date is exclusive -> subtract 1 day
        const endDateObj = new Date(`${rawEnd}T00:00:00Z`);
        if (!Number.isNaN(endDateObj.getTime())) {
          const inclusive = new Date(endDateObj.getTime() - 24 * 60 * 60 * 1000);
          const candidate = inclusive.toISOString().slice(0, 10);
          if (candidate >= startDateStr) {
            endDateStr = candidate;
          }
        }
      }
    }
    startTime = `${startDateStr}T00:00:00`;
    endTime = `${endDateStr}T23:59:59`;
  } else {
    const s = new Date(ev?.start?.dateTime || ev?.start || Date.now());
    const e = new Date(ev?.end?.dateTime || ev?.end || s);
    startTime = Number.isNaN(s.getTime()) ? new Date().toISOString() : s.toISOString();
    endTime = Number.isNaN(e.getTime()) ? startTime : e.toISOString();
  }

  const uidPart = String(ev.uid || ev.recurrence_id || idx)
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 28);

  return {
    id: `ha-${calendarId}-${uidPart}-${startTime}-${idx}`,
    calendarId,
    calendarName,
    calendarColor,
    isExternal: true,
    title: String(ev.summary || 'Agenda-afspraak').trim(),
    description: ev.description ? String(ev.description) : undefined,
    location: ev.location ? String(ev.location) : undefined,
    startTime,
    endTime,
    allDay: isAllDay
  };
}

async function fetchHaCalendarEvents(
  entityId: string,
  calendarId: string,
  calendarName: string,
  calendarColor: string,
  daysPast = 180,
  daysFuture = 365
) {
  const nowMs = Date.now();
  const startIso = new Date(nowMs - daysPast * 24 * 60 * 60 * 1000).toISOString();
  const endIso = new Date(nowMs + daysFuture * 24 * 60 * 60 * 1000).toISOString();
  const rawList = await haFetch(
    `/calendars/${encodeURIComponent(entityId)}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`
  );
  if (!Array.isArray(rawList)) return [];
  const mapped = rawList.map((ev: any, idx: number) =>
    mapHaCalendarEvent(ev, idx, calendarId, calendarName, calendarColor)
  );
  mapped.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return mapped;
}

// Get HA connection status
app.get('/api/ha/status', async (_req: Request, res: Response) => {
  const data = getRawStoredData();
  const cfg = getHaConnectionConfig(data);

  if (cfg.mode === 'none') {
    return res.json({
      connected: false,
      mode: 'none',
      addonMode: cfg.addonMode,
      haUrl: cfg.haUrlDisplay,
      hasToken: cfg.hasToken
    });
  }

  try {
    const haConfig = await haFetch('/config', {}, cfg);
    res.json({
      connected: true,
      mode: cfg.mode,
      addonMode: cfg.addonMode,
      haUrl: cfg.haUrlDisplay,
      hasToken: cfg.hasToken,
      locationName: haConfig?.location_name || 'Home Assistant',
      version: haConfig?.version || ''
    });
  } catch (error: any) {
    res.json({
      connected: false,
      mode: cfg.mode,
      addonMode: cfg.addonMode,
      haUrl: cfg.haUrlDisplay,
      hasToken: cfg.hasToken,
      error: error.message || 'Kan Home Assistant niet bereiken'
    });
  }
});

// Save HA manual URL/Token configuration & return updated status
app.post('/api/ha/config', async (req: Request, res: Response) => {
  try {
    const rawUrl = normalizeHaUrl(String(req.body?.haUrl || ''));
    const rawToken = req.body?.haToken !== undefined ? String(req.body.haToken).trim() : undefined;
    const clearToken = Boolean(req.body?.clearToken);

    const data = getRawStoredData();
    const nextToken = clearToken
      ? ''
      : rawToken && rawToken.length > 0
      ? rawToken
      : data.settings?.haToken || '';

    data.settings = {
      ...data.settings,
      haUrl: rawUrl,
      haToken: nextToken
    };
    saveStoredData(data);

    const cfg = getHaConnectionConfig(data);
    if (cfg.mode === 'none') {
      return res.json({
        connected: false,
        mode: 'none',
        addonMode: cfg.addonMode,
        haUrl: cfg.haUrlDisplay,
        hasToken: cfg.hasToken
      });
    }

    try {
      const haConfig = await haFetch('/config', {}, cfg);
      return res.json({
        connected: true,
        mode: cfg.mode,
        addonMode: cfg.addonMode,
        haUrl: cfg.haUrlDisplay,
        hasToken: cfg.hasToken,
        locationName: haConfig?.location_name || 'Home Assistant',
        version: haConfig?.version || ''
      });
    } catch (err: any) {
      return res.json({
        connected: false,
        mode: cfg.mode,
        addonMode: cfg.addonMode,
        haUrl: cfg.haUrlDisplay,
        hasToken: cfg.hasToken,
        error: err.message || 'Opgeslagen, maar verbinding mislukt'
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Kon HA configuratie niet opslaan.' });
  }
});

// Test HA connection
app.post('/api/ha/test', async (req: Request, res: Response) => {
  try {
    const data = getRawStoredData();
    const overrideUrl = req.body?.haUrl !== undefined ? String(req.body.haUrl) : undefined;
    const overrideToken =
      req.body?.haToken && String(req.body.haToken).trim()
        ? String(req.body.haToken).trim()
        : undefined;
    const cfg = getHaConnectionConfig(data, overrideUrl, overrideToken);

    if (cfg.mode === 'none') {
      return res.status(400).json({ error: 'Vul een Home Assistant URL en Access Token in.' });
    }

    const haConfig = await haFetch('/config', {}, cfg);
    const states = await haFetch('/states', {}, cfg).catch(() => []);
    const calCount = Array.isArray(states)
      ? states.filter((s: any) => String(s?.entity_id || '').startsWith('calendar.')).length
      : 0;
    const todoCount = Array.isArray(states)
      ? states.filter((s: any) => String(s?.entity_id || '').startsWith('todo.')).length
      : 0;

    res.json({
      connected: true,
      mode: cfg.mode,
      locationName: haConfig?.location_name || 'Home Assistant',
      version: haConfig?.version || '',
      calendarCount: calCount,
      todoCount
    });
  } catch (error: any) {
    res.status(502).json({
      connected: false,
      error: error.message || 'Verbinding met Home Assistant mislukt.'
    });
  }
});

// List HA calendar.* entities (merge /calendars and /states so every calendar entity is reliably found)
app.get('/api/ha/calendars', async (_req: Request, res: Response) => {
  try {
    const [calendarsRes, statesRes] = await Promise.all([
      haFetch('/calendars').catch(() => []),
      haFetch('/states').catch(() => [])
    ]);

    const byEntity = new Map<string, { entityId: string; name: string }>();

    if (Array.isArray(calendarsRes)) {
      for (const c of calendarsRes) {
        const entityId = String(c?.entity_id || '').trim();
        if (!entityId) continue;
        byEntity.set(entityId, {
          entityId,
          name: String(c?.name || entityId).trim()
        });
      }
    }

    if (Array.isArray(statesRes)) {
      for (const s of statesRes) {
        const entityId = String(s?.entity_id || '').trim();
        if (!entityId.startsWith('calendar.')) continue;
        const friendly = String(s?.attributes?.friendly_name || '').trim();
        const existing = byEntity.get(entityId);
        if (!existing) {
          byEntity.set(entityId, {
            entityId,
            name: friendly || entityId
          });
        } else if (friendly && (!existing.name || existing.name === entityId)) {
          existing.name = friendly;
        }
      }
    }

    const calendars = Array.from(byEntity.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'nl')
    );
    res.json({ calendars });
  } catch (error: any) {
    res.status(502).json({ error: error.message || 'Kon Home Assistant agenda\'s niet ophalen.' });
  }
});

// Fetch events for an HA calendar entity
app.get('/api/ha/calendars/events', async (req: Request, res: Response) => {
  const entityId = String(req.query.entityId || '').trim();
  const calendarId = String(req.query.calendarId || `ha-${entityId}`);
  const calendarName = String(req.query.calendarName || 'Home Assistant Agenda');
  const calendarColor = String(req.query.calendarColor || '#03A9F4');

  if (!entityId) {
    return res.status(400).json({ error: 'entityId parameter ontbreekt' });
  }

  try {
    const events = await fetchHaCalendarEvents(entityId, calendarId, calendarName, calendarColor);
    res.json({ success: true, count: events.length, events });
  } catch (error: any) {
    res.status(502).json({
      error: `Kan Home Assistant agenda (${entityId}) niet ophalen: ${error.message}`
    });
  }
});

// List HA todo.* entities
app.get('/api/ha/todos', async (_req: Request, res: Response) => {
  try {
    const states = await haFetch('/states');
    const todos = Array.isArray(states)
      ? states
          .filter((s: any) => String(s?.entity_id || '').startsWith('todo.'))
          .map((s: any) => ({
            entityId: s.entity_id,
            name: s.attributes?.friendly_name || s.entity_id,
            count: s.state
          }))
      : [];
    res.json({ todos });
  } catch (error: any) {
    res.status(502).json({ error: error.message || 'Kon Home Assistant takenlijsten niet ophalen.' });
  }
});

// Get items inside an HA todo.* list
app.get('/api/ha/todos/items', async (req: Request, res: Response) => {
  const entityId = String(req.query.entityId || '').trim();
  if (!entityId) {
    return res.status(400).json({ error: 'entityId parameter ontbreekt' });
  }
  try {
    const resp = await haFetch('/services/todo/get_items?return_response', {
      method: 'POST',
      body: JSON.stringify({ entity_id: entityId })
    });
    const rawItems = resp?.service_response?.[entityId]?.items || [];
    const items = Array.isArray(rawItems)
      ? rawItems.map((it: any) => ({
          uid: String(it.uid || it.summary),
          summary: String(it.summary || ''),
          status: it.status === 'completed' ? 'completed' : 'needs_action',
          due: it.due ? String(it.due) : undefined,
          description: it.description ? String(it.description) : undefined
        }))
      : [];
    res.json({ items });
  } catch (error: any) {
    res.status(502).json({ error: error.message || 'Kon taken uit Home Assistant niet laden.' });
  }
});

// Add item to an HA todo.* list
app.post('/api/ha/todos/items/add', async (req: Request, res: Response) => {
  const entityId = String(req.body?.entityId || '').trim();
  const item = String(req.body?.item || '').trim();
  const dueDate = req.body?.dueDate ? String(req.body.dueDate).trim() : '';
  const description = req.body?.description ? String(req.body.description).trim() : '';

  if (!entityId || !item) {
    return res.status(400).json({ error: 'entityId en item zijn verplicht' });
  }

  try {
    const payload: Record<string, any> = { entity_id: entityId, item };
    if (dueDate) payload.due_date = dueDate;
    if (description) payload.description = description;

    await haFetch('/services/todo/add_item', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(502).json({ error: error.message || 'Kon item niet toevoegen in Home Assistant.' });
  }
});

// Update item in an HA todo.* list (toggle status / rename / due / description)
app.post('/api/ha/todos/items/update', async (req: Request, res: Response) => {
  const entityId = String(req.body?.entityId || '').trim();
  const uid = String(req.body?.uid || '').trim();
  if (!entityId || !uid) {
    return res.status(400).json({ error: 'entityId en uid zijn verplicht' });
  }

  try {
    const payload: Record<string, any> = { entity_id: entityId, item: uid };
    if (req.body?.rename !== undefined) payload.rename = String(req.body.rename);
    if (req.body?.status !== undefined) payload.status = req.body.status;
    if (req.body?.dueDate !== undefined) payload.due_date = req.body.dueDate || null;
    if (req.body?.description !== undefined) payload.description = req.body.description;

    await haFetch('/services/todo/update_item', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(502).json({ error: error.message || 'Kon item in Home Assistant niet bijwerken.' });
  }
});

// Remove item from an HA todo.* list
app.post('/api/ha/todos/items/remove', async (req: Request, res: Response) => {
  const entityId = String(req.body?.entityId || '').trim();
  const uid = String(req.body?.uid || '').trim();
  if (!entityId || !uid) {
    return res.status(400).json({ error: 'entityId en uid zijn verplicht' });
  }

  try {
    await haFetch('/services/todo/remove_item', {
      method: 'POST',
      body: JSON.stringify({ entity_id: entityId, item: [uid] })
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(502).json({ error: error.message || 'Kon item uit Home Assistant niet verwijderen.' });
  }
});

// Clear completed items in an HA todo.* list
app.post('/api/ha/todos/items/clear-completed', async (req: Request, res: Response) => {
  const entityId = String(req.body?.entityId || '').trim();
  if (!entityId) {
    return res.status(400).json({ error: 'entityId is verplicht' });
  }

  try {
    await haFetch('/services/todo/remove_completed_items', {
      method: 'POST',
      body: JSON.stringify({ entity_id: entityId })
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(502).json({ error: error.message || 'Kon afgeronde items niet wissen in Home Assistant.' });
  }
});

// List HA actionable entities (automations, scripts, scenes, switches, lights, input_booleans)
app.get('/api/ha/entities', async (_req: Request, res: Response) => {
  const allowedDomains = new Set([
    'automation',
    'script',
    'scene',
    'switch',
    'light',
    'input_boolean'
  ]);

  try {
    const states = await haFetch('/states');
    const entities = Array.isArray(states)
      ? states
          .map((s: any) => {
            const entityId = String(s?.entity_id || '');
            const domain = entityId.split('.')[0] || '';
            return {
              entityId,
              domain,
              name: String(s?.attributes?.friendly_name || entityId)
            };
          })
          .filter(e => allowedDomains.has(e.domain))
          .sort((a, b) => a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name))
      : [];
    res.json({ entities });
  } catch (error: any) {
    res.status(502).json({ error: error.message || 'Kon Home Assistant entiteiten niet ophalen.' });
  }
});

// --- 24/7 DAILY AUTOMATION SCHEDULER WITH VACATION / CALENDAR SUPPRESSION ---

const schedulerCalendarCache = new Map<string, { fetchedAt: number; events: any[] }>();
const SCHEDULER_CACHE_TTL_MS = 5 * 60 * 1000;

function serverEventOccursOnDate(evt: any, dateStr: string): boolean {
  if (!evt?.startTime) return false;
  if (evt.allDay) {
    const s = String(evt.startTime).split('T')[0];
    const e = String(evt.endTime || evt.startTime).split('T')[0];
    return s === dateStr || (s <= dateStr && e >= dateStr);
  }
  const start = new Date(evt.startTime);
  const end = new Date(evt.endTime || evt.startTime);
  if (Number.isNaN(start.getTime())) return false;
  const sStr = formatDateYYYYMMDD(start);
  let eStr = sStr;
  if (!Number.isNaN(end.getTime())) {
    if (
      end.getTime() > start.getTime() &&
      end.getHours() === 0 &&
      end.getMinutes() === 0 &&
      end.getSeconds() === 0
    ) {
      eStr = formatDateYYYYMMDD(new Date(end.getTime() - 1));
    } else {
      eStr = formatDateYYYYMMDD(end);
    }
  }
  return sStr === dateStr || (sStr <= dateStr && eStr >= dateStr);
}

async function getCalendarEventsForScheduler(cal: any, localEvents: any[]): Promise<any[]> {
  if (!cal) return [];
  if (cal.type === 'local') {
    return localEvents.filter((e: any) => e.calendarId === cal.id);
  }

  const cached = schedulerCalendarCache.get(cal.id);
  if (cached && Date.now() - cached.fetchedAt < SCHEDULER_CACHE_TTL_MS) {
    return cached.events;
  }

  try {
    let events: any[] = [];
    if (cal.type === 'ical' && cal.url) {
      const normalizedUrl = String(cal.url).replace(/^webcal:\/\//i, 'https://');
      const resp = await fetch(normalizedUrl, {
        headers: { 'User-Agent': 'HomeBoard-Family-Dashboard/1.0' }
      });
      if (resp.ok) {
        const icsText = await resp.text();
        events = parseICS(icsText, cal.id, cal.name, cal.color);
      }
    } else if (cal.type === 'homeassistant' && cal.haEntityId) {
      events = await fetchHaCalendarEvents(cal.haEntityId, cal.id, cal.name, cal.color, 7, 30);
    }
    schedulerCalendarCache.set(cal.id, { fetchedAt: Date.now(), events });
    return events;
  } catch (err) {
    console.warn(`[Scheduler] Kon agenda "${cal.name}" niet verversen voor controle:`, err);
    return cached?.events || [];
  }
}

async function evaluateRuleSkipServer(rule: any, data: any, dateStr: string): Promise<{ skipped: boolean; reason?: string }> {
  const skipIds: string[] = Array.isArray(rule.skipCalendarIds) ? rule.skipCalendarIds : [];
  if (skipIds.length === 0) return { skipped: false };

  const keywords = String(rule.skipKeywords || '')
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);

  const calendars: any[] = Array.isArray(data.calendars) ? data.calendars : [];
  const localEvents: any[] = Array.isArray(data.events) ? data.events : [];

  for (const calId of skipIds) {
    const cal = calendars.find(c => c.id === calId);
    if (!cal) continue;
    const calEvents = await getCalendarEventsForScheduler(cal, localEvents);
    for (const evt of calEvents) {
      if (!serverEventOccursOnDate(evt, dateStr)) continue;
      if (keywords.length > 0) {
        const haystack = `${evt.title || ''} ${evt.description || ''}`.toLowerCase();
        if (!keywords.some(kw => haystack.includes(kw))) continue;
      }
      return {
        skipped: true,
        reason: `${cal.name}: ${evt.title}`
      };
    }
  }

  return { skipped: false };
}

async function fireRuleToHomeAssistant(rule: any, dateStr: string, data: any): Promise<void> {
  const cfg = getHaConnectionConfig(data);
  if (cfg.mode === 'none') {
    throw new Error('Home Assistant is niet gekoppeld.');
  }

  // 1. Always emit the HomeBoard event on Home Assistant's Event Bus
  await haFetch(
    '/events/homeboard_daily_trigger',
    {
      method: 'POST',
      body: JSON.stringify({
        rule_id: rule.id,
        title: rule.title,
        time: rule.time,
        date: dateStr,
        target_entity: rule.haTargetEntityId || null
      })
    },
    cfg
  );

  // 2. If a target entity is chosen, call the matching service
  const target = String(rule.haTargetEntityId || '').trim();
  if (target) {
    const domain = target.split('.')[0];
    if (domain === 'automation') {
      await haFetch(
        '/services/automation/trigger',
        { method: 'POST', body: JSON.stringify({ entity_id: target, skip_condition: false }) },
        cfg
      );
    } else if (domain === 'script') {
      await haFetch(
        '/services/script/turn_on',
        { method: 'POST', body: JSON.stringify({ entity_id: target }) },
        cfg
      );
    } else if (domain === 'scene') {
      await haFetch(
        '/services/scene/turn_on',
        { method: 'POST', body: JSON.stringify({ entity_id: target }) },
        cfg
      );
    } else {
      await haFetch(
        '/services/homeassistant/turn_on',
        { method: 'POST', body: JSON.stringify({ entity_id: target }) },
        cfg
      );
    }
  }

  // 3. Optional Webhook trigger
  const webhookId = String(rule.haWebhookId || '').trim();
  if (webhookId) {
    await fetch(`${cfg.baseApiUrl}/webhook/${encodeURIComponent(webhookId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_id: rule.id, title: rule.title, time: rule.time, date: dateStr })
    }).catch(() => {});
  }
}

let schedulerRunning = false;

async function runDailyAutomationScheduler() {
  if (schedulerRunning) return;
  schedulerRunning = true;
  try {
    const data = getRawStoredData();
    const rules: any[] = Array.isArray(data.dailyAutomationRules) ? data.dailyAutomationRules : [];
    if (rules.length === 0) return;

    const now = new Date();
    const todayStr = getLocalTodayStr();
    const dayOfWeek = now.getDay();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let mutated = false;

    for (const rule of rules) {
      if (!rule?.enabled) continue;
      if (!Array.isArray(rule.daysOfWeek) || !rule.daysOfWeek.includes(dayOfWeek)) continue;
      if (rule.lastTriggeredDate === todayStr || rule.lastSkippedDate === todayStr) continue;

      const match = String(rule.time || '').match(/^(\d{1,2}):(\d{2})$/);
      if (!match) continue;
      const ruleMinutes = Number(match[1]) * 60 + Number(match[2]);

      // Trigger within [ruleMinutes, ruleMinutes + 2] window (catches up if tick drifted slightly)
      if (nowMinutes < ruleMinutes || nowMinutes > ruleMinutes + 2) continue;

      const skipCheck = await evaluateRuleSkipServer(rule, data, todayStr);
      if (skipCheck.skipped) {
        rule.lastSkippedDate = todayStr;
        rule.lastSkippedReason = skipCheck.reason || 'Gepauzeerd via gekoppelde agenda';
        mutated = true;
        console.log(`[HomeBoard Scheduler] "${rule.title}" gepauzeerd vandaag (${rule.lastSkippedReason})`);
        continue;
      }

      try {
        await fireRuleToHomeAssistant(rule, todayStr, data);
        rule.lastTriggeredDate = todayStr;
        rule.lastTriggeredAt = now.toISOString();
        rule.lastSkippedDate = undefined;
        rule.lastSkippedReason = undefined;
        mutated = true;
        console.log(`[HomeBoard Scheduler] "${rule.title}" (${rule.time}) uitgevoerd in Home Assistant.`);
      } catch (err: any) {
        console.warn(`[HomeBoard Scheduler] Kon "${rule.title}" niet uitvoeren:`, err?.message || err);
      }
    }

    if (mutated) {
      saveStoredData(data);
    }
  } catch (err) {
    console.error('[HomeBoard Scheduler] Fout in scheduler:', err);
  } finally {
    schedulerRunning = false;
  }
}

// Manual test endpoint for a DailyAutomationRule
app.post('/api/ha/rules/:id/test', async (req: Request, res: Response) => {
  try {
    const ruleId = req.params.id;
    const data = getRawStoredData();
    const rule = (data.dailyAutomationRules || []).find((r: any) => r.id === ruleId);
    if (!rule) {
      return res.status(404).json({ error: 'Dagelijkse afspraak niet gevonden.' });
    }

    const todayStr = getLocalTodayStr();
    const skipCheck = await evaluateRuleSkipServer(rule, data, todayStr);
    await fireRuleToHomeAssistant(rule, todayStr, data);

    res.json({
      success: true,
      skippedTodayWouldBe: skipCheck.skipped,
      skipReason: skipCheck.reason || null
    });
  } catch (error: any) {
    res.status(502).json({
      error: error.message || 'Kon Home Assistant automatie niet testen.'
    });
  }
});

// --- CLIENT SERVING ---
async function setupServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
      }
    }));
    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏠 HomeBoard server running at http://0.0.0.0:${PORT} (ENV: ${process.env.NODE_ENV || 'development'})`);
  });

  // Start 24/7 daily automation scheduler (ticks every 20s)
  setTimeout(() => {
    runDailyAutomationScheduler();
    setInterval(runDailyAutomationScheduler, 20000);
  }, 5000);
}

setupServer().catch(err => {
  console.error('Failed to start HomeBoard server:', err);
  process.exit(1);
});
