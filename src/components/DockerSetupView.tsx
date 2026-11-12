import React, { useState, useEffect } from 'react';
import {
  Server,
  Download,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  FolderSync,
  HelpCircle,
  FileCode,
  Layers
} from 'lucide-react';
import { AppState } from '../types';

interface DockerSetupViewProps {
  appState: AppState;
  onRestoreState: (state: AppState) => void;
}

export const DockerSetupView: React.FC<DockerSetupViewProps> = ({
  appState,
  onRestoreState
}) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'dockerfile' | 'env' | 'googleGuide'>('compose');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [healthInfo, setHealthInfo] = useState<any>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealthInfo(data))
      .catch(() => setHealthInfo({ status: 'stand-alone', isDocker: false }));
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const dockerComposeYaml = `version: '3.8'

services:
  homeboard:
    image: homeboard:latest
    build:
      context: .
      dockerfile: Dockerfile
    container_name: homeboard
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATA_DIR=/data
    volumes:
      # Alle agenda's, taken en instellingen blijven bewaard in ./data
      - ./data:/data
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
`;

  const dockerfileContent = `FROM node:20-alpine AS builder

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

# Install tsx voor de Node server
RUN npm install -g tsx

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

CMD ["tsx", "server.ts"]
`;

  const envContent = `# HomeBoard Docker Configuratie
PORT=3000
NODE_ENV=production
DATA_DIR=/data
`;

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(appState, null, 2);
    downloadFile(jsonStr, `homeboard-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.calendars && parsed.chores) {
          onRestoreState(parsed);
          alert('Backup succesvol hersteld!');
        } else {
          alert('Ongeldig backupbestand formaat.');
        }
      } catch (err) {
        alert('Fout bij het lezen van backupbestand.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800 space-y-3">
        <div className="inline-flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
          <Server className="w-4 h-4 text-indigo-400" />
          <span>Self-Hosting & Docker Compose Hub</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Draai HomeBoard 100% gratis in je eigen Docker
        </h2>
        <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
          Geen maandelijkse abonnementskosten of commerciële cloudverplichting. Koppel je eigen Google Agenda's en iCal feeds en host de container eenvoudig op je Synology NAS, Unraid, Raspberry Pi of thuisserver.
        </p>

        {/* Live health telemetry badge */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Server status: {healthInfo?.status || 'Online'}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full font-mono">
            <HardDrive className="w-3.5 h-3.5 text-indigo-300" />
            <span>Persistentie: ./data map gemount</span>
          </div>
        </div>
      </div>

      {/* Tabs: Compose | Dockerfile | .env | Google Agenda Gids */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('compose')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'compose'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>docker-compose.yml</span>
        </button>

        <button
          onClick={() => setActiveTab('dockerfile')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'dockerfile'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Dockerfile</span>
        </button>

        <button
          onClick={() => setActiveTab('env')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'env'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>.env.example</span>
        </button>

        <button
          onClick={() => setActiveTab('googleGuide')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'googleGuide'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Google Agenda koppelen gids</span>
        </button>
      </div>

      {/* TAB CONTENT: DOCKER COMPOSE */}
      {activeTab === 'compose' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                docker-compose.yml
              </h3>
              <p className="text-xs text-slate-500">
                Plaats dit bestand in een map op je server om de app via Docker Compose te starten.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(dockerComposeYaml, 'compose')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                {copiedKey === 'compose' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Gekopieerd!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopieer YAML</span>
                  </>
                )}
              </button>

              <button
                onClick={() => downloadFile(dockerComposeYaml, 'docker-compose.yml', 'text/yaml')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .yml</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto">
            <pre>{dockerComposeYaml}</pre>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-500" />
              <span>Snel starten via Terminal / SSH</span>
            </div>
            <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs space-y-1">
              <div># 1. Maak een projectmap en datamap aan</div>
              <div className="text-emerald-400">mkdir -p ~/homeboard/data && cd ~/homeboard</div>
              <div># 2. Start de container op de achtergrond</div>
              <div className="text-emerald-400">docker compose up -d --build</div>
              <div># 3. Open in je browser op je tablet of pc:</div>
              <div className="text-amber-400">http://&lt;IP-VAN-JE-SERVER&gt;:3000</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DOCKERFILE */}
      {activeTab === 'dockerfile' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Dockerfile (Multi-Stage Build)
              </h3>
              <p className="text-xs text-slate-500">
                Lichtgewicht Alpine container met geoptimaliseerde Vite productie-bundel.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(dockerfileContent, 'dockerfile')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                {copiedKey === 'dockerfile' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Gekopieerd!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopieer Dockerfile</span>
                  </>
                )}
              </button>

              <button
                onClick={() => downloadFile(dockerfileContent, 'Dockerfile', 'text/plain')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Dockerfile</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto">
            <pre>{dockerfileContent}</pre>
          </div>
        </div>
      )}

      {/* TAB CONTENT: .ENV */}
      {activeTab === 'env' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                .env.example
              </h3>
              <p className="text-xs text-slate-500">
                Optionele omgevingsvariabelen voor poort en opslaglocatie.
              </p>
            </div>

            <button
              onClick={() => copyToClipboard(envContent, 'env')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              {copiedKey === 'env' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Gekopieerd!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopieer .env</span>
                </>
              )}
            </button>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto">
            <pre>{envContent}</pre>
          </div>
        </div>
      )}

      {/* TAB CONTENT: GOOGLE GUIDE */}
      {activeTab === 'googleGuide' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6 text-xs text-slate-700 dark:text-slate-300">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Google Agenda's koppelen aan je HomeBoard
            </h3>
            <p className="text-slate-500">
              Je kunt kiezen tussen twee eenvoudige, 100% gratis methoden:
            </p>
          </div>

          {/* Method 1: iCal Secret URL */}
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 text-sm">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">1</span>
              <span>Methode 1: iCal Feed (Klaar binnen 1 minuut, geen cloud-config nodig)</span>
            </div>
            <p className="leading-relaxed">
              Dit is de allersnelste manier en werkt gegarandeerd in elke Docker setup zonder dat je Google Cloud API keys hoeft aan te maken.
            </p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>Open <strong>calendar.google.com</strong> op je computer.</li>
              <li>Klik links op de 3 puntjes naast je agenda en kies <strong>Instellingen en delen</strong>.</li>
              <li>Scroll naar onderen naar het kopje <strong>Agenda integreren</strong>.</li>
              <li>Kopieer het <strong>Geheim adres in iCal-indeling</strong> (de <code className="bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded text-emerald-900 dark:text-emerald-200">.ics</code> link).</li>
              <li>Ga in HomeBoard naar <strong>Koppelingen</strong> -&gt; <strong>iCal Feed toevoegen</strong> en plak de link.</li>
              <li>Klaar! Al je afspraken worden automatisch gesynchroniseerd via de interne proxy.</li>
            </ol>
          </div>

          {/* Method 2: Google OAuth */}
          <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
            <div className="flex items-center gap-2 font-bold text-indigo-800 dark:text-indigo-300 text-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
              <span>Methode 2: Direct inloggen met Google OAuth (Two-way sync)</span>
            </div>
            <p className="leading-relaxed">
              Wil je ook direct vanuit HomeBoard nieuwe afspraken terug kunnen schrijven naar je Google Agenda? Klik dan in HomeBoard op de knop <strong>Inloggen met Google</strong> in het venster <em>Koppelingen</em>.
            </p>
            <p className="text-slate-500">
              In de AI Studio dev omgeving is dit reeds geconfigureerd. Voor je eigen losse Docker domein kun je in Google Cloud Console een gratis OAuth Client ID aanmaken met je eigen domein of IP als Authorized Redirect URI.
            </p>
          </div>
        </div>
      )}

      {/* Backup & Restore Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <FolderSync className="w-4 h-4 text-indigo-500" />
            <span>Volledige Gegevensbackup & Migratie</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Exporteer al je taken, gezinsleden en agenda's naar een JSON bestand om mee te nemen naar je Docker server.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">
            <span>Backup herstellen</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Backup (.json)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
