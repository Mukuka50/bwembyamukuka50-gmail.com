import React from 'react';
import { X, RotateCcw, Sun, Briefcase, Zap, Coffee } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  onResetSampleData: () => void;
  onClose: () => void;
}

const BREAK_PRESETS = [5, 10, 15, 20];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onResetSampleData,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="DayShape settings"
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              DayShape settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure your daily hours, peak energy window, and break rhythm.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Wake & Sleep Times */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Wake &amp; sleep times</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Wake time
              </label>
              <input
                type="time"
                value={settings.wakeTime}
                onChange={(e) => onUpdateSettings({ wakeTime: e.target.value })}
                className="w-full min-h-[42px] px-3 py-1.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Sleep time
              </label>
              <input
                type="time"
                value={settings.sleepTime}
                onChange={(e) => onUpdateSettings({ sleepTime: e.target.value })}
                className="w-full min-h-[42px] px-3 py-1.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>
        </div>

        {/* 2. Working Hours */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Briefcase className="w-4 h-4 text-slate-500" />
            <span>Working hours (used for overload warnings)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Work starts
              </label>
              <input
                type="time"
                value={settings.workStart}
                onChange={(e) => onUpdateSettings({ workStart: e.target.value })}
                className="w-full min-h-[42px] px-3 py-1.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Work ends
              </label>
              <input
                type="time"
                value={settings.workEnd}
                onChange={(e) => onUpdateSettings({ workEnd: e.target.value })}
                className="w-full min-h-[42px] px-3 py-1.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>
        </div>

        {/* 3. Peak-Energy Hours */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400">
            <Zap className="w-4 h-4" />
            <span>Peak-energy hours (for high-focus &amp; high-priority tasks)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Peak start
              </label>
              <input
                type="time"
                value={settings.peakStart}
                onChange={(e) => onUpdateSettings({ peakStart: e.target.value })}
                className="w-full min-h-[42px] px-3 py-1.5 text-sm font-mono bg-teal-50/50 dark:bg-teal-950/40 text-slate-900 dark:text-slate-100 rounded-xl border border-teal-200 dark:border-teal-800"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Peak end
              </label>
              <input
                type="time"
                value={settings.peakEnd}
                onChange={(e) => onUpdateSettings({ peakEnd: e.target.value })}
                className="w-full min-h-[42px] px-3 py-1.5 text-sm font-mono bg-teal-50/50 dark:bg-teal-950/40 text-slate-900 dark:text-slate-100 rounded-xl border border-teal-200 dark:border-teal-800"
              />
            </div>
          </div>
        </div>

        {/* 4. Preferred Break Length & Lunch */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Coffee className="w-4 h-4 text-slate-500" />
            <span>Preferred break length &amp; lunch</span>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              Short break between tasks
            </label>
            <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {BREAK_PRESETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => onUpdateSettings({ breakLength: b })}
                  className={`min-h-[38px] text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer ${
                    settings.breakLength === b
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {b}m
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Lunch time
              </label>
              <input
                type="time"
                value={settings.lunchTime}
                onChange={(e) => onUpdateSettings({ lunchTime: e.target.value })}
                className="w-full min-h-[42px] px-3 py-1.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Lunch duration (min)
              </label>
              <input
                type="number"
                min={15}
                max={90}
                step={15}
                value={settings.lunchDuration}
                onChange={(e) =>
                  onUpdateSettings({
                    lunchDuration: Math.max(15, Number(e.target.value) || 45),
                  })
                }
                className="w-full min-h-[42px] px-3 py-1.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onResetSampleData}
            className="min-h-[42px] px-3.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset sample data</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
