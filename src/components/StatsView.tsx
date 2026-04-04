import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Employee, Shift, TimeEntry } from '../types';
import { HOURS_PER_WEEK_FULL } from '../constants';
import { calcShiftHours } from '../services/schedule';
import { isHoliday } from '../services/holidays';

interface Props {
  employees: Employee[];
  shifts: Shift[];
  timeEntries: TimeEntry[];
}

// Full-time daily hours: 42h / 5 days = 8.4h
const DAILY_HOURS_FULL = HOURS_PER_WEEK_FULL / 5;

/**
 * Count public holidays that fall on weekdays (Mon-Fri) in a given month.
 */
function countWeekdayHolidays(monthStart: Date, monthEnd: Date): number {
  let count = 0;
  let current = monthStart;
  while (current <= monthEnd) {
    const day = current.getDay();
    if (day >= 1 && day <= 5 && isHoliday(format(current, 'yyyy-MM-dd'))) {
      count++;
    }
    current = addDays(current, 1);
  }
  return count;
}

export default function StatsView({ employees, shifts, timeEntries }: Props) {
  const [month, setMonth] = useState(new Date());

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  const stats = useMemo(() => {
    return employees.filter(e => e.role !== 'Hauslieferdienst').map(emp => {
      // Plan hours (from shifts)
      const monthShifts = shifts.filter(s =>
        s.employeeId === emp.id && s.date >= format(monthStart, 'yyyy-MM-dd') && s.date <= format(monthEnd, 'yyyy-MM-dd')
      );

      const planHours = monthShifts
        .filter(s => s.type === 'WORK')
        .reduce((sum, s) => sum + calcShiftHours(s), 0);

      const vacationDays = monthShifts.filter(s => s.type === 'VACATION').length;
      const sickDays = monthShifts.filter(s => s.type === 'SICK').length;

      // Actual hours (from time entries)
      const monthEntries = timeEntries.filter(e => {
        const d = e.clockIn.substring(0, 10);
        return e.employeeId === emp.id && d >= format(monthStart, 'yyyy-MM-dd') && d <= format(monthEnd, 'yyyy-MM-dd');
      });

      const actualHours = monthEntries.reduce((sum, e) => {
        if (!e.clockOut) return sum;
        const ms = new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime();
        return sum + ms / (1000 * 60 * 60);
      }, 0);

      // Target hours for this month
      const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
      const weeklyTarget = (emp.pensum / 100) * HOURS_PER_WEEK_FULL;
      const monthlyTarget = weeklyTarget * weeks.length;

      // Holiday hours: each weekday holiday credits (8.4h * pensum/100)
      const weekdayHolidays = countWeekdayHolidays(monthStart, monthEnd);
      const holidayHours = weekdayHolidays * DAILY_HOURS_FULL * (emp.pensum / 100);

      // Vacation compensated hours
      const dailyTarget = weeklyTarget / 5;
      const vacationHours = vacationDays * dailyTarget;

      const compensatedHours = vacationHours + holidayHours;
      const balance = planHours + compensatedHours - monthlyTarget;

      return {
        employee: emp,
        planHours,
        actualHours,
        monthlyTarget,
        vacationDays,
        sickDays,
        weekdayHolidays,
        holidayHours,
        compensatedHours,
        balance,
      };
    });
  }, [employees, shifts, timeEntries, monthStart, monthEnd]);

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center gap-3">
        <button onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}
          className="p-2 hover:bg-slate-100 rounded-lg transition"><ChevronLeft size={20} /></button>
        <h2 className="text-lg font-semibold text-slate-800">
          {format(month, 'MMMM yyyy', { locale: de })}
        </h2>
        <button onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}
          className="p-2 hover:bg-slate-100 rounded-lg transition"><ChevronRight size={20} /></button>
      </div>

      {/* Stats Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-4 py-3 text-left font-medium">Mitarbeiter</th>
              <th className="px-4 py-3 text-right font-medium">Soll (Monat)</th>
              <th className="px-4 py-3 text-right font-medium">Plan-Stunden</th>
              <th className="px-4 py-3 text-right font-medium">Ist-Stunden</th>
              <th className="px-4 py-3 text-right font-medium">Urlaub</th>
              <th className="px-4 py-3 text-right font-medium">Krank</th>
              <th className="px-4 py-3 text-right font-medium">Feiertage</th>
              <th className="px-4 py-3 text-right font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.employee.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">{s.employee.name}</span>
                    <span className="text-xs text-slate-400">{s.employee.pensum}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{s.monthlyTarget.toFixed(1)}h</td>
                <td className="px-4 py-3 text-right text-slate-600">{s.planHours.toFixed(1)}h</td>
                <td className="px-4 py-3 text-right text-slate-600">{s.actualHours.toFixed(1)}h</td>
                <td className="px-4 py-3 text-right text-amber-600">{s.vacationDays}d</td>
                <td className="px-4 py-3 text-right text-red-500">{s.sickDays}d</td>
                <td className="px-4 py-3 text-right text-blue-500" title={`${s.holidayHours.toFixed(1)}h gutgeschrieben`}>
                  {s.weekdayHolidays}d ({s.holidayHours.toFixed(1)}h)
                </td>
                <td className={`px-4 py-3 text-right font-medium ${s.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {s.balance >= 0 ? '+' : ''}{s.balance.toFixed(1)}h
                </td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">Keine Mitarbeiter erfasst.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
