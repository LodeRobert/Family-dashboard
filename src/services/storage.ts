import { AppState, CalendarEvent, CalendarSource } from '../types';

const LOCAL_STORAGE_KEY = 'homeboard_state_v1';

export async function loadAppState(): Promise<AppState> {
  try {
    const res = await fetch('/api/storage/state');
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Backend storage unavailable, falling back to localStorage:', err);
  }

  // Fallback to local storage
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // parse error
    }
  }

  // Return fallback default
  return {
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
        memberId: 'fam-4',
        title: 'Tafel dekken voor het avondeten',
        period: 'evening',
        stars: 2,
        completedToday: false,
        icon: '🍽️'
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
      kioskTheme: 'auto',
      timeFormat24h: true
    }
  };
}

export async function saveAppState(state: AppState): Promise<void> {
  // Always update local cache
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

  try {
    await fetch('/api/storage/state', {
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

export async function fetchICalFeedEvents(cal: CalendarSource): Promise<CalendarEvent[]> {
  if (!cal.url) return [];
  try {
    const url = `/api/ical/fetch?url=${encodeURIComponent(cal.url)}&calendarId=${encodeURIComponent(cal.id)}&calendarName=${encodeURIComponent(cal.name)}&calendarColor=${encodeURIComponent(cal.color)}`;
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
