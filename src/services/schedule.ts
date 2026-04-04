import { format, startOfWeek, addDays } from 'date-fns';
import type { Employee, Shift, DayConfig, VacationEntry } from '../types';
import { isHoliday } from './holidays';

let idCounter = 0;
function genId(): string {
  return `shift_${Date.now()}_${idCounter++}`;
}

export function generateWeekShifts(
  weekStart: Date,
  employees: Employee[],
  dayConfigs: DayConfig[],
  vacations: VacationEntry[],
  existingShifts: Shift[],
): Shift[] {
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
  const shifts: Shift[] = [];

  // For each day of the week (Mon-Sat = indices 0-5)
  for (let d = 0; d < 7; d++) {
    const currentDate = addDays(monday, d);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const dayOfWeek = currentDate.getDay(); // 0=Sun, 1=Mon, ...

    // Check if there are already manually created shifts for this day
    const hasExisting = existingShifts.some(s => s.date === dateStr);
    if (hasExisting) continue;

    // Check if it's a holiday
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
        });
        continue;
      }

      if (holiday) {
        // Create holiday entry for all employees
        shifts.push({
          id: genId(),
          employeeId: emp.id,
          date: dateStr,
          start: '00:00',
          end: '00:00',
          type: 'HOLIDAY',
          isOpener: false,
        });
        continue;
      }

      // Check fixed days off
      if (emp.fixedDaysOff.includes(dayOfWeek)) continue;

      // Find standard shift for this day
      const stdShift = emp.standardShifts.find(s => s.dayOfWeek === dayOfWeek);
      if (!stdShift) continue;

      // Check day config - is the shop open?
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
      });
    }
  }

  return shifts;
}

export function calcShiftHours(shift: Shift): number {
  if (shift.type === 'HOLIDAY') return 0;
  const [sh, sm] = shift.start.split(':').map(Number);
  const [eh, em] = shift.end.split(':').map(Number);
  return (eh + em / 60) - (sh + sm / 60);
}
