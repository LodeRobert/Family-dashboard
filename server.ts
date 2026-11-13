import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

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
    { id: 'fam-1', name: 'Papa', role: 'parent', color: '#3B82F6', avatar: '👨‍💼', stars: 25 },
    { id: 'fam-2', name: 'Mama', role: 'parent', color: '#EC4899', avatar: '👩‍💼', stars: 30 },
    { id: 'fam-3', name: 'Lucas', role: 'child', color: '#10B981', avatar: '👦', stars: 14 },
    { id: 'fam-4', name: 'Emma', role: 'child', color: '#F59E0B', avatar: '👧', stars: 18 }
  ],
  calendars: [
    {
      id: 'cal-family',
      name: 'Gezinsagenda',
      color: '#6366F1',
      type: 'local',
      visible: true,
      description: 'Gezamenlijke afspraken en uitjes'
    },
    {
      id: 'cal-school',
      name: 'School & Sport',
      color: '#10B981',
      type: 'local',
      visible: true,
      description: 'Lessen, trainingen en wedstrijden'
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
  rewards: [
    { id: 'rew-1', title: '1 uur gamen / schermtijd 🎮', starsRequired: 10, claimedCount: 3 },
    { id: 'rew-2', title: 'Pannenkoeken of pizza kiezen 🍕', starsRequired: 20, claimedCount: 1 },
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
    settingsPasswordHash: '',
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

    return {
      ...DEFAULT_INITIAL_STATE,
      ...parsed,
      calendars,
      choreCompletionsByDate,
      starLogs: Array.isArray(parsed.starLogs) ? parsed.starLogs : [],
      generalTasks: Array.isArray(parsed.generalTasks)
        ? parsed.generalTasks
        : DEFAULT_INITIAL_STATE.generalTasks,
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
  const { settingsPasswordHash, googleClientId: _gcid, customAppUrl: _cau, ...safeSettings } =
    data.settings || {};
  return {
    ...data,
    settings: {
      ...safeSettings,
      hasSettingsPassword: Boolean(settingsPasswordHash)
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

// Update state (preserves server-side settingsPasswordHash)
app.post('/api/storage/state', (req: Request, res: Response) => {
  try {
    const updated = req.body;
    if (!updated || typeof updated !== 'object') {
      return res.status(400).json({ error: 'Ongeldige data' });
    }
    const current = getRawStoredData();
    const { hasSettingsPassword: _ignore, ...incomingSettings } = updated.settings || {};
    const mergedToSave = {
      ...updated,
      settings: {
        ...current.settings,
        ...incomingSettings,
        settingsPasswordHash: current.settings?.settingsPasswordHash || ''
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

// Open-Meteo Current Weather (free, no API key required)
app.get('/api/weather/current', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: 'Ongeldige coördinaten' });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API status ${response.status}`);
    }
    const data = await response.json();
    const temp = Math.round(data.current?.temperature_2m ?? 18);
    const weatherCode = Number(data.current?.weather_code ?? 0);
    const condition = translateWeatherCode(weatherCode);

    res.json({
      temp,
      weatherCode,
      condition
    });
  } catch (error: any) {
    console.error('Weather current error:', error);
    res.status(500).json({ error: 'Kon actueel weer niet ophalen' });
  }
});

// Helper: Parse basic iCal / ICS feed into normalized events
function parseICS(icsText: string, calendarId: string, calendarName: string, calendarColor: string) {
  const events: any[] = [];
  const lines = icsText.replace(/\r\n /g, '').split(/\r\n|\n|\r/);
  let inEvent = false;
  let curEvent: any = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      curEvent = {
        id: 'ics-' + Math.random().toString(36).substring(2, 9),
        calendarId,
        calendarName,
        calendarColor,
        isExternal: true
      };
      continue;
    }
    if (line === 'END:VEVENT') {
      inEvent = false;
      if (curEvent.title && curEvent.startTime) {
        if (!curEvent.endTime) {
          curEvent.endTime = curEvent.startTime;
        }
        events.push(curEvent);
      }
      curEvent = {};
      continue;
    }
    if (!inEvent) continue;

    if (line.startsWith('SUMMARY:')) {
      curEvent.title = line.substring(8).replace(/\\,/g, ',').replace(/\\;/g, ';');
    } else if (line.startsWith('DESCRIPTION:')) {
      curEvent.description = line.substring(12).replace(/\\n/g, '\n').replace(/\\,/g, ',');
    } else if (line.startsWith('LOCATION:')) {
      curEvent.location = line.substring(9).replace(/\\,/g, ',');
    } else if (line.startsWith('UID:')) {
      curEvent.id = 'ics-' + line.substring(4).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    } else if (line.startsWith('DTSTART')) {
      const parts = line.split(':');
      const val = parts[1];
      if (val) {
        if (val.length === 8) {
          const y = val.substring(0, 4);
          const m = val.substring(4, 6);
          const d = val.substring(6, 8);
          curEvent.startTime = `${y}-${m}-${d}T00:00:00.000Z`;
          curEvent.allDay = true;
        } else {
          curEvent.startTime = formatICSDate(val);
          curEvent.allDay = false;
        }
      }
    } else if (line.startsWith('DTEND')) {
      const parts = line.split(':');
      const val = parts[1];
      if (val) {
        if (val.length === 8) {
          const y = val.substring(0, 4);
          const m = val.substring(4, 6);
          const d = val.substring(6, 8);
          curEvent.endTime = `${y}-${m}-${d}T23:59:59.000Z`;
        } else {
          curEvent.endTime = formatICSDate(val);
        }
      }
    }
  }

  return events;
}

function formatICSDate(val: string): string {
  try {
    const clean = val.replace(/[^0-9TZ]/g, '');
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const d = clean.substring(6, 8);
    const h = clean.substring(9, 11) || '00';
    const min = clean.substring(11, 13) || '00';
    const s = clean.substring(13, 15) || '00';
    return new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +s)).toISOString();
  } catch {
    return new Date().toISOString();
  }
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
}

setupServer().catch(err => {
  console.error('Failed to start HomeBoard server:', err);
  process.exit(1);
});
