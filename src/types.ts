export type CalendarType = 'local' | 'google_oauth' | 'ical';

export interface CalendarSource {
  id: string;
  name: string;
  color: string;
  type: CalendarType;
  visible: boolean;
  description?: string;
  url?: string; // For iCal feeds
  googleId?: string; // For Google Calendar ID (e.g. primary)
  isReadOnly?: boolean;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  allDay?: boolean;
  assignedTo?: string; // FamilyMember ID
  location?: string;
  calendarName?: string;
  calendarColor?: string;
  isExternal?: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'parent' | 'child';
  color: string;
  avatar: string;
  stars: number;
}

export type ChorePeriod = 'morning' | 'afternoon' | 'evening';

export interface Chore {
  id: string;
  memberId: string;
  title: string;
  period: ChorePeriod;
  stars: number;
  completedToday: boolean;
  icon?: string;
}

export interface RewardItem {
  id: string;
  title: string;
  starsRequired: number;
  claimedCount: number;
}

export interface AppSettings {
  dashboardName: string;
  cityName: string;
  weatherTemp: number;
  weatherCondition: string;
  kioskAutoDim: boolean;
  kioskDimAfterMinutes: number;
  kioskTheme: 'auto' | 'light' | 'dark';
  timeFormat24h: boolean;
}

export interface AppState {
  familyMembers: FamilyMember[];
  calendars: CalendarSource[];
  events: CalendarEvent[];
  chores: Chore[];
  rewards: RewardItem[];
  settings: AppSettings;
}

export type ViewTab = 'dashboard' | 'calendar' | 'chores' | 'docker';
export type CalendarViewMode = 'day' | 'week' | 'month' | 'agenda';
