import React, { useState } from 'react';
import { Chore, FamilyMember, RewardItem, ChorePeriod } from '../types';
import {
  Sparkles,
  Plus,
  CheckCircle2,
  Circle,
  Gift,
  RefreshCw,
  Sun,
  Sunset,
  Moon,
  Trash2,
  Trophy
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChoresViewProps {
  chores: Chore[];
  familyMembers: FamilyMember[];
  rewards: RewardItem[];
  onToggleChore: (choreId: string) => void;
  onAddChore: (chore: Omit<Chore, 'id' | 'completedToday'>) => void;
  onDeleteChore: (choreId: string) => void;
  onAddReward: (reward: Omit<RewardItem, 'id' | 'claimedCount'>) => void;
  onClaimReward: (rewardId: string, memberId: string) => void;
  onResetTodayChores: () => void;
}

export const ChoresView: React.FC<ChoresViewProps> = ({
  chores,
  familyMembers,
  rewards,
  onToggleChore,
  onAddChore,
  onDeleteChore,
  onAddReward,
  onClaimReward,
  onResetTodayChores
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    familyMembers.find(m => m.role === 'child')?.id || familyMembers[0]?.id || ''
  );
  const [isAddChoreOpen, setIsAddChoreOpen] = useState(false);
  const [isAddRewardOpen, setIsAddRewardOpen] = useState(false);

  // New chore form state
  const [newChoreTitle, setNewChoreTitle] = useState('');
  const [newChorePeriod, setNewChorePeriod] = useState<ChorePeriod>('morning');
  const [newChoreStars, setNewChoreStars] = useState(1);
  const [newChoreIcon, setNewChoreIcon] = useState('⭐');

  // New reward form state
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardStars, setNewRewardStars] = useState(10);

  const selectedMember = familyMembers.find(m => m.id === selectedMemberId);
  const memberChores = chores.filter(c => c.memberId === selectedMemberId);

  const morningChores = memberChores.filter(c => c.period === 'morning');
  const afternoonChores = memberChores.filter(c => c.period === 'afternoon');
  const eveningChores = memberChores.filter(c => c.period === 'evening');

  const completedCount = memberChores.filter(c => c.completedToday).length;
  const progressPercent = memberChores.length > 0 ? Math.round((completedCount / memberChores.length) * 100) : 0;

  const handleChoreClick = (chore: Chore) => {
    if (!chore.completedToday) {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    onToggleChore(chore.id);
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

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Member Selector & Star Balance */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                <span className="text-2xl">{member.avatar}</span>
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

        {/* Action Buttons: Add Chore & Reset day */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onResetTodayChores()}
            title="Zet alle taken voor vandaag weer op onvoltooid"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Nieuwe dag starten</span>
          </button>

          <button
            onClick={() => setIsAddChoreOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Taak toevoegen</span>
          </button>
        </div>
      </div>

      {/* Progress Strip for Selected Member */}
      {selectedMember && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{selectedMember.avatar}</span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Takenbord van {selectedMember.name}
              </h3>
              <p className="text-xs text-slate-500">
                {completedCount} van de {memberChores.length} taken voltooid vandaag ({progressPercent}%)
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

      {/* 3 Periods Grid (Ochtend, Middag, Avond) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Period 1: Ochtend */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Sun className="w-4 h-4" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Ochtendroutine
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {morningChores.filter(c => c.completedToday).length}/{morningChores.length}
            </span>
          </div>

          <div className="space-y-2">
            {morningChores.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Geen ochtendtaken ingesteld
              </div>
            ) : (
              morningChores.map(chore => (
                <div
                  key={chore.id}
                  onClick={() => handleChoreClick(chore)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-3 transition-all ${
                    chore.completedToday
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {chore.completedToday ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                    <span className="text-xl shrink-0">{chore.icon || '☀️'}</span>
                    <span
                      className={`font-semibold truncate ${
                        chore.completedToday ? 'line-through text-emerald-800/70 dark:text-emerald-300/70' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {chore.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-amber-500 font-bold font-mono">
                      +{chore.stars}★
                    </span>
                    <button
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
              ))
            )}
          </div>
        </div>

        {/* Period 2: Middag */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Sunset className="w-4 h-4" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Middag & Huiswerk
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {afternoonChores.filter(c => c.completedToday).length}/{afternoonChores.length}
            </span>
          </div>

          <div className="space-y-2">
            {afternoonChores.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Geen middagtaken ingesteld
              </div>
            ) : (
              afternoonChores.map(chore => (
                <div
                  key={chore.id}
                  onClick={() => handleChoreClick(chore)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-3 transition-all ${
                    chore.completedToday
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {chore.completedToday ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                    <span className="text-xl shrink-0">{chore.icon || '📚'}</span>
                    <span
                      className={`font-semibold truncate ${
                        chore.completedToday ? 'line-through text-emerald-800/70 dark:text-emerald-300/70' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {chore.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-amber-500 font-bold font-mono">
                      +{chore.stars}★
                    </span>
                    <button
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
              ))
            )}
          </div>
        </div>

        {/* Period 3: Avond */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
              <Moon className="w-4 h-4" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Avondroutine
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {eveningChores.filter(c => c.completedToday).length}/{eveningChores.length}
            </span>
          </div>

          <div className="space-y-2">
            {eveningChores.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Geen avondtaken ingesteld
              </div>
            ) : (
              eveningChores.map(chore => (
                <div
                  key={chore.id}
                  onClick={() => handleChoreClick(chore)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-3 transition-all ${
                    chore.completedToday
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {chore.completedToday ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                    <span className="text-xl shrink-0">{chore.icon || '🌙'}</span>
                    <span
                      className={`font-semibold truncate ${
                        chore.completedToday ? 'line-through text-emerald-800/70 dark:text-emerald-300/70' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {chore.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-amber-500 font-bold font-mono">
                      +{chore.stars}★
                    </span>
                    <button
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
              ))
            )}
          </div>
        </div>
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

      {/* Modal: Add Chore */}
      {isAddChoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl w-full max-w-md space-y-4 text-xs animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nieuwe taak toevoegen voor {selectedMember?.name}
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
                  <label className="block font-semibold mb-1">Dagdeel</label>
                  <select
                    value={newChorePeriod}
                    onChange={e => setNewChorePeriod(e.target.value as ChorePeriod)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="morning">Ochtend</option>
                    <option value="afternoon">Middag</option>
                    <option value="evening">Avond</option>
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
                <label className="block font-semibold mb-1">Icoon (kies of plak emoji)</label>
                <div className="flex gap-2">
                  {['🪥', '🎒', '📚', '🧸', '🍽️', '✨', '🐾', '🚴', '⚽'].map(emoji => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setNewChoreIcon(emoji)}
                      className={`text-lg p-1.5 rounded-lg border ${
                        newChoreIcon === emoji ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950' : 'border-slate-200 dark:border-slate-700'
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
