import { useState, useMemo } from 'react';
import { format, addDays, addMonths, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, RefreshCw, Plus, X } from 'lucide-react';
import type { Employee, Shift, DayConfig, VacationEntry, ShiftType, ShiftTemplate } from '../types';
import { DAY_NAMES, SHIFT_TEMPLATES, getTemplateColor } from '../constants';
import { generateMonthShifts, getMonthPlanRange, calcShiftHours } from '../services/schedule';
import { isHoliday } from '../services/holidays';

interface Props {
  employees: Employee[];
  shifts: Shift[];
  dayConfigs: DayConfig[];
  vacations: VacationEntry[];
  onShiftsChange: (shifts: Shift[]) => void;
}

const SHIFT_TYPE_COLORS: Record<ShiftType, string> = {
  WORK: '',
  VACATION: 'bg-amber-100 border-amber-300 text-amber-800',
  SICK: 'bg-red-100 border-red-300 text-red-800',
  HOLIDAY: 'bg-blue-100 border-blue-300 text-blue-800',
};

export default function ScheduleView({ employees, shifts, dayConfigs, vacations, onShiftsChange }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isNewShift, setIsNewShift] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const { start: planStart, end: planEnd } = getMonthPlanRange(year, month);

  // Only show employees who are in the schedule (not Hauslieferdienst)
  const planEmployees = employees.filter(e => e.role !== 'Hauslieferdienst');

  // Group by role
  const apotheker = planEmployees.filter(e => e.role === 'Apotheker/in');
  const assistenten = planEmployees.filter(e => e.role === 'Pharma-Assistent/in');
  const lernende = planEmployees.filter(e => e.role === 'Lernende/r');

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let current = planStart;
    while (current <= planEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(addDays(current, i));
      }
      result.push(week);
      current = addDays(current, 7);
    }
    return result;
  }, [planStart, planEnd]);

  const rangeShifts = useMemo(() => {
    const startStr = format(planStart, 'yyyy-MM-dd');
    const endStr = format(planEnd, 'yyyy-MM-dd');
    return shifts.filter(s => s.date >= startStr && s.date <= endStr);
  }, [shifts, planStart, planEnd]);

  function generateForMonth() {
    const startStr = format(planStart, 'yyyy-MM-dd');
    const endStr = format(planEnd, 'yyyy-MM-dd');
    const existingInRange = shifts.filter(s => s.date >= startStr && s.date <= endStr);
    const newShifts = generateMonthShifts(year, month, planEmployees, dayConfigs, vacations, existingInRange);
    const otherShifts = shifts.filter(s => s.date < startStr || s.date > endStr);
    onShiftsChange([...otherShifts, ...existingInRange, ...newShifts]);
  }

  function clearMonth() {
    const startStr = format(planStart, 'yyyy-MM-dd');
    const endStr = format(planEnd, 'yyyy-MM-dd');
    onShiftsChange(shifts.filter(s => s.date < startStr || s.date > endStr));
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
    setEditingShift({
      id: `shift_${Date.now()}`,
      employeeId,
      date,
      start: '08:00',
      end: '17:00',
      type: 'WORK',
      isOpener: false,
      lunchBreak: true,
      lunchDuration: 60,
      template: 'CUSTOM',
    });
    setIsNewShift(true);
  }

  function openEditShift(shift: Shift) {
    setEditingShift({ ...shift });
    setIsNewShift(false);
  }

  function saveShift() {
    if (!editingShift) return;
    if (isNewShift) {
      onShiftsChange([...shifts, editingShift]);
    } else {
      onShiftsChange(shifts.map(s => s.id === editingShift.id ? editingShift : s));
    }
    setEditingShift(null);
  }

  function renderEmployeeRows(emps: Employee[], week: Date[]) {
    return emps.map(emp => (
      <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50">
        <td className="px-3 py-1">
          <span className="font-medium text-slate-700 text-xs">{emp.shortName || emp.name}</span>
        </td>
        {week.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayShifts = rangeShifts.filter(s => s.date === dateStr && s.employeeId === emp.id);
          return (
            <td key={dateStr} className="px-0.5 py-0.5 align-top">
              {dayShifts.map(shift => {
                const tColor = shift.type === 'WORK' ? getTemplateColor(shift.template || 'CUSTOM') : '';
                return (
                  <div key={shift.id}
                    className={`group relative text-xs rounded px-1 py-0.5 mb-0.5 border cursor-pointer transition hover:shadow-sm ${
                      shift.type !== 'WORK' ? SHIFT_TYPE_COLORS[shift.type] : ''
                    }`}
                    style={shift.type === 'WORK' ? { backgroundColor: tColor + '25', borderColor: tColor + '80', color: tColor } : {}}
                    onClick={() => openEditShift(shift)}>
                    {shift.type === 'WORK' ? (
                      <div className="font-semibold leading-tight">{shift.start}-{shift.end}</div>
                    ) : (
                      <div className="font-medium">{shift.type === 'VACATION' ? 'Ferien' : shift.type === 'SICK' ? 'Krank' : 'Feiertag'}</div>
                    )}
                    <button onClick={e => { e.stopPropagation(); deleteShift(shift.id); }}
                      className="absolute top-0 right-0 hidden group-hover:block text-red-400 hover:text-red-600">
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
              {dayShifts.length === 0 && (
                <button onClick={() => openNewShift(dateStr, emp.id)}
                  className="w-full h-6 border border-dashed border-slate-200 rounded text-slate-300 hover:border-emerald-300 hover:text-emerald-400 transition flex items-center justify-center">
                  <Plus size={10} />
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
      <tr><td colSpan={8} className="bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</td></tr>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(d => subMonths(d, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition"><ChevronLeft size={20} /></button>
          <h2 className="text-lg font-semibold text-slate-800">
            {format(currentMonth, 'MMMM yyyy', { locale: de })}
          </h2>
          <button onClick={() => setCurrentMonth(d => addMonths(d, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition"><ChevronRight size={20} /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(new Date())} className="text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 border border-slate-300 rounded-lg transition">Heute</button>
          <button onClick={clearMonth} className="text-sm text-red-600 hover:text-red-800 px-3 py-1.5 border border-red-300 rounded-lg transition">Monat leeren</button>
          <button onClick={generateForMonth} className="flex items-center gap-1 text-sm bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition">
            <RefreshCw size={14} /> Generieren
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-xs">
        {SHIFT_TEMPLATES.map(t => (
          <span key={t.id} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: t.color }} />
            {t.label}
          </span>
        ))}
      </div>

      <div className="text-xs text-slate-400">
        Planungszeitraum: {format(planStart, 'dd.MM.yyyy')} - {format(planEnd, 'dd.MM.yyyy')}
      </div>

      {/* Month Grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 text-left text-slate-500 font-medium w-24"></th>
                {week.map(day => {
                  const holiday = isHoliday(format(day, 'yyyy-MM-dd'));
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <th key={day.toISOString()} className={`px-2 py-2 text-center font-medium min-w-[110px] ${holiday ? 'text-red-500' : isWeekend ? 'text-slate-400' : 'text-slate-600'}`}>
                      <div>{DAY_NAMES[day.getDay()]}</div>
                      <div className="text-xs">{format(day, 'dd.MM.')}</div>
                      {holiday && <div className="text-xs font-normal">{holiday.name}</div>}
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
                <tr><td colSpan={8} className="text-center py-6 text-slate-400 text-sm">Bitte zuerst Mitarbeiter im Tab "Team" erfassen.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ))}

      {/* Monthly Summary */}
      {planEmployees.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-2">Monatsuebersicht</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              {/* Quick select templates */}
              {editingShift.type === 'WORK' && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Schnellauswahl</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SHIFT_TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => applyTemplate(t.id)}
                        className={`text-xs px-2 py-2 rounded-lg border-2 transition font-medium ${
                          editingShift.template === t.id ? 'ring-2 ring-offset-1' : ''
                        }`}
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
                  <option value="VACATION">Ferien</option>
                  <option value="SICK">Krank</option>
                  <option value="HOLIDAY">Feiertag</option>
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
    </div>
  );
}
