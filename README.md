# 🏠 HomeBoard - Slim Familie Dashboard & Gezinsplanner

> Een privacy-vriendelijk, 100% gratis te hosten digitaal familiedashboard en interactieve agendaplanner geïnspireerd op **Home-Board.nl**. Geoptimaliseerd voor wandtablets aan de muur, smartphones (GSM), tablets en laptops met directe Google Agenda integratie en Docker Compose ondersteuning.

---

## ✨ Functionaliteiten

- 📅 **Interactieve Kalender (Google Agenda & Feeds)**:
  - Bekijk al je gezins- en werkagenda's in **Dag-**, **Week-**, **Maand-** en **Agendalijst-weergave**.
  - **Google Agenda koppelen via iCal**: Koppel direct via het geheime iCal-adres van Google Agenda — werkt binnen 1 minuut zonder ingewikkelde cloud-accounts!
  - **Google OAuth ondersteuning**: Mogelijkheid tot direct inloggen met Google.
  - **Afspraken toevoegen & bewerken**: Voeg eenvoudig afspraken toe met titel, datum, tijden, gekoppeld gezinslid, locatie en beschrijving.
- ⭐ **Takenbord & Beloningssysteem (Home-Board Stijl)**:
  - Profielen voor elk gezinslid met eigen avatars, rollen en herkenbare kleuren.
  - Dagelijkse routines verdeeld over **Ochtend**, **Middag** en **Avond**.
  - Confetti-animatie bij het afvinken van taken en automatisch sterren sparen.
  - **Beloningenwinkel**: Wissel verdiende sterren in voor leuke beloningen (bijv. schermtijd, pannenkoeken eten, filmavond).
- 🕒 **Live Klok & Weerwidget**:
  - Grote, rustige klok met datum en dagdeelbegroeting (*Goedemorgen / Goedemiddag / Goedenavond*).
  - Actuele weersvoorspelling en temperatuur.
- 📱 **Volledig Responsief Ontwerp**:
  - **GSM (Mobiel)**: Vaste navigatiebalk onderaan het scherm (zoals een native app) en een compacte bovenbalk.
  - **Wandtablet**: 2-koloms dashboard met handige **Kiosk-modus** (schermvullend zonder adresbalken).
  - **Laptop / Desktop**: Rijk breedbeeld overzicht.
  - **Lichte & Donkere Modus**: Ideaal voor overdag én een rustige nachtmodus aan de muur.
- 🔒 **100% Privacy & Zelf-Gehost**:
  - Geen maandelijks abonnement, geen tracking, geen externe servers vereist.
  - Alle gegevens worden lokaal opgeslagen in een persistent JSON-bestand (`./data/homeboard-data.json`).

---

## 🚀 Snel Starten met Docker Compose

### 1. Repository downloaden of clonen
```bash
git clone https://github.com/<jouw-gebruikersnaam>/homeboard.git
cd homeboard
```

### 2. Container bouwen en starten
```bash
docker compose up -d --build
```

### 3. Openen in je browser
Open op je computer, tablet of smartphone:
```
http://localhost:3000
```
*(of vervang `localhost` door het IP-adres van je NAS of server, bijv. `http://192.168.1.100:3000`)*

---

## ⚙️ Wat is er aan te passen in `docker-compose.yml`?

Hieronder staat het complete `docker-compose.yml` bestand met uitleg per instelling:

```yaml
version: '3.8'

services:
  homeboard:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: homeboard
    restart: unless-stopped

    # 1. POORT AANPASSEN:
    # Als poort 3000 al bezet is op je server, wijzig dan het linker getal.
    # Bijvoorbeeld: "8080:3000" maakt de app bereikbaar op http://jouw-ip:8080
    ports:
      - "3000:3000"

    # 2. OMGEVINGSVARIABELEN:
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATA_DIR=/data

    # 3. DATA BEWAREN (PERSISTENTIE):
    # './data' is de map op je computer/NAS waar alle afspraken, taken en
    # gezinsleden worden opgeslagen. Dit blijft bewaard bij container updates.
    volumes:
      - ./data:/data

    # 4. HEALTHCHECK:
    # Controleert automatisch of de interne server goed reageert.
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Belangrijkste aanpassingen voor jouw situatie:
1. **Andere poort gebruiken**:
   Wijzig in `docker-compose.yml` de regel `ports`:
   ```yaml
   ports:
     - "8085:3000"
   ```
   Nu is de app bereikbaar via poort `8085`.
2. **Eigen opslagpad kiezen (bijv. op Synology NAS of Unraid)**:
   In plaats van `./data:/data` kun je een absoluut pad opgeven:
   ```yaml
   volumes:
     - /volume1/docker/homeboard/data:/data
   ```

---

## 📆 Google Agenda Koppelen

HomeBoard ondersteunt twee gratis manieren om je Google Agenda's te koppelen:

### Methode 1: Via iCal Geheime Link (Aanbevolen & Binnen 1 Minuut Klaar)
Dit is de snelste methode en werkt gegarandeerd in elke Docker omgeving zonder dat je een Google Cloud ontwikkelaarsaccount nodig hebt:
1. Ga op je computer naar [Google Agenda](https://calendar.google.com).
2. Beweeg in de linkerzijbalk over de gewenste agenda, klik op de **3 puntjes** en kies **Instellingen en delen**.
3. Scroll naar beneden naar het kopje **Agenda integreren**.
4. Kopieer de link bij **Geheim adres in iCal-indeling** (eindigend op `.ics`).
5. Open in HomeBoard het menu **Koppelingen** (of klik in de Kalender op *Koppelingen*).
6. Plak de link op het tabblad **Direct Koppelen (iCal / Preview)** en klik op **Google Agenda Nu Koppelen**.
7. Al je afspraken worden direct binnengehaald en automatisch bijgewerkt!

### Methode 2: Direct inloggen met Google (OAuth)
Wil je via OAuth inloggen om direct tweerichtingsverkeer te synchroniseren?
- Draai je HomeBoard lokaal in Docker op `http://localhost:3000`? Dan is `localhost` al standaard geautoriseerd en kun je direct op **Inloggen met Google** klikken.
- Gebruik je een eigen domeinnaam (bijv. `https://agenda.mijnhuis.nl`)? Maak in de gratis Google Cloud Console een OAuth Client ID aan en voeg je domein toe aan de geautoriseerde redirect URI's.

---

## 📱 Handige Kioskmodus voor Wandtablets (iPad / Android / Raspberry Pi)

Wil je HomeBoard gebruiken als vast scherm aan de muur in de keuken of gang?

1. **iPad / iOS**:
   - Open HomeBoard in Safari op je tablet.
   - Tik op het **Deel-icoon** (vierkantje met pijl omhoog) en kies **Zet op beginscherm**.
   - Start HomeBoard vanaf je beginscherm: de Safari-knoppenbalk verdwijnt en de app opent schermvullend!
   - *Tip:* Gebruik iOS **Begeleide Toegang** (Guided Access) om te voorkomen dat iemand de app per ongeluk afsluit.
2. **Android Tablet**:
   - Open HomeBoard in Chrome.
   - Tik op de 3 puntjes rechtsboven en kies **Toevoegen aan startscherm** of **App installeren**.
   - *Tip:* Installeer de app **Fully Kiosk Browser** voor geavanceerde wandfunctionaliteiten (zoals automatisch aanzetten bij beweging via de camera).
3. **Kiosk-knop in de app**:
   - Klik rechtsboven op het pictogram **Kiosk** (of druk op F11) om de ingebouwde schermvullende modus te activeren.

---

## 📤 Hoe push je dit project naar je eigen GitHub?

Volg deze eenvoudige stappen in je terminal:

```bash
# 1. Initialiseer git (indien nog niet gedaan)
git init

# 2. Voeg alle bestanden toe
git add .

# 3. Maak je eerste commit
git commit -m "feat: initial commit van HomeBoard gezinsplanner"

# 4. Zet de hoofdtak op 'main'
git branch -M main

# 5. Koppel je GitHub repository (vervang door jouw GitHub URL)
git remote add origin https://github.com/<jouw-gebruikersnaam>/homeboard.git

# 6. Push naar GitHub
git push -u origin main
```

---

## 💾 Back-up & Herstel

- **Automatische opslag**: Alle wijzigingen in taken, beloningen en gekoppelde agenda's worden direct weggeschreven naar `data/homeboard-data.json`.
- **Handmatige export**: Ga in HomeBoard naar het tabblad **Docker & Setup** en klik op **Download Backup (.json)** om een momentopname te downloaden.
- **Herstellen**: Klik op **Backup herstellen** om een eerder gedownload `.json` bestand direct terug te zetten.

---

## 🛠️ Technologieën

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js 20, Express, Native Fetch, veilige iCal parser proxy.
- **Container**: Multi-stage Alpine Linux Docker build.
- **Licentie**: Open source (MIT).
