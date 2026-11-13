import React, { useState, useEffect } from 'react';
import {
  Chore,
  FamilyMember,
  RewardItem,
  ChorePeriod,
  StarLogEntry,
  GeneralTask
} from '../types';
import { MemberAvatar } from './MemberAvatar';
import {
  getLocalDateStr,
  shiftLocalDateStr,
  formatLocalDateNL,
  getCurrentDayPeriod,
  isChorePeriodActiveNow,
  getChorePeriodLabel,
  getChorePeriodTimeRange,
  isChoreCompletedOnDate
} from '../utils/dateTime';
import {
  Sparkles,
  Plus,
  CheckCircle2,
  Circle,
  Sun,
  Sunset,
  Moon,
  Trash2,
  Trophy,
  CalendarDays,
  ListTodo,
  Clock,
  Lock,
  ChevronLeft,
  ChevronRight,
  History,
  CheckSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChoresViewProps {
  chores: Chore[];
  choreCompletionsByDate: Record<string, string[]>;
  starLogs: StarLogEntry[];
  generalTasks: GeneralTask[];
  familyMembers: FamilyMember[];
  rewards: RewardItem[];
  todayStr: string;
  onToggleChore: (choreId: string, dateStr: string) => void;
  onAddChore: (chore: Omit<Chore, 'id' | 'completedToday'>) => void;
  onDeleteChore: (choreId: string) => void;
  onAddReward: (reward: Omit<RewardItem, 'id' | 'claimedCount'>) => void;
  onClaimReward: (rewardId: string, memberId: string) => void;
  onAddGeneralTask: (task: Omit<GeneralTask, 'id' | 'completed' | 'createdAt'>) => void;
  onToggleGeneralTask: (taskId: string) => void;
  onDeleteGeneralTask: (taskId: string) => void;
  onClearCompletedGeneralTasks: () => void;
}

type ChoresSubTab = 'routines' | 'star_calendar' | 'general_tasks';

export const ChoresView: React.FC<ChoresViewProps> = ({
  chores,
  choreCompletionsByDate,
  starLogs,
  generalTasks,
  familyMembers,
  rewards,
  todayStr,
  onToggleChore,
  onAddChore,
  onDeleteChore,
  onAddReward,
  onClaimReward,
  onAddGeneralTask,
  onToggleGeneralTask,
  onDeleteGeneralTask,
  onClearCompletedGeneralTasks
}) => {
  const [subTab, setSubTab] = useState<ChoresSubTab>('routines');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    familyMembers.find(m => m.role === 'child')?.id || familyMembers[0]?.id || ''
  );

  // Selected date for routines (defaults to todayStr; supports adjusting previous days)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [now, setNow] = useState<Date>(() => new Date());

  // Modals
  const [isAddChoreOpen, setIsAddChoreOpen] = useState(false);
  const [isAddRewardOpen, setIsAddRewardOpen] = useState(false);

  // New routine chore form state
  const [newChoreTitle, setNewChoreTitle] = useState('');
  const [newChorePeriod, setNewChorePeriod] = useState<ChorePeriod>('morning');
  const [newChoreStars, setNewChoreStars] = useState(1);
  const [newChoreIcon, setNewChoreIcon] = useState('⭐');

  // New reward form state
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardStars, setNewRewardStars] = useState(10);

  // Star Calendar state
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string>(todayStr);
  const [calendarMemberFilter, setCalendarMemberFilter] = useState<string>('all');

  // General Tasks state (Google Tasks replacement)
  const [selectedListFilter, setSelectedListFilter] = useState<string>('ALL');
  const [showCompletedTasks, setShowCompletedTasks] = useState<boolean>(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskListName, setNewTaskListName] = useState('Algemeen');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'normal' | 'high'>('normal');

  // Keep current time ticking every 30s so time-of-day routine locks update cleanly
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Automatically roll over selectedDateStr when midnight passes if user was on the previous "today"
  useEffect(() => {
    const yesterdayStr = shiftLocalDateStr(todayStr, -1);
    setSelectedDateStr(prev => (prev === yesterdayStr ? todayStr : prev));
    setCalendarSelectedDate(prev => (prev === yesterdayStr ? todayStr : prev));
  }, [todayStr]);

  useEffect(() => {
    if (familyMembers.length === 0) {
      setSelectedMemberId('');
      return;
    }
    if (!familyMembers.some(m => m.id === selectedMemberId)) {
      const nextDefault =
        familyMembers.find(m => m.role === 'child')?.id || familyMembers[0].id;
      setSelectedMemberId(nextDefault);
    }
  }, [familyMembers, selectedMemberId]);

  const selectedMember = familyMembers.find(m => m.id === selectedMemberId);
  const memberChores = chores.filter(c => c.memberId === selectedMemberId);
  const isTodaySelected = selectedDateStr === todayStr;
  const currentPeriod = getCurrentDayPeriod(now);

  const morningChores = memberChores.filter(c => c.period === 'morning');
  const afternoonChores = memberChores.filter(c => c.period === 'afternoon');
  const eveningChores = memberChores.filter(c => c.period === 'evening');
  const allDayChores = memberChores.filter(c => c.period === 'all_day');

  const completedCount = memberChores.filter(c =>
    isChoreCompletedOnDate(choreCompletionsByDate, selectedDateStr, c.id)
  ).length;
  const progressPercent =
    memberChores.length > 0 ? Math.round((completedCount / memberChores.length) * 100) : 0;

  const canTogglePeriod = (period: ChorePeriod) => {
    if (!isTodaySelected) {
      // Previous days can always be adjusted by parents
      return selectedDateStr <= todayStr;
    }
    return isChorePeriodActiveNow(period, now);
  };

  const handleChoreClick = (chore: Chore) => {
    if (!canTogglePeriod(chore.period)) return;
    const isCompleted = isChoreCompletedOnDate(choreCompletionsByDate, selectedDateStr, chore.id);
    if (!isCompleted) {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    onToggleChore(chore.id, selectedDateStr);
  };

  const handleAddChoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChoreTitle.trim() || !selectedMemberId) return;

    onAddChore({
      memberId: selectedMemberId,
      title: newChoreTitle.trim(),
      period: newChorePeriod,
      stars: newChoreStars,
      icon: newChoreIcon
    });

    setNewChoreTitle('');
    setIsAddChoreOpen(false);
  };

  const handleAddRewardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRewardTitle.trim()) return;

    onAddReward({
      title: newRewardTitle.trim(),
      starsRequired: newRewardStars
    });

    setNewRewardTitle('');
    setIsAddRewardOpen(false);
  };

  const handleClaim = (reward: RewardItem) => {
    if (!selectedMember || selectedMember.stars < reward.starsRequired) return;
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.5 }
    });
    onClaimReward(reward.id, selectedMember.id);
  };

  // --- Star Calendar helpers ---
  const filteredStarLogs =
    calendarMemberFilter === 'all'
      ? starLogs
      : starLogs.filter(l => l.memberId === calendarMemberFilter);

  const getCalendarDaysForMonth = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date: d, isCurrentMonth: false, dateStr: getLocalDateStr(d) });
    }
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true, dateStr: getLocalDateStr(d) });
    }
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, dateStr: getLocalDateStr(d) });
    }
    return days;
  };

  const selectedDayStarLogs = filteredStarLogs
    .filter(l => l.date === calendarSelectedDate)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // --- General Tasks helpers ---
  const uniqueTaskLists = Array.from(
    new Set(['Algemeen', 'Boodschappen', 'Klusjes', ...generalTasks.map(t => t.listName)])
  );

  const visibleGeneralTasks = generalTasks
    .filter(t => selectedListFilter === 'ALL' || t.listName === selectedListFilter)
    .filter(t => showCompletedTasks || !t.completed)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const prioOrder = { high: 0, normal: 1, low: 2 };
      if (prioOrder[a.priority] !== prioOrder[b.priority]) {
        return prioOrder[a.priority] - prioOrder[b.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleAddGeneralTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    onAddGeneralTask({
      title: newTaskTitle.trim(),
      notes: newTaskNotes.trim() || undefined,
      listName: newTaskListName.trim() || 'Algemeen',
      dueDate: newTaskDueDate || undefined,
      assignedTo: newTaskAssignedTo || undefined,
      priority: newTaskPriority
    });

    setNewTaskTitle('');
    setNewTaskNotes('');
    setNewTaskDueDate('');
  };

  // --- Render Period Column Helper ---
  const renderPeriodCard = (
    period: ChorePeriod,
    title: string,
    icon: React.ReactNode,
    items: Chore[],
    emptyText: string,
    defaultEmoji: string
  ) => {
    const isActiveNow = canTogglePeriod(period);
    const completedInPeriod = items.filter(c =>
      isChoreCompletedOnDate(choreCompletionsByDate, selectedDateStr, c.id)
    ).length;

    return (
      <div
        className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-xs space-y-3 transition-all ${
          isTodaySelected && !isActiveNow
            ? 'border-slate-200/70 dark:border-slate-800/70 opacity-80'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              {icon}
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h4>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
              <span>{getChorePeriodTimeRange(period)}</span>
              {isTodaySelected && !isActiveNow && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                  <Lock className="w-3 h-3" />
                  Buiten tijdvak
                </span>
              )}
              {isTodaySelected && isActiveNow && period !== 'all_day' && (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  · Nu actief
                </span>
              )}
            </div>
          </div>
          <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
            {completedInPeriod}/{items.length}
          </span>
        </div>

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">{emptyText}</div>
          ) : (
            items.map(chore => {
              const isCompleted = isChoreCompletedOnDate(
                choreCompletionsByDate,
                selectedDateStr,
                chore.id
              );

              return (
                <div
                  key={chore.id}
                  onClick={() => handleChoreClick(chore)}
                  title={
                    isActiveNow
                      ? 'Tik om af te vinken'
                      : `Alleen af te vinken tussen ${getChorePeriodTimeRange(period)}`
                  }
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all ${
                    !isActiveNow
                      ? 'cursor-not-allowed bg-slate-50/70 dark:bg-slate-800/20 border-slate-200/70 dark:border-slate-800 text-slate-500'
                      : isCompleted
                      ? 'cursor-pointer bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'cursor-pointer bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {!isActiveNow && !isCompleted ? (
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                    <span className="text-xl shrink-0">{chore.icon || defaultEmoji}</span>
                    <span
                      className={`font-semibold truncate ${
                        isCompleted
                          ? 'line-through text-emerald-800/70 dark:text-emerald-300/70'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {chore.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-amber-500 font-bold font-mono tabular-nums">
                      +{chore.stars}★
                    </span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteChore(chore.id);
                      }}
                      className="text-slate-300 hover:text-red-500 p-1"
                      title="Verwijder taak"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-navigation tabs inside Takenbord */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSubTab('routines')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            subTab === 'routines'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Dagroutines & Beloningen</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('star_calendar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            subTab === 'star_calendar'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Sterren-agenda & Historiek</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('general_tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            subTab === 'general_tasks'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          <span>Algemene Taken ({generalTasks.filter(t => !t.completed).length})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 1: DAGROUTINES & BELONINGEN                                   */}
      {/* ===================================================================== */}
      {subTab === 'routines' && (
        <div className="space-y-6">
          {/* Top Banner: Member Selector & Day Picker */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Member Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {familyMembers.map(member => {
                const isSelected = member.id === selectedMemberId;
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl transition-all border shrink-0 text-left ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <MemberAvatar member={member} size="md" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {member.name}
                      </div>
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold font-mono tabular-nums flex items-center gap-1">
                        <Sparkles className="w-3 h-3 fill-current" />
                        <span>{member.stars} sterren</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Day Switcher (for adjusting previous days) + Add Chore */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedDateStr(prev => shiftLocalDateStr(prev, -1))}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Vorige dag aanpassen"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDateStr}
                  max={todayStr}
                  onChange={e => {
                    if (e.target.value && e.target.value <= todayStr) {
                      setSelectedDateStr(e.target.value);
                    }
                  }}
                  className="bg-transparent px-1.5 py-1 font-mono font-semibold text-slate-800 dark:text-slate-200 focus:outline-none text-xs"
                  aria-label="Kies datum om routines te bekijken of aan te passen"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = shiftLocalDateStr(selectedDateStr, 1);
                    if (next <= todayStr) setSelectedDateStr(next);
                  }}
                  disabled={isTodaySelected}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-colors"
                  title="Volgende dag"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {!isTodaySelected && (
                <button
                  type="button"
                  onClick={() => setSelectedDateStr(todayStr)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                >
                  Naar vandaag
                </button>
              )}

              <button
                onClick={() => setIsAddChoreOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Routine toevoegen</span>
              </button>
            </div>
          </div>

          {/* Info strip: Either Editing Past Day Banner OR Automatic Midnight / Active Period Strip */}
          {!isTodaySelected ? (
            <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  Je past een <strong>vorige dag</strong> aan (
                  <span className="capitalize font-semibold">
                    {formatLocalDateNL(selectedDateStr)}
                  </span>
                  ). Vinkjes hier passen het totale sterrensaldo en de sterren-agenda direct aan.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDateStr(todayStr)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg"
              >
                Terug naar vandaag
              </button>
            </div>
          ) : (
            <div className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  Actief dagdeel nu:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {getChorePeriodLabel(currentPeriod)} ({getChorePeriodTimeRange(currentPeriod)})
                  </strong>{' '}
                  · Taken voor <strong>Hele dag</strong> zijn altijd af te vinken.
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Nieuwe dag start automatisch om 00:00
              </span>
            </div>
          )}

          {/* Progress Strip for Selected Member */}
          {selectedMember && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MemberAvatar member={selectedMember} size="lg" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Takenbord van {selectedMember.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {completedCount} van de {memberChores.length} routines voltooid op{' '}
                    <span className="capitalize">
                      {isTodaySelected ? 'vandaag' : formatLocalDateNL(selectedDateStr)}
                    </span>{' '}
                    ({progressPercent}%)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-64">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold font-mono tabular-nums text-slate-700 dark:text-slate-300 shrink-0">
                  {progressPercent}%
                </span>
              </div>
            </div>
          )}

          {/* 4 Periods Grid: Ochtend, Middag, Avond, Hele dag */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {renderPeriodCard(
              'morning',
              'Ochtendroutine',
              <Sun className="w-4 h-4 text-amber-500" />,
              morningChores,
              'Geen ochtendtaken ingesteld',
              '☀️'
            )}
            {renderPeriodCard(
              'afternoon',
              'Middag & Huiswerk',
              <Sunset className="w-4 h-4 text-indigo-500" />,
              afternoonChores,
              'Geen middagtaken ingesteld',
              '📚'
            )}
            {renderPeriodCard(
              'evening',
              'Avondroutine',
              <Moon className="w-4 h-4 text-violet-500" />,
              eveningChores,
              'Geen avondtaken ingesteld',
              '🌙'
            )}
            {renderPeriodCard(
              'all_day',
              'Hele dag',
              <Clock className="w-4 h-4 text-emerald-500" />,
              allDayChores,
              'Geen taken voor de hele dag',
              '✨'
            )}
          </div>

          {/* Rewards Catalog Section (Beloningenwinkel) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Beloningenwinkel & Spaardoelen 🎁
                  </h3>
                  <p className="text-xs text-slate-500">
                    Wissel verdiende sterren in voor leuke gezinsbeloningen
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddRewardOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Beloning toevoegen</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {rewards.map(reward => {
                const canAfford = (selectedMember?.stars || 0) >= reward.starsRequired;

                return (
                  <div
                    key={reward.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {reward.title}
                      </div>
                      <div className="text-xs text-amber-600 dark:text-amber-400 font-bold font-mono mt-1">
                        {reward.starsRequired} sterren nodig
                      </div>
                      {reward.claimedCount > 0 && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Al {reward.claimedCount}x ingewisseld
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleClaim(reward)}
                      disabled={!canAfford}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {canAfford
                        ? `Inwisselen voor ${selectedMember?.name}`
                        : `Nog ${reward.starsRequired - (selectedMember?.stars || 0)}★ nodig`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 2: STERREN-AGENDA & HISTORIEK                                 */}
      {/* ===================================================================== */}
      {subTab === 'star_calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Monthly Star Calendar */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                    )
                  }
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize min-w-[150px] text-center">
                  {new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' }).format(
                    calendarMonth
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    )
                  }
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <select
                value={calendarMemberFilter}
                onChange={e => setCalendarMemberFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="all">Alle gezinsleden</option>
                {familyMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.stars}★)
                  </option>
                ))}
              </select>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-center py-2 text-[11px] font-semibold text-slate-500">
                <div>Ma</div>
                <div>Di</div>
                <div>Wo</div>
                <div>Do</div>
                <div>Vr</div>
                <div>Za</div>
                <div>Zo</div>
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
                {getCalendarDaysForMonth().map((dayObj, idx) => {
                  const dayLogs = filteredStarLogs.filter(l => l.date === dayObj.dateStr);
                  // Sum stars per member on this day
                  const perMemberTotals = new Map<string, number>();
                  for (const entry of dayLogs) {
                    perMemberTotals.set(
                      entry.memberId,
                      (perMemberTotals.get(entry.memberId) || 0) + entry.stars
                    );
                  }

                  const isSelected = calendarSelectedDate === dayObj.dateStr;
                  const isToday = dayObj.dateStr === todayStr;

                  return (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setCalendarSelectedDate(dayObj.dateStr)}
                      className={`min-h-[72px] sm:min-h-[92px] p-1.5 text-left flex flex-col justify-between transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/50 ring-2 ring-inset ring-indigo-500'
                          : !dayObj.isCurrentMonth
                          ? 'bg-slate-50/60 dark:bg-slate-950/40 text-slate-400'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span
                        className={`text-xs font-bold font-mono tabular-nums inline-flex items-center justify-center w-6 h-6 rounded-full ${
                          isToday
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {dayObj.date.getDate()}
                      </span>

                      <div className="space-y-0.5 w-full mt-1">
                        {Array.from(perMemberTotals.entries())
                          .slice(0, 3)
                          .map(([mId, total]) => {
                            const mem = familyMembers.find(m => m.id === mId);
                            if (!mem) return null;
                            return (
                              <div
                                key={mId}
                                className="flex items-center justify-between gap-1 text-[10px] px-1 py-0.5 rounded bg-white/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700 truncate"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: mem.color }}
                                />
                                <span className="truncate font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">
                                  {mem.name}
                                </span>
                                <span
                                  className={`font-mono font-bold shrink-0 ${
                                    total >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'
                                  }`}
                                >
                                  {total >= 0 ? `+${total}` : total}★
                                </span>
                              </div>
                            );
                          })}
                        {perMemberTotals.size > 3 && (
                          <div className="text-[9px] text-slate-400 font-mono">
                            +{perMemberTotals.size - 3} meer
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Selected Day Star Log Details */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                  {formatLocalDateNL(calendarSelectedDate)}
                </h3>
                <p className="text-xs text-slate-500">
                  Overzicht van behaalde & aangepaste sterren
                </p>
              </div>
              {calendarSelectedDate <= todayStr && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDateStr(calendarSelectedDate);
                    setSubTab('routines');
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg shrink-0"
                >
                  Dag aanpassen
                </button>
              )}
            </div>

            {selectedDayStarLogs.length === 0 ? (
              <div className="py-10 text-center space-y-2 text-xs text-slate-400">
                <Sparkles className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-700" />
                <p>Op deze dag zijn geen sterren geregistreerd.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {selectedDayStarLogs.map(entry => {
                  const mem = familyMembers.find(m => m.id === entry.memberId);
                  const timeStr = new Intl.DateTimeFormat('nl-NL', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(new Date(entry.timestamp));

                  return (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {mem && <MemberAvatar member={mem} size="sm" />}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white truncate">
                            {entry.title}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {mem?.name || 'Gezinslid'} · {timeStr} ·{' '}
                            {entry.type === 'chore'
                              ? 'Taak'
                              : entry.type === 'manual_adjustment'
                              ? 'Instellingen'
                              : 'Beloning'}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`font-mono font-bold text-sm shrink-0 ${
                          entry.stars >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-500'
                        }`}
                      >
                        {entry.stars >= 0 ? `+${entry.stars}` : entry.stars}★
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 3: ALGEMENE TAKEN (Volledig lokale Google Tasks vervanger)    */}
      {/* ===================================================================== */}
      {subTab === 'general_tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Add General Task Form */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 h-fit">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Nieuwe algemene taak
                </h3>
                <p className="text-xs text-slate-500">
                  Boodschappen, klusjes en to-do's lokaal in HomeBoard
                </p>
              </div>
            </div>

            <form onSubmit={handleAddGeneralTaskSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Wat moet er gebeuren? *
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="bijv. Pakketje afhalen, Melk kopen, Garage opruimen"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lijst / Categorie
                  </label>
                  <input
                    type="text"
                    list="general-task-lists"
                    value={newTaskListName}
                    onChange={e => setNewTaskListName(e.target.value)}
                    placeholder="Algemeen"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <datalist id="general-task-lists">
                    {uniqueTaskLists.map(l => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prioriteit
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={e =>
                      setNewTaskPriority(e.target.value as 'low' | 'normal' | 'high')
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="normal">Normaal</option>
                    <option value="high">Belangrijk (!)</option>
                    <option value="low">Laag</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vervaldatum (optioneel)
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={e => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Voor wie? (optioneel)
                  </label>
                  <select
                    value={newTaskAssignedTo}
                    onChange={e => setNewTaskAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">Iedereen</option>
                    {familyMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notities (optioneel)
                </label>
                <textarea
                  value={newTaskNotes}
                  onChange={e => setNewTaskNotes(e.target.value)}
                  rows={2}
                  placeholder="Extra details..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition-colors"
              >
                + Taak toevoegen
              </button>
            </form>
          </div>

          {/* Right: Lists Filter & General Tasks */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedListFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
                    selectedListFilter === 'ALL'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Alles ({generalTasks.filter(t => !t.completed).length})
                </button>
                {uniqueTaskLists.map(list => (
                  <button
                    type="button"
                    key={list}
                    onClick={() => setSelectedListFilter(list)}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
                      selectedListFilter === list
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {list}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCompletedTasks(p => !p)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                >
                  {showCompletedTasks ? 'Verberg afgerond' : 'Toon afgerond'}
                </button>
                {generalTasks.some(t => t.completed) && (
                  <button
                    type="button"
                    onClick={onClearCompletedGeneralTasks}
                    className="px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium"
                  >
                    Afgeronde wissen
                  </button>
                )}
              </div>
            </div>

            {visibleGeneralTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <ListTodo className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p>Geen algemene taken in deze lijst.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {visibleGeneralTasks.map(task => {
                  const assignedMember = familyMembers.find(m => m.id === task.assignedTo);
                  return (
                    <div
                      key={task.id}
                      onClick={() => onToggleGeneralTask(task.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-start justify-between gap-3 transition-all ${
                        task.completed
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/50 opacity-75'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-semibold text-sm ${
                                task.completed
                                  ? 'line-through text-slate-500'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.priority === 'high' && !task.completed && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                                Belangrijk
                              </span>
                            )}
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                              {task.listName}
                            </span>
                          </div>
                          {task.notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {task.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            {task.dueDate && (
                              <span className="font-mono">
                                📅 {formatLocalDateNL(task.dueDate, { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            {assignedMember && (
                              <span className="inline-flex items-center gap-1">
                                <MemberAvatar member={assignedMember} size="xs" />
                                <span>{assignedMember.name}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteGeneralTask(task.id);
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-500 shrink-0"
                        title="Verwijder algemene taak"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Routine Chore */}
      {isAddChoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl w-full max-w-md space-y-4 text-xs animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nieuwe routine toevoegen voor {selectedMember?.name}
            </h3>

            <form onSubmit={handleAddChoreSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Titel van de taak</label>
                <input
                  type="text"
                  value={newChoreTitle}
                  onChange={e => setNewChoreTitle(e.target.value)}
                  placeholder="bijv. Huiswerk maken, Bed opmaken, Hond uitlaten"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Moment van de dag</label>
                  <select
                    value={newChorePeriod}
                    onChange={e => setNewChorePeriod(e.target.value as ChorePeriod)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="morning">Ochtend (00:00–12:00)</option>
                    <option value="afternoon">Middag (12:00–18:00)</option>
                    <option value="evening">Avond (18:00–00:00)</option>
                    <option value="all_day">Hele dag (altijd)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Sterren beloning</label>
                  <select
                    value={newChoreStars}
                    onChange={e => setNewChoreStars(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value={1}>1 ster ★</option>
                    <option value={2}>2 sterren ★★</option>
                    <option value={3}>3 sterren ★★★</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Icoon</label>
                <div className="flex gap-2 flex-wrap">
                  {['🪥', '🎒', '📚', '🧸', '🍽️', '✨', '🐾', '🚴', '⚽'].map(emoji => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setNewChoreIcon(emoji)}
                      className={`text-lg p-1.5 rounded-lg border ${
                        newChoreIcon === emoji
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddChoreOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Taak opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Reward */}
      {isAddRewardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl w-full max-w-md space-y-4 text-xs animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nieuwe beloning toevoegen
            </h3>

            <form onSubmit={handleAddRewardSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Titel van de beloning</label>
                <input
                  type="text"
                  value={newRewardTitle}
                  onChange={e => setNewRewardTitle(e.target.value)}
                  placeholder="bijv. Extra zakgeld, Uitstapje, Pannenkoeken eten"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Aantal benodigde sterren</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newRewardStars}
                  onChange={e => setNewRewardStars(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddRewardOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Beloning toevoegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
