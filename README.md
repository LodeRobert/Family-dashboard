# 🏠 HomeBoard - Slim Familie Dashboard & Gezinsplanner

> Een privacy-vriendelijk, 100% gratis te hosten digitaal familiedashboard en interactieve agendaplanner geïnspireerd op **Home-Board.nl**. Geoptimaliseerd voor wandtablets aan de muur, smartphones (GSM), tablets en laptops met iCal-agenda koppeling en Docker Compose ondersteuning.

---

## ✨ Functionaliteiten

- 📅 **Interactieve Kalender (iCal & Lokale Agenda's)**:
  - Bekijk al je gezins- en werkagenda's in **Dag-**, **Week-**, **Maand-** en **Agendalijst-weergave**.
  - **Volledig kleurenspectrum**: Kies voor elke lokale of iCal-agenda een eigen kleur uit het volledige kleurenspectrum en maak onbeperkt lokale agenda's aan.
  - **Agenda's koppelen via iCal**: Koppel eenvoudig elke Google-, Apple- of Outlook-agenda via de geheime iCal-link (`.ics`) — werkt op elk lokaal netwerk zonder cloud-account.
  - **Afspraken toevoegen & bewerken**: Voeg eenvoudig lokale afspraken toe met titel, datum, tijden, gekoppeld gezinslid, locatie en beschrijving.
- ⭐ **Takenbord, Sterrenlijst & Algemene Taken**:
  - **Dagroutines op moment van de dag**: Taken voor **Ochtend** (00:00–12:00), **Middag** (12:00–18:00), **Avond** (18:00–00:00) of **Hele dag** (altijd af te vinken). Elke dag start automatisch om **00:00** opnieuw, en voorbije dagen blijven achteraf aanpasbaar.
  - **Sterrenlijst & Historiek**: Overzichtelijke lijstweergave per persoon waarop je precies ziet wanneer en door welke taak of reden sterren zijn behaald, aangepast of ingewisseld.
  - **Algemene Taken**: Volledig ingebouwde takenlijsten (zoals *Algemeen*, *Boodschappen*, *Klusjes*) ter vervanging van Google Tasks.
  - **Wachtwoordbeveiligde Instellingen**: Stel bij het opstarten een wachtwoord in; pas alleen na het wachtwoord het gezin, losse sterren (zonder taak toevoegen, aanpassen, verwijderen of op 0 zetten) en profielfoto's (`data/avatars/`) aan.
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

## 📆 Externe Agenda Koppelen (iCal)

HomeBoard koppelt externe agenda's (zoals Google Agenda, Apple iCloud of Outlook) snel en betrouwbaar via een **iCal-link (.ics)** — zonder Google Cloud of OAuth configuratie:

1. Ga op je computer naar [Google Agenda](https://calendar.google.com).
2. Beweeg in de linkerzijbalk over de gewenste agenda, klik op de **3 puntjes** en kies **Instellingen en delen**.
3. Scroll naar beneden naar het kopje **Agenda integreren**.
4. Kopieer de link bij **Geheim adres in iCal-indeling** (eindigend op `.ics`).
5. Open in HomeBoard **Kalender → Koppelingen** (of via **Instellingen → iCal Agenda Koppelen**).
6. Plak de link, kies een naam en kleur uit het volledige spectrum en klik op **iCal Agenda Koppelen**.
7. Al je afspraken worden direct opgehaald en automatisch ververst!

---

## 📱 Handige Kioskmodus voor Wandtablets (iPad / Android / Raspberry Pi)

1. **iPad / iOS**: Open HomeBoard in Safari -> **Deel-icoon** -> **Zet op beginscherm**.
2. **Android Tablet**: Open HomeBoard in Chrome -> **3 puntjes** -> **Toevoegen aan startscherm** (of gebruik **Fully Kiosk Browser**).
3. **Kiosk-knop in de app**: Klik rechtsboven op het **Kiosk-icoon** voor schermvullende weergave.

---

## 💾 Back-up & Herstel

- **Automatische opslag**: Alle wijzigingen worden opgeslagen in `data/homeboard-data.json` en profielfoto's in `data/avatars/`.
- **Handmatige export/herstel**: Gebruik de knoppen onderaan in **Instellingen** (*Tijdweergave & Gegevensback-up*).
