export type Priority = 'high' | 'medium' | 'low';
export type EnergyLevel = 'high' | 'low';
export type TaskCategory = 'deep-work' | 'calls' | 'errands' | 'admin' | 'routine' | 'break' | 'lunch';

export interface Task {
  id: string;
  title: string;
  duration: number; // Estimated duration in minutes
  actualDuration: number; // Logged duration in minutes
  priority: Priority;
  energy: EnergyLevel;
  category: TaskCategory;
  deadline?: string; // Optional HH:MM deadline
  dayOffset: number; // 0 = Today, 1 = Tomorrow
  scheduledStart?: number; // Minutes from midnight (e.g., 540 = 09:00)
  completed: boolean;
  isRoutine?: boolean;
  routineId?: string;
  isSystemBlock?: boolean; // True for auto-generated breaks & lunch
}

export interface Routine {
  id: string;
  title: string;
  duration: number; // Minutes
  startTime: string; // HH:MM
  energy: EnergyLevel;
  category: TaskCategory;
  enabled: boolean;
  days: string[]; // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
}

export interface UserSettings {
  wakeTime: string; // HH:MM e.g. "07:00"
  sleepTime: string; // HH:MM e.g. "22:30"
  workStart: string; // HH:MM e.g. "08:30"
  workEnd: string; // HH:MM e.g. "17:30"
  peakStart: string; // HH:MM e.g. "09:00"
  peakEnd: string; // HH:MM e.g. "12:00"
  lunchTime: string; // HH:MM e.g. "12:30"
  lunchDuration: number; // Minutes e.g. 45
  breakLength: number; // Minutes e.g. 10
  darkMode: boolean;
}

export interface SmartPlanReport {
  timestamp: number;
  scheduledCount: number;
  peakMatchedCount: number;
  groupedBatches: string[];
  breaksAdded: number;
  isOverloaded: boolean;
  overloadMinutes: number;
  availableWorkMinutes: number;
  totalPlannedWorkMinutes: number;
  suggestedMoveToTomorrowIds: string[];
}

export interface DailyHistoryPoint {
  day: string; // 'Mon' | 'Tue' | ...
  plannedMinutes: number;
  actualMinutes: number;
  completedTasks: number;
}
