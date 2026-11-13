import React, { useState, useEffect, useCallback } from 'react';
import {
  AppSettings,
  AppState,
  CalendarEvent,
  CalendarSource,
  Chore,
  FamilyMember,
  GeneralTask,
  RewardItem,
  StarLogEntry,
  ViewTab
} from './types';
import { TopBar } from './components/TopBar';
import { BottomNavBar } from './components/BottomNavBar';
import { DashboardView } from './components/DashboardView';
import { CalendarView } from './components/CalendarView';
import { ChoresView } from './components/ChoresView';
import { SettingsView } from './components/SettingsView';
import {
  FirstTimePasswordModal,
  SettingsLockScreen
} from './components/SettingsAuthModals';
import { EventModal } from './components/EventModal';
import { ManageCalendarsModal } from './components/ManageCalendarsModal';
import {
  loadAppState,
  saveAppState,
  fetchICalFeedEvents,
  fetchCurrentWeather
} from './services/storage';
import { getLocalDateStr } from './utils/dateTime';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [appState, setAppState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Automatic local date tracker (rolls over cleanly at 00:00 local time)
  const [todayStr, setTodayStr] = useState<string>(() => getLocalDateStr());

  // Settings password lock state (session-only in memory)
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);

  // Kiosk & Dark theme state
  const [isKiosk, setIsKiosk] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [initialDateForModal, setInitialDateForModal] = useState<string | undefined>(undefined);
  const [isManageCalendarsOpen, setIsManageCalendarsOpen] = useState(false);

  // External iCal events state
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);

  // Midnight rollover check every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const nextToday = getLocalDateStr();
      setTodayStr(prev => (prev !== nextToday ? nextToday : prev));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Theme synchronization
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = localStorage.getItem('homeboard_theme');
    if (initialTheme === 'dark' || (!initialTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('homeboard_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('homeboard_theme', 'light');
      }
      return next;
    });
  };

  const toggleKiosk = () => {
    setIsKiosk(prev => {
      const next = !prev;
      if (next) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  };

  // Sync iCal feeds via server proxy
  const refreshExternalCalendars = useCallback(async (calendars: CalendarSource[]) => {
    const allExtEvents: CalendarEvent[] = [];

    for (const cal of calendars) {
      if (cal.type === 'ical' && cal.url) {
        try {
          const icalEvts = await fetchICalFeedEvents(cal);
          allExtEvents.push(...icalEvts);
        } catch (err) {
          console.error(`Error loading iCal feed for ${cal.name}:`, err);
        }
      }
    }

    setExternalEvents(allExtEvents);
  }, []);

  // State Updates Helper
  const updateStateAndPersist = useCallback(async (updater: (prev: AppState) => AppState) => {
    setAppState(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      saveAppState(next);
      return next;
    });
  }, []);

  // Refresh live weather for configured coordinates
  const refreshLiveWeather = useCallback(
    async (lat?: number, lon?: number) => {
      if (lat == null || lon == null) return;
      try {
        const weather = await fetchCurrentWeather(lat, lon);
        updateStateAndPersist(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            weatherTemp: weather.temp,
            weatherCondition: weather.condition,
            weatherCode: weather.weatherCode
          }
        }));
      } catch {
        // Keep last cached weather if offline
      }
    },
    [updateStateAndPersist]
  );

  // Initialize App State
  useEffect(() => {
    async function init() {
      try {
        const state = await loadAppState();
        setAppState(state);

        await refreshExternalCalendars(state.calendars);

        if (state.settings.weatherLat != null && state.settings.weatherLon != null) {
          refreshLiveWeather(state.settings.weatherLat, state.settings.weatherLon);
        }
      } catch (err) {
        console.error('Failed to initialize HomeBoard:', err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [refreshExternalCalendars, refreshLiveWeather]);

  // Periodic refresh: iCal feeds every 5 min
  useEffect(() => {
    if (!appState) return;
    const interval = setInterval(() => {
      refreshExternalCalendars(appState.calendars);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [appState, refreshExternalCalendars]);

  // Periodic refresh: live weather every 15 min
  useEffect(() => {
    const lat = appState?.settings.weatherLat;
    const lon = appState?.settings.weatherLon;
    if (lat == null || lon == null) return;

    const weatherInterval = setInterval(() => {
      refreshLiveWeather(lat, lon);
    }, 15 * 60 * 1000);

    return () => clearInterval(weatherInterval);
  }, [appState?.settings.weatherLat, appState?.settings.weatherLon, refreshLiveWeather]);

  // Settings & Household Handlers
  const handleUpdateSettings = (partial: Partial<AppSettings>) => {
    updateStateAndPersist(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...partial
      }
    }));
  };

  const handleUpdateFamilyMembers = (members: FamilyMember[]) => {
    const validIds = new Set(members.map(m => m.id));
    updateStateAndPersist(prev => ({
      ...prev,
      familyMembers: members,
      chores: prev.chores.filter(c => validIds.has(c.memberId))
    }));
  };

  const handleAdjustMemberStars = (memberId: string, delta: number, reason?: string) => {
    if (!delta) return;
    updateStateAndPersist(prev => {
      const target = prev.familyMembers.find(m => m.id === memberId);
      if (!target) return prev;

      const nextStars = Math.max(0, target.stars + delta);
      const actualDelta = nextStars - target.stars;
      if (actualDelta === 0) return prev;

      const logEntry: StarLogEntry = {
        id: 'slog-' + Math.random().toString(36).substring(2, 9),
        date: getLocalDateStr(),
        timestamp: new Date().toISOString(),
        memberId,
        title:
          reason ||
          (actualDelta > 0 ? 'Extra sterren toegevoegd' : 'Sterren afgetrokken'),
        stars: actualDelta,
        type: 'manual_adjustment'
      };

      return {
        ...prev,
        familyMembers: prev.familyMembers.map(m =>
          m.id === memberId ? { ...m, stars: nextStars } : m
        ),
        starLogs: [...prev.starLogs, logEntry]
      };
    });
  };

  const handleUpdateCalendars = (calendars: CalendarSource[]) => {
    const validIds = new Set(calendars.map(c => c.id));
    updateStateAndPersist(prev => ({
      ...prev,
      calendars,
      events: prev.events.filter(e => validIds.has(e.calendarId))
    }));
    refreshExternalCalendars(calendars);
  };

  const handleUpdateCalendar = (calendarId: string, patch: Partial<CalendarSource>) => {
    updateStateAndPersist(prev => ({
      ...prev,
      calendars: prev.calendars.map(c => (c.id === calendarId ? { ...c, ...patch } : c))
    }));
  };

  // Calendar Event Handlers
  const handleOpenNewEvent = (initialDate?: string) => {
    setEditingEvent(null);
    setInitialDateForModal(initialDate);
    setIsEventModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.isExternal) return; // iCal events are read-only
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    if (!appState) return;

    const targetCal = appState.calendars.find(c => c.id === eventData.calendarId);

    if (eventData.id) {
      await updateStateAndPersist(prev => ({
        ...prev,
        events: prev.events.map(e =>
          e.id === eventData.id
            ? {
                ...e,
                ...eventData,
                calendarName: targetCal?.name || e.calendarName,
                calendarColor: targetCal?.color || e.calendarColor
              }
            : e
        )
      }));
    } else {
      const localCal =
        targetCal?.type === 'local'
          ? targetCal
          : appState.calendars.find(c => c.type === 'local') || appState.calendars[0];

      const newEvent: CalendarEvent = {
        id: 'evt-' + Math.random().toString(36).substring(2, 9),
        calendarId: localCal?.id || 'cal-family',
        calendarName: localCal?.name || 'Gezinsagenda',
        calendarColor: localCal?.color || '#6366F1',
        title: eventData.title!,
        description: eventData.description,
        startTime: eventData.startTime!,
        endTime: eventData.endTime!,
        allDay: eventData.allDay,
        assignedTo: eventData.assignedTo,
        location: eventData.location
      };

      await updateStateAndPersist(prev => ({
        ...prev,
        events: [...prev.events, newEvent]
      }));
    }
  };

  const handleDeleteEvent = async (eventId: string, _calendarId: string) => {
    await updateStateAndPersist(prev => ({
      ...prev,
      events: prev.events.filter(e => e.id !== eventId)
    }));
  };

  // Calendar Management Handlers
  const handleAddCalendar = async (cal: CalendarSource) => {
    await updateStateAndPersist(prev => ({
      ...prev,
      calendars: [...prev.calendars, cal]
    }));
    if (appState) {
      refreshExternalCalendars([...appState.calendars, cal]);
    }
  };

  const handleDeleteCalendar = async (calendarId: string) => {
    const nextCals = appState ? appState.calendars.filter(c => c.id !== calendarId) : [];
    await updateStateAndPersist(prev => ({
      ...prev,
      calendars: prev.calendars.filter(c => c.id !== calendarId),
      events: prev.events.filter(e => e.calendarId !== calendarId)
    }));
    refreshExternalCalendars(nextCals);
  };

  const handleToggleCalendarVisibility = async (calendarId: string) => {
    await updateStateAndPersist(prev => ({
      ...prev,
      calendars: prev.calendars.map(c =>
        c.id === calendarId ? { ...c, visible: !c.visible } : c
      )
    }));
  };

  // Chore & Star Log Handlers (supports today + adjusting previous days)
  const handleToggleChore = async (choreId: string, dateStr: string) => {
    await updateStateAndPersist(prev => {
      const chore = prev.chores.find(c => c.id === choreId);
      if (!chore) return prev;

      const currentCompleted = prev.choreCompletionsByDate[dateStr] || [];
      const wasCompleted = currentCompleted.includes(choreId);

      if (!wasCompleted) {
        const nextCompleted = [...currentCompleted, choreId];
        const newLog: StarLogEntry = {
          id: 'slog-' + Math.random().toString(36).substring(2, 9),
          date: dateStr,
          timestamp: new Date().toISOString(),
          memberId: chore.memberId,
          choreId: chore.id,
          title: chore.title,
          stars: chore.stars,
          type: 'chore'
        };

        return {
          ...prev,
          choreCompletionsByDate: {
            ...prev.choreCompletionsByDate,
            [dateStr]: nextCompleted
          },
          familyMembers: prev.familyMembers.map(m =>
            m.id === chore.memberId ? { ...m, stars: m.stars + chore.stars } : m
          ),
          starLogs: [...prev.starLogs, newLog]
        };
      } else {
        const nextCompleted = currentCompleted.filter(id => id !== choreId);
        // Find matching star log for that chore + date so we reverse the exact stars earned
        let removedLogId: string | null = null;
        let starsToRemove = chore.stars;
        for (let i = prev.starLogs.length - 1; i >= 0; i--) {
          const entry = prev.starLogs[i];
          if (
            entry.type === 'chore' &&
            entry.date === dateStr &&
            entry.choreId === choreId &&
            entry.memberId === chore.memberId
          ) {
            removedLogId = entry.id;
            starsToRemove = entry.stars;
            break;
          }
        }

        const nextLogs = removedLogId
          ? prev.starLogs.filter(l => l.id !== removedLogId)
          : prev.starLogs;

        return {
          ...prev,
          choreCompletionsByDate: {
            ...prev.choreCompletionsByDate,
            [dateStr]: nextCompleted
          },
          familyMembers: prev.familyMembers.map(m =>
            m.id === chore.memberId
              ? { ...m, stars: Math.max(0, m.stars - starsToRemove) }
              : m
          ),
          starLogs: nextLogs
        };
      }
    });
  };

  const handleAddChore = async (newChore: Omit<Chore, 'id' | 'completedToday'>) => {
    const chore: Chore = {
      ...newChore,
      id: 'chr-' + Math.random().toString(36).substring(2, 9)
    };
    await updateStateAndPersist(prev => ({
      ...prev,
      chores: [...prev.chores, chore]
    }));
  };

  const handleDeleteChore = async (choreId: string) => {
    await updateStateAndPersist(prev => ({
      ...prev,
      chores: prev.chores.filter(c => c.id !== choreId)
    }));
  };

  const handleAddReward = async (newReward: Omit<RewardItem, 'id' | 'claimedCount'>) => {
    const reward: RewardItem = {
      ...newReward,
      id: 'rew-' + Math.random().toString(36).substring(2, 9),
      claimedCount: 0
    };
    await updateStateAndPersist(prev => ({
      ...prev,
      rewards: [...prev.rewards, reward]
    }));
  };

  const handleClaimReward = async (rewardId: string, memberId: string) => {
    await updateStateAndPersist(prev => {
      const reward = prev.rewards.find(r => r.id === rewardId);
      if (!reward) return prev;

      const logEntry: StarLogEntry = {
        id: 'slog-' + Math.random().toString(36).substring(2, 9),
        date: getLocalDateStr(),
        timestamp: new Date().toISOString(),
        memberId,
        title: `Beloning: ${reward.title}`,
        stars: -reward.starsRequired,
        type: 'reward_claim'
      };

      return {
        ...prev,
        rewards: prev.rewards.map(r =>
          r.id === rewardId ? { ...r, claimedCount: r.claimedCount + 1 } : r
        ),
        familyMembers: prev.familyMembers.map(m =>
          m.id === memberId
            ? { ...m, stars: Math.max(0, m.stars - reward.starsRequired) }
            : m
        ),
        starLogs: [...prev.starLogs, logEntry]
      };
    });
  };

  // General Tasks Handlers
  const handleAddGeneralTask = async (
    taskData: Omit<GeneralTask, 'id' | 'completed' | 'createdAt'>
  ) => {
    const newTask: GeneralTask = {
      ...taskData,
      id: 'gt-' + Math.random().toString(36).substring(2, 9),
      completed: false,
      createdAt: new Date().toISOString()
    };
    await updateStateAndPersist(prev => ({
      ...prev,
      generalTasks: [newTask, ...prev.generalTasks]
    }));
  };

  const handleToggleGeneralTask = async (taskId: string) => {
    await updateStateAndPersist(prev => ({
      ...prev,
      generalTasks: prev.generalTasks.map(t =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : undefined
            }
          : t
      )
    }));
  };

  const handleDeleteGeneralTask = async (taskId: string) => {
    await updateStateAndPersist(prev => ({
      ...prev,
      generalTasks: prev.generalTasks.filter(t => t.id !== taskId)
    }));
  };

  const handleClearCompletedGeneralTasks = async () => {
    await updateStateAndPersist(prev => ({
      ...prev,
      generalTasks: prev.generalTasks.filter(t => !t.completed)
    }));
  };

  const handleSyncAll = async () => {
    if (appState) {
      await refreshExternalCalendars(appState.calendars);
    }
  };

  if (isLoading || !appState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold">HomeBoard wordt geladen...</p>
        </div>
      </div>
    );
  }

  const combinedEvents = [...appState.events, ...externalEvents];

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors ${
        isKiosk ? 'p-2 sm:p-4' : ''
      }`}
    >
      {/* First-time Password Setup on Startup */}
      {!appState.settings.hasSettingsPassword && (
        <FirstTimePasswordModal
          onSuccess={() => {
            setAppState(prev =>
              prev
                ? {
                    ...prev,
                    settings: { ...prev.settings, hasSettingsPassword: true }
                  }
                : prev
            );
            setIsSettingsUnlocked(true);
          }}
        />
      )}

      {/* Top Bar Header */}
      {!isKiosk && (
        <TopBar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onOpenNewEvent={() => handleOpenNewEvent()}
          isKiosk={isKiosk}
          onToggleKiosk={toggleKiosk}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          dashboardName={appState.settings.dashboardName}
        />
      )}

      {/* Kiosk Mode Floating Controls */}
      {isKiosk && (
        <div className="fixed top-3 right-3 z-50 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 text-xs shadow-lg">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              currentTab === 'dashboard' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentTab('calendar')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              currentTab === 'calendar' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300'
            }`}
          >
            Kalender
          </button>
          <button
            onClick={() => setCurrentTab('chores')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              currentTab === 'chores' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300'
            }`}
          >
            Taken
          </button>
          <button
            onClick={toggleDarkMode}
            className="p-1.5 text-slate-300 hover:text-white"
            title="Thema wisselen"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={toggleKiosk}
            className="p-1.5 text-amber-400 hover:text-amber-300 font-bold"
            title="Kiosk sluiten"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Viewport Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-12">
        {currentTab === 'dashboard' && (
          <DashboardView
            events={combinedEvents}
            calendars={appState.calendars}
            familyMembers={appState.familyMembers}
            chores={appState.chores}
            choreCompletionsByDate={appState.choreCompletionsByDate}
            generalTasks={appState.generalTasks}
            settings={appState.settings}
            todayStr={todayStr}
            onOpenNewEvent={handleOpenNewEvent}
            onNavigateToCalendar={() => setCurrentTab('calendar')}
            onNavigateToChores={() => setCurrentTab('chores')}
            onNavigateToSettings={() => setCurrentTab('settings')}
            onToggleChore={handleToggleChore}
            onToggleGeneralTask={handleToggleGeneralTask}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            events={combinedEvents}
            calendars={appState.calendars}
            familyMembers={appState.familyMembers}
            onOpenNewEvent={handleOpenNewEvent}
            onSelectEvent={handleSelectEvent}
            onOpenManageCalendars={() => setIsManageCalendarsOpen(true)}
            onToggleCalendarVisibility={handleToggleCalendarVisibility}
          />
        )}

        {currentTab === 'chores' && (
          <ChoresView
            chores={appState.chores}
            choreCompletionsByDate={appState.choreCompletionsByDate}
            starLogs={appState.starLogs}
            generalTasks={appState.generalTasks}
            familyMembers={appState.familyMembers}
            rewards={appState.rewards}
            todayStr={todayStr}
            onToggleChore={handleToggleChore}
            onAddChore={handleAddChore}
            onDeleteChore={handleDeleteChore}
            onAddReward={handleAddReward}
            onClaimReward={handleClaimReward}
            onAddGeneralTask={handleAddGeneralTask}
            onToggleGeneralTask={handleToggleGeneralTask}
            onDeleteGeneralTask={handleDeleteGeneralTask}
            onClearCompletedGeneralTasks={handleClearCompletedGeneralTasks}
          />
        )}

        {currentTab === 'settings' &&
          (!isSettingsUnlocked ? (
            <SettingsLockScreen onUnlocked={() => setIsSettingsUnlocked(true)} />
          ) : (
            <SettingsView
              appState={appState}
              onUpdateSettings={handleUpdateSettings}
              onUpdateFamilyMembers={handleUpdateFamilyMembers}
              onAdjustMemberStars={handleAdjustMemberStars}
              onUpdateCalendars={handleUpdateCalendars}
              onOpenManageCalendars={() => setIsManageCalendarsOpen(true)}
              onLockSettings={() => setIsSettingsUnlocked(false)}
              onRestoreState={async newState => {
                setAppState(newState);
                await saveAppState(newState);
                refreshExternalCalendars(newState.calendars);
              }}
            />
          ))}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      {!isKiosk && (
        <BottomNavBar currentTab={currentTab} onTabChange={setCurrentTab} />
      )}

      {/* Modals */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        editingEvent={editingEvent}
        calendars={appState.calendars}
        familyMembers={appState.familyMembers}
        initialDate={initialDateForModal}
      />

      <ManageCalendarsModal
        isOpen={isManageCalendarsOpen}
        onClose={() => setIsManageCalendarsOpen(false)}
        calendars={appState.calendars}
        onAddCalendar={handleAddCalendar}
        onUpdateCalendar={handleUpdateCalendar}
        onDeleteCalendar={handleDeleteCalendar}
        onToggleVisibility={handleToggleCalendarVisibility}
        onSyncAll={handleSyncAll}
      />
    </div>
  );
}
