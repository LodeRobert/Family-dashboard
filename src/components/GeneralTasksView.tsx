import React, { useState, useEffect, useCallback } from 'react';
import {
  FamilyMember,
  GeneralTask,
  HaStatusInfo,
  HaTodoEntity,
  HaTodoItem,
  LinkedHaTodoList
} from '../types';
import { MemberAvatar } from './MemberAvatar';
import { formatLocalDateNL } from '../utils/dateTime';
import {
  fetchHaStatus,
  fetchHaTodoEntities,
  fetchHaTodoItems,
  addHaTodoItem,
  updateHaTodoItem,
  removeHaTodoItem,
  clearCompletedHaTodoItems
} from '../services/storage';
import {
  CheckSquare,
  ListTodo,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Pencil,
  FolderPlus,
  SlidersHorizontal,
  X,
  Home,
  RefreshCw,
  AlertCircle,
  Unlink
} from 'lucide-react';

interface GeneralTasksViewProps {
  taskLists: string[];
  generalTasks: GeneralTask[];
  haLinkedTodoEntities: LinkedHaTodoList[];
  familyMembers: FamilyMember[];
  onAddTaskList: (name: string) => void;
  onDeleteTaskList: (name: string) => void;
  onLinkHaTodoList: (entity: LinkedHaTodoList) => void;
  onUnlinkHaTodoList: (entityId: string) => void;
  onAddGeneralTask: (task: Omit<GeneralTask, 'id' | 'completed' | 'createdAt'>) => void;
  onUpdateGeneralTask: (taskId: string, patch: Partial<GeneralTask>) => void;
  onToggleGeneralTask: (taskId: string) => void;
  onDeleteGeneralTask: (taskId: string) => void;
  onClearCompletedGeneralTasks: (listName?: string) => void;
}

export const GeneralTasksView: React.FC<GeneralTasksViewProps> = ({
  taskLists,
  generalTasks,
  haLinkedTodoEntities,
  familyMembers,
  onAddTaskList,
  onDeleteTaskList,
  onLinkHaTodoList,
  onUnlinkHaTodoList,
  onAddGeneralTask,
  onUpdateGeneralTask,
  onToggleGeneralTask,
  onDeleteGeneralTask,
  onClearCompletedGeneralTasks
}) => {
  const [selectedList, setSelectedList] = useState<string>(taskLists[0] || 'Algemeen');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);

  // Create new local list
  const [newListName, setNewListName] = useState('');
  const [confirmDeleteList, setConfirmDeleteList] = useState<string | null>(null);

  // Quick add task (shared fields for local & HA)
  const [newTitle, setNewTitle] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high'>('normal');

  // Inline edit existing local task
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editListName, setEditListName] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'normal' | 'high'>('normal');

  // Home Assistant To-Do state
  const [haStatus, setHaStatus] = useState<HaStatusInfo | null>(null);
  const [availableHaTodos, setAvailableHaTodos] = useState<HaTodoEntity[]>([]);
  const [showHaPicker, setShowHaPicker] = useState(false);
  const [isLoadingHaLists, setIsLoadingHaLists] = useState(false);

  const [haItemsByEntity, setHaItemsByEntity] = useState<Record<string, HaTodoItem[]>>({});
  const [isLoadingHaItems, setIsLoadingHaItems] = useState(false);
  const [isMutatingHa, setIsMutatingHa] = useState(false);
  const [haError, setHaError] = useState('');

  // Inline edit HA item
  const [editingHaUid, setEditingHaUid] = useState<string | null>(null);
  const [editHaSummary, setEditHaSummary] = useState('');
  const [editHaDue, setEditHaDue] = useState('');
  const [editHaDescription, setEditHaDescription] = useState('');

  const isHaListSelected = selectedList.startsWith('HA:');
  const activeHaEntityId = isHaListSelected ? selectedList.slice(3) : '';
  const activeHaMeta = haLinkedTodoEntities.find(h => h.entityId === activeHaEntityId);

  const loadHaItemsForEntity = useCallback(async (entityId: string) => {
    if (!entityId) return;
    try {
      setIsLoadingHaItems(true);
      setHaError('');
      const items = await fetchHaTodoItems(entityId);
      setHaItemsByEntity(prev => ({ ...prev, [entityId]: items }));
    } catch (err: any) {
      setHaError(err.message || 'Kon taken uit Home Assistant niet laden.');
    } finally {
      setIsLoadingHaItems(false);
    }
  }, []);

  // Load items when switching to a linked HA list
  useEffect(() => {
    if (activeHaEntityId) {
      loadHaItemsForEntity(activeHaEntityId);
    }
  }, [activeHaEntityId, loadHaItemsForEntity]);

  // Preload open counts for linked HA lists on mount
  useEffect(() => {
    if (haLinkedTodoEntities.length === 0) return;
    haLinkedTodoEntities.forEach(async list => {
      try {
        const items = await fetchHaTodoItems(list.entityId);
        setHaItemsByEntity(prev => ({ ...prev, [list.entityId]: items }));
      } catch {
        // Ignore background preload error
      }
    });
  }, [haLinkedTodoEntities]);

  const handleOpenHaPicker = async () => {
    setShowHaPicker(prev => !prev);
    try {
      setIsLoadingHaLists(true);
      setHaError('');
      const status = await fetchHaStatus();
      setHaStatus(status);
      if (status.connected) {
        const list = await fetchHaTodoEntities();
        setAvailableHaTodos(list);
      } else {
        setAvailableHaTodos([]);
      }
    } catch (err: any) {
      setHaError(err.message || 'Kon Home Assistant takenlijsten niet ophalen.');
    } finally {
      setIsLoadingHaLists(false);
    }
  };

  const allLists = Array.from(
    new Set([...taskLists, ...generalTasks.map(t => t.listName).filter(Boolean)])
  );

  const visibleLocalTasks = generalTasks
    .filter(t => selectedList === 'ALL' || t.listName === selectedList)
    .filter(t => showCompleted || !t.completed)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const prioOrder = { high: 0, normal: 1, low: 2 };
      if (prioOrder[a.priority] !== prioOrder[b.priority]) {
        return prioOrder[a.priority] - prioOrder[b.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const activeHaItems = activeHaEntityId ? haItemsByEntity[activeHaEntityId] || [] : [];
  const visibleHaItems = activeHaItems
    .filter(it => showCompleted || it.status !== 'completed')
    .sort((a, b) => {
      const aDone = a.status === 'completed';
      const bDone = b.status === 'completed';
      if (aDone !== bDone) return aDone ? 1 : -1;
      return a.summary.localeCompare(b.summary);
    });

  const handleCreateListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newListName.trim();
    if (!cleaned) return;
    onAddTaskList(cleaned);
    setSelectedList(cleaned);
    setNewListName('');
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (isHaListSelected && activeHaEntityId) {
      try {
        setIsMutatingHa(true);
        setHaError('');
        await addHaTodoItem({
          entityId: activeHaEntityId,
          item: newTitle.trim(),
          dueDate: newDueDate || undefined,
          description: newNotes.trim() || undefined
        });
        setNewTitle('');
        setNewNotes('');
        setNewDueDate('');
        await loadHaItemsForEntity(activeHaEntityId);
      } catch (err: any) {
        setHaError(err.message || 'Kon puntje niet toevoegen in Home Assistant.');
      } finally {
        setIsMutatingHa(false);
      }
      return;
    }

    const targetList = selectedList === 'ALL' ? allLists[0] || 'Algemeen' : selectedList;
    onAddGeneralTask({
      title: newTitle.trim(),
      notes: newNotes.trim() || undefined,
      listName: targetList,
      dueDate: newDueDate || undefined,
      assignedTo: newAssignedTo || undefined,
      priority: newPriority
    });

    setNewTitle('');
    setNewNotes('');
    setNewDueDate('');
    setNewAssignedTo('');
    setNewPriority('normal');
  };

  const startEditingTask = (task: GeneralTask) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditNotes(task.notes || '');
    setEditListName(task.listName);
    setEditDueDate(task.dueDate || '');
    setEditPriority(task.priority);
  };

  const handleSaveTaskEdit = (taskId: string) => {
    if (!editTitle.trim()) return;
    onUpdateGeneralTask(taskId, {
      title: editTitle.trim(),
      notes: editNotes.trim() || undefined,
      listName: editListName || allLists[0] || 'Algemeen',
      dueDate: editDueDate || undefined,
      priority: editPriority
    });
    setEditingTaskId(null);
  };

  const handleToggleHaItem = async (item: HaTodoItem) => {
    if (!activeHaEntityId || isMutatingHa) return;
    const nextStatus = item.status === 'completed' ? 'needs_action' : 'completed';
    // Optimistic update
    setHaItemsByEntity(prev => ({
      ...prev,
      [activeHaEntityId]: (prev[activeHaEntityId] || []).map(it =>
        it.uid === item.uid ? { ...it, status: nextStatus } : it
      )
    }));
    try {
      setHaError('');
      await updateHaTodoItem({
        entityId: activeHaEntityId,
        uid: item.uid,
        status: nextStatus
      });
      await loadHaItemsForEntity(activeHaEntityId);
    } catch (err: any) {
      setHaError(err.message || 'Kon Home Assistant taak niet bijwerken.');
      await loadHaItemsForEntity(activeHaEntityId);
    }
  };

  const startEditingHaItem = (item: HaTodoItem) => {
    setEditingHaUid(item.uid);
    setEditHaSummary(item.summary);
    setEditHaDue(item.due ? item.due.slice(0, 10) : '');
    setEditHaDescription(item.description || '');
  };

  const handleSaveHaItemEdit = async (uid: string) => {
    if (!activeHaEntityId || !editHaSummary.trim()) return;
    try {
      setIsMutatingHa(true);
      setHaError('');
      await updateHaTodoItem({
        entityId: activeHaEntityId,
        uid,
        rename: editHaSummary.trim(),
        dueDate: editHaDue || null,
        description: editHaDescription.trim()
      });
      setEditingHaUid(null);
      await loadHaItemsForEntity(activeHaEntityId);
    } catch (err: any) {
      setHaError(err.message || 'Kon Home Assistant item niet opslaan.');
    } finally {
      setIsMutatingHa(false);
    }
  };

  const handleDeleteHaItem = async (uid: string) => {
    if (!activeHaEntityId) return;
    try {
      setIsMutatingHa(true);
      setHaError('');
      await removeHaTodoItem(activeHaEntityId, uid);
      await loadHaItemsForEntity(activeHaEntityId);
    } catch (err: any) {
      setHaError(err.message || 'Kon Home Assistant item niet verwijderen.');
    } finally {
      setIsMutatingHa(false);
    }
  };

  const handleClearCompletedHa = async () => {
    if (!activeHaEntityId) return;
    try {
      setIsMutatingHa(true);
      setHaError('');
      await clearCompletedHaTodoItems(activeHaEntityId);
      await loadHaItemsForEntity(activeHaEntityId);
    } catch (err: any) {
      setHaError(err.message || 'Kon afgeronde items niet wissen.');
    } finally {
      setIsMutatingHa(false);
    }
  };

  const completedInLocalScope = generalTasks.filter(
    t => t.completed && (selectedList === 'ALL' || t.listName === selectedList)
  ).length;
  const completedInHaScope = activeHaItems.filter(it => it.status === 'completed').length;

  return (
    <div className="space-y-5 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Algemene Taken & Lijsten
            </h1>
            <p className="text-xs text-slate-500">
              Maak meerdere eigen lijsten aan of koppel rechtstreeks je Home Assistant To-Do lijsten (`todo.*`).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Task Lists (Local + Home Assistant) */}
        <aside className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-indigo-500" />
              <span>Mijn lijsten ({allLists.length})</span>
            </h2>
          </div>

          <div className="space-y-1.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedList('ALL')}
              className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between font-semibold transition-colors ${
                selectedList === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Alle lokale lijsten</span>
              <span className="font-mono text-[11px] opacity-85">
                {generalTasks.filter(t => !t.completed).length}
              </span>
            </button>

            {allLists.map(listName => {
              const openCount = generalTasks.filter(
                t => t.listName === listName && !t.completed
              ).length;
              const isSelected = selectedList === listName;

              return (
                <div
                  key={listName}
                  className={`rounded-xl flex items-center justify-between gap-2 px-3 py-2 transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 font-bold'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedList(listName)}
                    className="flex-1 text-left flex items-center justify-between gap-2 min-w-0 py-0.5"
                  >
                    <span className="truncate">{listName}</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 shrink-0">
                      {openCount}
                    </span>
                  </button>

                  {allLists.length > 1 &&
                    (confirmDeleteList === listName ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteTaskList(listName);
                            if (selectedList === listName) {
                              const next = allLists.find(l => l !== listName) || 'ALL';
                              setSelectedList(next);
                            }
                            setConfirmDeleteList(null);
                          }}
                          className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-semibold"
                        >
                          Wis
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteList(null)}
                          className="p-0.5 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteList(listName)}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                        title={`Lijst "${listName}" verwijderen`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ))}
                </div>
              );
            })}
          </div>

          {/* Linked Home Assistant To-Do Lists */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-sky-500" />
                <span>Home Assistant To-Do ({haLinkedTodoEntities.length})</span>
              </span>
              <button
                type="button"
                onClick={handleOpenHaPicker}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
              >
                {showHaPicker ? 'Sluiten' : '+ Lijst koppelen'}
              </button>
            </div>

            {haLinkedTodoEntities.length > 0 && (
              <div className="space-y-1.5">
                {haLinkedTodoEntities.map(hl => {
                  const key = `HA:${hl.entityId}`;
                  const isSelected = selectedList === key;
                  const openCount = (haItemsByEntity[hl.entityId] || []).filter(
                    it => it.status !== 'completed'
                  ).length;

                  return (
                    <div
                      key={hl.entityId}
                      className={`rounded-xl flex items-center justify-between gap-2 px-3 py-2 transition-colors ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200 font-bold'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedList(key)}
                        className="flex-1 text-left flex items-center justify-between gap-2 min-w-0 py-0.5"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-sky-100 dark:bg-sky-900/70 text-sky-700 dark:text-sky-300 shrink-0">
                            HA
                          </span>
                          <span className="truncate">{hl.name}</span>
                        </div>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 shrink-0">
                          {haItemsByEntity[hl.entityId] ? openCount : '·'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onUnlinkHaTodoList(hl.entityId);
                          if (selectedList === key) {
                            setSelectedList(allLists[0] || 'ALL');
                          }
                        }}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                        title="Home Assistant lijst ontkoppelen"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {showHaPicker && (
              <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 space-y-2">
                {isLoadingHaLists ? (
                  <p className="text-[11px] text-slate-500">Home Assistant lijsten laden...</p>
                ) : !haStatus?.connected ? (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                    Home Assistant is nog niet gekoppeld. Stel de URL & Token in bij{' '}
                    <strong>Instellingen → Home Assistant Koppeling</strong> (of start als HA Add-on).
                  </p>
                ) : availableHaTodos.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Geen `todo.*` lijsten gevonden in Home Assistant.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Beschikbare Home Assistant lijsten:
                    </div>
                    {availableHaTodos.map(todo => {
                      const alreadyLinked = haLinkedTodoEntities.some(
                        h => h.entityId === todo.entityId
                      );
                      return (
                        <div
                          key={todo.entityId}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {todo.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">
                              {todo.entityId}
                            </div>
                          </div>
                          {alreadyLinked ? (
                            <span className="text-[10px] font-semibold text-emerald-600 shrink-0">
                              Gekoppeld
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onLinkHaTodoList({
                                  entityId: todo.entityId,
                                  name: todo.name
                                });
                                setSelectedList(`HA:${todo.entityId}`);
                                setShowHaPicker(false);
                              }}
                              className="px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold shrink-0"
                            >
                              Koppelen
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Create New Local List Form */}
          <form
            onSubmit={handleCreateListSubmit}
            className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs"
          >
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FolderPlus className="w-3.5 h-3.5 text-indigo-500" />
              <span>Nieuwe lokale lijst aanmaken</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="bijv. Vakantie, Doe-het-zelf..."
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>
        </aside>

        {/* RIGHT COLUMN: Items inside selected list */}
        <section className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {isHaListSelected
                    ? activeHaMeta?.name || activeHaEntityId
                    : selectedList === 'ALL'
                    ? 'Alle lokale lijsten'
                    : selectedList}
                </h2>
                {isHaListSelected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300">
                    <Home className="w-3 h-3" />
                    <span>Home Assistant</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isHaListSelected
                  ? `${visibleHaItems.filter(i => i.status !== 'completed').length} open puntjes in ${activeHaEntityId}`
                  : `${visibleLocalTasks.filter(t => !t.completed).length} open puntjes`}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              {isHaListSelected && (
                <button
                  type="button"
                  onClick={() => loadHaItemsForEntity(activeHaEntityId)}
                  disabled={isLoadingHaItems}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHaItems ? 'animate-spin' : ''}`} />
                  <span>Synchroniseer</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowCompleted(p => !p)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
              >
                {showCompleted ? 'Verberg afgerond' : 'Toon afgerond'}
              </button>

              {isHaListSelected ? (
                completedInHaScope > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCompletedHa}
                    disabled={isMutatingHa}
                    className="px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium"
                  >
                    Afgeronde wissen ({completedInHaScope})
                  </button>
                )
              ) : (
                completedInLocalScope > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onClearCompletedGeneralTasks(
                        selectedList === 'ALL' ? undefined : selectedList
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium"
                  >
                    Afgeronde wissen ({completedInLocalScope})
                  </button>
                )
              )}
            </div>
          </div>

          {haError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{haError}</span>
            </div>
          )}

          {/* Quick Add Task Bar */}
          <form
            onSubmit={handleAddTaskSubmit}
            className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 text-xs"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder={
                  isHaListSelected
                    ? `Nieuw item toevoegen aan Home Assistant (${activeHaMeta?.name || activeHaEntityId})...`
                    : `Puntje toevoegen aan "${selectedList === 'ALL' ? allLists[0] || 'Algemeen' : selectedList}"...`
                }
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowDetails(p => !p)}
                className={`p-2 rounded-lg border transition-colors shrink-0 ${
                  showDetails
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800'
                }`}
                title="Extra opties (notitie, vervaldatum)"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={isMutatingHa}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold shrink-0"
              >
                {isMutatingHa ? 'Bezig...' : 'Toevoegen'}
              </button>
            </div>

            {showDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                {!isHaListSelected && (
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Prioriteit
                    </label>
                    <select
                      value={newPriority}
                      onChange={e =>
                        setNewPriority(e.target.value as 'low' | 'normal' | 'high')
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="normal">Normaal</option>
                      <option value="high">Belangrijk (!)</option>
                      <option value="low">Laag</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Vervaldatum (optioneel)
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                {!isHaListSelected && (
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Voor wie? (optioneel)
                    </label>
                    <select
                      value={newAssignedTo}
                      onChange={e => setNewAssignedTo(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Iedereen</option>
                      {familyMembers.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={isHaListSelected ? 'sm:col-span-2' : 'sm:col-span-3'}>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Notities / omschrijving (optioneel)
                  </label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    placeholder="Notities of extra details..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            )}
          </form>

          {/* HOME ASSISTANT LIST ITEMS */}
          {isHaListSelected ? (
            isLoadingHaItems && visibleHaItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Home Assistant taken ophalen...
              </div>
            ) : visibleHaItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <CheckSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p>Geen puntjes in deze Home Assistant lijst.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleHaItems.map(item => {
                  const isCompleted = item.status === 'completed';
                  const isEditing = editingHaUid === item.uid;

                  if (isEditing) {
                    return (
                      <div
                        key={item.uid}
                        className="p-3.5 rounded-xl border border-sky-300 dark:border-sky-700 bg-sky-50/40 dark:bg-sky-950/20 space-y-2.5 text-xs"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editHaSummary}
                            onChange={e => setEditHaSummary(e.target.value)}
                            className="sm:col-span-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                          />
                          <div>
                            <label className="block font-semibold text-slate-500 mb-1">
                              Vervaldatum
                            </label>
                            <input
                              type="date"
                              value={editHaDue}
                              onChange={e => setEditHaDue(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-500 mb-1">
                              Notities
                            </label>
                            <input
                              type="text"
                              value={editHaDescription}
                              onChange={e => setEditHaDescription(e.target.value)}
                              placeholder="Omschrijving..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingHaUid(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                          >
                            Annuleren
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveHaItemEdit(item.uid)}
                            disabled={isMutatingHa}
                            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                          >
                            Opslaan in HA
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.uid}
                      onClick={() => handleToggleHaItem(item)}
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-start justify-between gap-3 transition-all ${
                        isCompleted
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/50 opacity-75'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-sky-300'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-semibold text-sm ${
                                isCompleted
                                  ? 'line-through text-slate-500'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {item.summary}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.description}
                            </p>
                          )}
                          {item.due && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              📅 {formatLocalDateNL(item.due.slice(0, 10), { day: 'numeric', month: 'short' })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            startEditingHaItem(item);
                          }}
                          className="p-1.5 text-slate-300 hover:text-sky-500"
                          title="Bewerken in Home Assistant"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteHaItem(item.uid);
                          }}
                          className="p-1.5 text-slate-300 hover:text-red-500"
                          title="Verwijderen uit Home Assistant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : visibleLocalTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <CheckSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p>Geen puntjes in deze lijst.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleLocalTasks.map(task => {
                const assignedMember = familyMembers.find(m => m.id === task.assignedTo);
                const isEditing = editingTaskId === task.id;

                if (isEditing) {
                  return (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2.5 text-xs"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="sm:col-span-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                        />
                        <select
                          value={editListName}
                          onChange={e => setEditListName(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                          {allLists.map(l => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <select
                            value={editPriority}
                            onChange={e =>
                              setEditPriority(e.target.value as 'low' | 'normal' | 'high')
                            }
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          >
                            <option value="normal">Normaal</option>
                            <option value="high">Belangrijk (!)</option>
                            <option value="low">Laag</option>
                          </select>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={e => setEditDueDate(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                          />
                        </div>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          placeholder="Notities..."
                          className="sm:col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          Annuleren
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveTaskEdit(task.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                          Opslaan
                        </button>
                      </div>
                    </div>
                  );
                }

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
                          {selectedList === 'ALL' && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                              {task.listName}
                            </span>
                          )}
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

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          startEditingTask(task);
                        }}
                        className="p-1.5 text-slate-300 hover:text-indigo-500"
                        title="Bewerken"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteGeneralTask(task.id);
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-500"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
