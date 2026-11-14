import { CalendarMultiDayMode, CalendarSource, FamilyMember } from '../types';

export const CALENDAR_ICONS = [
  '📅',
  '🗑️',
  '🎂',
  '✈️',
  '🏫',
  '🏥',
  '⚽',
  '🚒',
  '💼',
  '🏠',
  '🛒',
  '🎵'
];

export interface CalendarPreset {
  key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  defaultScope: 'family' | 'children';
  multiDayMode: CalendarMultiDayMode;
}

export const CALENDAR_PRESETS: CalendarPreset[] = [
  {
    key: 'trash',
    name: 'Vuilbakkenophaling',
    icon: '🗑️',
    color: '#D97706',
    description: 'Restafval, PMD, GFT & papier ophaaldagen',
    defaultScope: 'family',
    multiDayMode: 'smart_cutoff'
  },
  {
    key: 'birthdays',
    name: 'Verjaardagen',
    icon: '🎂',
    color: '#EC4899',
    description: 'Verjaardagen van familie, vrienden en klasgenootjes',
    defaultScope: 'family',
    multiDayMode: 'smart_cutoff'
  },
  {
    key: 'holidays',
    name: 'Vakanties & Vrije dagen',
    icon: '✈️',
    color: '#8B5CF6',
    description: 'Schoolvakanties, brugdagen en verlof',
    defaultScope: 'family',
    multiDayMode: 'all_days'
  },
  {
    key: 'school',
    name: 'School & Opvang',
    icon: '🏫',
    color: '#10B981',
    description: 'Schoolactiviteiten, uitstappen en opvang',
    defaultScope: 'children',
    multiDayMode: 'smart_cutoff'
  },
  {
    key: 'medical',
    name: 'Dokter & Zorg',
    icon: '🏥',
    color: '#EF4444',
    description: 'Huisarts, tandarts en medische afspraken',
    defaultScope: 'family',
    multiDayMode: 'smart_cutoff'
  },
  {
    key: 'sport',
    name: 'Sport & Hobby',
    icon: '⚽',
    color: '#0EA5E9',
    description: 'Trainingen, wedstrijden en muziekles',
    defaultScope: 'children',
    multiDayMode: 'smart_cutoff'
  },
  {
    key: 'work',
    name: 'Werk & Shiften',
    icon: '💼',
    color: '#475569',
    description: 'Werkroosters, dag- en nachtshiften',
    defaultScope: 'family',
    multiDayMode: 'smart_cutoff'
  }
];

export function createCalendarFromPreset(
  preset: CalendarPreset,
  familyMembers: FamilyMember[]
): CalendarSource {
  const childIds = familyMembers.filter(m => m.role === 'child').map(m => m.id);
  const assignToChildren = preset.defaultScope === 'children' && childIds.length > 0;

  return {
    id: `cal-${preset.key}-${Math.random().toString(36).substring(2, 7)}`,
    name: preset.name,
    icon: preset.icon,
    color: preset.color,
    type: 'local',
    visible: true,
    description: preset.description,
    assignmentMode: assignToChildren ? 'members' : 'family',
    memberIds: assignToChildren ? childIds : [],
    multiDayMode: preset.multiDayMode
  };
}
