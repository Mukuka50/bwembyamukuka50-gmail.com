import React from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Trash2,
  RotateCcw,
  Check,
  Moon,
} from 'lucide-react';
import { Task } from '../types';
import { formatDuration } from '../utils/scheduler';

interface EveningReviewProps {
  tasks: Task[];
  onMoveToTomorrow: (ids: string[]) => void;
  onMoveToToday: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

export const EveningReview: React.FC<EveningReviewProps> = ({
  tasks,
  onMoveToTomorrow,
  onMoveToToday,
  onDeleteTask,
  onUpdateTask,
}) => {
  const todayTasks = tasks.filter((t) => t.dayOffset === 0 && !t.isSystemBlock);
  const finishedToday = todayTasks.filter((t) => t.completed);
  const unfinishedToday = todayTasks.filter((t) => !t.completed);
  const tomorrowTasks = tasks.filter((t) => t.dayOffset === 1 && !t.isSystemBlock);

  const totalCompletedMinutes = finishedToday.reduce(
    (sum, t) => sum + (t.actualDuration || t.duration),
    0
  );
  const totalUnfinishedMinutes = unfinishedToday.reduce(
    (sum, t) => sum + t.duration,
    0
  );

  return (
    <div className="space-y-6">
      {/* Evening Summary Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Moon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>End-of-day reflection</span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
            Evening review &amp; tomorrow handoff
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            You finished <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{finishedToday.length}</span> of{' '}
            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{todayTasks.length}</span> tasks today ({formatDuration(totalCompletedMinutes)} focused work).
          </p>
        </div>

        {unfinishedToday.length > 0 && (
          <button
            type="button"
            onClick={() => onMoveToTomorrow(unfinishedToday.map((t) => t.id))}
            className="min-h-[46px] px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
          >
            <span>Move all {unfinishedToday.length} unfinished to tomorrow</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UNFINISHED TODAY: Move to Tomorrow or Drop */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Unfinished today ({unfinishedToday.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unfinishedToday.length > 0
                  ? `${formatDuration(totalUnfinishedMinutes)} remaining — move to tomorrow or drop what no longer matters.`
                  : 'Every task planned for today has been resolved.'}
              </p>
            </div>
          </div>

          {unfinishedToday.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Nothing left unfinished today. Rest easy tonight.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {unfinishedToday.map((task) => (
                <div
                  key={task.id}
                  className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono">{task.duration}m</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{task.priority} priority</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {task.energy === 'high' ? 'High focus' : 'Low focus'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTask(task.id, {
                          completed: true,
                          actualDuration: task.duration,
                        })
                      }
                      className="min-h-[40px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onMoveToTomorrow([task.id])}
                      className="min-h-[40px] px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/70 text-teal-800 dark:text-teal-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <span>Tomorrow</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Drop</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FINISHED TODAY */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Finished today ({finishedToday.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Completed work logged across your day.
              </p>
            </div>
          </div>

          {finishedToday.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No tasks marked finished yet today.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {finishedToday.map((task) => (
                <div
                  key={task.id}
                  className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 line-through truncate">
                        {task.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono">
                          Est {task.duration}m · Actual {task.actualDuration || task.duration}m
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{task.priority} priority</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpdateTask(task.id, { completed: false })}
                    className="min-h-[38px] px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    Undo
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* TOMORROW QUEUE */}
      {tomorrowTasks.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Queued for tomorrow ({tomorrowTasks.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tasks moved to tomorrow’s plan.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tomorrowTasks.map((task) => (
              <div
                key={task.id}
                className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {task.title}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{task.duration}m</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{task.priority} priority</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onMoveToToday(task.id)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Move back to today</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="min-h-[38px] px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer"
                  >
                    Drop
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
