import React, { useState, useRef } from 'react';
import {
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Check,
  GripVertical,
  Play,
  Trash2,
  Clock,
  ChevronUp,
  ChevronDown,
  CalendarPlus,
} from 'lucide-react';
import { Task, UserSettings, SmartPlanReport } from '../types';
import {
  minutesToTime,
  timeToMinutes,
  formatDuration,
} from '../utils/scheduler';

interface TimelineViewProps {
  tasks: Task[];
  settings: UserSettings;
  planReport: SmartPlanReport | null;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onMoveToTomorrow: (ids: string[]) => void;
  onPlanMyDay: () => void;
  onStartFocusTask: (taskId: string) => void;
}

const PIXELS_PER_MINUTE = 1.6; // 96px per hour (24px per 15 mins)

export const TimelineView: React.FC<TimelineViewProps> = ({
  tasks,
  settings,
  planReport,
  onUpdateTask,
  onDeleteTask,
  onMoveToTomorrow,
  onPlanMyDay,
  onStartFocusTask,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state for reschedule or resize
  const [dragState, setDragState] = useState<{
    taskId: string;
    mode: 'move' | 'resize';
    initialY: number;
    initialStart: number;
    initialDuration: number;
    currentStart: number;
    currentDuration: number;
  } | null>(null);

  const wakeMin = timeToMinutes(settings.wakeTime);
  const sleepMin = timeToMinutes(settings.sleepTime);
  const workStartMin = timeToMinutes(settings.workStart);
  const workEndMin = timeToMinutes(settings.workEnd);
  const peakStartMin = timeToMinutes(settings.peakStart);
  const peakEndMin = timeToMinutes(settings.peakEnd);

  // Today's tasks
  const todayTasks = tasks.filter((t) => t.dayOffset === 0);
  const scheduledTasks = todayTasks
    .filter((t) => typeof t.scheduledStart === 'number')
    .sort((a, b) => (a.scheduledStart || 0) - (b.scheduledStart || 0));
  const unscheduledTasks = todayTasks.filter(
    (t) => typeof t.scheduledStart !== 'number' && !t.isSystemBlock
  );

  // Determine timeline bounds (start at wakeTime or earliest scheduled task, end at sleepTime or latest task)
  const earliestTaskMin =
    scheduledTasks.length > 0
      ? Math.min(...scheduledTasks.map((t) => t.scheduledStart || wakeMin))
      : wakeMin;
  const latestTaskEndMin =
    scheduledTasks.length > 0
      ? Math.max(...scheduledTasks.map((t) => (t.scheduledStart || 0) + t.duration))
      : workEndMin;

  const timelineStartHour = Math.max(0, Math.floor(Math.min(wakeMin, earliestTaskMin) / 60));
  const timelineEndHour = Math.min(24, Math.ceil(Math.max(sleepMin, latestTaskEndMin + 30) / 60));
  const timelineStartMin = timelineStartHour * 60;
  const totalTimelineMinutes = Math.max(120, (timelineEndHour - timelineStartHour) * 60);
  const totalTimelineHeight = totalTimelineMinutes * PIXELS_PER_MINUTE;

  const hoursList: number[] = [];
  for (let h = timelineStartHour; h <= timelineEndHour; h++) {
    hoursList.push(h);
  }

  // Overload runtime check (either from planReport or live calculation)
  const availableWorkMinutes = Math.max(
    60,
    workEndMin - workStartMin - (settings.lunchDuration || 45)
  );
  const totalPlannedWorkMinutes = todayTasks
    .filter((t) => !t.isRoutine && t.category !== 'lunch')
    .reduce((sum, t) => sum + t.duration, 0);

  const tasksSpillingOver = scheduledTasks.filter(
    (t) => !t.isRoutine && !t.isSystemBlock && (t.scheduledStart || 0) + t.duration > workEndMin
  );
  const liveOverloadMinutes = Math.max(
    0,
    totalPlannedWorkMinutes - availableWorkMinutes,
    tasksSpillingOver.length > 0
      ? Math.max(...tasksSpillingOver.map((t) => (t.scheduledStart || 0) + t.duration)) - workEndMin
      : 0
  );

  // Suggest tasks to move to tomorrow when overloaded
  const suggestedTasksToDefer = (() => {
    if (liveOverloadMinutes <= 0) return [];
    const priorityRank = (p: Task['priority']) => (p === 'low' ? 1 : p === 'medium' ? 2 : 3);
    const candidates = todayTasks
      .filter((t) => !t.completed && !t.isRoutine && !t.isSystemBlock)
      .sort((a, b) => {
        const pDiff = priorityRank(a.priority) - priorityRank(b.priority);
        if (pDiff !== 0) return pDiff;
        return (b.scheduledStart || 9999) - (a.scheduledStart || 9999);
      });

    const chosen: Task[] = [];
    let acc = 0;
    for (const c of candidates) {
      if (acc >= liveOverloadMinutes && chosen.length > 0) break;
      chosen.push(c);
      acc += c.duration;
    }
    return chosen;
  })();

  // Pointer Drag Handlers
  const startDrag = (
    e: React.PointerEvent,
    task: Task,
    mode: 'move' | 'resize'
  ) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({
      taskId: task.id,
      mode,
      initialY: e.clientY,
      initialStart: task.scheduledStart ?? workStartMin,
      initialDuration: task.duration,
      currentStart: task.scheduledStart ?? workStartMin,
      currentDuration: task.duration,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    const deltaY = e.clientY - dragState.initialY;
    const deltaMinutesRaw = deltaY / PIXELS_PER_MINUTE;
    // Snap to 15-minute intervals
    const deltaSnapped = Math.round(deltaMinutesRaw / 15) * 15;

    if (dragState.mode === 'move') {
      const nextStart = Math.max(
        timelineStartMin,
        Math.min(timelineEndHour * 60 - dragState.initialDuration, dragState.initialStart + deltaSnapped)
      );
      setDragState((prev) => (prev ? { ...prev, currentStart: nextStart } : null));
    } else {
      const nextDuration = Math.max(15, Math.min(240, dragState.initialDuration + deltaSnapped));
      setDragState((prev) => (prev ? { ...prev, currentDuration: nextDuration } : null));
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragState) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore if already released
    }
    if (dragState.mode === 'move') {
      onUpdateTask(dragState.taskId, { scheduledStart: dragState.currentStart });
    } else {
      onUpdateTask(dragState.taskId, { duration: dragState.currentDuration });
    }
    setDragState(null);
  };

  const getPriorityStyles = (task: Task) => {
    if (task.category === 'lunch' || task.category === 'break') {
      return {
        border: 'border-l-4 border-l-slate-300 dark:border-l-slate-600',
        bg: 'bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60',
        label: task.category === 'lunch' ? 'Lunch' : 'Break',
      };
    }
    if (task.isRoutine) {
      return {
        border: 'border-l-4 border-l-teal-600 dark:border-l-teal-400',
        bg: 'bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-800/60',
        label: 'Routine',
      };
    }
    switch (task.priority) {
      case 'high':
        return {
          border: 'border-l-4 border-l-rose-600 dark:border-l-rose-500',
          bg: 'bg-rose-50/60 dark:bg-rose-950/35 border border-rose-200/70 dark:border-rose-900/60',
          label: 'High priority',
        };
      case 'medium':
        return {
          border: 'border-l-4 border-l-amber-500 dark:border-l-amber-400',
          bg: 'bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60',
          label: 'Medium priority',
        };
      default:
        return {
          border: 'border-l-4 border-l-slate-400 dark:border-l-slate-500',
          bg: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
          label: 'Low priority',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Smart Day Plan Banner & Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Work window {settings.workStart}–{settings.workEnd}</span>
            <span aria-hidden="true">·</span>
            <span>Peak focus {settings.peakStart}–{settings.peakEnd}</span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
            Arrange your day around your energy
          </h2>
          {planReport ? (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Placed <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{planReport.peakMatchedCount}</span> high-focus tasks in peak hours
              {planReport.groupedBatches.length > 0 && (
                <>
                  {' '}and grouped <span className="font-medium text-slate-900 dark:text-slate-200">{planReport.groupedBatches.join(', ')}</span>
                </>
              )}
              {' '}with {planReport.breaksAdded} restorative breaks.
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Places high-priority focus work in peak hours ({settings.peakStart}–{settings.peakEnd}), batches calls &amp; admin, and adds breaks.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onPlanMyDay}
          className="min-h-[46px] px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 shrink-0 whitespace-nowrap transition-colors cursor-pointer shadow-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>Plan my day</span>
        </button>
      </div>

      {/* Overload Warning & Suggestions */}
      {liveOverloadMinutes > 0 && (
        <div
          role="alert"
          className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/80 rounded-2xl p-4 sm:p-5 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                  Your plan has {formatDuration(liveOverloadMinutes)} more work than your available working hours
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
                  Planned work ({formatDuration(totalPlannedWorkMinutes)}) exceeds your {formatDuration(availableWorkMinutes)} working capacity before {settings.workEnd}.
                </p>
              </div>
            </div>

            {suggestedTasksToDefer.length > 0 && (
              <button
                type="button"
                onClick={() => onMoveToTomorrow(suggestedTasksToDefer.map((t) => t.id))}
                className="min-h-[42px] px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
              >
                <span>Move {suggestedTasksToDefer.length} suggested to tomorrow</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {suggestedTasksToDefer.length > 0 && (
            <div className="pt-2 border-t border-amber-200/70 dark:border-amber-800/60 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-amber-900 dark:text-amber-300">
                Suggested to move to tomorrow:
              </span>
              {suggestedTasksToDefer.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onMoveToTomorrow([t.id])}
                  className="min-h-[34px] px-3 py-1 bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-slate-800 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="truncate max-w-[200px]">{t.title}</span>
                  <span className="font-mono text-amber-700 dark:text-amber-400">({t.duration}m)</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unscheduled Backlog Queue (if user added tasks without slotting yet) */}
      {unscheduledTasks.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Unscheduled tasks ({unscheduledTasks.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tap &ldquo;Plan my day&rdquo; above to arrange automatically, or slot individually.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {unscheduledTasks.map((task) => (
              <div
                key={task.id}
                className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {task.title}
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{task.duration}m</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{task.priority} priority</span>
                    <span aria-hidden="true">·</span>
                    <span>{task.energy === 'high' ? 'High focus' : 'Low focus'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{task.category.replace('-', ' ')}</span>
                    {task.deadline && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-amber-700 dark:text-amber-400">
                          Due {task.deadline}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTask(task.id, {
                        scheduledStart:
                          task.energy === 'high' ? peakStartMin : workStartMin,
                      })
                    }
                    className="min-h-[40px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Add to timeline</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveToTomorrow([task.id])}
                    className="min-h-[40px] px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Day Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Daily timeline
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag any block up or down to reschedule, or drag its bottom edge to resize duration.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-teal-500/25 border border-teal-500/50 inline-block" />
              <span>Peak energy ({settings.peakStart}–{settings.peakEnd})</span>
            </span>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative select-none overflow-x-hidden"
          style={{ height: `${totalTimelineHeight}px` }}
        >
          {/* Peak Energy Window Highlight Band */}
          {peakEndMin > timelineStartMin && peakStartMin < timelineEndHour * 60 && (
            <div
              className="absolute left-14 sm:left-18 right-0 bg-teal-500/[0.06] dark:bg-teal-400/[0.06] border-y border-teal-500/20 pointer-events-none flex items-start justify-end pr-3 pt-1.5"
              style={{
                top: `${Math.max(0, (peakStartMin - timelineStartMin) * PIXELS_PER_MINUTE)}px`,
                height: `${(peakEndMin - peakStartMin) * PIXELS_PER_MINUTE}px`,
              }}
            >
              <span className="text-[11px] font-mono text-teal-700 dark:text-teal-300/80">
                Peak focus window
              </span>
            </div>
          )}

          {/* End of Working Hours Line */}
          {workEndMin > timelineStartMin && workEndMin < timelineEndHour * 60 && (
            <div
              className="absolute left-14 sm:left-18 right-0 border-t border-dashed border-amber-500/50 pointer-events-none z-10 flex justify-end pr-3"
              style={{
                top: `${(workEndMin - timelineStartMin) * PIXELS_PER_MINUTE}px`,
              }}
            >
              <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 -mt-2.5 bg-white dark:bg-slate-900 px-1.5">
                Work ends {settings.workEnd}
              </span>
            </div>
          )}

          {/* Hour Grid Lines */}
          {hoursList.map((hour) => {
            const topPx = (hour * 60 - timelineStartMin) * PIXELS_PER_MINUTE;
            return (
              <div
                key={hour}
                className="absolute left-0 right-0 flex items-start pointer-events-none"
                style={{ top: `${topPx}px` }}
              >
                <div className="w-14 sm:w-18 pr-2.5 text-right text-[11px] font-mono text-slate-400 dark:text-slate-500 -mt-2">
                  {String(hour).padStart(2, '0')}:00
                </div>
                <div className="flex-1 border-t border-slate-100 dark:border-slate-800/80" />
              </div>
            );
          })}

          {/* Scheduled Task Time Blocks */}
          {scheduledTasks.map((task) => {
            const isDragging = dragState?.taskId === task.id;
            const displayStart = isDragging
              ? dragState.currentStart
              : task.scheduledStart || workStartMin;
            const displayDuration = isDragging
              ? dragState.currentDuration
              : task.duration;

            const topPx = (displayStart - timelineStartMin) * PIXELS_PER_MINUTE;
            const heightPx = Math.max(28, displayDuration * PIXELS_PER_MINUTE - 2);
            const styles = getPriorityStyles(task);
            const isCompact = displayDuration <= 20;

            return (
              <div
                key={task.id}
                onPointerMove={isDragging ? onPointerMove : undefined}
                onPointerUp={isDragging ? endDrag : undefined}
                style={{
                  top: `${topPx}px`,
                  height: `${heightPx}px`,
                }}
                className={`absolute left-15 sm:left-20 right-3 sm:right-5 rounded-xl ${styles.bg} ${styles.border} transition-shadow ${
                  isDragging
                    ? 'z-30 shadow-lg ring-2 ring-teal-500 opacity-95'
                    : 'z-20 hover:shadow-xs'
                } ${task.completed ? 'opacity-60' : ''} flex flex-col justify-between overflow-hidden`}
              >
                {/* Main Block Content + Drag Handle */}
                <div
                  onPointerDown={(e) => startDrag(e, task, 'move')}
                  className={`flex-1 px-2.5 sm:px-3.5 ${
                    isCompact ? 'py-0.5 flex items-center' : 'py-1.5 flex items-start'
                  } justify-between gap-2 cursor-grab active:cursor-grabbing touch-none`}
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {/* Complete Checkbox (not for system breaks) */}
                    {!task.isSystemBlock ? (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() =>
                          onUpdateTask(task.id, {
                            completed: !task.completed,
                            actualDuration: !task.completed
                              ? task.actualDuration || task.duration
                              : task.actualDuration,
                          })
                        }
                        aria-label={`Mark ${task.title} as ${
                          task.completed ? 'incomplete' : 'complete'
                        }`}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          task.completed
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-teal-600'
                        }`}
                      >
                        {task.completed && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs sm:text-sm font-medium truncate ${
                            task.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      {!isCompact && (
                        <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                            {minutesToTime(displayStart)}–
                            {minutesToTime(displayStart + displayDuration)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{displayDuration}m</span>
                          <span aria-hidden="true">·</span>
                          <span>{styles.label}</span>
                          {!task.isSystemBlock && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>
                                {task.energy === 'high' ? 'High focus' : 'Low focus'}
                              </span>
                            </>
                          )}
                          {task.deadline && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-amber-700 dark:text-amber-400">
                                Due {task.deadline}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions on Right */}
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 shrink-0"
                  >
                    {isCompact && (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mr-1">
                        {minutesToTime(displayStart)} ({displayDuration}m)
                      </span>
                    )}

                    {/* Quick Nudge -15m / +15m buttons for mobile accessibility */}
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTask(task.id, {
                          scheduledStart: Math.max(
                            timelineStartMin,
                            displayStart - 15
                          ),
                        })
                      }
                      title="Move earlier 15m"
                      aria-label="Move earlier 15 minutes"
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTask(task.id, {
                          scheduledStart: Math.min(
                            23 * 60,
                            displayStart + 15
                          ),
                        })
                      }
                      title="Move later 15m"
                      aria-label="Move later 15 minutes"
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {!task.isSystemBlock && !task.completed && (
                      <button
                        type="button"
                        onClick={() => onStartFocusTask(task.id)}
                        title="Focus on this task now"
                        aria-label={`Focus on ${task.title}`}
                        className="p-1.5 text-teal-700 dark:text-teal-400 hover:bg-teal-100/60 dark:hover:bg-teal-900/50 rounded-lg cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      title="Remove block"
                      aria-label={`Delete ${task.title}`}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 hidden sm:block" />
                  </div>
                </div>

                {/* Bottom Resize Handle */}
                <div
                  onPointerDown={(e) => startDrag(e, task, 'resize')}
                  title="Drag bottom edge to resize duration"
                  className="h-2.5 w-full cursor-ns-resize flex items-center justify-center hover:bg-slate-900/5 dark:hover:bg-white/5 touch-none shrink-0"
                >
                  <div className="w-8 h-0.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
