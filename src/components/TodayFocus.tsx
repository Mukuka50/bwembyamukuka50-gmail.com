import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Sparkles,
  Plus,
} from 'lucide-react';
import { Task, UserSettings } from '../types';
import { minutesToTime, timeToMinutes } from '../utils/scheduler';

interface TodayFocusProps {
  tasks: Task[];
  settings: UserSettings;
  activeTaskId: string | null;
  onSelectActiveTask: (id: string) => void;
  onCompleteTask: (id: string, loggedMinutes: number) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onGoToPlan: () => void;
}

export const TodayFocus: React.FC<TodayFocusProps> = ({
  tasks,
  settings,
  activeTaskId,
  onSelectActiveTask,
  onCompleteTask,
  onUpdateTask,
  onGoToPlan,
}) => {
  // Ordered incomplete tasks for today (excluding system breaks unless user explicitly picks one)
  const incompleteTasks = tasks
    .filter((t) => t.dayOffset === 0 && !t.completed && !t.isSystemBlock)
    .sort((a, b) => (a.scheduledStart ?? 9999) - (b.scheduledStart ?? 9999));

  const currentTask =
    incompleteTasks.find((t) => t.id === activeTaskId) || incompleteTasks[0] || null;

  const currentIndex = currentTask
    ? incompleteTasks.findIndex((t) => t.id === currentTask.id)
    : -1;
  const nextTask =
    currentIndex >= 0 && currentIndex + 1 < incompleteTasks.length
      ? incompleteTasks[currentIndex + 1]
      : incompleteTasks.find((t) => t.id !== currentTask?.id) || null;

  const [isRunning, setIsRunning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() =>
    currentTask ? currentTask.duration * 60 : 25 * 60
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Sync timer when currentTask changes
  useEffect(() => {
    setIsRunning(false);
    if (currentTask) {
      setSecondsRemaining(currentTask.duration * 60);
      setElapsedSeconds(0);
    }
  }, [currentTask?.id, currentTask?.duration]);

  // Tick timer every second when running
  useEffect(() => {
    if (!isRunning || !currentTask) return;
    const interval = window.setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, currentTask]);

  if (!currentTask) {
    return (
      <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          All tasks for today are complete
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          You have cleared your focus queue for today. Head to Evening Review to wrap up your day or add a new task in Plan view.
        </p>
        <button
          type="button"
          onClick={onGoToPlan}
          className="min-h-[46px] px-5 py-2.5 bg-slate-900 dark:bg-teal-600 text-white text-sm font-medium rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <span>Return to day plan</span>
        </button>
      </div>
    );
  }

  const totalSeconds = Math.max(60, currentTask.duration * 60);
  const progressFraction = Math.min(
    1,
    Math.max(0, (totalSeconds - secondsRemaining) / totalSeconds)
  );
  const minsLeft = Math.floor(secondsRemaining / 60);
  const secsLeft = secondsRemaining % 60;

  const peakStartMin = timeToMinutes(settings.peakStart);
  const peakEndMin = timeToMinutes(settings.peakEnd);
  const isInPeakWindow =
    typeof currentTask.scheduledStart === 'number' &&
    currentTask.scheduledStart >= peakStartMin &&
    currentTask.scheduledStart < peakEndMin;

  const handleFinishCurrent = () => {
    setIsRunning(false);
    const loggedMins =
      elapsedSeconds >= 60
        ? Math.max(1, Math.round(elapsedSeconds / 60))
        : currentTask.duration;
    onCompleteTask(currentTask.id, loggedMins);
    if (nextTask) {
      onSelectActiveTask(nextTask.id);
    }
  };

  const handleAddFiveMinutes = () => {
    setSecondsRemaining((prev) => prev + 5 * 60);
    onUpdateTask(currentTask.id, { duration: currentTask.duration + 5 });
  };

  // SVG Ring Math
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressFraction);

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* CURRENT TASK CARD */}
      <section
        aria-label="Current focus task"
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-teal-700 dark:text-teal-400">
              Current task
            </span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{currentTask.priority} priority</span>
            <span aria-hidden="true">·</span>
            <span>
              {currentTask.energy === 'high' ? 'High focus' : 'Low focus'}
            </span>
          </div>
          {typeof currentTask.scheduledStart === 'number' && (
            <span className="font-mono">
              {minutesToTime(currentTask.scheduledStart)}–
              {minutesToTime(currentTask.scheduledStart + currentTask.duration)}
            </span>
          )}
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 text-balance">
            {currentTask.title}
          </h2>
          {isInPeakWindow && currentTask.energy === 'high' && (
            <p className="text-xs text-teal-700 dark:text-teal-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Scheduled in your peak energy window ({settings.peakStart}–{settings.peakEnd})</span>
            </p>
          )}
        </div>

        {/* Circular Countdown Timer */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-52 h-52 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-100 dark:text-slate-800"
              />
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="text-teal-600 dark:text-teal-400 transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-mono font-semibold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                {String(minsLeft).padStart(2, '0')}:{String(secsLeft).padStart(2, '0')}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isRunning ? 'Focusing...' : 'Ready'} · {currentTask.duration}m est
              </span>
            </div>
          </div>
        </div>

        {/* Primary Timer Controls (Large 48px+ Tap Targets) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsRunning((prev) => !prev)}
            className={`min-h-[52px] px-6 py-3 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-teal-700 hover:bg-teal-800 text-white'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause timer</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start focus timer</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleFinishCurrent}
            className="min-h-[52px] px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete task</span>
          </button>
        </div>

        {/* Secondary Timer Adjustments */}
        <div className="flex items-center justify-center gap-4 pt-1">
          <button
            type="button"
            onClick={() => {
              setIsRunning(false);
              setSecondsRemaining(currentTask.duration * 60);
              setElapsedSeconds(0);
            }}
            className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset timer</span>
          </button>
          <button
            type="button"
            onClick={handleAddFiveMinutes}
            className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add 5 minutes</span>
          </button>
        </div>
      </section>

      {/* NEXT TASK ONLY (Strict 2-item focus discipline) */}
      <section
        aria-label="Next task up"
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4"
      >
        {nextTask ? (
          <>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Next up
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{nextTask.duration}m</span>
                {typeof nextTask.scheduledStart === 'number' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">
                      {minutesToTime(nextTask.scheduledStart)}
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="capitalize">{nextTask.priority} priority</span>
              </div>
              <h3 className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 truncate">
                {nextTask.title}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => onSelectActiveTask(nextTask.id)}
              className="min-h-[44px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
            >
              <span>Switch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="text-xs text-slate-500 dark:text-slate-400 py-1">
            No more tasks queued after this one today.
          </div>
        )}
      </section>
    </div>
  );
};
