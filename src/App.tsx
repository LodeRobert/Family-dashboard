import React, { useState, useEffect, useCallback } from 'react';
import {
  AppState,
  CalendarEvent,
  CalendarSource,
  Chore,
  RewardItem,
  ViewTab
} from './types';
import { TopBar } from './components/TopBar';
import { BottomNavBar } from './components/BottomNavBar';
import { DashboardView } from './components/DashboardView';
import { CalendarView } from './components/CalendarView';
import { ChoresView } from './components/ChoresView';
import { DockerSetupView } from './components/DockerSetupView';
import { EventModal } from './components/EventModal';
import { ManageCalendarsModal } from './components/ManageCalendarsModal';
import {
  initAuth,
  googleSignIn,
  logoutGoogle
} from './services/firebaseAuth';
import {
  fetchGoogleCalendarList,
  fetchGoogleEvents,
  createGoogleEvent,
  deleteGoogleEvent
} from './services/googleCalendar';
import {
  loadAppState,
  saveAppState,
  fetchICalFeedEvents
} from './services/storage';
import { User } from 'firebase/auth';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [appState, setAppState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Kiosk & Dark theme state
  const [isKiosk, setIsKiosk] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [initialDateForModal, setInitialDateForModal] = useState<string | undefined>(undefined);
  const [isManageCalendarsOpen, setIsManageCalendarsOpen] = useState(false);

  // Google Calendar Auth & Feeds state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [availableGoogleCalendars, setAvailableGoogleCalendars] = useState<CalendarSource[]>([]);
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);

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

  // Sync external feeds (Google Calendar + iCal)
  const refreshExternalCalendars = useCallback(
    async (calendars: CalendarSource[], token: string | null) => {
      const allExtEvents: CalendarEvent[] = [];

      // 1. Fetch iCal feeds via server proxy
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

      // 2. Fetch Google Calendar events if authenticated
      if (token) {
        for (const cal of calendars) {
          if (cal.type === 'google_oauth' && cal.googleId) {
            try {
              const gEvts = await fetchGoogleEvents(cal.googleId, cal.color, cal.name);
              allExtEvents.push(...gEvts);
            } catch (err) {
              console.error(`Error loading Google events for ${cal.name}:`, err);
            }
          }
        }
      }

      setExternalEvents(allExtEvents);
    },
    []
  );

  // Initialize App State and Auth
  useEffect(() => {
    async function init() {
      try {
        const state = await loadAppState();
        setAppState(state);

        // Init Firebase Auth
        initAuth(
          async (user, token) => {
            setGoogleUser(user);
            setGoogleToken(token);
            try {
              const gCals = await fetchGoogleCalendarList();
              setAvailableGoogleCalendars(gCals);

              // Auto-add primary Google calendar if none exists yet
              if (!state.calendars.some(c => c.type === 'google_oauth') && gCals.length > 0) {
                const primary = gCals[0];
                const updatedCalendars = [...state.calendars, primary];
                const updatedState = { ...state, calendars: updatedCalendars };
                setAppState(updatedState);
                saveAppState(updatedState);
                refreshExternalCalendars(updatedCalendars, token);
              } else {
                refreshExternalCalendars(state.calendars, token);
              }
            } catch (err) {
              console.error('Error fetching Google Calendars:', err);
              refreshExternalCalendars(state.calendars, token);
            }
          },
          () => {
            setGoogleUser(null);
            setGoogleToken(null);
            refreshExternalCalendars(state.calendars, null);
          }
        );
      } catch (err) {
        console.error('Failed to initialize HomeBoard:', err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [refreshExternalCalendars]);

  // Periodic refresh (every 5 minutes for wall displays)
  useEffect(() => {
    if (!appState) return;
    const interval = setInterval(() => {
      refreshExternalCalendars(appState.calendars, googleToken);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [appState, googleToken, refreshExternalCalendars]);

  // Google OAuth Handlers
  const handleGoogleSignIn = async () => {
    const result = await googleSignIn();
    if (result) {
      setGoogleUser(result.user);
      setGoogleToken(result.accessToken);
      const gCals = await fetchGoogleCalendarList();
      setAvailableGoogleCalendars(gCals);

      if (appState && gCals.length > 0) {
        const existingIds = new Set(appState.calendars.map(c => c.id));
        const newCals = [...appState.calendars];
        for (const cal of gCals) {
          if (!existingIds.has(cal.id)) {
            newCals.push(cal);
            break;
          }
        }
        const updatedState = { ...appState, calendars: newCals };
        setAppState(updatedState);
        await saveAppState(updatedState);
        await refreshExternalCalendars(newCals, result.accessToken);
      }
    }
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setGoogleToken(null);
    setAvailableGoogleCalendars([]);
    if (appState) {
      refreshExternalCalendars(appState.calendars, null);
    }
  };

  // State Updates Helpers
  const updateStateAndPersist = async (updater: (prev: AppState) => AppState) => {
    setAppState(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      saveAppState(next);
      return next;
    });
  };

  // Calendar Event Handlers
  const handleOpenNewEvent = (initialDate?: string) => {
    setEditingEvent(null);
    setInitialDateForModal(initialDate);
    setIsEventModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    if (!appState) return;

    const targetCal = appState.calendars.find(c => c.id === eventData.calendarId);

    // If writing to a Google Calendar
    if (targetCal?.type === 'google_oauth' && targetCal.googleId) {
      await createGoogleEvent(targetCal.googleId, {
        title: eventData.title!,
        description: eventData.description,
        startTime: eventData.startTime!,
        endTime: eventData.endTime!,
        allDay: eventData.allDay,
        location: eventData.location
      });

      if (googleToken) {
        await refreshExternalCalendars(appState.calendars, googleToken);
      }
      return;
    }

    // Otherwise save to local calendar events
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
      const newEvent: CalendarEvent = {
        id: 'evt-' + Math.random().toString(36).substring(2, 9),
        calendarId: eventData.calendarId || appState.calendars[0]?.id || 'cal-family',
        calendarName: targetCal?.name || 'Gezinsagenda',
        calendarColor: targetCal?.color || '#6366F1',
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

  const handleDeleteEvent = async (eventId: string, calendarId: string) => {
    if (!appState) return;

    const targetCal = appState.calendars.find(c => c.id === calendarId);

    if (targetCal?.type === 'google_oauth' && targetCal.googleId) {
      await deleteGoogleEvent(targetCal.googleId, eventId);
      if (googleToken) {
        await refreshExternalCalendars(appState.calendars, googleToken);
      }
      return;
    }

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
      refreshExternalCalendars([...appState.calendars, cal], googleToken);
    }
  };

  const handleDeleteCalendar = async (calendarId: string) => {
    await updateStateAndPersist(prev => ({
      ...prev,
      calendars: prev.calendars.filter(c => c.id !== calendarId),
      events: prev.events.filter(e => e.calendarId !== calendarId)
    }));
  };

  const handleToggleCalendarVisibility = async (calendarId: string) => {
    await updateStateAndPersist(prev => ({
      ...prev,
      calendars: prev.calendars.map(c =>
        c.id === calendarId ? { ...c, visible: !c.visible } : c
      )
    }));
  };

  // Chore & Rewards Handlers
  const handleToggleChore = async (choreId: string) => {
    if (!appState) return;
    const chore = appState.chores.find(c => c.id === choreId);
    if (!chore) return;

    const nextCompleted = !chore.completedToday;
    const starDelta = nextCompleted ? chore.stars : -chore.stars;

    await updateStateAndPersist(prev => ({
      ...prev,
      chores: prev.chores.map(c =>
        c.id === choreId ? { ...c, completedToday: nextCompleted } : c
      ),
      familyMembers: prev.familyMembers.map(m =>
        m.id === chore.memberId ? { ...m, stars: Math.max(0, m.stars + starDelta) } : m
      )
    }));
  };

  const handleAddChore = async (newChore: Omit<Chore, 'id' | 'completedToday'>) => {
    const chore: Chore = {
      ...newChore,
      id: 'chr-' + Math.random().toString(36).substring(2, 9),
      completedToday: false
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

  const handleResetTodayChores = async () => {
    await updateStateAndPersist(prev => ({
      ...prev,
      chores: prev.chores.map(c => ({ ...c, completedToday: false }))
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
    if (!appState) return;
    const reward = appState.rewards.find(r => r.id === rewardId);
    if (!reward) return;

    await updateStateAndPersist(prev => ({
      ...prev,
      rewards: prev.rewards.map(r =>
        r.id === rewardId ? { ...r, claimedCount: r.claimedCount + 1 } : r
      ),
      familyMembers: prev.familyMembers.map(m =>
        m.id === memberId
          ? { ...m, stars: Math.max(0, m.stars - reward.starsRequired) }
          : m
      )
    }));
  };

  const handleSyncAll = async () => {
    if (appState) {
      await refreshExternalCalendars(appState.calendars, googleToken);
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
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors ${isKiosk ? 'p-2 sm:p-4' : ''}`}>
      {/* Top Bar Header (Desktop & Mobile Compact) */}
      {!isKiosk && (
        <TopBar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onOpenNewEvent={() => handleOpenNewEvent()}
          isKiosk={isKiosk}
          onToggleKiosk={toggleKiosk}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          activeCalendarCount={appState.calendars.length}
        />
      )}

      {/* Kiosk Mode Floating Controls */}
      {isKiosk && (
        <div className="fixed top-3 right-3 z-50 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 text-xs shadow-lg">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`px-2.5 py-1 rounded-md transition-colors ${currentTab === 'dashboard' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentTab('calendar')}
            className={`px-2.5 py-1 rounded-md transition-colors ${currentTab === 'calendar' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300'}`}
          >
            Kalender
          </button>
          <button
            onClick={() => setCurrentTab('chores')}
            className={`px-2.5 py-1 rounded-md transition-colors ${currentTab === 'chores' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300'}`}
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
            settings={appState.settings}
            onOpenNewEvent={handleOpenNewEvent}
            onNavigateToCalendar={() => setCurrentTab('calendar')}
            onNavigateToChores={() => setCurrentTab('chores')}
            onToggleChore={handleToggleChore}
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
            familyMembers={appState.familyMembers}
            rewards={appState.rewards}
            onToggleChore={handleToggleChore}
            onAddChore={handleAddChore}
            onDeleteChore={handleDeleteChore}
            onAddReward={handleAddReward}
            onClaimReward={handleClaimReward}
            onResetTodayChores={handleResetTodayChores}
          />
        )}

        {currentTab === 'docker' && (
          <DockerSetupView
            appState={appState}
            onRestoreState={async newState => {
              setAppState(newState);
              await saveAppState(newState);
            }}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Visible only on GSM / screens < md) */}
      {!isKiosk && (
        <BottomNavBar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
        />
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
        onDeleteCalendar={handleDeleteCalendar}
        onToggleVisibility={handleToggleCalendarVisibility}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        googleUser={googleUser}
        googleToken={googleToken}
        availableGoogleCalendars={availableGoogleCalendars}
        onImportGoogleCalendar={handleAddCalendar}
        onSyncAll={handleSyncAll}
      />
    </div>
  );
}
