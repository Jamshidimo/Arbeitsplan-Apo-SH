import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import type { Employee, Role, StandardShift } from '../types';
import { ROLES, EMPLOYEE_COLORS, DAY_NAMES } from '../constants';

interface Props {
  employees: Employee[];
  onChange: (employees: Employee[]) => void;
}

function emptyEmployee(): Employee {
  return {
    id: `emp_${Date.now()}`,
    name: '',
    shortName: '',
    color: EMPLOYEE_COLORS[Math.floor(Math.random() * EMPLOYEE_COLORS.length)],
    role: 'Pharma-Assistent/in',
    pensum: 100,
    vacationDays: 25,
    fixedDaysOff: [0], // Sunday off by default
    standardShifts: [],
    notes: '',
  };
}

function emptyStdShift(): StandardShift {
  return { dayOfWeek: 1, start: '08:00', end: '17:00', isOpener: false };
}

export default function EmployeeManager({ employees, onChange }: Props) {
  const [editing, setEditing] = useState<Employee | null>(null);
  const [isNew, setIsNew] = useState(false);

  function openNew() {
    setEditing(emptyEmployee());
    setIsNew(true);
  }

  function openEdit(emp: Employee) {
    setEditing({ ...emp, standardShifts: emp.standardShifts.map(s => ({ ...s })), fixedDaysOff: [...emp.fixedDaysOff] });
    setIsNew(false);
  }

  function handleSave() {
    if (!editing || !editing.name.trim()) return;
    if (isNew) {
      onChange([...employees, editing]);
    } else {
      onChange(employees.map(e => e.id === editing.id ? editing : e));
    }
    setEditing(null);
  }

  function handleDelete(id: string) {
    onChange(employees.filter(e => e.id !== id));
  }

  function updateEditing(patch: Partial<Employee>) {
    if (editing) setEditing({ ...editing, ...patch });
  }

  function toggleDayOff(day: number) {
    if (!editing) return;
    const days = editing.fixedDaysOff.includes(day)
      ? editing.fixedDaysOff.filter(d => d !== day)
      : [...editing.fixedDaysOff, day];
    updateEditing({ fixedDaysOff: days });
  }

  function addStdShift() {
    if (!editing) return;
    updateEditing({ standardShifts: [...editing.standardShifts, emptyStdShift()] });
  }

  function updateStdShift(idx: number, patch: Partial<StandardShift>) {
    if (!editing) return;
    const shifts = editing.standardShifts.map((s, i) => i === idx ? { ...s, ...patch } : s);
    updateEditing({ standardShifts: shifts });
  }

  function removeStdShift(idx: number) {
    if (!editing) return;
    updateEditing({ standardShifts: editing.standardShifts.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">Team-Verwaltung</h2>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition">
          <Plus size={18} /> Mitarbeiter hinzufuegen
        </button>
      </div>

      {/* Employee List */}
      <div className="grid gap-3">
        {employees.length === 0 && (
          <p className="text-slate-400 text-center py-8">Noch keine Mitarbeiter erfasst.</p>
        )}
        {employees.map(emp => (
          <div key={emp.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: emp.color }} />
              <div>
                <div className="font-medium text-slate-800">{emp.name} <span className="text-slate-400 text-sm">({emp.shortName})</span></div>
                <div className="text-sm text-slate-500">{emp.role} &middot; {emp.pensum}% &middot; {emp.standardShifts.length} Schichten</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(emp)} className="p-2 text-slate-400 hover:text-emerald-500 transition"><Pencil size={16} /></button>
              <button onClick={() => handleDelete(emp.id)} className="p-2 text-slate-400 hover:text-red-500 transition"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{isNew ? 'Neuer Mitarbeiter' : 'Mitarbeiter bearbeiten'}</h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
                  <input value={editing.name} onChange={e => updateEditing({ name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Kuerzel</label>
                  <input value={editing.shortName} onChange={e => updateEditing({ shortName: e.target.value })}
                    maxLength={4}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Rolle</label>
                  <select value={editing.role} onChange={e => updateEditing({ role: e.target.value as Role })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Pensum (%)</label>
                  <input type="number" min={10} max={100} step={10} value={editing.pensum}
                    onChange={e => updateEditing({ pensum: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Urlaubstage/Jahr</label>
                  <input type="number" min={0} max={50} value={editing.vacationDays}
                    onChange={e => updateEditing({ vacationDays: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Farbe</label>
                  <input type="color" value={editing.color} onChange={e => updateEditing({ color: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer" />
                </div>
              </div>

              {/* Fixed days off */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Fix-Freitage</label>
                <div className="flex gap-2">
                  {DAY_NAMES.map((name, idx) => (
                    <button key={idx} onClick={() => toggleDayOff(idx)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        editing.fixedDaysOff.includes(idx) ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Standard Shifts */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-600">Standard-Schichten</label>
                  <button onClick={addStdShift} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">+ Schicht</button>
                </div>
                <div className="space-y-2">
                  {editing.standardShifts.map((shift, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                      <select value={shift.dayOfWeek} onChange={e => updateStdShift(idx, { dayOfWeek: Number(e.target.value) })}
                        className="border border-slate-300 rounded px-2 py-1 text-sm">
                        {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                      </select>
                      <input type="time" value={shift.start} onChange={e => updateStdShift(idx, { start: e.target.value })}
                        className="border border-slate-300 rounded px-2 py-1 text-sm" />
                      <span className="text-slate-400">-</span>
                      <input type="time" value={shift.end} onChange={e => updateStdShift(idx, { end: e.target.value })}
                        className="border border-slate-300 rounded px-2 py-1 text-sm" />
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <input type="checkbox" checked={shift.isOpener} onChange={e => updateStdShift(idx, { isOpener: e.target.checked })} />
                        Opener
                      </label>
                      <button onClick={() => removeStdShift(idx)} className="text-red-400 hover:text-red-600 ml-auto"><X size={14} /></button>
                    </div>
                  ))}
                  {editing.standardShifts.length === 0 && (
                    <p className="text-xs text-slate-400 py-2">Keine Standard-Schichten definiert.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notizen</label>
                <textarea value={editing.notes} onChange={e => updateEditing({ notes: e.target.value })}
                  rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition">Abbrechen</button>
              <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-600 transition">
                <Save size={16} /> Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
