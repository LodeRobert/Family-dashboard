import { CalendarEvent, CalendarSource } from '../types';
import { getAccessToken } from './firebaseAuth';

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
}

export async function fetchGoogleCalendarList(): Promise<CalendarSource[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Niet ingelogd met Google');
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Calendar API fout (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const items: GoogleCalendarItem[] = data.items || [];

  return items.map(item => ({
    id: `gcal-${item.id}`,
    name: item.summary || 'Google Agenda',
    color: item.backgroundColor || '#4285F4',
    type: 'google_oauth' as const,
    visible: true,
    description: item.description || (item.primary ? 'Primaire Google Agenda' : 'Google Agenda'),
    googleId: item.id
  }));
}

export async function fetchGoogleEvents(
  googleId: string,
  calendarColor: string,
  calendarName: string,
  timeMin?: string,
  timeMax?: string
): Promise<CalendarEvent[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const now = new Date();
  const min = timeMin || new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const max = timeMax || new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleId)}/events`);
  url.searchParams.set('timeMin', min);
  url.searchParams.set('timeMax', max);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    console.error(`Kon afspraken voor Google Agenda ${googleId} niet ophalen:`, res.status);
    return [];
  }

  const data = await res.json();
  const items: any[] = data.items || [];

  return items.map(item => {
    const isAllDay = !item.start?.dateTime;
    const start = item.start?.dateTime || (item.start?.date ? `${item.start.date}T00:00:00.000Z` : new Date().toISOString());
    const end = item.end?.dateTime || (item.end?.date ? `${item.end.date}T23:59:59.000Z` : start);

    return {
      id: `gcal-evt-${item.id}`,
      calendarId: `gcal-${googleId}`,
      calendarName,
      calendarColor,
      title: item.summary || '(Geen titel)',
      description: item.description || '',
      startTime: start,
      endTime: end,
      allDay: isAllDay,
      location: item.location || '',
      isExternal: true
    };
  });
}

export async function createGoogleEvent(
  googleId: string,
  event: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    allDay?: boolean;
    location?: string;
  }
): Promise<any> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Niet geauthenticeerd bij Google. Log eerst in.');
  }

  const body: any = {
    summary: event.title,
    description: event.description || '',
    location: event.location || ''
  };

  if (event.allDay) {
    const startDate = event.startTime.split('T')[0];
    const endDate = event.endTime.split('T')[0];
    body.start = { date: startDate };
    body.end = { date: endDate };
  } else {
    body.start = { dateTime: new Date(event.startTime).toISOString() };
    body.end = { dateTime: new Date(event.endTime).toISOString() };
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Agenda toevoegen mislukt (${res.status}): ${err}`);
  }

  return await res.json();
}

export async function deleteGoogleEvent(googleId: string, googleEventId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Niet geauthenticeerd bij Google.');
  }

  const cleanEventId = googleEventId.replace(/^gcal-evt-/, '');

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleId)}/events/${encodeURIComponent(cleanEventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google Agenda afspraak verwijderen mislukt (${res.status})`);
  }

  return true;
}
