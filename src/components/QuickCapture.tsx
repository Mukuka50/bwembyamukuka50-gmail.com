import React, { useState } from 'react';
import { Plus, Clock, Zap, Flag, CalendarClock, Sparkles } from 'lucide-react';
import { Priority, EnergyLevel, TaskCategory, Task } from '../types';
import { inferCategoryFromTitle } from '../utils/scheduler';

interface QuickCaptureProps {
  onAddTask: (task: Omit<Task, 'id' | 'actualDuration' | 'completed'>) => void;
  onAddAndPlan?: (task: Omit<Task, 'id' | 'actualDuration' | 'completed'>) => void;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90];

export const QuickCapture: React.FC<QuickCaptureProps> = ({ onAddTask, onAddAndPlan }) => {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [priority, setPriority] = useState<Priority>('medium');
  const [energy, setEnergy] = useState<EnergyLevel>('high');
  const [category, setCategory] = useState<TaskCategory>('deep-work');
  const [manualCategory, setManualCategory] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!manualCategory && val.trim().length > 2) {
      setCategory(inferCategoryFromTitle(val, energy));
    }
  };

  const handleEnergyChange = (newEnergy: EnergyLevel) => {
    setEnergy(newEnergy);
    if (!manualCategory) {
      setCategory(inferCategoryFromTitle(title, newEnergy));
    }
  };

  const resetForm = () => {
    setTitle('');
    setDuration(30);
    setPriority('medium');
    setEnergy('high');
    setCategory('deep-work');
    setManualCategory(false);
    setDeadline('');
  };

  const handleSubmit = (e: React.FormEvent, shouldAutoPlan = false) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload: Omit<Task, 'id' | 'actualDuration' | 'completed'> = {
      title: title.trim(),
      duration,
      priority,
      energy,
      category,
      deadline: deadline || undefined,
      dayOffset: 0,
      scheduledStart: undefined,
    };

    if (shouldAutoPlan && onAddAndPlan) {
      onAddAndPlan(payload);
    } else {
      onAddTask(payload);
    }
    resetForm();
  };

  return (
    <section
      aria-label="Quick capture task"
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 transition-colors"
    >
      <form onSubmit={(e) => handleSubmit(e, false)}>
        <div className="flex items-center gap-2.5">
          <input
            type="text"
            value={title}
            onFocus={() => setIsExpanded(true)}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Add a task (e.g., Call Alex, Draft proposal, Pick up parcel)..."
            className="w-full min-h-[46px] px-3.5 py-2.5 text-sm sm:text-base bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-teal-600 dark:focus:ring-teal-500 transition-all"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="min-h-[46px] px-4 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white font-medium text-sm rounded-xl flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>

        {/* Options Panel - always visible when typing or toggled */}
        <div className={`mt-4 space-y-4 ${isExpanded || title.trim().length > 0 ? 'block' : 'hidden sm:block'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Duration */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Estimated duration</span>
              </label>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDuration(preset)}
                    className={`flex-1 min-h-[36px] text-xs font-mono font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      duration === preset
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {preset}m
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Priority (Colour-coded) */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                <Flag className="w-3.5 h-3.5" />
                <span>Priority</span>
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(['high', 'medium', 'low'] as Priority[]).map((p) => {
                  const active = priority === p;
                  const activeStyle =
                    p === 'high'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : p === 'medium'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs';
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`min-h-[36px] px-2 text-xs font-medium capitalize rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? activeStyle
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Energy Level Needed */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Energy needed</span>
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleEnergyChange('high')}
                  className={`min-h-[36px] px-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    energy === 'high'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  High focus
                </button>
                <button
                  type="button"
                  onClick={() => handleEnergyChange('low')}
                  className={`min-h-[36px] px-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    energy === 'low'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Low focus
                </button>
              </div>
            </div>

            {/* 4. Optional Deadline */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                <span>Optional deadline</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  aria-label="Optional deadline time"
                  className="w-full min-h-[38px] px-3 py-1 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-transparent focus:border-teal-600 focus:outline-none"
                />
                {deadline && (
                  <button
                    type="button"
                    onClick={() => setDeadline('')}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Grouping Category Selector & Add + Auto-place option */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">
                Task group:
              </span>
              {(
                [
                  { id: 'deep-work', label: 'Deep work' },
                  { id: 'calls', label: 'Calls' },
                  { id: 'admin', label: 'Admin' },
                  { id: 'errands', label: 'Errands' },
                ] as { id: TaskCategory; label: string }[]
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    setManualCategory(true);
                  }}
                  className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    category === cat.id
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {onAddAndPlan && title.trim().length > 0 && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Add &amp; slot into timeline</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
};
