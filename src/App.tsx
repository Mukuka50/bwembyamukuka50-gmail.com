import { useState, useEffect } from 'react';
import {
  Calendar,
  Target,
  Moon,
  Sun,
  BarChart3,
  Repeat,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Task,
  Routine,
  UserSettings,
  SmartPlanReport,
  DailyHistoryPoint,
} from './types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_ROUTINES,
  INITIAL_TASKS,
  INITIAL_WEEKLY_HISTORY,
} from './data/defaultData';
import {
  generateSmartDayPlan,
  timeToMinutes,
  formatDuration,
} from './utils/scheduler';
import { QuickCapture } from './components/QuickCapture';
import { TimelineView } from './components/TimelineView';
import { TodayFocus } from './components/TodayFocus';
import { EveningReview } from './components/EveningReview';
import { WeeklyInsights } from './components/WeeklyInsights';
import { RoutinesView } from './components/RoutinesView';
import { SettingsModal } from './components/SettingsModal';

type ActiveTab = 'plan' | 'focus' | 'review' | 'insights' | 'routines';

const STORAGE_KEYS = {
  TASKS: 'dayshape_tasks_v1',
  ROUTINES: 'dayshape_routines_v1',
  SETTINGS: 'dayshape_settings_v1',
  HISTORY: 'dayshape_history_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() =>
    loadFromStorage(STORAGE_KEYS.TASKS, INITIAL_TASKS)
  );
  const [routines, setRoutines] = useState<Routine[]>(() =>
    loadFromStorage(STORAGE_KEYS.ROUTINES, DEFAULT_ROUTINES)
  );
  const [settings, setSettings] = useState<UserSettings>(() =>
    loadFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
  );
  const [weeklyHistory, setWeeklyHistory] = useState<DailyHistoryPoint[]>(() =>
    loadFromStorage(STORAGE_KEYS.HISTORY, INITIAL_WEEKLY_HISTORY)
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('plan');
  const [activeFocusTaskId, setActiveFocusTaskId] = useState<string | null>(null);
  const [planReport, setPlanReport] = useState<SmartPlanReport | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch {
      // ignore storage quota errors
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
    } catch {
      // ignore
    }
  }, [routines]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Sync dark mode class on document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Task Handlers
  const handleAddTask = (
    newTaskData: Omit<Task, 'id' | 'actualDuration' | 'completed'>
  ) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      actualDuration: 0,
      completed: false,
    };
    setTasks((prev) => [...prev, newTask]);
  };

  const handleAddAndPlan = (
    newTaskData: Omit<Task, 'id' | 'actualDuration' | 'completed'>
  ) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      actualDuration: 0,
      completed: false,
    };
    const nextList = [...tasks, newTask];
    const { tasks: plannedTasks, report } = generateSmartDayPlan(
      nextList,
      routines,
      settings
    );
    setTasks(plannedTasks);
    setPlanReport(report);
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleMoveToTomorrow = (ids: string[]) => {
    const idSet = new Set(ids);
    setTasks((prev) =>
      prev.map((t) =>
        idSet.has(t.id)
          ? { ...t, dayOffset: 1, scheduledStart: undefined }
          : t
      )
    );
  };

  const handleMoveToToday = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              dayOffset: 0,
              scheduledStart: timeToMinutes(settings.workStart),
            }
          : t
      )
    );
  };

  const handlePlanMyDay = () => {
    const { tasks: plannedTasks, report } = generateSmartDayPlan(
      tasks,
      routines,
      settings
    );
    setTasks(plannedTasks);
    setPlanReport(report);
  };

  const handleStartFocusTask = (taskId: string) => {
    setActiveFocusTaskId(taskId);
    setActiveTab('focus');
  };

  const handleCompleteFocusTask = (id: string, loggedMinutes: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed: true, actualDuration: loggedMinutes }
          : t
      )
    );
  };

  // Routine Handlers
  const handleAddRoutine = (routineData: Omit<Routine, 'id'>) => {
    const newRoutine: Routine = {
      ...routineData,
      id: `routine-${Date.now()}`,
    };
    const nextRoutines = [...routines, newRoutine];
    setRoutines(nextRoutines);

    // Also add block to today's timeline immediately
    const rTask: Task = {
      id: `task-routine-${newRoutine.id}`,
      title: newRoutine.title,
      duration: newRoutine.duration,
      actualDuration: 0,
      priority: 'medium',
      energy: newRoutine.energy,
      category: newRoutine.category,
      dayOffset: 0,
      scheduledStart: timeToMinutes(newRoutine.startTime),
      completed: false,
      isRoutine: true,
      routineId: newRoutine.id,
    };
    setTasks((prev) => [...prev, rTask]);
  };

  const handleToggleRoutine = (id: string) => {
    const target = routines.find((r) => r.id === id);
    if (!target) return;
    const nextEnabled = !target.enabled;

    setRoutines((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: nextEnabled } : r))
    );

    if (nextEnabled) {
      // Add to today's timeline if not already present
      const exists = tasks.some(
        (t) => t.dayOffset === 0 && t.routineId === id
      );
      if (!exists) {
        setTasks((prev) => [
          ...prev,
          {
            id: `task-routine-${id}`,
            title: target.title,
            duration: target.duration,
            actualDuration: 0,
            priority: 'medium',
            energy: target.energy,
            category: target.category,
            dayOffset: 0,
            scheduledStart: timeToMinutes(target.startTime),
            completed: false,
            isRoutine: true,
            routineId: id,
          },
        ]);
      }
    } else {
      // Remove uncompleted routine instance from today
      setTasks((prev) =>
        prev.filter((t) => !(t.dayOffset === 0 && t.routineId === id && !t.completed))
      );
    }
  };

  const handleDeleteRoutine = (id: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id));
    setTasks((prev) => prev.filter((t) => t.routineId !== id));
  };

  const handleUpdateSettings = (updates: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const handleResetSampleData = () => {
    setTasks(INITIAL_TASKS);
    setRoutines(DEFAULT_ROUTINES);
    setSettings(DEFAULT_SETTINGS);
    setWeeklyHistory(INITIAL_WEEKLY_HISTORY);
    setPlanReport(null);
    setIsSettingsOpen(false);
  };

  // Summary metrics for header context
  const todayUserTasks = tasks.filter(
    (t) => t.dayOffset === 0 && !t.isSystemBlock
  );
  const completedCount = todayUserTasks.filter((t) => t.completed).length;
  const totalCount = todayUserTasks.length;
  const remainingMinutes = todayUserTasks
    .filter((t) => !t.completed)
    .reduce((sum, t) => sum + t.duration, 0);

  const navItems: { id: ActiveTab; label: string; shortLabel: string; icon: typeof Calendar }[] = [
    { id: 'plan', label: 'Day Plan', shortLabel: 'Plan', icon: Calendar },
    { id: 'focus', label: 'Today Focus', shortLabel: 'Focus', icon: Target },
    { id: 'review', label: 'Evening Review', shortLabel: 'Review', icon: Moon },
    { id: 'insights', label: 'Weekly Insights', shortLabel: 'Insights', icon: BarChart3 },
    { id: 'routines', label: 'Routines', shortLabel: 'Routines', icon: Repeat },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 h-13 sm:h-15 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#plan"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('plan');
          }}
          className="text-xl sm:text-2xl font-display font-normal tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap"
        >
          DayShape
        </a>

        {/* Zone 2: 5 clean text navigation links (Desktop) */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-1 whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-teal-600 dark:border-teal-400 text-slate-900 dark:text-white font-semibold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1–2 Primary Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleUpdateSettings({ darkMode: !settings.darkMode })}
            aria-label={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {settings.darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT VIEWPORT */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-24 md:pb-12 space-y-6">
        {/* Quiet Day Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800/80 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-normal text-slate-900 dark:text-slate-100">
              {activeTab === 'plan' && 'Today’s Shape'}
              {activeTab === 'focus' && 'Single-Task Focus'}
              {activeTab === 'review' && 'Evening Review'}
              {activeTab === 'insights' && 'Weekly Insights'}
              {activeTab === 'routines' && 'Daily Routines'}
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>
              {completedCount}/{totalCount} completed
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatDuration(remainingMinutes)} remaining today</span>
            <span aria-hidden="true">·</span>
            <span>Peak {settings.peakStart}–{settings.peakEnd}</span>
          </div>
        </div>

        {/* VIEW 1: DAY PLAN & TIMELINE (Features 1, 2, 3) */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            <QuickCapture
              onAddTask={handleAddTask}
              onAddAndPlan={handleAddAndPlan}
            />

            <TimelineView
              tasks={tasks}
              settings={settings}
              planReport={planReport}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onMoveToTomorrow={handleMoveToTomorrow}
              onPlanMyDay={handlePlanMyDay}
              onStartFocusTask={handleStartFocusTask}
            />
          </div>
        )}

        {/* VIEW 2: TODAY FOCUS (Feature 4) */}
        {activeTab === 'focus' && (
          <TodayFocus
            tasks={tasks}
            settings={settings}
            activeTaskId={activeFocusTaskId}
            onSelectActiveTask={setActiveFocusTaskId}
            onCompleteTask={handleCompleteFocusTask}
            onUpdateTask={handleUpdateTask}
            onGoToPlan={() => setActiveTab('plan')}
          />
        )}

        {/* VIEW 3: EVENING REVIEW (Feature 5) */}
        {activeTab === 'review' && (
          <EveningReview
            tasks={tasks}
            onMoveToTomorrow={handleMoveToTomorrow}
            onMoveToToday={handleMoveToToday}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTask}
          />
        )}

        {/* VIEW 4: WEEKLY INSIGHTS (Feature 6) */}
        {activeTab === 'insights' && (
          <WeeklyInsights
            tasks={tasks}
            history={weeklyHistory}
            settings={settings}
          />
        )}

        {/* VIEW 5: ROUTINES (Feature 7) */}
        {activeTab === 'routines' && (
          <RoutinesView
            routines={routines}
            onAddRoutine={handleAddRoutine}
            onToggleRoutine={handleToggleRoutine}
            onDeleteRoutine={handleDeleteRoutine}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (< 768px) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-15 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center px-1"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
                isActive
                  ? 'text-teal-700 dark:text-teal-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetSampleData={handleResetSampleData}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
