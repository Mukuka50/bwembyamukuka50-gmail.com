import React from 'react';
import { Lightbulb, Clock, CheckCircle2, Zap } from 'lucide-react';
import { Task, DailyHistoryPoint, UserSettings } from '../types';
import { formatDuration, timeToMinutes } from '../utils/scheduler';

interface WeeklyInsightsProps {
  tasks: Task[];
  history: DailyHistoryPoint[];
  settings: UserSettings;
}

export const WeeklyInsights: React.FC<WeeklyInsightsProps> = ({
  tasks,
  history,
  settings,
}) => {
  // Compute live Today stats and merge into Wednesday (or current weekday)
  const todayTasks = tasks.filter((t) => t.dayOffset === 0 && !t.isSystemBlock);
  const todayPlanned = todayTasks.reduce((s, t) => s + t.duration, 0);
  const todayCompletedTasks = todayTasks.filter((t) => t.completed);
  const todayActual = todayCompletedTasks.reduce(
    (s, t) => s + (t.actualDuration || t.duration),
    0
  );

  // Merge live today metrics into 'Wed' (today in sample context) so charts respond live to user actions
  const weekData: DailyHistoryPoint[] = history.map((d) =>
    d.day === 'Wed'
      ? {
          day: 'Wed (Today)',
          plannedMinutes: Math.max(120, todayPlanned),
          actualMinutes: Math.max(90, todayActual + 180),
          completedTasks: Math.max(2, todayCompletedTasks.length + 3),
        }
      : d
  );

  const totalPlannedWeek = weekData.reduce((s, d) => s + d.plannedMinutes, 0);
  const totalActualWeek = weekData.reduce((s, d) => s + d.actualMinutes, 0);
  const totalCompletedWeek = weekData.reduce((s, d) => s + d.completedTasks, 0);

  const maxMinutes = Math.max(
    480,
    ...weekData.map((d) => Math.max(d.plannedMinutes, d.actualMinutes))
  );
  const maxTasks = Math.max(8, ...weekData.map((d) => d.completedTasks));

  // Productive hours distribution (08:00 to 18:00)
  const peakStartHour = Math.floor(timeToMinutes(settings.peakStart) / 60);
  const peakEndHour = Math.ceil(timeToMinutes(settings.peakEnd) / 60);

  const hourlyProductivity = [
    { hour: '08:00', score: 58 },
    { hour: '09:00', score: 92 },
    { hour: '10:00', score: 96 },
    { hour: '11:00', score: 88 },
    { hour: '12:00', score: 45 },
    { hour: '13:00', score: 52 },
    { hour: '14:00', score: 74 },
    { hour: '15:00', score: 68 },
    { hour: '16:00', score: 55 },
    { hour: '17:00', score: 42 },
  ].map((slot) => {
    const h = parseInt(slot.hour.split(':')[0], 10);
    const inUserPeak = h >= peakStartHour && h < peakEndHour;
    return {
      ...slot,
      isPeak: inUserPeak,
    };
  });

  // Plain-language suggestion based on data
  const unfinishedHighFocus = todayTasks.filter(
    (t) => !t.completed && t.energy === 'high'
  ).length;
  const accuracyRatio = Math.round((totalActualWeek / Math.max(1, totalPlannedWeek)) * 100);

  const plainLanguageSuggestion =
    unfinishedHighFocus >= 2
      ? `You still have ${unfinishedHighFocus} high-focus tasks open today. Next week, cap high-focus deep work at 2 blocks per morning (${settings.peakStart}–${settings.peakEnd}) and batch all calls after lunch so deep work never gets crowded out.`
      : accuracyRatio < 92
      ? `You completed ${accuracyRatio}% of your planned hours this week, with afternoon plans running slightly over capacity. Next week, leave a 30-minute unscheduled buffer at 15:30 to absorb spillover tasks without pushing into your evening.`
      : `Your planned vs. actual time is tightly aligned (${accuracyRatio}% match), and your strongest completion window is 09:00–11:30. Next week, protect 09:00–11:00 strictly for your single highest-priority task before opening messages or calls.`;

  return (
    <div className="space-y-6">
      {/* Top Plain-Language Suggestion Card */}
      <section
        aria-label="Weekly improvement suggestion"
        className="bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/70 rounded-2xl p-5 sm:p-6 flex items-start gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold text-teal-800 dark:text-teal-300">
            Suggestion for next week
          </div>
          <p className="text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-relaxed">
            {plainLanguageSuggestion}
          </p>
        </div>
      </section>

      {/* Top Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Planned vs actual (7 days)</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatDuration(totalActualWeek)}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              / {formatDuration(totalPlannedWeek)} planned
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tasks completed</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {totalCompletedWeek}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              avg {(totalCompletedWeek / 7).toFixed(1)} per day
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Zap className="w-3.5 h-3.5" />
            <span>Most productive hours</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-semibold text-teal-700 dark:text-teal-400 tabular-nums">
              09:00–11:30
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              92% focus completion
            </span>
          </div>
        </div>
      </div>

      {/* Chart 1: Planned vs Actual Time */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Planned vs. actual time
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daily comparison of scheduled hours against logged focus time.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-slate-300 dark:bg-slate-700 inline-block" />
              <span>Planned</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-teal-600 dark:bg-teal-500 inline-block" />
              <span>Actual</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 pt-4 border-b border-slate-100 dark:border-slate-800 pb-2">
          {weekData.map((d) => {
            const plannedPct = Math.round((d.plannedMinutes / maxMinutes) * 100);
            const actualPct = Math.round((d.actualMinutes / maxMinutes) * 100);
            return (
              <div
                key={d.day}
                className="flex flex-col items-center h-full justify-end gap-2"
              >
                <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-32">
                  <div
                    style={{ height: `${Math.max(8, plannedPct)}%` }}
                    title={`Planned: ${formatDuration(d.plannedMinutes)}`}
                    className="w-3 sm:w-5 bg-slate-200 dark:bg-slate-700 rounded-t-md transition-all"
                  />
                  <div
                    style={{ height: `${Math.max(8, actualPct)}%` }}
                    title={`Actual: ${formatDuration(d.actualMinutes)}`}
                    className="w-3 sm:w-5 bg-teal-600 dark:bg-teal-500 rounded-t-md transition-all"
                  />
                </div>
                <div className="text-center">
                  <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                    {d.day.replace(' (Today)', '')}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {(d.actualMinutes / 60).toFixed(1)}h
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 2: Tasks Completed Per Day */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Tasks completed per day
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Number of finished tasks across the week.
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            {weekData.map((d) => {
              const widthPct = Math.round((d.completedTasks / maxTasks) * 100);
              return (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="w-16 text-xs font-medium text-slate-600 dark:text-slate-400 shrink-0">
                    {d.day.replace(' (Today)', ' *')}
                  </span>
                  <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      style={{ width: `${Math.max(8, widthPct)}%` }}
                      className="h-full bg-slate-800 dark:bg-slate-300 rounded-lg transition-all"
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-mono font-medium text-slate-900 dark:text-slate-200 tabular-nums">
                    {d.completedTasks}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Chart 3: Most Productive Hours */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Most productive hours
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Focus completion rate by hour of day (teal marks your configured peak window).
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {hourlyProductivity.map((slot) => (
              <div key={slot.hour} className="flex items-center gap-3">
                <span className="w-12 text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
                  {slot.hour}
                </span>
                <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
                  <div
                    style={{ width: `${slot.score}%` }}
                    className={`h-full rounded-md transition-all ${
                      slot.isPeak
                        ? 'bg-teal-600 dark:bg-teal-500'
                        : 'bg-slate-400 dark:bg-slate-600'
                    }`}
                  />
                </div>
                <span className="w-10 text-right text-xs font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                  {slot.score}%
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
