import React, { useState, useEffect } from 'react';
import {
  Chore,
  FamilyMember,
  RewardItem,
  ChorePeriod,
  StarLogEntry
} from '../types';
import { MemberAvatar } from './MemberAvatar';
import {
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
  Clock,
  Lock,
  ChevronLeft,
  ChevronRight,
  History,
  List
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChoresViewProps {
  chores: Chore[];
  choreCompletionsByDate: Record<string, string[]>;
  starLogs: StarLogEntry[];
  familyMembers: FamilyMember[];
  rewards: RewardItem[];
  todayStr: string;
  onToggleChore: (choreId: string, dateStr: string) => void;
  onAddChore: (chore: Omit<Chore, 'id' | 'completedToday'>) => void;
  onDeleteChore: (choreId: string) => void;
  onAddReward: (reward: Omit<RewardItem, 'id' | 'claimedCount'>) => void;
  onClaimReward: (rewardId: string, memberId: string) => void;
  onNavigateToSettings?: () => void;
}

type ChoresSubTab = 'routines' | 'star_list';

export const ChoresView: React.FC<ChoresViewProps> = ({
  chores,
  choreCompletionsByDate,
  starLogs,
  familyMembers,
  rewards,
  todayStr,
  onToggleChore,
  onAddChore,
  onDeleteChore,
  onAddReward,
  onClaimReward,
  onNavigateToSettings
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

  // Star list state
  const [starListMemberFilter, setStarListMemberFilter] = useState<string>('all');
  const [starListTypeFilter, setStarListTypeFilter] = useState<'all' | 'chore' | 'manual_adjustment' | 'reward_claim'>('all');

  // Keep current time ticking every 30s so time-of-day routine locks update cleanly
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Automatically roll over selectedDateStr when midnight passes if user was on the previous "today"
  useEffect(() => {
    const yesterdayStr = shiftLocalDateStr(todayStr, -1);
    setSelectedDateStr(prev => (prev === yesterdayStr ? todayStr : prev));
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

  // --- Star List helpers ---
  const filteredStarLogs = starLogs
    .filter(l => starListMemberFilter === 'all' || l.memberId === starListMemberFilter)
    .filter(l => starListTypeFilter === 'all' || l.type === starListTypeFilter)
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const groupedStarLogsByDate = filteredStarLogs.reduce<Record<string, StarLogEntry[]>>(
    (acc, entry) => {
      if (!acc[entry.date]) acc[entry.date] = [];
      acc[entry.date].push(entry);
      return acc;
    },
    {}
  );
  const starLogDatesDesc = Object.keys(groupedStarLogsByDate).sort((a, b) => b.localeCompare(a));

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
          onClick={() => setSubTab('star_list')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            subTab === 'star_list'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Sterrenlijst & Historiek</span>
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
                  ). Vinkjes hier passen het totale sterrensaldo en de sterrenlijst direct aan.
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
      {/* SUB-TAB 2: STERRENLIJST & HISTORIEK (Per persoon, lijstweergave)      */}
      {/* ===================================================================== */}
      {subTab === 'star_list' && (
        <div className="space-y-5">
          {/* Top Member Filter Cards + Link to Password-Protected Settings */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>Opvolging van behaalde sterren</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bekijk per persoon wanneer en door welke taak of reden sterren zijn behaald, aangepast of ingewisseld.
                </p>
              </div>

              {onNavigateToSettings && (
                <button
                  type="button"
                  onClick={onNavigateToSettings}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Sterren aanpassen of verwijderen</span>
                </button>
              )}
            </div>

            {/* Clickable Member Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setStarListMemberFilter('all')}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold shrink-0 transition-all ${
                  starListMemberFilter === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                Iedereen ({starLogs.length})
              </button>

              {familyMembers.map(m => {
                const isSelected = starListMemberFilter === m.id;
                const count = starLogs.filter(l => l.memberId === m.id).length;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setStarListMemberFilter(m.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shrink-0 transition-all ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <MemberAvatar member={m} size="sm" />
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-white leading-tight">
                        {m.name}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                        {m.stars}★ · {count} items
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Category filter strip */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-400 mr-1 font-medium">Filter:</span>
              {[
                { key: 'all', label: 'Alles' },
                { key: 'chore', label: 'Door taken' },
                { key: 'manual_adjustment', label: 'Handmatig / Startsaldo' },
                { key: 'reward_claim', label: 'Beloningen' }
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() =>
                    setStarListTypeFilter(
                      tab.key as 'all' | 'chore' | 'manual_adjustment' | 'reward_claim'
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    starListTypeFilter === tab.key
                      ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chronological Star List Grouped by Date */}
          {starLogDatesDesc.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-2 text-xs text-slate-400 shadow-xs">
              <Sparkles className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                Nog geen sterren-historiek voor deze selectie.
              </p>
              <p>
                Vink een taak af of voeg handmatig sterren toe via Instellingen.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {starLogDatesDesc.map(dateStr => {
                const dayEntries = groupedStarLogsByDate[dateStr];
                const dayNet = dayEntries.reduce((sum, e) => sum + e.stars, 0);
                const isToday = dateStr === todayStr;
                const isYesterday = dateStr === shiftLocalDateStr(todayStr, -1);

                return (
                  <div
                    key={dateStr}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
                  >
                    <div className="px-4 sm:px-5 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-500" />
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white capitalize">
                          {isToday
                            ? `Vandaag · ${formatLocalDateNL(dateStr)}`
                            : isYesterday
                            ? `Gisteren · ${formatLocalDateNL(dateStr)}`
                            : formatLocalDateNL(dateStr)}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-md ${
                          dayNet >= 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300'
                        }`}
                      >
                        {dayNet >= 0 ? `+${dayNet}` : dayNet}★ op deze dag
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {dayEntries.map(entry => {
                        const mem = familyMembers.find(m => m.id === entry.memberId);
                        const timeStr = new Intl.DateTimeFormat('nl-NL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }).format(new Date(entry.timestamp));

                        return (
                          <div
                            key={entry.id}
                            className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {mem && <MemberAvatar member={mem} size="md" />}
                              <div className="min-w-0">
                                <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                  {entry.title}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 mt-0.5">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {mem?.name || 'Gezinslid'}
                                  </span>
                                  <span>·</span>
                                  <span className="font-mono">{timeStr}</span>
                                  <span>·</span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-medium ${
                                      entry.type === 'chore'
                                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                                        : entry.type === 'manual_adjustment'
                                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                        : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                    }`}
                                  >
                                    {entry.type === 'chore'
                                      ? 'Taak'
                                      : entry.type === 'manual_adjustment'
                                      ? 'Handmatig / Zonder taak'
                                      : 'Beloning'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span
                              className={`font-mono font-bold text-sm sm:text-base shrink-0 tabular-nums ${
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
                  </div>
                );
              })}
            </div>
          )}
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
