import React from 'react';
import {
  CalendarAssignmentMode,
  CalendarMultiDayMode,
  FamilyMember
} from '../types';
import { MemberAvatar } from './MemberAvatar';
import { Home, Check, Clock } from 'lucide-react';

interface CalendarAssignmentControlsProps {
  familyMembers: FamilyMember[];
  assignmentMode: CalendarAssignmentMode;
  memberIds: string[];
  multiDayMode: CalendarMultiDayMode;
  onChangeAssignment: (mode: CalendarAssignmentMode, memberIds: string[]) => void;
  onChangeMultiDayMode: (mode: CalendarMultiDayMode) => void;
  compact?: boolean;
}

export const CalendarAssignmentControls: React.FC<CalendarAssignmentControlsProps> = ({
  familyMembers,
  assignmentMode,
  memberIds,
  multiDayMode,
  onChangeAssignment,
  onChangeMultiDayMode,
  compact = false
}) => {
  const toggleMember = (id: string) => {
    const isCurrentlySelected = assignmentMode === 'members' && memberIds.includes(id);
    if (isCurrentlySelected) {
      const nextIds = memberIds.filter(m => m !== id);
      if (nextIds.length === 0) {
        onChangeAssignment('family', []);
      } else {
        onChangeAssignment('members', nextIds);
      }
    } else {
      const base = assignmentMode === 'members' ? memberIds : [];
      onChangeAssignment('members', Array.from(new Set([...base, id])));
    }
  };

  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-3.5'}>
      {/* Person / Whole Family Assignment */}
      <div>
        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
          Voor wie is deze agenda? (kies volledig gezin of 1 of meerdere personen)
        </label>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onChangeAssignment('family', [])}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              assignmentMode === 'family' || memberIds.length === 0
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Volledige gezin</span>
          </button>

          {familyMembers.map(member => {
            const isSelected = assignmentMode === 'members' && memberIds.includes(member.id);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleMember(member.id)}
                style={
                  isSelected
                    ? {
                        borderColor: member.color,
                        backgroundColor: `${member.color}18`
                      }
                    : undefined
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                  isSelected
                    ? 'text-slate-900 dark:text-white shadow-2xs ring-1'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <MemberAvatar member={member} size="xs" />
                <span>{member.name}</span>
                {isSelected && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
              </button>
            );
          })}
        </div>
        {!compact && (
          <p className="text-[11px] text-slate-500 mt-1">
            Tip: je kunt meerdere agenda's (bijv. Werk, Brandweer en Privé) aan dezelfde persoon koppelen, of 2 kinderen samen aanvinken.
          </p>
        )}
      </div>

      {/* Multi-day & Overnight Shift Display Mode */}
      <div>
        <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span>Weergave van nachtshiften & meerdaagse items</span>
        </label>
        <select
          value={multiDayMode}
          onChange={e => onChangeMultiDayMode(e.target.value as CalendarMultiDayMode)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
        >
          <option value="smart_cutoff">
            Slim — Nachtshift (19:00–07:00) alleen op startdag in lijsten; meerdaagse vakanties op alle dagen
          </option>
          <option value="start_day_only">
            Alleen op startdag — Elk meerdaags item / nachtshift alleen op begindatum (ook in urenrooster)
          </option>
          <option value="all_days">
            Op alle dagen tonen — Elk item dat de nacht of meerdere dagen overspant staat op elke dag
          </option>
        </select>
      </div>
    </div>
  );
};
