# 🏠 HomeBoard - Slim Familie Dashboard & Gezinsplanner

> Een privacy-vriendelijk, 100% gratis te hosten digitaal familiedashboard en interactieve agendaplanner geïnspireerd op **Home-Board.nl**. Geoptimaliseerd voor wandtablets aan de muur, smartphones (GSM), tablets en laptops met directe Google Agenda integratie en Docker Compose ondersteuning.

---

## ✨ Functionaliteiten

- 📅 **Interactieve Kalender (Google Agenda & Feeds)**:
  - Bekijk al je gezins- en werkagenda's in **Dag-**, **Week-**, **Maand-** en **Agendalijst-weergave**.
  - **Volledig kleurenspectrum**: Kies voor elke lokale, Google- of iCal-agenda een eigen kleur uit het volledige kleurenspectrum en voeg onbeperkt lokale agenda's toe.
  - **Google Agenda koppelen via iCal**: Koppel direct via het geheime iCal-adres van Google Agenda — werkt binnen 1 minuut op elk lokaal IP-adres.
  - **Eigen Google OAuth Client ID**: Vul in **Instellingen** je eigen Google Cloud OAuth Client ID in om direct met je Google-account in te loggen op jouw eigen thuisadres/domein.
  - **Afspraken toevoegen & bewerken**: Voeg eenvoudig afspraken toe met titel, datum, tijden, gekoppeld gezinslid, locatie en beschrijving.
- ⭐ **Takenbord & Aanpasbaar Gezin (Home-Board Stijl)**:
  - Stel in **Instellingen** je eigen gezin samen: gezinsleden toevoegen, bewerken of verwijderen met rol (Ouder/Kind), eigen kleur en **eigen profielfoto** (lokaal opgeslagen in `data/avatars/`).
  - Dagelijkse routines verdeeld over **Ochtend**, **Middag** en **Avond** met confetti-animatie en **Beloningenwinkel**.
- 🕒 **Aanpasbare Begroeting, Live Klok & Lokaal Weer**:
  - Kies in **Instellingen** zelf de naam van je bord en of je wel of geen familienaam/huishoudnaam in de begroeting toont.
  - Kies je eigen **woonplaats** voor automatisch live weer (via Open-Meteo, zonder API-key).
- 📱 **Volledig Responsief Ontwerp**:
  - **GSM (Mobiel)**: Vaste navigatiebalk onderaan het scherm (zoals een native app) en een compacte bovenbalk.
  - **Wandtablet**: 2-koloms dashboard met handige **Kiosk-modus** (schermvullend zonder adresbalken).
  - **Laptop / Desktop**: Rijk breedbeeld overzicht in **Lichte & Donkere Modus**.
- 🔒 **100% Privacy & Zelf-Gehost**:
  - Geen maandelijks abonnement, geen tracking, geen externe cloud-opslag vereist.
  - Alle gegevens en geüploade profielfoto's worden lokaal opgeslagen in de Docker data-map (`./data/homeboard-data.json` en `./data/avatars/`).

---

## 🚀 Starten in Docker (2 Manieren)

### Optie A: Rechtstreeks bouwen vanaf GitHub (`docker-compose.yml`)
Geschikt voor **Docker CLI**, **Portainer (Stacks -> Repository)**, **Dockge** en **Synology / Unraid**.

```bash
git clone https://github.com/<jouw-gebruikersnaam>/<jouw-repo>.git
cd <jouw-repo>
docker compose up -d --build
```
*In Portainer: ga naar **Stacks -> Add stack -> Repository**, vul de GitHub URL in en klik op **Deploy the stack**.*

---

### Optie B: Direct een kant-en-klaar image pullen vanaf GitHub (GHCR)
Deze repository bevat een automatische **GitHub Action** (`.github/workflows/docker-publish.yml`). Bij elke push naar `main` bouwt GitHub automatisch een multi-platform Docker image (`amd64` én `arm64` voor Raspberry Pi) op:
`ghcr.io/<jouw-gebruikersnaam>/<jouw-repo>:latest`

1. Push de code naar GitHub (tabblad **Actions** op GitHub bouwt nu automatisch het image).
2. Zet het package op GitHub op **Public** (eenmalig):
   - Ga op GitHub naar je profiel -> **Packages** -> klik op je package -> **Package settings** -> **Change visibility** -> **Public**.
3. Gebruik `docker-compose.ghcr.yml` (of plak dit in Portainer / Synology Container Manager):

```yaml
services:
  homeboard:
    image: ghcr.io/<jouw-gebruikersnaam>/<jouw-repo>:latest
    container_name: homeboard
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATA_DIR=/data
      - TZ=Europe/Amsterdam
    volumes:
      - ./data:/data
```
Start met:
```bash
docker compose -f docker-compose.ghcr.yml up -d
```

Open daarna in je browser:
`http://localhost:3000` *(of `http://<IP-VAN-JE-SERVER>:3000`)*

---

## ⚙️ Wat is er aan te passen in `docker-compose.yml`?

| Instelling | Standaardwaarde | Wat aanpassen & Waarom? |
| :--- | :--- | :--- |
| **Poort (`ports`)** | `"3000:3000"` | Als poort 3000 al bezet is op je NAS of Raspberry Pi, verander je het eerste getal (bijv. `"8085:3000"`). |
| **Opslagpad (`volumes`)** | `./data:/data` | Bewaart alle data lokaal. Op een Synology NAS of Unraid kun je een vast pad opgeven (bijv. `/volume1/docker/homeboard/data:/data`). |
| **Tijdzone (`TZ`)** | `Europe/Amsterdam` | Pas aan indien je in een andere tijdzone zit (bijv. `Europe/Brussels`). |
| **Herstartbeleid (`restart`)** | `unless-stopped` | Zorgt dat HomeBoard automatisch weer opstart na het herstarten van je server of NAS. |

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
- Ga in HomeBoard naar **Instellingen** → **Agenda's, Kleuren & Google OAuth**.
- Maak in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) een **OAuth 2.0 Client ID (Webapplicatie)** aan met de **Google Calendar API** ingeschakeld.
- Voeg jouw eigen HomeBoard-adres toe onder **Geautoriseerde JavaScript-oorsprongen** (bijv. `http://localhost:3000` of `https://agenda.mijndomein.nl` — let op dat Google voor OAuth geen losse IP-adressen zoals `192.168.x.x` accepteert, wel `localhost`, een domeinnaam of `*.sslip.io`).
- Plak je Client ID in **Instellingen** en log in via **Koppelingen** → **Inloggen met Google (OAuth)**.

---

## 📱 Handige Kioskmodus voor Wandtablets (iPad / Android / Raspberry Pi)

1. **iPad / iOS**: Open HomeBoard in Safari -> **Deel-icoon** -> **Zet op beginscherm**.
2. **Android Tablet**: Open HomeBoard in Chrome -> **3 puntjes** -> **Toevoegen aan startscherm** (of gebruik **Fully Kiosk Browser**).
3. **Kiosk-knop in de app**: Klik rechtsboven op het **Kiosk-icoon** voor schermvullende weergave.

---

## 💾 Back-up & Herstel

- **Automatische opslag**: Alle wijzigingen worden opgeslagen in `data/homeboard-data.json` en profielfoto's in `data/avatars/`.
- **Handmatige export/herstel**: Gebruik de knoppen onderaan in **Instellingen** (*Tijdweergave & Gegevensback-up*).
