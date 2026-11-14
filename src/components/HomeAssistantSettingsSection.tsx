import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarEvent,
  CalendarSource,
  DailyAutomationRule,
  HaActionEntity,
  HaStatusInfo
} from '../types';
import {
  fetchHaActionEntities,
  fetchHaStatus,
  saveHaConfig,
  testDailyAutomationRule,
  testHaConnection
} from '../services/storage';
import { getLocalDateStr } from '../utils/dateTime';
import { getRuleSkipMatchOnDate } from '../utils/dailyRules';
import {
  Home,
  Check,
  AlertCircle,
  RefreshCw,
  BellRing,
  Plus,
  Trash2,
  Pencil,
  Play,
  CalendarOff,
  ChevronDown,
  ChevronUp,
  Power
} from 'lucide-react';

interface HomeAssistantSettingsSectionProps {
  calendars: CalendarSource[];
  allEvents: CalendarEvent[];
  rules: DailyAutomationRule[];
  initialHaUrl?: string;
  onAddRule: (rule: Omit<DailyAutomationRule, 'id'>) => void;
  onUpdateRule: (ruleId: string, patch: Partial<DailyAutomationRule>) => void;
  onDeleteRule: (ruleId: string) => void;
  onHaStatusChanged?: () => void;
}

const WEEKDAYS_NL: { day: number; label: string }[] = [
  { day: 1, label: 'Ma' },
  { day: 2, label: 'Di' },
  { day: 3, label: 'Wo' },
  { day: 4, label: 'Do' },
  { day: 5, label: 'Vr' },
  { day: 6, label: 'Za' },
  { day: 0, label: 'Zo' }
];

export const HomeAssistantSettingsSection: React.FC<HomeAssistantSettingsSectionProps> = ({
  calendars,
  allEvents,
  rules,
  initialHaUrl = '',
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onHaStatusChanged
}) => {
  // HA connection state
  const [haStatus, setHaStatus] = useState<HaStatusInfo | null>(null);
  const [haUrlInput, setHaUrlInput] = useState(initialHaUrl);
  const [haTokenInput, setHaTokenInput] = useState('');
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSavingHa, setIsSavingHa] = useState(false);
  const [isTestingHa, setIsTestingHa] = useState(false);
  const [haFeedback, setHaFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Action entities
  const [haEntities, setHaEntities] = useState<HaActionEntity[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);

  // New / Edit Daily Rule form state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleTime, setRuleTime] = useState('08:00');
  const [ruleDuration, setRuleDuration] = useState(15);
  const [ruleDays, setRuleDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [ruleShowOnCal, setRuleShowOnCal] = useState(true);
  const [ruleCalId, setRuleCalId] = useState<string>(calendars[0]?.id || 'cal-family');
  const [ruleSkipCalIds, setRuleSkipCalIds] = useState<string[]>([]);
  const [ruleSkipKeywords, setRuleSkipKeywords] = useState('');
  const [ruleTargetEntity, setRuleTargetEntity] = useState('');
  const [ruleWebhookId, setRuleWebhookId] = useState('');
  const [showYamlExample, setShowYamlExample] = useState(false);

  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [ruleFeedback, setRuleFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [confirmDeleteRuleId, setConfirmDeleteRuleId] = useState<string | null>(null);

  const loadStatusAndEntities = useCallback(async () => {
    try {
      setIsLoadingStatus(true);
      const st = await fetchHaStatus();
      setHaStatus(st);
      if (st.haUrl && st.mode === 'manual') {
        setHaUrlInput(st.haUrl);
      }
      if (st.connected) {
        setIsLoadingEntities(true);
        try {
          const ents = await fetchHaActionEntities();
          setHaEntities(ents);
        } catch {
          setHaEntities([]);
        } finally {
          setIsLoadingEntities(false);
        }
      } else {
        setHaEntities([]);
      }
    } catch {
      // Ignore initial error
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatusAndEntities();
  }, [loadStatusAndEntities]);

  const handleSaveHaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingHa(true);
      setHaFeedback(null);
      const st = await saveHaConfig({
        haUrl: haUrlInput.trim(),
        haToken: haTokenInput.trim() || undefined
      });
      setHaStatus(st);
      setHaTokenInput('');
      if (st.connected) {
        setHaFeedback({
          type: 'ok',
          msg: `Verbonden met ${st.locationName || 'Home Assistant'} (v${st.version || '?'})!`
        });
        await loadStatusAndEntities();
        onHaStatusChanged?.();
      } else {
        setHaFeedback({
          type: 'err',
          msg: st.error || 'Opgeslagen, maar Home Assistant kon nog niet bereikt worden.'
        });
      }
    } catch (err: any) {
      setHaFeedback({ type: 'err', msg: err.message || 'Kon koppeling niet opslaan.' });
    } finally {
      setIsSavingHa(false);
    }
  };

  const handleTestHa = async () => {
    try {
      setIsTestingHa(true);
      setHaFeedback(null);
      const result = await testHaConnection({
        haUrl: haUrlInput.trim() || undefined,
        haToken: haTokenInput.trim() || undefined
      });
      setHaFeedback({
        type: 'ok',
        msg: `Verbinding geslaagd met "${result.locationName}"! Gevonden: ${result.calendarCount ?? 0} agenda's en ${result.todoCount ?? 0} to-do lijsten.`
      });
    } catch (err: any) {
      setHaFeedback({ type: 'err', msg: err.message || 'Verbindingstest mislukt.' });
    } finally {
      setIsTestingHa(false);
    }
  };

  const resetRuleForm = () => {
    setEditingRuleId(null);
    setRuleTitle('');
    setRuleTime('08:00');
    setRuleDuration(15);
    setRuleDays([1, 2, 3, 4, 5]);
    setRuleShowOnCal(true);
    setRuleCalId(calendars[0]?.id || 'cal-family');
    setRuleSkipCalIds([]);
    setRuleSkipKeywords('');
    setRuleTargetEntity('');
    setRuleWebhookId('');
  };

  const startEditRule = (rule: DailyAutomationRule) => {
    setEditingRuleId(rule.id);
    setRuleTitle(rule.title);
    setRuleTime(rule.time);
    setRuleDuration(rule.durationMinutes || 15);
    setRuleDays(rule.daysOfWeek || [1, 2, 3, 4, 5]);
    setRuleShowOnCal(rule.showOnCalendar);
    setRuleCalId(rule.calendarId || calendars[0]?.id || 'cal-family');
    setRuleSkipCalIds(rule.skipCalendarIds || []);
    setRuleSkipKeywords(rule.skipKeywords || '');
    setRuleTargetEntity(rule.haTargetEntityId || '');
    setRuleWebhookId(rule.haWebhookId || '');
  };

  const toggleDay = (d: number) => {
    setRuleDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));
  };

  const toggleSkipCalendar = (calId: string) => {
    setRuleSkipCalIds(prev =>
      prev.includes(calId) ? prev.filter(id => id !== calId) : [...prev, calId]
    );
  };

  const handleSaveRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim()) return;
    if (ruleDays.length === 0) {
      setRuleFeedback({ type: 'err', msg: 'Kies minstens één dag van de week.' });
      return;
    }

    const payload: Omit<DailyAutomationRule, 'id'> = {
      title: ruleTitle.trim(),
      time: ruleTime || '08:00',
      durationMinutes: Math.max(5, Number(ruleDuration) || 15),
      daysOfWeek: [...ruleDays],
      enabled: true,
      showOnCalendar: ruleShowOnCal,
      calendarId: ruleCalId || calendars[0]?.id,
      skipCalendarIds: ruleSkipCalIds,
      skipKeywords: ruleSkipKeywords.trim() || undefined,
      haTargetEntityId: ruleTargetEntity.trim() || undefined,
      haWebhookId: ruleWebhookId.trim() || undefined
    };

    if (editingRuleId) {
      onUpdateRule(editingRuleId, payload);
      setRuleFeedback({ type: 'ok', msg: `Dagelijkse afspraak "${payload.title}" bijgewerkt.` });
    } else {
      onAddRule(payload);
      setRuleFeedback({ type: 'ok', msg: `Dagelijkse afspraak "${payload.title}" aangemaakt.` });
    }
    resetRuleForm();
  };

  const handleTestRule = async (rule: DailyAutomationRule) => {
    try {
      setTestingRuleId(rule.id);
      setRuleFeedback(null);
      const res = await testDailyAutomationRule(rule.id);
      setRuleFeedback({
        type: 'ok',
        msg: res.skippedTodayWouldBe
          ? `Testsignaal voor "${rule.title}" verstuurd naar Home Assistant! (Let op: voor vandaag staat hij op pauze wegens "${res.skipReason}").`
          : `Testsignaal voor "${rule.title}" succesvol uitgevoerd in Home Assistant!`
      });
    } catch (err: any) {
      setRuleFeedback({
        type: 'err',
        msg: err.message || 'Kon automatie niet testen.'
      });
    } finally {
      setTestingRuleId(null);
    }
  };

  const todayStr = getLocalDateStr();
  const nonRuleEvents = allEvents.filter(e => !e.isDailyRule);

  return (
    <div className="space-y-6">
      {/* SECTION A: Home Assistant Verbinding */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Home className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Home Assistant Koppeling
              </h2>
              <p className="text-xs text-slate-500">
                Gebruik Home Assistant kalenders, To-Do lijsten en dagelijkse automatie-triggers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {isLoadingStatus ? (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                Status controleren...
              </span>
            ) : haStatus?.connected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  Verbonden ({haStatus.mode === 'supervisor' ? 'HA Add-on Supervisor' : haStatus.locationName || 'Home Assistant'})
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-semibold">
                <span>Niet gekoppeld</span>
              </span>
            )}
            <button
              type="button"
              onClick={loadStatusAndEntities}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              title="Status verversen"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {haStatus?.addonMode && haStatus?.mode === 'supervisor' && (
          <div className="p-3.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs text-sky-900 dark:text-sky-200">
            <strong>Home Assistant Add-on modus actief:</strong> HomeBoard praat automatisch en veilig via de ingebouwde Home Assistant Supervisor API (`http://supervisor/core`). Handmatige token invullen is niet nodig!
          </div>
        )}

        {haFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              haFeedback.type === 'ok'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
            }`}
          >
            {haFeedback.type === 'ok' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{haFeedback.msg}</span>
          </div>
        )}

        <form onSubmit={handleSaveHaConfig} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Home Assistant URL {haStatus?.addonMode ? '(optionele overschrijving)' : ''}
              </label>
              <input
                type="url"
                value={haUrlInput}
                onChange={e => setHaUrlInput(e.target.value)}
                placeholder="http://homeassistant.local:8123"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Long-Lived Access Token{' '}
                {haStatus?.hasToken ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-normal">
                    (token opgeslagen)
                  </span>
                ) : null}
              </label>
              <input
                type="password"
                value={haTokenInput}
                onChange={e => setHaTokenInput(e.target.value)}
                placeholder={
                  haStatus?.hasToken
                    ? '•••••••• (laat leeg om huidig token te behouden)'
                    : 'Plak je Home Assistant Access Token'
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-slate-500">
              Maak een token in Home Assistant via <strong>Profiel → Beveiliging → Langlevende toegangstokens</strong> (alleen nodig buiten de Add-on).
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleTestHa}
                disabled={isTestingHa}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200"
              >
                {isTestingHa ? 'Testen...' : 'Test verbinding'}
              </button>
              <button
                type="submit"
                disabled={isSavingHa}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs"
              >
                {isSavingHa ? 'Opslaan...' : 'Koppeling opslaan'}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* SECTION B: Dagelijkse Afspraken & Home Assistant Automaties */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Dagelijkse Afspraken & Home Assistant Automaties
              </h2>
              <p className="text-xs text-slate-500">
                Plan vaste dagelijkse triggers (bijv. 08:00 Klaarmaken voor school) en pauzeer ze automatisch op vakantiedagen uit een gekoppelde agenda.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowYamlExample(p => !p)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>Home Assistant YAML voorbeeld</span>
            {showYamlExample ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showYamlExample && (
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono space-y-2 overflow-x-auto border border-slate-800">
            <div className="text-sky-300 font-sans font-semibold text-xs">
              Tip: HomeBoard stuurt altijd event <code>homeboard_daily_trigger</code> naar Home Assistant (én optioneel een gekozen automatie/script). Je kunt in Home Assistant dus ook direct op dit event triggeren:
            </div>
            <pre className="leading-relaxed whitespace-pre">{`alias: "HomeBoard - Ochtend school melding"
trigger:
  - platform: event
    event_type: homeboard_daily_trigger
    event_data:
      title: "Klaarmaken voor school"
action:
  - service: tts.speak
    data:
      message: "Het is {{ trigger.event.data.time }} uur, tijd om klaar te maken voor school!"`}</pre>
          </div>
        )}

        {ruleFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              ruleFeedback.type === 'ok'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
            }`}
          >
            {ruleFeedback.type === 'ok' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{ruleFeedback.msg}</span>
          </div>
        )}

        {/* Create / Edit Rule Form */}
        <form
          onSubmit={handleSaveRuleSubmit}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                {editingRuleId
                  ? 'Dagelijkse afspraak & automatie bewerken'
                  : 'Nieuwe dagelijkse afspraak & automatie toevoegen'}
              </span>
            </div>
            {editingRuleId && (
              <button
                type="button"
                onClick={resetRuleForm}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
              >
                Nieuw item maken i.p.v. bewerken
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Titel van de afspraak *
              </label>
              <input
                type="text"
                value={ruleTitle}
                onChange={e => setRuleTitle(e.target.value)}
                placeholder="bijv. Klaarmaken voor school, Schoenen aandoen"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                required
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Tijdstip *
              </label>
              <input
                type="time"
                value={ruleTime}
                onChange={e => setRuleTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm"
                required
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Duur op agenda (min)
              </label>
              <input
                type="number"
                min={5}
                max={240}
                step={5}
                value={ruleDuration}
                onChange={e => setRuleDuration(Number(e.target.value) || 15)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm"
              />
            </div>
          </div>

          {/* Days of Week */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="font-semibold text-slate-600 dark:text-slate-400">
                Op welke dagen actief?
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setRuleDays([1, 2, 3, 4, 5])}
                  className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-medium"
                >
                  Schooldagen (Ma–Vr)
                </button>
                <button
                  type="button"
                  onClick={() => setRuleDays([0, 1, 2, 3, 4, 5, 6])}
                  className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-medium"
                >
                  Elke dag
                </button>
                <button
                  type="button"
                  onClick={() => setRuleDays([0, 6])}
                  className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-medium"
                >
                  Weekend
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {WEEKDAYS_NL.map(({ day, label }) => {
                const active = ruleDays.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                      active
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Home Assistant Target Entity & Webhook */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Start in Home Assistant (automatie / script / scene / schakelaar)
              </label>
              {haEntities.length > 0 ? (
                <select
                  value={ruleTargetEntity}
                  onChange={e => setRuleTargetEntity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">
                    Alleen HomeBoard event ("homeboard_daily_trigger") sturen
                  </option>
                  {haEntities.map(ent => (
                    <option key={ent.entityId} value={ent.entityId}>
                      [{ent.domain}] {ent.name} ({ent.entityId})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={ruleTargetEntity}
                  onChange={e => setRuleTargetEntity(e.target.value)}
                  placeholder="bijv. automation.ochtend_school (optioneel)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              )}
              {isLoadingEntities && (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Home Assistant entiteiten laden...
                </span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Optionele Home Assistant Webhook ID
              </label>
              <input
                type="text"
                value={ruleWebhookId}
                onChange={e => setRuleWebhookId(e.target.value)}
                placeholder="bijv. school_alarm_ochtend (optioneel)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Calendar Display + Vacation / Skip Calendars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
            <div className="space-y-2.5">
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={ruleShowOnCal}
                  onChange={e => setRuleShowOnCal(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span>Ook tonen als afspraak op Dashboard & Kalender</span>
              </label>

              {ruleShowOnCal && (
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    In welke agenda tonen?
                  </label>
                  <select
                    value={ruleCalId}
                    onChange={e => setRuleCalId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {calendars.map(cal => (
                      <option key={cal.id} value={cal.id}>
                        {cal.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <CalendarOff className="w-3.5 h-3.5 text-amber-500" />
                <span>Pauzeren bij afspraken in agenda (bijv. Vakantie):</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                {calendars.map(cal => {
                  const checked = ruleSkipCalIds.includes(cal.id);
                  return (
                    <label
                      key={cal.id}
                      className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-indigo-600"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSkipCalendar(cal.id)}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cal.color }}
                      />
                      <span className="truncate font-medium">{cal.name}</span>
                      <span className="text-[10px] text-slate-400">
                        ({cal.type === 'homeassistant' ? 'HA' : cal.type === 'ical' ? 'iCal' : 'Lokaal'})
                      </span>
                    </label>
                  );
                })}
              </div>

              {ruleSkipCalIds.length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Alleen pauzeren bij trefwoorden (laat leeg = elke afspraak in deze agenda):
                  </label>
                  <input
                    type="text"
                    value={ruleSkipKeywords}
                    onChange={e => setRuleSkipKeywords(e.target.value)}
                    placeholder="bijv. vakantie, vrij, verlof (leeg = altijd pauzeren)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            {editingRuleId && (
              <button
                type="button"
                onClick={resetRuleForm}
                className="px-3.5 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold"
              >
                Annuleren
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
            >
              {editingRuleId ? 'Wijzigingen opslaan' : 'Dagelijkse afspraak toevoegen'}
            </button>
          </div>
        </form>

        {/* Configured Rules List */}
        {rules.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            Nog geen dagelijkse afspraken of automaties ingesteld. Voeg er hierboven een toe (bijv. 08:00 Klaarmaken voor school).
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {rules.map(rule => {
              const skipToday = getRuleSkipMatchOnDate(rule, todayStr, nonRuleEvents, calendars);
              const skipCalendarNames = (rule.skipCalendarIds || [])
                .map(id => calendars.find(c => c.id === id)?.name)
                .filter(Boolean);
              const dayLabels = WEEKDAYS_NL.filter(w => (rule.daysOfWeek || []).includes(w.day))
                .map(w => w.label)
                .join(', ');

              return (
                <div
                  key={rule.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    !rule.enabled ? 'opacity-60 bg-slate-50/50 dark:bg-slate-800/20' : ''
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                        {rule.time}
                      </span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {rule.title}
                      </span>
                      {!rule.enabled && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          Uitgeschakeld
                        </span>
                      )}
                      {rule.enabled && skipToday.skipped && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                          Vandaag gepauzeerd ({skipToday.reason})
                        </span>
                      )}
                      {rule.lastTriggeredDate === todayStr && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                          Vandaag uitgevoerd
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                      <span>Dagen: {dayLabels || 'Geen'}</span>
                      <span>·</span>
                      <span>
                        Actie:{' '}
                        {rule.haTargetEntityId ? (
                          <code className="font-mono text-sky-600 dark:text-sky-400">
                            {rule.haTargetEntityId}
                          </code>
                        ) : (
                          'HA event homeboard_daily_trigger'
                        )}
                      </span>
                      {skipCalendarNames.length > 0 && (
                        <>
                          <span>·</span>
                          <span>Pauzeert bij: {skipCalendarNames.join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleTestRule(rule)}
                      disabled={testingRuleId === rule.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold hover:bg-sky-100"
                      title="Automatie nu direct testen in Home Assistant"
                    >
                      <Play className="w-3 h-3" />
                      <span>{testingRuleId === rule.id ? 'Bezig...' : 'Test nu'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateRule(rule.id, { enabled: !rule.enabled })}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        rule.enabled
                          ? 'border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-100'
                      }`}
                      title={rule.enabled ? 'Tijdelijk uitschakelen' : 'Inschakelen'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => startEditRule(rule)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      title="Bewerken"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {confirmDeleteRuleId === rule.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteRule(rule.id);
                            setConfirmDeleteRuleId(null);
                          }}
                          className="px-2 py-1 bg-red-600 text-white rounded font-semibold"
                        >
                          Wis
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteRuleId(null)}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded"
                        >
                          Nee
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteRuleId(rule.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
