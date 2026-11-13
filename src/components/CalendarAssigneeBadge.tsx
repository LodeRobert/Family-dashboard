import React from 'react';
import { Home } from 'lucide-react';
import { ResolvedAssignees } from '../utils/calendarHelpers';
import { MemberAvatar } from './MemberAvatar';

interface CalendarAssigneeBadgeProps {
  assignees: ResolvedAssignees;
  compact?: boolean;
  showText?: boolean;
}

export const CalendarAssigneeBadge: React.FC<CalendarAssigneeBadgeProps> = ({
  assignees,
  compact = false,
  showText = true
}) => {
  if (assignees.isFamily) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0"
        title="Volledige gezin"
      >
        <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
          <Home className="w-2.5 h-2.5" />
        </span>
        {showText && <span className="truncate">{compact ? 'Gezin' : 'Hele gezin'}</span>}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100 shrink-0 min-w-0"
      title={assignees.members.map(m => m.name).join(' & ')}
    >
      <span className="inline-flex items-center -space-x-1.5 shrink-0">
        {assignees.members.map(member => (
          <MemberAvatar
            key={member.id}
            member={member}
            size="xs"
            className="ring-1 ring-white dark:ring-slate-900"
          />
        ))}
      </span>
      {showText && <span className="truncate">{assignees.label}</span>}
    </span>
  );
};
