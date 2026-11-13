import React, { useState } from 'react';
import { FamilyMember, GeneralTask } from '../types';
import { MemberAvatar } from './MemberAvatar';
import { formatLocalDateNL } from '../utils/dateTime';
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
  X
} from 'lucide-react';

interface GeneralTasksViewProps {
  taskLists: string[];
  generalTasks: GeneralTask[];
  familyMembers: FamilyMember[];
  onAddTaskList: (name: string) => void;
  onDeleteTaskList: (name: string) => void;
  onAddGeneralTask: (task: Omit<GeneralTask, 'id' | 'completed' | 'createdAt'>) => void;
  onUpdateGeneralTask: (taskId: string, patch: Partial<GeneralTask>) => void;
  onToggleGeneralTask: (taskId: string) => void;
  onDeleteGeneralTask: (taskId: string) => void;
  onClearCompletedGeneralTasks: (listName?: string) => void;
}

export const GeneralTasksView: React.FC<GeneralTasksViewProps> = ({
  taskLists,
  generalTasks,
  familyMembers,
  onAddTaskList,
  onDeleteTaskList,
  onAddGeneralTask,
  onUpdateGeneralTask,
  onToggleGeneralTask,
  onDeleteGeneralTask,
  onClearCompletedGeneralTasks
}) => {
  const [selectedList, setSelectedList] = useState<string>(taskLists[0] || 'Algemeen');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);

  // Create new list
  const [newListName, setNewListName] = useState('');
  const [confirmDeleteList, setConfirmDeleteList] = useState<string | null>(null);

  // Quick add task
  const [newTitle, setNewTitle] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high'>('normal');

  // Inline edit existing task
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editListName, setEditListName] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'normal' | 'high'>('normal');

  const allLists = Array.from(
    new Set([...taskLists, ...generalTasks.map(t => t.listName).filter(Boolean)])
  );

  const visibleTasks = generalTasks
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

  const handleCreateListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newListName.trim();
    if (!cleaned) return;
    onAddTaskList(cleaned);
    setSelectedList(cleaned);
    setNewListName('');
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
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

  const completedInScope = generalTasks.filter(
    t => t.completed && (selectedList === 'ALL' || t.listName === selectedList)
  ).length;

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
              Maak meerdere eigen lijsten aan (boodschappen, herinneringen, to-do's, ...) — los van het sterrenbord.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Task Lists */}
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
              <span>Alle lijsten samen</span>
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

                  {allLists.length > 1 && (
                    confirmDeleteList === listName ? (
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
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* Create New List Form */}
          <form
            onSubmit={handleCreateListSubmit}
            className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs"
          >
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FolderPlus className="w-3.5 h-3.5 text-indigo-500" />
              <span>Nieuwe lijst aanmaken</span>
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
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {selectedList === 'ALL' ? 'Alle lijsten samen' : selectedList}
              </h2>
              <p className="text-xs text-slate-500">
                {visibleTasks.filter(t => !t.completed).length} open puntjes
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowCompleted(p => !p)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
              >
                {showCompleted ? 'Verberg afgerond' : 'Toon afgerond'}
              </button>
              {completedInScope > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onClearCompletedGeneralTasks(
                      selectedList === 'ALL' ? undefined : selectedList
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium"
                >
                  Afgeronde wissen ({completedInScope})
                </button>
              )}
            </div>
          </div>

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
                placeholder={`Puntje toevoegen aan "${selectedList === 'ALL' ? allLists[0] || 'Algemeen' : selectedList}"...`}
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
                title="Extra opties (notitie, vervaldatum, persoon)"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shrink-0"
              >
                Toevoegen
              </button>
            </div>

            {showDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
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

                <div className="sm:col-span-3">
                  <input
                    type="text"
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    placeholder="Notities of extra details (optioneel)..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            )}
          </form>

          {/* Task Items */}
          {visibleTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <CheckSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p>Geen puntjes in deze lijst.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleTasks.map(task => {
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
