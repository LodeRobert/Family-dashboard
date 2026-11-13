export type CalendarType = 'local' | 'ical';

export interface CalendarSource {
  id: string;
  name: string;
  color: string;
  type: CalendarType;
  visible: boolean;
  description?: string;
  url?: string; // For iCal feeds
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
  avatar: string; // Emoji fallback
  photoUrl?: string; // Uploaded photo path stored in /data/avatars
  stars: number;
}

export type ChorePeriod = 'morning' | 'afternoon' | 'evening' | 'all_day';

export interface Chore {
  id: string;
  memberId: string;
  title: string;
  period: ChorePeriod;
  stars: number;
  icon?: string;
  completedToday?: boolean; // Legacy field kept optional for smooth migration
}

export type StarLogType = 'chore' | 'manual_adjustment' | 'reward_claim';

export interface StarLogEntry {
  id: string;
  date: string; // Local YYYY-MM-DD
  timestamp: string; // ISO timestamp
  memberId: string;
  choreId?: string;
  title: string;
  stars: number; // Positive for earned, negative for deducted/claimed
  type: StarLogType;
}

export interface GeneralTask {
  id: string;
  title: string;
  notes?: string;
  listName: string; // e.g., 'Algemeen', 'Boodschappen', 'Klusjes'
  dueDate?: string; // YYYY-MM-DD
  assignedTo?: string; // Optional FamilyMember ID
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  priority: 'low' | 'normal' | 'high';
}

export interface RewardItem {
  id: string;
  title: string;
  starsRequired: number;
  claimedCount: number;
}

export interface AppSettings {
  dashboardName: string;
  showFamilyNameInGreeting: boolean;
  familyGreetingName: string;
  cityName: string;
  weatherLat?: number;
  weatherLon?: number;
  weatherTemp: number;
  weatherCondition: string;
  weatherCode?: number;
  hasSettingsPassword?: boolean;
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
  choreCompletionsByDate: Record<string, string[]>; // Local YYYY-MM-DD -> completed chore IDs
  starLogs: StarLogEntry[];
  generalTasks: GeneralTask[];
  rewards: RewardItem[];
  settings: AppSettings;
}

export type ViewTab = 'dashboard' | 'calendar' | 'chores' | 'settings';
export type CalendarViewMode = 'day' | 'week' | 'month' | 'agenda';

export interface WeatherLocationResult {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}
