import { Task, Routine, UserSettings, SmartPlanReport, TaskCategory } from '../types';

export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 9 * 60;
  const [h, m] = timeStr.split(':').map(Number);
  return (isNaN(h) ? 9 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  const mins = Math.round(minutes);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function inferCategoryFromTitle(title: string, energy: 'high' | 'low'): TaskCategory {
  const lower = title.toLowerCase();
  if (
    lower.includes('call') ||
    lower.includes('phone') ||
    lower.includes('sync') ||
    lower.includes('meet') ||
    lower.includes('1:1') ||
    lower.includes('zoom') ||
    lower.includes('interview')
  ) {
    return 'calls';
  }
  if (
    lower.includes('errand') ||
    lower.includes('pick up') ||
    lower.includes('buy') ||
    lower.includes('grocer') ||
    lower.includes('post') ||
    lower.includes('drop off') ||
    lower.includes('bank') ||
    lower.includes('pharmacy') ||
    lower.includes('parcel')
  ) {
    return 'errands';
  }
  if (
    lower.includes('inbox') ||
    lower.includes('email') ||
    lower.includes('invoice') ||
    lower.includes('expense') ||
    lower.includes('admin') ||
    lower.includes('changelog') ||
    lower.includes('notes') ||
    lower.includes('reply') ||
    lower.includes('file')
  ) {
    return 'admin';
  }
  return energy === 'high' ? 'deep-work' : 'admin';
}

interface Interval {
  start: number;
  end: number;
}

function isOverlapping(start: number, end: number, busy: Interval[]): Interval | null {
  for (const b of busy) {
    if (start < b.end && end > b.start) {
      return b;
    }
  }
  return null;
}

function findNextAvailableSlot(
  desiredStart: number,
  duration: number,
  busy: Interval[],
  minStart: number
): number {
  let candidate = Math.max(desiredStart, minStart);
  // Align to 5-minute increments for clean times
  candidate = Math.ceil(candidate / 5) * 5;

  let safety = 0;
  while (safety < 200) {
    safety++;
    const conflict = isOverlapping(candidate, candidate + duration, busy);
    if (!conflict) {
      return candidate;
    }
    candidate = Math.ceil(conflict.end / 5) * 5;
  }
  return candidate;
}

export function generateSmartDayPlan(
  allTasks: Task[],
  routines: Routine[],
  settings: UserSettings
): { tasks: Task[]; report: SmartPlanReport } {
  const workStartMin = timeToMinutes(settings.workStart);
  const workEndMin = timeToMinutes(settings.workEnd);
  const peakStartMin = timeToMinutes(settings.peakStart);
  const peakEndMin = timeToMinutes(settings.peakEnd);
  const lunchStartMin = timeToMinutes(settings.lunchTime);
  const lunchDur = Math.max(15, settings.lunchDuration || 45);
  const breakLen = Math.max(5, settings.breakLength || 10);

  // 1. Keep tomorrow's tasks and already-completed today tasks intact
  const otherDayTasks = allTasks.filter((t) => t.dayOffset !== 0);
  const completedTodayTasks = allTasks.filter(
    (t) => t.dayOffset === 0 && t.completed && !t.isSystemBlock
  );

  // 2. Sync enabled routines into today's blocks (avoid duplicating completed routines)
  const routineBlocks: Task[] = [];
  const busyIntervals: Interval[] = [];

  // Mark completed today tasks with a scheduledStart as busy
  for (const ct of completedTodayTasks) {
    if (typeof ct.scheduledStart === 'number') {
      busyIntervals.push({
        start: ct.scheduledStart,
        end: ct.scheduledStart + ct.duration,
      });
    }
  }

  for (const r of routines) {
    if (!r.enabled) continue;
    const alreadyDone = completedTodayTasks.some(
      (ct) => ct.routineId === r.id || (ct.isRoutine && ct.title === r.title)
    );
    if (alreadyDone) continue;

    const rStart = timeToMinutes(r.startTime);
    const existingIncomplete = allTasks.find(
      (t) => t.dayOffset === 0 && !t.completed && (t.routineId === r.id || (t.isRoutine && t.title === r.title))
    );

    const routineTask: Task = existingIncomplete
      ? { ...existingIncomplete, scheduledStart: rStart, duration: r.duration, title: r.title }
      : {
          id: `task-routine-${r.id}`,
          title: r.title,
          duration: r.duration,
          actualDuration: 0,
          priority: 'medium',
          energy: r.energy,
          category: r.category || 'routine',
          dayOffset: 0,
          scheduledStart: rStart,
          completed: false,
          isRoutine: true,
          routineId: r.id,
        };

    routineBlocks.push(routineTask);
    busyIntervals.push({ start: rStart, end: rStart + r.duration });
  }

  // 3. Add Lunch Break
  const lunchSlotStart = findNextAvailableSlot(lunchStartMin, lunchDur, busyIntervals, workStartMin);
  const lunchTask: Task = {
    id: 'sys-lunch-break',
    title: 'Lunch break & recharge',
    duration: lunchDur,
    actualDuration: 0,
    priority: 'medium',
    energy: 'low',
    category: 'lunch',
    dayOffset: 0,
    scheduledStart: lunchSlotStart,
    completed: false,
    isSystemBlock: true,
  };
  busyIntervals.push({ start: lunchSlotStart, end: lunchSlotStart + lunchDur });

  // 4. Gather incomplete user tasks for today (excluding routines and system blocks)
  const candidateTasks = allTasks.filter(
    (t) => t.dayOffset === 0 && !t.completed && !t.isRoutine && !t.isSystemBlock
  );

  // Separate into Peak Focus candidates (High Focus or High Priority Deep Work) vs Batchable Tasks
  const priorityScore = (p: Task['priority']) => (p === 'high' ? 3 : p === 'medium' ? 2 : 1);

  const peakTasks: Task[] = [];
  const batchTasks: Task[] = [];

  for (const t of candidateTasks) {
    if (t.energy === 'high' || (t.priority === 'high' && t.category === 'deep-work')) {
      peakTasks.push(t);
    } else {
      batchTasks.push(t);
    }
  }

  // Sort peak tasks: High priority first, then earliest deadline, then longest duration
  peakTasks.sort((a, b) => {
    const pDiff = priorityScore(b.priority) - priorityScore(a.priority);
    if (pDiff !== 0) return pDiff;
    if (a.deadline && b.deadline) return timeToMinutes(a.deadline) - timeToMinutes(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return b.duration - a.duration;
  });

  // Group batch tasks by category ('calls', 'admin', 'errands', 'deep-work') so similar tasks stay contiguous
  const categoryOrder: TaskCategory[] = ['calls', 'admin', 'errands', 'deep-work'];
  const groupedBatches: string[] = [];
  const orderedBatchTasks: Task[] = [];

  for (const cat of categoryOrder) {
    const inCat = batchTasks.filter((t) => t.category === cat);
    if (inCat.length > 0) {
      inCat.sort((a, b) => {
        const pDiff = priorityScore(b.priority) - priorityScore(a.priority);
        if (pDiff !== 0) return pDiff;
        if (a.deadline && b.deadline) return timeToMinutes(a.deadline) - timeToMinutes(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return 0;
      });
      orderedBatchTasks.push(...inCat);
      if (inCat.length >= 2) {
        const label =
          cat === 'calls'
            ? `${inCat.length} calls`
            : cat === 'admin'
            ? `${inCat.length} admin tasks`
            : cat === 'errands'
            ? `${inCat.length} errands`
            : `${inCat.length} focus tasks`;
        groupedBatches.push(label);
      }
    }
  }

  const scheduledUserTasks: Task[] = [];
  const generatedBreaks: Task[] = [];
  let peakMatchedCount = 0;
  let breakCounter = 0;

  // 5. Schedule Peak Tasks into Peak Energy Window first
  let peakCursor = Math.max(peakStartMin, workStartMin);
  for (let i = 0; i < peakTasks.length; i++) {
    const task = peakTasks[i];
    const start = findNextAvailableSlot(peakCursor, task.duration, busyIntervals, workStartMin);
    const end = start + task.duration;

    if (start >= peakStartMin && start < peakEndMin) {
      peakMatchedCount++;
    }

    scheduledUserTasks.push({
      ...task,
      scheduledStart: start,
    });
    busyIntervals.push({ start, end });
    peakCursor = end;

    // Insert a short restorative break after a peak task if another task follows and not right before lunch
    const hasMoreTasks = i < peakTasks.length - 1 || orderedBatchTasks.length > 0;
    const closeToLunch = Math.abs(end - lunchSlotStart) <= 20;
    if (hasMoreTasks && !closeToLunch) {
      const breakStart = findNextAvailableSlot(end, breakLen, busyIntervals, workStartMin);
      if (breakStart === end) {
        breakCounter++;
        generatedBreaks.push({
          id: `sys-break-${breakCounter}`,
          title: 'Short restorative break',
          duration: breakLen,
          actualDuration: 0,
          priority: 'low',
          energy: 'low',
          category: 'break',
          dayOffset: 0,
          scheduledStart: breakStart,
          completed: false,
          isSystemBlock: true,
        });
        busyIntervals.push({ start: breakStart, end: breakStart + breakLen });
        peakCursor = breakStart + breakLen;
      }
    }
  }

  // 6. Schedule Grouped Batch Tasks into remaining Working Hours
  let workCursor = workStartMin;
  let continuousBatchMinutes = 0;

  for (let i = 0; i < orderedBatchTasks.length; i++) {
    const task = orderedBatchTasks[i];
    const prevTask = i > 0 ? orderedBatchTasks[i - 1] : null;
    const categoryChanged = prevTask && prevTask.category !== task.category;

    // Add a short break when switching between task groups or after >= 60m of continuous batch work
    if ((categoryChanged || continuousBatchMinutes >= 60) && workCursor > workStartMin) {
      const closeToLunch = Math.abs(workCursor - lunchSlotStart) <= 20;
      if (!closeToLunch) {
        const breakStart = findNextAvailableSlot(workCursor, breakLen, busyIntervals, workStartMin);
        if (breakStart - workCursor <= 15) {
          breakCounter++;
          generatedBreaks.push({
            id: `sys-break-${breakCounter}`,
            title: 'Short restorative break',
            duration: breakLen,
            actualDuration: 0,
            priority: 'low',
            energy: 'low',
            category: 'break',
            dayOffset: 0,
            scheduledStart: breakStart,
            completed: false,
            isSystemBlock: true,
          });
          busyIntervals.push({ start: breakStart, end: breakStart + breakLen });
          workCursor = breakStart + breakLen;
          continuousBatchMinutes = 0;
        }
      }
    }

    const start = findNextAvailableSlot(workCursor, task.duration, busyIntervals, workStartMin);
    const end = start + task.duration;

    scheduledUserTasks.push({
      ...task,
      scheduledStart: start,
    });
    busyIntervals.push({ start, end });
    workCursor = end;
    continuousBatchMinutes += task.duration;
  }

  // 7. Overload Calculation & Tomorrow Suggestions
  const availableWorkMinutes = Math.max(60, workEndMin - workStartMin - lunchDur);
  const completedWorkMinutes = completedTodayTasks
    .filter((t) => !t.isRoutine)
    .reduce((acc, t) => acc + t.duration, 0);
  const incompleteWorkMinutes = scheduledUserTasks.reduce((acc, t) => acc + t.duration, 0);
  const breaksMinutes = generatedBreaks.reduce((acc, t) => acc + t.duration, 0);
  const totalPlannedWorkMinutes = completedWorkMinutes + incompleteWorkMinutes + breaksMinutes;

  // Check if tasks spill past workEndMin or exceed availableWorkMinutes
  const tasksPastWorkEnd = scheduledUserTasks.filter(
    (t) => (t.scheduledStart || 0) + t.duration > workEndMin
  );

  const rawOverload = Math.max(
    totalPlannedWorkMinutes - availableWorkMinutes,
    tasksPastWorkEnd.length > 0
      ? Math.max(...tasksPastWorkEnd.map((t) => (t.scheduledStart || 0) + t.duration)) - workEndMin
      : 0
  );

  const isOverloaded = rawOverload > 0;
  const suggestedMoveToTomorrowIds: string[] = [];

  if (isOverloaded) {
    // Rank candidates to move to tomorrow: low priority first, no today deadline, scheduled latest
    const deferralCandidates = [...scheduledUserTasks].sort((a, b) => {
      const pDiff = priorityScore(a.priority) - priorityScore(b.priority);
      if (pDiff !== 0) return pDiff;
      if (a.deadline && !b.deadline) return 1;
      if (!a.deadline && b.deadline) return -1;
      return (b.scheduledStart || 0) - (a.scheduledStart || 0);
    });

    let minutesToRecover = rawOverload;
    for (const candidate of deferralCandidates) {
      if (minutesToRecover <= 0) break;
      suggestedMoveToTomorrowIds.push(candidate.id);
      minutesToRecover -= candidate.duration;
    }
  }

  const finalTasks: Task[] = [
    ...completedTodayTasks,
    ...routineBlocks,
    lunchTask,
    ...scheduledUserTasks,
    ...generatedBreaks,
    ...otherDayTasks,
  ];

  const report: SmartPlanReport = {
    timestamp: Date.now(),
    scheduledCount: scheduledUserTasks.length,
    peakMatchedCount,
    groupedBatches,
    breaksAdded: generatedBreaks.length + 1, // +1 for lunch
    isOverloaded,
    overloadMinutes: Math.max(0, rawOverload),
    availableWorkMinutes,
    totalPlannedWorkMinutes,
    suggestedMoveToTomorrowIds,
  };

  return { tasks: finalTasks, report };
}
