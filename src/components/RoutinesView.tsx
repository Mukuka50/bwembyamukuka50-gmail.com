import React, { useState } from 'react';
import { Plus, Repeat, Trash2, Clock, Check } from 'lucide-react';
import { Routine, EnergyLevel } from '../types';

interface RoutinesViewProps {
  routines: Routine[];
  onAddRoutine: (routine: Omit<Routine, 'id'>) => void;
  onToggleRoutine: (id: string) => void;
  onDeleteRoutine: (id: string) => void;
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DURATION_OPTIONS = [15, 30, 45, 60, 90];

export const RoutinesView: React.FC<RoutinesViewProps> = ({
  routines,
  onAddRoutine,
  onToggleRoutine,
  onDeleteRoutine,
}) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [duration, setDuration] = useState(45);
  const [energy, setEnergy] = useState<EnergyLevel>('low');
  const [days, setDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  const toggleDay = (day: string) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddRoutine({
      title: title.trim(),
      startTime,
      duration,
      energy,
      category: energy === 'high' ? 'deep-work' : 'routine',
      enabled: true,
      days: days.length > 0 ? days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    });
    setTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Add New Repeating Routine Form */}
      <section
        aria-label="Create repeating routine"
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4"
      >
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
            Save a repeating routine block
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Enabled routines are reserved automatically on your daily timeline when you plan your day.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Routine title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Morning walk, Language study, Evening gym..."
                className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Preferred start time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Duration */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Duration
              </label>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`flex-1 min-h-[36px] text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer ${
                      duration === d
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>

            {/* Energy */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Focus level
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEnergy('low')}
                  className={`min-h-[36px] text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    energy === 'low'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Low focus / Habit
                </button>
                <button
                  type="button"
                  onClick={() => setEnergy('high')}
                  className={`min-h-[36px] text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    energy === 'high'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  High focus / Study
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">
                Repeat days:
              </span>
              {ALL_DAYS.map((day) => {
                const selected = days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      selected
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={!title.trim()}
              className="min-h-[44px] px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save routine</span>
            </button>
          </div>
        </form>
      </section>

      {/* Saved Routines List */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Saved routines ({routines.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Toggle a routine on to include it automatically in your daily timeline.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {routines.map((routine) => (
            <div
              key={routine.id}
              className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Repeat className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100">
                    {routine.title}
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                      {routine.startTime}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{routine.duration}m</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {routine.energy === 'high' ? 'High focus' : 'Low focus'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{routine.days.join(', ')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleRoutine(routine.id)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                    routine.enabled
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {routine.enabled && <Check className="w-3.5 h-3.5" />}
                  <span>{routine.enabled ? 'Active in day plan' : 'Paused'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteRoutine(routine.id)}
                  aria-label={`Delete ${routine.title}`}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
