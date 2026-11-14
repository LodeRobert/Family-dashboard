# HomeBoard — Home Assistant Add-on Handleiding

HomeBoard draait volledig binnen Home Assistant (inclusief zijbalk/Ingress), maar blijft ook bruikbaar op poort `3000` voor wandtablets in Kiosk-modus.

## Functies in Home Assistant

1. **Automatische Koppeling (Supervisor API)**:
   Binnen de Add-on heeft HomeBoard automatisch toegang tot je Home Assistant kalenders, To-Do lijsten en automaties zonder dat je handmatig een token hoeft in te vullen.
2. **Home Assistant Kalenders**:
   Ga in HomeBoard naar **Kalender → Koppelingen → Home Assistant** om elke `calendar.*` entiteit (zoals Lokale Kalender, Schoolvakanties, CalDAV of Google) toe te voegen met eigen kleur en gezinslid-koppeling.
3. **Home Assistant To-Do Lijsten (2-richtingsverkeer)**:
   Ga naar **Takenlijsten → Home Assistant To-Do → + Lijst koppelen** om elke `todo.*` lijst (zoals *Boodschappenlijst*) rechtstreeks vanuit HomeBoard te bekijken, af te vinken, toe te voegen en te verwijderen.
4. **Dagelijkse Afspraken & Automatische Vakantie-pauze**:
   Ga naar **Instellingen → Dagelijkse Afspraken & Home Assistant Automaties**:
   - Maak een regel (bijv. `08:00` — *"Klaarmaken voor school"* op maandag t/m vrijdag).
   - Kies een Home Assistant automatie, script, scene of schakelaar (of gebruik het event `homeboard_daily_trigger`).
   - Koppel een of meerdere **pauze-agenda's** (bijv. *Schoolvakanties* in Home Assistant of via iCal). Staat er die dag een afspraak in die agenda, dan slaat HomeBoard die dag de automatie automatisch over én verbergt hij het blokje op de agenda!

## Optionele Add-on Configuratie

- `tz`: Tijdzone voor de dagelijkse scheduler (standaard `Europe/Amsterdam`, of bijv. `Europe/Brussels`).
- `ha_url` & `ha_token`: Alleen nodig als je een tweede/externe Home Assistant server wilt gebruiken in plaats van de lokale Supervisor API.

## Voorbeeld Home Assistant Automatie op basis van `homeboard_daily_trigger`

```yaml
alias: "HomeBoard - Klaarmaken voor school melding"
trigger:
  - platform: event
    event_type: homeboard_daily_trigger
    event_data:
      title: "Klaarmaken voor school"
action:
  - service: notify.mobile_app_telefoon
    data:
      title: "HomeBoard"
      message: "Het is {{ trigger.event.data.time }}, tijd om klaar te maken voor school!"
```
