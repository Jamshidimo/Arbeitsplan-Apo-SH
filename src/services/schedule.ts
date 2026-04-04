import { format, startOfWeek, addDays, startOfMonth, endOfMonth, isBefore, isAfter, getDay } from 'date-fns';
import type { Employee, Shift, DayConfig, VacationEntry } from '../types';
import { isHoliday } from './holidays';

let idCounter = 0;
function genId(): string {
  return `shift_${Date.now()}_${idCounter++}`;
}

/**
 * Get the planning range for a month:
 * - Starts on the Monday of the week containing the 1st of the month
 *   (if Mon is still in this month, include it; otherwise start from next Monday)
 * - Ends on the Sunday of the last week that has a Monday in this month
 */
export function getMonthPlanRange(year: number, month: number): { start: Date; end: Date } {
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(new Date(year, month));

  // Find the Monday on or before the 1st
  let planStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  // If that Monday is in the previous month and the 1st is not a Monday,
  // check if the Monday is still "close enough"
  // Rule: if Monday is still in this month, include it in the old month's plan
  // So our plan starts from the first Monday that's >= 1st of month,
  // OR the Monday of the week if the 1st falls on Mon
  if (isBefore(planStart, monthStart) && getDay(monthStart) !== 1) {
    // The Monday before the 1st belongs to last month's plan
    // Our plan starts from the Monday of the 1st's week only if 1st is Monday
    // Otherwise start from next Monday
    planStart = addDays(planStart, 7);
  }
  // But if the 1st IS a Monday, planStart is already correct (== monthStart)
  if (getDay(monthStart) === 1) {
    planStart = monthStart;
  }

  // Find the last Monday that's still in this month
  let planEnd = startOfWeek(monthEnd, { weekStartsOn: 1 });
  if (isAfter(planEnd, monthEnd)) {
    planEnd = addDays(planEnd, -7);
  }
  // Plan ends on Sunday of that week
  planEnd = addDays(planEnd, 6);

  return { start: planStart, end: planEnd };
}

export function generateMonthShifts(
  year: number,
  month: number,
  employees: Employee[],
  dayConfigs: DayConfig[],
  vacations: VacationEntry[],
  existingShifts: Shift[],
): Shift[] {
  const { start, end } = getMonthPlanRange(year, month);
  const shifts: Shift[] = [];

  let current = start;
  while (current <= end) {
    const dateStr = format(current, 'yyyy-MM-dd');
    const dayOfWeek = current.getDay();

    // Skip if there are already shifts for this day
    const hasExisting = existingShifts.some(s => s.date === dateStr);
    if (hasExisting) {
      current = addDays(current, 1);
      continue;
    }

    const holiday = isHoliday(dateStr);

    for (const emp of employees) {
      // Check vacation
      const onVacation = vacations.some(v =>
        v.employeeId === emp.id && dateStr >= v.startDate && dateStr <= v.endDate
      );

      if (onVacation) {
        shifts.push({
          id: genId(),
          employeeId: emp.id,
          date: dateStr,
          start: '08:00',
          end: '17:00',
          type: 'VACATION',
          isOpener: false,
          lunchBreak: false,
          lunchDuration: 0,
          template: 'CUSTOM',
        });
        current = addDays(current, 1);
        continue;
      }

      if (holiday) {
        shifts.push({
          id: genId(),
          employeeId: emp.id,
          date: dateStr,
          start: '00:00',
          end: '00:00',
          type: 'HOLIDAY',
          isOpener: false,
          lunchBreak: false,
          lunchDuration: 0,
          template: 'CUSTOM',
        });
        continue;
      }

      // Check fixed days off
      if (emp.fixedDaysOff.includes(dayOfWeek)) continue;

      // Find standard shift for this day
      const stdShift = emp.standardShifts.find(s => s.dayOfWeek === dayOfWeek);
      if (!stdShift) continue;

      // Check day config
      const dayConfig = dayConfigs.find(dc => dc.dayOfWeek === dayOfWeek);
      if (!dayConfig || !dayConfig.isOpen) continue;

      shifts.push({
        id: genId(),
        employeeId: emp.id,
        date: dateStr,
        start: stdShift.start,
        end: stdShift.end,
        type: 'WORK',
        isOpener: stdShift.isOpener,
        lunchBreak: stdShift.lunchBreak,
        lunchDuration: stdShift.lunchDuration,
        template: stdShift.template || 'CUSTOM',
      });
    }

    current = addDays(current, 1);
  }

  return shifts;
}

export function calcShiftHours(shift: Shift): number {
  if (shift.type === 'HOLIDAY') return 0;
  const [sh, sm] = shift.start.split(':').map(Number);
  const [eh, em] = shift.end.split(':').map(Number);
  let hours = (eh + em / 60) - (sh + sm / 60);
  if (shift.lunchBreak && hours > 0) {
    hours -= shift.lunchDuration / 60;
  }
  return Math.max(0, hours);
}
