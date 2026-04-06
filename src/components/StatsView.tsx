import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, addDays, eachDayOfInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import type { Employee, Shift, TimeEntry, HourAdjustment, TeamMeeting, AbsenceCreditConfig, HolidayCreditConfig } from '../types';
import { HOURS_PER_WEEK_FULL, getAbsenceInfo, DEFAULT_ABSENCE_CREDITS, formatDateDE } from '../constants';
import { calcShiftHours } from '../services/schedule';
import { isHoliday } from '../services/holidays';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  employees: Employee[];
  shifts: Shift[];
  timeEntries: TimeEntry[];
  hourAdjustments: HourAdjustment[];
  teamMeetings: TeamMeeting[];
  absenceCredits: AbsenceCreditConfig;
  holidayCredits: HolidayCreditConfig;
}

const DAILY_HOURS_FULL = HOURS_PER_WEEK_FULL / 5;

function calcHolidayCredits(monthStart: Date, monthEnd: Date, pensum: number, holCredits: HolidayCreditConfig): { count: number; hours: number } {
  let count = 0;
  let hours = 0;
  let current = monthStart;
  while (current <= monthEnd) {
    const dateStr = format(current, 'yyyy-MM-dd');
    const dow = current.getDay();
    const holiday = isHoliday(dateStr);
    if (holiday) {
      const isWeekend = dow === 0 || dow === 6;
      const creditPct = holCredits[dateStr] ?? (isWeekend ? 0 : 100);
      if (creditPct > 0) {
        count++;
        const effectivePct = Math.min(creditPct, pensum);
        hours += DAILY_HOURS_FULL * (effectivePct / 100);
      }
    }
    current = addDays(current, 1);
  }
  return { count, hours };
}

export default function StatsView({ employees, shifts, timeEntries, hourAdjustments, teamMeetings, absenceCredits, holidayCredits }: Props) {
  const [month, setMonth] = useState(new Date());

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  const stats = useMemo(() => {
    return employees.filter(e => e.role !== 'Hauslieferdienst').map(emp => {
      const monthShifts = shifts.filter(s =>
        s.employeeId === emp.id && s.date >= format(monthStart, 'yyyy-MM-dd') && s.date <= format(monthEnd, 'yyyy-MM-dd')
      );

      const planHours = monthShifts
        .filter(s => s.type === 'WORK')
        .reduce((sum, s) => sum + calcShiftHours(s), 0);

      const vacationDays = monthShifts.filter(s => s.type === 'VACATION').length;
      const sickDays = monthShifts.filter(s => s.type === 'SICK').length;

      const monthEntries = timeEntries.filter(e => {
        const d = e.clockIn.substring(0, 10);
        return e.employeeId === emp.id && d >= format(monthStart, 'yyyy-MM-dd') && d <= format(monthEnd, 'yyyy-MM-dd');
      });

      const actualHours = monthEntries.reduce((sum, e) => {
        if (!e.clockOut) return sum;
        const ms = new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime();
        return sum + ms / (1000 * 60 * 60);
      }, 0);

      const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
      const weeklyTarget = (emp.pensum / 100) * HOURS_PER_WEEK_FULL;

      // If contract ends within this month, calculate proportional target
      let monthlyTarget: number;
      const contractEndStr = emp.contractEnd;
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
      if (contractEndStr && contractEndStr >= monthStartStr && contractEndStr <= monthEndStr) {
        // Count working days (Mo-Fr) from month start to contract end
        const endDate = new Date(contractEndStr + 'T00:00:00');
        let workDays = 0;
        let totalWorkDays = 0;
        let current = monthStart;
        while (current <= monthEnd) {
          const dow = current.getDay();
          if (dow >= 1 && dow <= 5) {
            totalWorkDays++;
            if (current <= endDate) workDays++;
          }
          current = addDays(current, 1);
        }
        const fraction = totalWorkDays > 0 ? workDays / totalWorkDays : 0;
        monthlyTarget = weeklyTarget * weeks.length * fraction;
      } else {
        monthlyTarget = weeklyTarget * weeks.length;
      }

      const { count: weekdayHolidays, hours: holidayHours } = calcHolidayCredits(monthStart, monthEnd, emp.pensum, holidayCredits);

      // Absence credit: use configured percentage, capped at pensum
      const getAbsenceCredit = (type: string, days: number): number => {
        const creditPct = Math.min(absenceCredits[type] ?? DEFAULT_ABSENCE_CREDITS[type] ?? 100, emp.pensum);
        return days * DAILY_HOURS_FULL * (creditPct / 100);
      };

      const vacationHours = getAbsenceCredit('VACATION', vacationDays);
      const sickHours = getAbsenceCredit('SICK', sickDays);

      // Other absence types
      const militaryDays = monthShifts.filter(s => s.type === 'MILITARY').length;
      const maternityDays = monthShifts.filter(s => s.type === 'MATERNITY').length;
      const unpaidDays = monthShifts.filter(s => s.type === 'UNPAID_LEAVE').length;
      const trainingDays = monthShifts.filter(s => s.type === 'TRAINING').length;
      const appointmentDays = monthShifts.filter(s => s.type === 'APPOINTMENT').length;

      const militaryHours = getAbsenceCredit('MILITARY', militaryDays);
      const maternityHours = getAbsenceCredit('MATERNITY', maternityDays);
      const unpaidHours = getAbsenceCredit('UNPAID_LEAVE', unpaidDays);
      const trainingHours = getAbsenceCredit('TRAINING', trainingDays);
      const appointmentHours = getAbsenceCredit('APPOINTMENT', appointmentDays);

      const absenceHours = vacationHours + sickHours + militaryHours + maternityHours + unpaidHours + trainingHours + appointmentHours;
      const compensatedHours = absenceHours + holidayHours;

      // Team meeting hours: credit only to attendees
      const meetingHours = teamMeetings
        .filter(m => m.date >= format(monthStart, 'yyyy-MM-dd') && m.date <= format(monthEnd, 'yyyy-MM-dd') && m.attendees.includes(emp.id))
        .reduce((sum, m) => sum + (m.hours || 0), 0);

      // Manual hour adjustments for this employee in this month
      const adjHours = hourAdjustments
        .filter(a => a.employeeId === emp.id && a.date >= format(monthStart, 'yyyy-MM-dd') && a.date <= format(monthEnd, 'yyyy-MM-dd'))
        .reduce((sum, a) => sum + a.hours, 0);

      const balance = planHours + compensatedHours + meetingHours + adjHours - monthlyTarget;

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
        meetingHours,
        adjHours,
        balance,
      };
    });
  }, [employees, shifts, timeEntries, hourAdjustments, teamMeetings, absenceCredits, holidayCredits, monthStart, monthEnd]);

  function exportEmployeePDF(empStat: typeof stats[0]) {
    const emp = empStat.employee;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const monthLabel = format(month, 'MMMM yyyy', { locale: de });

    // Header
    doc.setFontSize(14);
    doc.text(`Arbeitszeit-Auswertung`, 14, 15);
    doc.setFontSize(10);
    doc.text(`${emp.name} (${emp.shortName}) - ${monthLabel}`, 14, 22);
    doc.setFontSize(8);
    doc.text(`Apotheke Steinhoelzli | Pensum: ${emp.pensum}% | Ferientage/Jahr: ${emp.vacationDays}`, 14, 28);

    // Summary table
    autoTable(doc, {
      startY: 34,
      head: [['Kennzahl', 'Wert']],
      body: [
        ['Soll-Stunden (Monat)', `${empStat.monthlyTarget.toFixed(1)}h`],
        ['Plan-Stunden', `${empStat.planHours.toFixed(1)}h`],
        ['Ist-Stunden (gestempelt)', `${empStat.actualHours.toFixed(1)}h`],
        ['Ferientage', `${empStat.vacationDays} Tage`],
        ['Krankheitstage', `${empStat.sickDays} Tage`],
        ['Feiertage (Werktage)', `${empStat.weekdayHolidays} Tage (${empStat.holidayHours.toFixed(1)}h)`],
        ['Kompensierte Stunden', `${empStat.compensatedHours.toFixed(1)}h`],
        ['Teamsitzungen', `${empStat.meetingHours > 0 ? '+' : ''}${empStat.meetingHours.toFixed(1)}h`],
        ['Manuelle Anpassungen', `${empStat.adjHours >= 0 ? '+' : ''}${empStat.adjHours.toFixed(1)}h`],
        ['Saldo', `${empStat.balance >= 0 ? '+' : ''}${empStat.balance.toFixed(1)}h`],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
      theme: 'grid',
    });

    // Daily detail table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.text('Tagesdetails', 14, y);
    y += 4;

    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const dayRows: string[][] = [];

    for (const day of days) {
      const dow = day.getDay();
      if (dow === 0) continue; // skip Sunday
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayLabel = format(day, 'EE dd.MM.', { locale: de });
      const holiday = isHoliday(dateStr);

      const dayShifts = shifts.filter(s => s.employeeId === emp.id && s.date === dateStr);
      const dayEntries = timeEntries.filter(e => e.employeeId === emp.id && e.clockIn.startsWith(dateStr));

      let planStr = '-';
      let planH = 0;
      if (holiday) {
        planStr = `Feiertag: ${holiday.name}`;
      } else if (dayShifts.length > 0) {
        const labels: string[] = [];
        for (const s of dayShifts) {
          if (s.type === 'WORK') {
            labels.push(`${s.start}-${s.end}`);
            planH += calcShiftHours(s);
          } else {
            const info = getAbsenceInfo(s.type);
            labels.push(info?.label || s.type);
          }
        }
        planStr = labels.join(', ');
      }

      let actualStr = '-';
      let actualH = 0;
      if (dayEntries.length > 0) {
        const parts: string[] = [];
        for (const e of dayEntries) {
          const inTime = format(new Date(e.clockIn), 'HH:mm');
          const outTime = e.clockOut ? format(new Date(e.clockOut), 'HH:mm') : '...';
          parts.push(`${inTime}-${outTime}`);
          if (e.clockOut) {
            actualH += (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / (1000 * 60 * 60);
          }
        }
        actualStr = parts.join(', ');
      }

      dayRows.push([
        dayLabel,
        planStr,
        planH > 0 ? planH.toFixed(1) + 'h' : '',
        actualStr,
        actualH > 0 ? actualH.toFixed(1) + 'h' : '',
      ]);
    }

    autoTable(doc, {
      startY: y,
      head: [['Tag', 'Plan', 'Plan h', 'Ist', 'Ist h']],
      body: dayRows,
      styles: { fontSize: 7, cellPadding: 1.5, lineWidth: 0.1, lineColor: [220, 220, 220] },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 22 },
        2: { cellWidth: 14, halign: 'right' },
        4: { cellWidth: 14, halign: 'right' },
      },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section === 'body') {
          const cellText = data.cell.text.join('');
          if (cellText.startsWith('Ferien') || cellText.startsWith('Feiertag')) {
            data.cell.styles.textColor = [180, 120, 0];
          } else if (cellText === 'Krank') {
            data.cell.styles.textColor = [200, 50, 50];
          }
          // Saturday rows slightly grey
          if (data.row.index < dayRows.length) {
            const rowText = dayRows[data.row.index][0];
            if (rowText.startsWith('Sa')) {
              data.cell.styles.fillColor = [248, 250, 252];
            }
          }
        }
      },
    });

    doc.save(`Auswertung_${emp.shortName}_${format(month, 'yyyy-MM')}.pdf`);
  }

  function exportAllPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const monthLabel = format(month, 'MMMM yyyy', { locale: de });

    doc.setFontSize(14);
    doc.text(`Auswertung - ${monthLabel}`, 14, 12);
    doc.setFontSize(8);
    doc.text('Apotheke Steinhoelzli', 14, 17);

    const headers = ['Mitarbeiter', 'Pensum', 'Soll', 'Plan', 'Ist', 'Ferien', 'Krank', 'Feiertage', 'Sitzungen', 'Saldo'];
    const rows = stats.map(s => [
      s.employee.name,
      `${s.employee.pensum}%`,
      `${s.monthlyTarget.toFixed(1)}h`,
      `${s.planHours.toFixed(1)}h`,
      `${s.actualHours.toFixed(1)}h`,
      `${s.vacationDays}d`,
      `${s.sickDays}d`,
      `${s.weekdayHolidays}d (${s.holidayHours.toFixed(1)}h)`,
      `${s.meetingHours > 0 ? '+' + s.meetingHours.toFixed(1) + 'h' : '-'}`,
      `${s.balance >= 0 ? '+' : ''}${s.balance.toFixed(1)}h`,
    ]);

    autoTable(doc, {
      startY: 22,
      head: [headers],
      body: rows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold' },
        9: { fontStyle: 'bold' },
      },
      theme: 'grid',
      didParseCell: (data) => {
        // Color the balance column
        if (data.section === 'body' && data.column.index === 9) {
          const text = data.cell.text.join('');
          if (text.startsWith('+')) data.cell.styles.textColor = [16, 185, 129];
          else if (text.startsWith('-')) data.cell.styles.textColor = [239, 68, 68];
        }
      },
    });

    doc.save(`Auswertung_Alle_${format(month, 'yyyy-MM')}.pdf`);
  }

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition"><ChevronLeft size={20} /></button>
          <h2 className="text-lg font-semibold text-slate-800">
            {format(month, 'MMMM yyyy', { locale: de })}
          </h2>
          <button onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition"><ChevronRight size={20} /></button>
        </div>
        <button onClick={exportAllPDF} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 border border-slate-300 rounded-lg transition">
          <FileDown size={14} /> Alle als PDF
        </button>
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
              <th className="px-4 py-3 text-right font-medium">Sitzungen</th>
              <th className="px-4 py-3 text-right font-medium">Saldo</th>
              <th className="px-4 py-3 text-center font-medium">PDF</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.employee.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">{s.employee.name}</span>
                    <span className="text-xs text-slate-400">{s.employee.pensum}%</span>
                    {s.employee.contractEnd && <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">bis {formatDateDE(s.employee.contractEnd)}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{s.monthlyTarget.toFixed(1)}h</td>
                <td className="px-4 py-3 text-right text-slate-600">{s.planHours.toFixed(1)}h</td>
                <td className="px-4 py-3 text-right text-slate-600">{s.actualHours.toFixed(1)}h</td>
                <td className="px-4 py-3 text-right text-amber-600">{s.vacationDays}d</td>
                <td className="px-4 py-3 text-right text-red-500">{s.sickDays}d</td>
                <td className="px-4 py-3 text-right text-blue-500">
                  {s.weekdayHolidays}d <span className="text-blue-400">+{s.holidayHours.toFixed(1)}h</span>
                </td>
                <td className="px-4 py-3 text-right text-purple-500">
                  {s.meetingHours > 0 ? `+${s.meetingHours.toFixed(1)}h` : '-'}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${s.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {s.balance >= 0 ? '+' : ''}{s.balance.toFixed(1)}h
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => exportEmployeePDF(s)}
                    className="text-slate-400 hover:text-slate-700 transition" title="PDF exportieren">
                    <FileDown size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr><td colSpan={10} className="text-center py-8 text-slate-400">Keine Mitarbeiter erfasst.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
