export type CalendarType = 'local' | 'ical' | 'homeassistant';
export type CalendarAssignmentMode = 'family' | 'members';
export type CalendarMultiDayMode = 'smart_cutoff' | 'start_day_only' | 'all_days';

export interface CalendarSource {
  id: string;
  name: string;
  color: string;
  type: CalendarType;
  visible: boolean;
  description?: string;
  url?: string; // For iCal feeds
  haEntityId?: string; // For Home Assistant calendar.* entities
  isReadOnly?: boolean;
  assignmentMode?: CalendarAssignmentMode; // 'family' = volledige gezin, 'members' = 1 of meer gezinsleden
  memberIds?: string[]; // Gekoppelde gezinsleden (bijv. 1 ouder, of 2 kinderen samen)
  multiDayMode?: CalendarMultiDayMode; // Hoe meerdaagse & nacht-events worden getoond
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  allDay?: boolean;
  assignedTo?: string; // Optional single FamilyMember override
  location?: string;
  calendarName?: string;
  calendarColor?: string;
  isExternal?: boolean;
  isDailyRule?: boolean;
  dailyRuleId?: string;
  multiDayOverride?: 'default' | 'all_days' | 'start_day_only';
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
  startTime?: string; // Optional custom HH:mm start time (e.g. "07:00")
  endTime?: string; // Optional custom HH:mm end time (e.g. "09:00")
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

export interface LinkedHaTodoList {
  entityId: string;
  name: string;
}

export interface HaTodoItem {
  uid: string;
  summary: string;
  status: 'needs_action' | 'completed';
  due?: string;
  description?: string;
}

export interface DailyAutomationRule {
  id: string;
  title: string;
  time: string; // HH:mm
  durationMinutes: number;
  daysOfWeek: number[]; // 0 = zo, 1 = ma, ... 6 = za
  enabled: boolean;
  showOnCalendar: boolean;
  calendarId?: string;
  skipCalendarIds: string[];
  skipKeywords?: string;
  haTargetEntityId?: string; // automation.*, script.*, scene.*, switch.*, light.*, input_boolean.*
  haWebhookId?: string;
  lastTriggeredDate?: string;
  lastTriggeredAt?: string;
  lastSkippedDate?: string;
  lastSkippedReason?: string;
}

export interface HaStatusInfo {
  connected: boolean;
  mode: 'supervisor' | 'manual' | 'none';
  addonMode: boolean;
  haUrl: string;
  hasToken: boolean;
  locationName?: string;
  version?: string;
  error?: string;
}

export interface HaCalendarEntity {
  entityId: string;
  name: string;
}

export interface HaTodoEntity {
  entityId: string;
  name: string;
  count?: string;
}

export interface HaActionEntity {
  entityId: string;
  name: string;
  domain: string;
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
  haUrl?: string;
  hasHaToken?: boolean;
  haAddonMode?: boolean;
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
  starLogsReconciled?: boolean;
  taskLists?: string[];
  generalTasks: GeneralTask[];
  haLinkedTodoEntities?: LinkedHaTodoList[];
  dailyAutomationRules?: DailyAutomationRule[];
  rewards: RewardItem[];
  settings: AppSettings;
}

export type ViewTab = 'dashboard' | 'calendar' | 'chores' | 'tasks' | 'settings';
export type CalendarViewMode = 'day' | 'week' | 'month' | 'agenda';

export interface WeatherLocationResult {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}
