import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Ensure persistent data directory exists
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DATA_FILE = path.join(DATA_DIR, 'homeboard-data.json');

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
      completedToday: false,
      icon: '🪥'
    },
    {
      id: 'chr-2',
      memberId: 'fam-3',
      title: 'Schooltas inpakken & drinkbus vullen',
      period: 'morning',
      stars: 1,
      completedToday: true,
      icon: '🎒'
    },
    {
      id: 'chr-3',
      memberId: 'fam-3',
      title: 'Huiswerk / 15 min lezen 📖',
      period: 'afternoon',
      stars: 2,
      completedToday: false,
      icon: '📚'
    },
    {
      id: 'chr-4',
      memberId: 'fam-3',
      title: 'Speelgoed opruimen & pyjama aan',
      period: 'evening',
      stars: 1,
      completedToday: false,
      icon: '🧸'
    },
    {
      id: 'chr-5',
      memberId: 'fam-4',
      title: 'Tanden poetsen ochtend',
      period: 'morning',
      stars: 1,
      completedToday: true,
      icon: '🪥'
    },
    {
      id: 'chr-6',
      memberId: 'fam-4',
      title: 'Tafel dekken voor het avondeten',
      period: 'evening',
      stars: 2,
      completedToday: false,
      icon: '🍽️'
    },
    {
      id: 'chr-7',
      memberId: 'fam-4',
      title: 'Kamer netjes maken voor het slapen',
      period: 'evening',
      stars: 1,
      completedToday: false,
      icon: '✨'
    }
  ],
  rewards: [
    { id: 'rew-1', title: '1 uur gamen / schermtijd 🎮', starsRequired: 10, claimedCount: 3 },
    { id: 'rew-2', title: 'Pannenkoeken of pizza kiezen 🍕', starsRequired: 20, claimedCount: 1 },
    { id: 'rew-3', title: 'Middagje speeltuin of bioscoop 🍿', starsRequired: 35, claimedCount: 0 }
  ],
  settings: {
    dashboardName: 'HomeBoard Familie',
    cityName: 'Amsterdam',
    weatherTemp: 18,
    weatherCondition: 'Zonnig',
    kioskAutoDim: false,
    kioskDimAfterMinutes: 10,
    kioskTheme: 'auto', // 'light' | 'dark' | 'auto'
    timeFormat24h: true
  }
};

// Initialize file if not existing
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_INITIAL_STATE, null, 2), 'utf-8');
}

// Helper to read data
function getStoredData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading data file, falling back to initial:', err);
    return DEFAULT_INITIAL_STATE;
  }
}

// Helper to save data
function saveStoredData(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
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

// Get all persisted state
app.get('/api/storage/state', (_req: Request, res: Response) => {
  const data = getStoredData();
  res.json(data);
});

// Update state
app.post('/api/storage/state', (req: Request, res: Response) => {
  try {
    const updated = req.body;
    if (!updated || typeof updated !== 'object') {
      return res.status(400).json({ error: 'Ongeldige data' });
    }
    saveStoredData(updated);
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
          // All day event: YYYYMMDD
          const y = val.substring(0, 4);
          const m = val.substring(4, 6);
          const d = val.substring(6, 8);
          curEvent.startTime = `${y}-${m}-${d}T00:00:00.000Z`;
          curEvent.allDay = true;
        } else {
          // DateTime: YYYYMMDDTHHmmssZ
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
    const isUtc = clean.endsWith('Z');
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
    // Normalise webcal:// to https://
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

// Docker Compose export details
app.get('/api/docker/config', (_req: Request, res: Response) => {
  const composeYaml = `version: '3.8'

services:
  homeboard:
    build: .
    container_name: homeboard
    restart: unless-stopped
    ports:
      - "\${PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATA_DIR=/data
    volumes:
      - ./data:/data
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
`;

  const dockerfile = `FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.ts ./
COPY firebase-applet-config.json ./

# Install tsx for running server.ts directly
RUN npm install -g tsx

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

CMD ["tsx", "server.ts"]
`;

  const envExample = `# HomeBoard Docker Configuratie
PORT=3000
NODE_ENV=production
DATA_DIR=/data
`;

  res.json({
    composeYaml,
    dockerfile,
    envExample,
    instructions: [
      '1. Maak een map aan op je server/NAS: mkdir -p homeboard/data',
      '2. Plaats de docker-compose.yml en Dockerfile in deze map',
      '3. Start de container met: docker compose up -d --build',
      '4. Open http://jouw-nas-ip:3000 in de browser van je wandtablet of pc!'
    ]
  });
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
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
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
