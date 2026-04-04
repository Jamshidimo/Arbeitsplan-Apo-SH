import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, RefreshCw, Plus, X } from 'lucide-react';
import type { Employee, Shift, DayConfig, VacationEntry, ShiftType } from '../types';
import { DAY_NAMES } from '../constants';
import { generateWeekShifts, calcShiftHours } from '../services/schedule';
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isNewShift, setIsNewShift] = useState(false);

  const monday = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const weekShifts = useMemo(() => {
    return shifts.filter(s => {
      const d = new Date(s.date);
      return d >= monday && d < addDays(monday, 7);
    });
  }, [shifts, monday]);

  function generateForWeek() {
    const newShifts = generateWeekShifts(monday, employees, dayConfigs, vacations, weekShifts);
    // Remove existing auto-generated shifts for this week, keep manual ones
    const otherShifts = shifts.filter(s => {
      const d = new Date(s.date);
      return !(d >= monday && d < addDays(monday, 7));
    });
    onShiftsChange([...otherShifts, ...weekShifts.filter(s => shifts.some(orig => orig.id === s.id)), ...newShifts]);
  }

  function clearWeek() {
    const filtered = shifts.filter(s => {
      const d = new Date(s.date);
      return !(d >= monday && d < addDays(monday, 7));
    });
    onShiftsChange(filtered);
  }

  function deleteShift(id: string) {
    onShiftsChange(shifts.filter(s => s.id !== id));
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

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => subWeeks(d, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition"><ChevronLeft size={20} /></button>
          <h2 className="text-lg font-semibold text-slate-800">
            {format(monday, 'dd. MMM', { locale: de })} - {format(addDays(monday, 6), 'dd. MMM yyyy', { locale: de })}
          </h2>
          <button onClick={() => setCurrentDate(d => addWeeks(d, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition"><ChevronRight size={20} /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(new Date())} className="text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 border border-slate-300 rounded-lg transition">Heute</button>
          <button onClick={clearWeek} className="text-sm text-red-600 hover:text-red-800 px-3 py-1.5 border border-red-300 rounded-lg transition">Woche leeren</button>
          <button onClick={generateForWeek} className="flex items-center gap-1 text-sm bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition">
            <RefreshCw size={14} /> Generieren
          </button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left text-slate-500 font-medium w-32">Mitarbeiter</th>
              {weekDays.map(day => {
                const holiday = isHoliday(format(day, 'yyyy-MM-dd'));
                return (
                  <th key={day.toISOString()} className={`px-2 py-2 text-center font-medium min-w-[120px] ${holiday ? 'text-red-500' : day.getDay() === 0 || day.getDay() === 6 ? 'text-slate-400' : 'text-slate-600'}`}>
                    <div>{DAY_NAMES[day.getDay()]}</div>
                    <div className="text-xs">{format(day, 'dd.MM.')}</div>
                    {holiday && <div className="text-xs font-normal">{holiday.name}</div>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: emp.color }} />
                    <span className="font-medium text-slate-700 truncate">{emp.shortName || emp.name}</span>
                  </div>
                </td>
                {weekDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayShifts = weekShifts.filter(s => s.date === dateStr && s.employeeId === emp.id);
                  return (
                    <td key={dateStr} className="px-1 py-1 align-top">
                      {dayShifts.map(shift => (
                        <div key={shift.id}
                          className={`group relative text-xs rounded px-1.5 py-1 mb-0.5 border cursor-pointer transition hover:shadow-sm ${
                            shift.type !== 'WORK'
                              ? SHIFT_TYPE_COLORS[shift.type]
                              : 'border-slate-200 hover:border-emerald-300'
                          }`}
                          style={shift.type === 'WORK' ? { backgroundColor: emp.color + '20', borderColor: emp.color + '60' } : {}}
                          onClick={() => openEditShift(shift)}>
                          {shift.type === 'WORK' ? (
                            <>
                              <div className="font-medium">{shift.start}-{shift.end}</div>
                              {shift.isOpener && <div className="text-emerald-600 font-medium">Opener</div>}
                            </>
                          ) : (
                            <div className="font-medium">{shift.type === 'VACATION' ? 'Urlaub' : shift.type === 'SICK' ? 'Krank' : 'Feiertag'}</div>
                          )}
                          <button onClick={e => { e.stopPropagation(); deleteShift(shift.id); }}
                            className="absolute top-0.5 right-0.5 hidden group-hover:block text-red-400 hover:text-red-600">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {dayShifts.length === 0 && (
                        <button onClick={() => openNewShift(dateStr, emp.id)}
                          className="w-full h-8 border border-dashed border-slate-200 rounded text-slate-300 hover:border-emerald-300 hover:text-emerald-400 transition flex items-center justify-center">
                          <Plus size={12} />
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {employees.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">Bitte zuerst Mitarbeiter im Tab "Team" erfassen.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Weekly Summary */}
      {employees.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-2">Wochenuebersicht</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {employees.map(emp => {
              const empShifts = weekShifts.filter(s => s.employeeId === emp.id && s.type === 'WORK');
              const hours = empShifts.reduce((sum, s) => sum + calcShiftHours(s), 0);
              const targetHours = (emp.pensum / 100) * 42;
              return (
                <div key={emp.id} className="text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: emp.color }} />
                    <span className="font-medium text-slate-700">{emp.shortName || emp.name}</span>
                  </div>
                  <div className={`text-xs ${Math.abs(hours - targetHours) < 1 ? 'text-emerald-600' : hours > targetHours ? 'text-red-500' : 'text-amber-500'}`}>
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
              <div>
                <label className="block text-sm text-slate-600 mb-1">Mitarbeiter</label>
                <select value={editingShift.employeeId}
                  onChange={e => setEditingShift({ ...editingShift, employeeId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Typ</label>
                <select value={editingShift.type}
                  onChange={e => setEditingShift({ ...editingShift, type: e.target.value as ShiftType })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="WORK">Arbeit</option>
                  <option value="VACATION">Urlaub</option>
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
                        onChange={e => setEditingShift({ ...editingShift, start: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Bis</label>
                      <input type="time" value={editingShift.end}
                        onChange={e => setEditingShift({ ...editingShift, end: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={editingShift.isOpener}
                      onChange={e => setEditingShift({ ...editingShift, isOpener: e.target.checked })}
                      className="accent-emerald-500" />
                    Opener (oeffnet die Apotheke)
                  </label>
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
