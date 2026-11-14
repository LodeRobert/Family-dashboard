import {
  CalendarCategory,
  CalendarMultiDayMode,
  CalendarSource,
  FamilyMember
} from '../types';

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
  key: CalendarCategory;
  name: string;
  icon: string;
  color: string;
  description: string;
  defaultScope: 'family' | 'children';
  multiDayMode: CalendarMultiDayMode;
  highlightOnDashboard?: boolean;
}

export const CALENDAR_PRESETS: CalendarPreset[] = [
  {
    key: 'trash',
    name: 'Vuilbakkenophaling',
    icon: '🗑️',
    color: '#D97706',
    description: 'Restafval, PMD, GFT & papier ophaaldagen',
    defaultScope: 'family',
    multiDayMode: 'smart_cutoff',
    highlightOnDashboard: true
  },
  {
    key: 'birthdays',
    name: 'Verjaardagen',
    icon: '🎂',
    color: '#EC4899',
    description: 'Verjaardagen van familie, vrienden en klasgenootjes',
    defaultScope: 'family',
    multiDayMode: 'smart_cutoff',
    highlightOnDashboard: true
  },
  {
    key: 'holidays',
    name: 'Vakanties & Vrije dagen',
    icon: '✈️',
    color: '#8B5CF6',
    description: 'Schoolvakanties, brugdagen en verlof',
    defaultScope: 'family',
    multiDayMode: 'all_days',
    highlightOnDashboard: true
  },
  {
    key: 'school',
    name: 'School & Opvang',
    icon: '🏫',
    color: '#10B981',
    description: 'Schoolactiviteiten, uitstappen en opvang',
    defaultScope: 'children',
    multiDayMode: 'smart_cutoff',
    highlightOnDashboard: true
  },
  {
    key: 'medical',
    name: 'Dokter & Zorg',
    icon: '🏥',
    color: '#EF4444',
    description: 'Huisarts, tandarts en medische afspraken',
    defaultScope: 'family',
    multiDayMode: 'smart_cutoff',
    highlightOnDashboard: true
  },
  {
    key: 'sport',
    name: 'Sport & Hobby',
    icon: '⚽',
    color: '#0EA5E9',
    description: 'Trainingen, wedstrijden en muziekles',
    defaultScope: 'children',
    multiDayMode: 'smart_cutoff',
    highlightOnDashboard: false
  },
  {
    key: 'work',
    name: 'Werk & Shiften',
    icon: '💼',
    color: '#475569',
    description: 'Werkroosters, dag- en nachtshiften',
    defaultScope: 'family',
    multiDayMode: 'smart_cutoff',
    highlightOnDashboard: false
  }
];

export function getCalendarPresetByKey(
  category?: CalendarCategory
): CalendarPreset | undefined {
  if (!category) return undefined;
  return CALENDAR_PRESETS.find(p => p.key === category);
}

export function inferCalendarCategory(cal: Pick<CalendarSource, 'category' | 'name'>): CalendarCategory | undefined {
  if (cal.category) return cal.category;
  const n = (cal.name || '').toLowerCase();
  if (n.includes('vuil') || n.includes('afval') || n.includes('recycle') || n.includes('pmd') || n.includes('gft')) {
    return 'trash';
  }
  if (n.includes('verjaardag') || n.includes('birthday')) return 'birthdays';
  if (n.includes('vakantie') || n.includes('feestdag') || n.includes('verlof')) return 'holidays';
  if (n.includes('school') || n.includes('opvang') || n.includes('bso')) return 'school';
  if (n.includes('dokter') || n.includes('tandarts') || n.includes('zorg') || n.includes('arts')) return 'medical';
  if (n.includes('sport') || n.includes('hobby') || n.includes('voetbal') || n.includes('zwem')) return 'sport';
  if (n.includes('werk') || n.includes('shift') || n.includes('brandweer')) return 'work';
  return undefined;
}

export function isHighlightedStandardCategory(category?: CalendarCategory): boolean {
  if (!category) return false;
  const preset = getCalendarPresetByKey(category);
  return Boolean(preset?.highlightOnDashboard);
}

export interface PresetSourceOverride {
  type: 'local' | 'ical' | 'homeassistant';
  name?: string;
  url?: string;
  haEntityId?: string;
  color?: string;
  assignmentMode?: 'family' | 'members';
  memberIds?: string[];
}

export function createCalendarFromPreset(
  preset: CalendarPreset,
  familyMembers: FamilyMember[],
  sourceOverride?: PresetSourceOverride
): CalendarSource {
  const childIds = familyMembers.filter(m => m.role === 'child').map(m => m.id);
  const assignToChildren = preset.defaultScope === 'children' && childIds.length > 0;
  const srcType = sourceOverride?.type || 'local';

  const assignmentMode =
    sourceOverride?.assignmentMode || (assignToChildren ? 'members' : 'family');
  const memberIds =
    sourceOverride?.memberIds !== undefined
      ? sourceOverride.memberIds
      : assignToChildren
      ? childIds
      : [];

  return {
    id: `${srcType === 'homeassistant' ? 'ha' : srcType === 'ical' ? 'ical' : 'cal'}-${preset.key}-${Math.random().toString(36).substring(2, 7)}`,
    name: sourceOverride?.name?.trim() || preset.name,
    icon: preset.icon,
    category: preset.key,
    color: sourceOverride?.color || preset.color,
    type: srcType,
    visible: true,
    url: sourceOverride?.url,
    haEntityId: sourceOverride?.haEntityId,
    isReadOnly: srcType === 'ical' || srcType === 'homeassistant',
    description:
      srcType === 'homeassistant' && sourceOverride?.haEntityId
        ? `${preset.name} · HA (${sourceOverride.haEntityId})`
        : srcType === 'ical'
        ? `${preset.name} · iCal feed`
        : preset.description,
    assignmentMode,
    memberIds,
    multiDayMode: preset.multiDayMode
  };
}
