import { useState, useMemo, useRef, useCallback } from 'react';
import { format, addDays, addMonths, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, RefreshCw, Plus, X, RotateCw, StickyNote, FileDown } from 'lucide-react';
import type { Employee, Shift, DayConfig, VacationEntry, ShiftType, ShiftTemplate, DayNote } from '../types';
import { DAY_NAMES, SHIFT_TEMPLATES, getTemplateColor, ABSENCE_TYPES, getAbsenceInfo } from '../constants';
import { generateMonthShifts, getMonthPlanRange, calcShiftHours } from '../services/schedule';
import { isHoliday } from '../services/holidays';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  employees: Employee[];
  shifts: Shift[];
  dayConfigs: DayConfig[];
  vacations: VacationEntry[];
  onShiftsChange: (shifts: Shift[]) => void;
  dayNotes: DayNote[];
  onDayNotesChange: (notes: DayNote[]) => void;
}

// Timeline range: 07:00 - 19:00 = 12 hours
const TIMELINE_START = 7;
const TIMELINE_END = 19;
const TIMELINE_HOURS = TIMELINE_END - TIMELINE_START;

function timeToPercent(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const hour = h + m / 60;
  return Math.max(0, Math.min(100, ((hour - TIMELINE_START) / TIMELINE_HOURS) * 100));
}

// Saturday shifts
const SATURDAY_NORMAL = { start: '07:45', end: '16:00', lunchBreak: true, lunchDuration: 30 };
const SATURDAY_OPENER = { start: '07:30', end: '16:00', lunchBreak: true, lunchDuration: 30 };

export default function ScheduleView({ employees, shifts, dayConfigs, vacations, onShiftsChange, dayNotes, onDayNotesChange }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isNewShift, setIsNewShift] = useState(false);
  const [editingNote, setEditingNote] = useState<{ date: string; text: string } | null>(null);
  const dragData = useRef<{ shiftId: string; sourceDate: string } | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const { start: planStart, end: planEnd } = getMonthPlanRange(year, month);

  const planEmployees = employees.filter(e => e.role !== 'Hauslieferdienst');
  const apotheker = planEmployees.filter(e => e.role === 'Apotheker/in');
  const assistenten = planEmployees.filter(e => e.role === 'Pharma-Assistent/in');
  const lernende = planEmployees.filter(e => e.role === 'Lernende/r');

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let current = planStart;
    while (current <= planEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 6; i++) week.push(addDays(current, i));
      result.push(week);
      current = addDays(current, 7);
    }
    return result;
  }, [planStart, planEnd]);

  const rangeShifts = useMemo(() => {
    const s = format(planStart, 'yyyy-MM-dd');
    const e = format(planEnd, 'yyyy-MM-dd');
    return shifts.filter(sh => sh.date >= s && sh.date <= e);
  }, [shifts, planStart, planEnd]);

  // Count people present at a specific hour on a given date
  const countPresentAt = useCallback((dateStr: string, hour: number): number => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    return rangeShifts.filter(s => {
      if (s.date !== dateStr || s.type !== 'WORK') return false;
      return s.start <= timeStr && s.end > timeStr;
    }).length;
  }, [rangeShifts]);

  function generateForMonth() {
    const startStr = format(planStart, 'yyyy-MM-dd');
    const endStr = format(planEnd, 'yyyy-MM-dd');
    const existing = shifts.filter(s => s.date >= startStr && s.date <= endStr);
    const newShifts = generateMonthShifts(year, month, planEmployees, dayConfigs, vacations, existing);
    const other = shifts.filter(s => s.date < startStr || s.date > endStr);
    onShiftsChange([...other, ...existing, ...newShifts]);
  }

  function updateMonth() {
    const startStr = format(planStart, 'yyyy-MM-dd');
    const endStr = format(planEnd, 'yyyy-MM-dd');
    const other = shifts.filter(s => s.date < startStr || s.date > endStr);
    const newShifts = generateMonthShifts(year, month, planEmployees, dayConfigs, vacations, []);
    onShiftsChange([...other, ...newShifts]);
  }

  function clearMonth() {
    const s = format(planStart, 'yyyy-MM-dd');
    const e = format(planEnd, 'yyyy-MM-dd');
    onShiftsChange(shifts.filter(sh => sh.date < s || sh.date > e));
  }

  function deleteShift(id: string) {
    onShiftsChange(shifts.filter(s => s.id !== id));
  }

  function applyTemplate(templateId: ShiftTemplate) {
    if (!editingShift) return;
    const t = SHIFT_TEMPLATES.find(s => s.id === templateId);
    if (!t) return;
    setEditingShift({
      ...editingShift,
      start: t.morning,
      end: t.afternoonEnd,
      template: templateId,
      lunchBreak: true,
      lunchDuration: 60,
      isOpener: templateId === 'OPENER',
    });
  }

  function openNewShift(date: string, employeeId: string) {
    const isSaturday = new Date(date).getDay() === 6;
    const satDefaults = isSaturday ? SATURDAY_NORMAL : {};
    setEditingShift({
      id: `shift_${Date.now()}`,
      employeeId, date,
      start: '08:00', end: '17:00',
      type: 'WORK', isOpener: false,
      lunchBreak: true, lunchDuration: 60,
      template: 'CUSTOM',
      ...satDefaults,
    });
    setIsNewShift(true);
  }

  function openEditShift(shift: Shift) {
    setEditingShift({ ...shift });
    setIsNewShift(false);
  }

  function saveShift() {
    if (!editingShift) return;
    if (isNewShift) onShiftsChange([...shifts, editingShift]);
    else onShiftsChange(shifts.map(s => s.id === editingShift.id ? editingShift : s));
    setEditingShift(null);
  }

  // Day notes
  function openNoteEditor(date: string) {
    const existing = dayNotes.find(n => n.date === date);
    setEditingNote({ date, text: existing?.text || '' });
  }

  function saveNote() {
    if (!editingNote) return;
    if (editingNote.text.trim()) {
      const existing = dayNotes.find(n => n.date === editingNote.date);
      if (existing) {
        onDayNotesChange(dayNotes.map(n => n.date === editingNote.date ? { ...n, text: editingNote.text } : n));
      } else {
        onDayNotesChange([...dayNotes, { id: `note_${Date.now()}`, date: editingNote.date, text: editingNote.text }]);
      }
    } else {
      onDayNotesChange(dayNotes.filter(n => n.date !== editingNote.date));
    }
    setEditingNote(null);
  }

  // Drag and drop
  function handleDragStart(shiftId: string, sourceDate: string) {
    dragData.current = { shiftId, sourceDate };
  }

  function handleDrop(targetDate: string, empId: string) {
    if (!dragData.current) return;
    const { shiftId } = dragData.current;
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift || shift.employeeId !== empId) { dragData.current = null; return; }

    const targetDay = new Date(targetDate).getDay();
    let updatedShift = { ...shift, date: targetDate };

    if (targetDay === 6) {
      const satShift = shift.isOpener ? SATURDAY_OPENER : SATURDAY_NORMAL;
      updatedShift = {
        ...updatedShift,
        start: satShift.start,
        end: satShift.end,
        lunchBreak: satShift.lunchBreak,
        lunchDuration: satShift.lunchDuration,
        template: 'CUSTOM',
      };
    }

    onShiftsChange(shifts.map(s => s.id === shiftId ? updatedShift : s));
    dragData.current = null;
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function renderShiftBar(shift: Shift, _emp: Employee, isSaturday: boolean) {
    if (shift.type !== 'WORK') {
      const info = getAbsenceInfo(shift.type);
      const color = info?.color || '#94a3b8';
      const label = info?.shortLabel || shift.type;
      return (
        <div key={shift.id}
          className="group relative h-5 rounded text-xs flex items-center justify-center font-medium cursor-pointer"
          style={{ backgroundColor: color + '25', color, border: `1px solid ${color}60` }}
          onClick={() => openEditShift(shift)}>
          {label}
          <button onClick={e => { e.stopPropagation(); deleteShift(shift.id); }}
            className="absolute -top-1 -right-1 hidden group-hover:flex w-3.5 h-3.5 bg-red-500 text-white rounded-full items-center justify-center">
            <X size={8} />
          </button>
        </div>
      );
    }

    const left = timeToPercent(shift.start);
    const right = timeToPercent(shift.end);
    const width = right - left;

    let tColor: string;
    if (isSaturday) {
      tColor = shift.isOpener ? '#f59e0b' : '#94a3b8';
    } else {
      tColor = getTemplateColor(shift.template || 'CUSTOM');
    }

    return (
      <div key={shift.id} className="relative h-5"
        draggable
        onDragStart={() => handleDragStart(shift.id, shift.date)}>
        <div
          className="group absolute top-0 h-full rounded cursor-pointer transition-shadow hover:shadow-md flex items-center overflow-hidden"
          style={{
            left: `${left}%`,
            width: `${Math.max(width, 8)}%`,
            backgroundColor: tColor + '30',
            border: `1.5px solid ${tColor}`,
          }}
          onClick={() => openEditShift(shift)}>
          <span className="text-[9px] font-bold px-0.5 truncate leading-none" style={{ color: tColor }}>
            {shift.start}-{shift.end}
          </span>
          <button onClick={e => { e.stopPropagation(); deleteShift(shift.id); }}
            className="absolute -top-1 -right-1 hidden group-hover:flex w-3.5 h-3.5 bg-red-500 text-white rounded-full items-center justify-center z-10">
            <X size={8} />
          </button>
        </div>
      </div>
    );
  }

  function renderEmployeeRows(emps: Employee[], week: Date[]) {
    return emps.map(emp => (
      <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/30">
        <td className="px-1 sm:px-2 py-0.5 w-10 sm:w-16">
          <span className="font-medium text-slate-700 text-[10px] sm:text-xs">{emp.shortName || emp.name}</span>
        </td>
        {week.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSaturday = day.getDay() === 6;
          const dayShifts = rangeShifts.filter(s => s.date === dateStr && s.employeeId === emp.id);
          return (
            <td key={dateStr} className="px-0 sm:px-0.5 py-0.5 align-middle"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(dateStr, emp.id)}>
              {dayShifts.length > 0 ? (
                <div className="space-y-0.5">
                  {dayShifts.map(shift => renderShiftBar(shift, emp, isSaturday))}
                </div>
              ) : (
                <button onClick={() => openNewShift(dateStr, emp.id)}
                  className="w-full h-5 border border-dashed border-slate-200 rounded text-slate-300 hover:border-emerald-300 hover:text-emerald-400 transition flex items-center justify-center">
                  <Plus size={8} />
                </button>
              )}
            </td>
          );
        })}
      </tr>
    ));
  }

  function renderSeparator(label: string) {
    return (
      <tr><td colSpan={7} className="bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</td></tr>
    );
  }

  // Minimal timeline: just 9h and 17h marker lines + person count
  function renderTimelineMarkers(dateStr: string) {
    const pct9 = timeToPercent('09:00');
    const pct17 = timeToPercent('17:00');
    const count9 = countPresentAt(dateStr, 9);
    const count17 = countPresentAt(dateStr, 17);
    return (
      <div className="relative h-4">
        {/* 9:00 marker */}
        <div className="absolute top-0 bottom-0 w-px bg-blue-300/50" style={{ left: `${pct9}%` }} />
        <span className="absolute text-[7px] sm:text-[8px] text-blue-400 font-medium -translate-x-1/2"
          style={{ left: `${pct9}%`, top: '-1px' }}>
          9<span className="hidden sm:inline">h</span>{count9 > 0 && <span className="text-blue-600">({count9})</span>}
        </span>
        {/* 17:00 marker */}
        <div className="absolute top-0 bottom-0 w-px bg-orange-300/50" style={{ left: `${pct17}%` }} />
        <span className="absolute text-[7px] sm:text-[8px] text-orange-400 font-medium -translate-x-1/2"
          style={{ left: `${pct17}%`, top: '-1px' }}>
          17<span className="hidden sm:inline">h</span>{count17 > 0 && <span className="text-orange-600">({count17})</span>}
        </span>
      </div>
    );
  }

  // PDF Export
  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: de });

    doc.setFontSize(14);
    doc.text(`Arbeitsplan - ${monthLabel}`, 14, 12);
    doc.setFontSize(8);
    doc.text('Apotheke Steinhoelzli', 14, 17);

    let startY = 22;

    for (let wi = 0; wi < weeks.length; wi++) {
      const week = weeks[wi];
      const headers = ['Name', ...week.map(d => `${DAY_NAMES[d.getDay()]} ${format(d, 'dd.MM.')}`)];

      const allEmps = [...apotheker, ...assistenten, ...lernende];
      const rows: string[][] = [];

      for (const emp of allEmps) {
        const row = [emp.shortName || emp.name];
        for (const day of week) {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayShifts = rangeShifts.filter(s => s.date === dateStr && s.employeeId === emp.id);
          if (dayShifts.length === 0) {
            row.push('');
          } else {
            const labels = dayShifts.map(s => {
              if (s.type !== 'WORK') {
                const info = getAbsenceInfo(s.type);
                return info?.shortLabel || s.type;
              }
              return `${s.start}-${s.end}`;
            });
            row.push(labels.join('\n'));
          }
        }
        rows.push(row);
      }

      autoTable(doc, {
        startY,
        head: [headers],
        body: rows,
        styles: { fontSize: 7, cellPadding: 1.5, lineWidth: 0.1, lineColor: [200, 200, 200] },
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold' },
        },
        theme: 'grid',
        margin: { left: 8, right: 8 },
        tableWidth: 'auto',
        didDrawCell: (data) => {
          // Color-code absence cells
          if (data.section === 'body' && data.column.index > 0) {
            const cellText = data.cell.text.join('');
            if (cellText === 'Ferien') {
              doc.setFillColor(255, 243, 224);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
              doc.setTextColor(180, 120, 0);
              doc.text(cellText, data.cell.x + 1.5, data.cell.y + data.cell.height / 2 + 1);
              doc.setTextColor(0);
            } else if (cellText === 'Krank') {
              doc.setFillColor(254, 226, 226);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
              doc.setTextColor(200, 50, 50);
              doc.text(cellText, data.cell.x + 1.5, data.cell.y + data.cell.height / 2 + 1);
              doc.setTextColor(0);
            }
          }
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startY = (doc as any).lastAutoTable.finalY + 4;

      // Add new page if needed for next week
      if (wi < weeks.length - 1 && startY > 170) {
        doc.addPage();
        startY = 12;
      }
    }

    // Day notes section
    const monthNotes = dayNotes.filter(n => {
      const s = format(planStart, 'yyyy-MM-dd');
      const e = format(planEnd, 'yyyy-MM-dd');
      return n.date >= s && n.date <= e && n.text.trim();
    });
    if (monthNotes.length > 0) {
      if (startY > 170) { doc.addPage(); startY = 12; }
      doc.setFontSize(9);
      doc.text('Notizen:', 14, startY);
      startY += 4;
      doc.setFontSize(7);
      for (const note of monthNotes) {
        doc.text(`${note.date}: ${note.text}`, 14, startY);
        startY += 3.5;
      }
    }

    doc.save(`Arbeitsplan_${format(currentMonth, 'yyyy-MM')}.pdf`);
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(d => subMonths(d, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition"><ChevronLeft size={20} /></button>
          <h2 className="text-base sm:text-lg font-semibold text-slate-800">
            {format(currentMonth, 'MMMM yyyy', { locale: de })}
          </h2>
          <button onClick={() => setCurrentMonth(d => addMonths(d, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition"><ChevronRight size={20} /></button>
        </div>
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          <button onClick={() => setCurrentMonth(new Date())} className="text-xs sm:text-sm text-slate-600 hover:text-slate-800 px-2 sm:px-3 py-1.5 border border-slate-300 rounded-lg transition">Heute</button>
          <button onClick={updateMonth} className="flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-800 px-2 sm:px-3 py-1.5 border border-blue-300 rounded-lg transition">
            <RotateCw size={14} /> <span className="hidden sm:inline">Update</span>
          </button>
          <button onClick={clearMonth} className="text-xs sm:text-sm text-red-600 hover:text-red-800 px-2 sm:px-3 py-1.5 border border-red-300 rounded-lg transition">
            <span className="sm:hidden">Leeren</span><span className="hidden sm:inline">Monat leeren</span>
          </button>
          <button onClick={generateForMonth} className="flex items-center gap-1 text-xs sm:text-sm bg-emerald-500 text-white px-2 sm:px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition">
            <RefreshCw size={14} /> <span className="hidden sm:inline">Generieren</span><span className="sm:hidden">Gen.</span>
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1 text-xs sm:text-sm text-slate-600 hover:text-slate-800 px-2 sm:px-3 py-1.5 border border-slate-300 rounded-lg transition">
            <FileDown size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-2 sm:gap-3 text-[10px] sm:text-xs flex-wrap">
        {SHIFT_TEMPLATES.map(t => (
          <span key={t.id} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded" style={{ backgroundColor: t.color }} />
            <span className="font-medium">{t.label}</span>
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded" style={{ backgroundColor: '#f59e0b' }} />
          <span className="font-medium">Sa Opener</span>
        </span>
      </div>

      {/* Month Grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full text-sm table-fixed min-w-[500px]">
            <colgroup>
              <col className="w-10 sm:w-16" />
              {week.map((_, i) => <col key={i} />)}
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-1 sm:px-2 py-1 text-left text-slate-500 font-medium"></th>
                {week.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const holiday = isHoliday(dateStr);
                  const isWeekend = day.getDay() === 6;
                  const note = dayNotes.find(n => n.date === dateStr);
                  return (
                    <th key={day.toISOString()} className={`px-0.5 sm:px-1 py-1 text-center font-medium ${holiday ? 'text-red-500' : isWeekend ? 'text-slate-400' : 'text-slate-600'}`}>
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="text-[10px] sm:text-xs">{DAY_NAMES[day.getDay()]} {format(day, 'dd.MM.')}</span>
                        <button onClick={() => openNoteEditor(dateStr)}
                          className={`p-0.5 rounded transition ${note ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-slate-500'}`}
                          title={note ? note.text : 'Notiz hinzufuegen'}>
                          <StickyNote size={9} />
                        </button>
                      </div>
                      {holiday && <div className="text-[8px] sm:text-[9px] font-normal">{holiday.name}</div>}
                      {note && <div className="text-[8px] sm:text-[9px] font-normal text-amber-600 truncate max-w-full">{note.text}</div>}
                      {renderTimelineMarkers(dateStr)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {apotheker.length > 0 && renderSeparator('Apotheker/innen')}
              {renderEmployeeRows(apotheker, week)}
              {assistenten.length > 0 && renderSeparator('Pharma-Assistent/innen')}
              {renderEmployeeRows(assistenten, week)}
              {lernende.length > 0 && renderSeparator('Lernende')}
              {renderEmployeeRows(lernende, week)}
              {planEmployees.length === 0 && (
                <tr><td colSpan={7} className="text-center py-6 text-slate-400 text-sm">Bitte zuerst Mitarbeiter im Tab "Team" erfassen.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ))}

      {/* Monthly Summary */}
      {planEmployees.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-2">Monatsuebersicht</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {planEmployees.map(emp => {
              const empShifts = rangeShifts.filter(s => s.employeeId === emp.id && s.type === 'WORK');
              const hours = empShifts.reduce((sum, s) => sum + calcShiftHours(s), 0);
              const targetHours = (emp.pensum / 100) * 42 * weeks.length;
              return (
                <div key={emp.id} className="text-sm">
                  <span className="font-medium text-slate-700">{emp.shortName || emp.name}</span>
                  <div className={`text-xs ${Math.abs(hours - targetHours) < 2 ? 'text-emerald-600' : hours > targetHours ? 'text-red-500' : 'text-amber-500'}`}>
                    {hours.toFixed(1)}h / {targetHours.toFixed(1)}h Soll
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Shift Modal */}
      {editingShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{isNewShift ? 'Neue Schicht' : 'Schicht bearbeiten'}</h3>
              <button onClick={() => setEditingShift(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {editingShift.type === 'WORK' && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Schnellauswahl</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SHIFT_TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => applyTemplate(t.id)}
                        className={`text-xs px-2 py-2 rounded-lg border-2 transition font-medium ${editingShift.template === t.id ? 'ring-2 ring-offset-1' : ''}`}
                        style={{ borderColor: t.color, backgroundColor: t.color + '15', color: t.color }}>
                        <div className="font-bold">{t.label}</div>
                        <div>{t.morning}-{t.morningEnd}</div>
                        <div>{t.afternoon}-{t.afternoonEnd}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-600 mb-1">Mitarbeiter</label>
                <select value={editingShift.employeeId}
                  onChange={e => setEditingShift({ ...editingShift, employeeId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  {planEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Typ</label>
                <select value={editingShift.type}
                  onChange={e => setEditingShift({ ...editingShift, type: e.target.value as ShiftType })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="WORK">Arbeit</option>
                  {ABSENCE_TYPES.map(a => (
                    <option key={a.type} value={a.type}>{a.label}</option>
                  ))}
                </select>
              </div>
              {editingShift.type === 'WORK' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Von</label>
                      <input type="time" value={editingShift.start}
                        onChange={e => setEditingShift({ ...editingShift, start: e.target.value, template: 'CUSTOM' })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Bis</label>
                      <input type="time" value={editingShift.end}
                        onChange={e => setEditingShift({ ...editingShift, end: e.target.value, template: 'CUSTOM' })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={editingShift.lunchBreak}
                        onChange={e => setEditingShift({ ...editingShift, lunchBreak: e.target.checked })}
                        className="accent-emerald-500" />
                      Mittagspause
                    </label>
                    {editingShift.lunchBreak && (
                      <div className="flex items-center gap-1">
                        <input type="number" min={15} max={120} step={15} value={editingShift.lunchDuration}
                          onChange={e => setEditingShift({ ...editingShift, lunchDuration: Number(e.target.value) })}
                          className="w-16 border border-slate-300 rounded px-2 py-1 text-sm" />
                        <span className="text-sm text-slate-400">Min.</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
              <button onClick={() => setEditingShift(null)} className="px-4 py-2 text-sm text-slate-600">Abbrechen</button>
              <button onClick={saveShift} className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-600 transition">Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* Day Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Tagesnotiz - {editingNote.date}</h3>
              <button onClick={() => setEditingNote(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <textarea
              value={editingNote.text}
              onChange={e => setEditingNote({ ...editingNote, text: e.target.value })}
              placeholder="z.B. Interne Schulung, Weihnachtsessen, Geburtstag..."
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditingNote(null)} className="px-4 py-2 text-sm text-slate-600">Abbrechen</button>
              <button onClick={saveNote} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition">Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
