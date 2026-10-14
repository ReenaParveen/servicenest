import { minutesFromTime, timeFromMinutes, weekdayFromDateString } from './dates.js';

export function generateSlots({ weeklyRules, date, blockedDates = [], busyStarts = [], isToday = false, nowMinutes = 0 }) {
  if (!date || blockedDates.includes(date)) return [];
  const day = weekdayFromDateString(date);
  const busy = new Set(busyStarts);
  const slots = [];

  for (const rule of weeklyRules) {
    if (rule.dayOfWeek !== day || rule.isActive === false) continue;
    const start = minutesFromTime(rule.startTime);
    const end = minutesFromTime(rule.endTime);
    const step = Number(rule.slotMinutes || 60);
    if (start === null || end === null || end <= start || step < 30 || step > 240) continue;
    for (let cursor = start; cursor + step <= end; cursor += step) {
      if (isToday && cursor <= nowMinutes) continue;
      const startTime = timeFromMinutes(cursor);
      slots.push({
        startTime,
        endTime: timeFromMinutes(cursor + step),
        available: !busy.has(startTime),
      });
    }
  }

  return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
}
