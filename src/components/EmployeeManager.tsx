import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Save, Palmtree } from 'lucide-react';
import type { Employee, Role, StandardShift, VacationEntry, ShiftTemplate } from '../types';
import { ROLES, DAY_NAMES, calcVacationDays, SHIFT_TEMPLATES, ABSENCE_TYPES, formatDateDE } from '../constants';
import { countWorkingDays } from '../services/schedule';

interface Props {
  employees: Employee[];
  onChange: (employees: Employee[]) => void;
  vacations: VacationEntry[];
  onVacationsChange: (vacations: VacationEntry[]) => void;
}

const ABSENCE_ENTRY_TYPES = ABSENCE_TYPES.filter(a => a.type !== 'SICK' && a.type !== 'HOLIDAY');

function emptyEmployee(): Employee {
  return {
    id: `emp_${Date.now()}`,
    name: '',
    shortName: '',
    color: '#94a3b8',
    role: 'Pharma-Assistent/in',
    pensum: 100,
    vacationDays: 25,
    fixedDaysOff: [0],
    standardShifts: [],
    notes: '',
    contractStart: new Date().toISOString().substring(0, 10),
  };
}

function emptyStdShift(): StandardShift {
  return { dayOfWeek: 1, start: '08:00', end: '17:00', isOpener: false, lunchBreak: true, lunchDuration: 60, template: 'CUSTOM' };
}

export default function EmployeeManager({ employees, onChange, vacations, onVacationsChange }: Props) {
  const [editing, setEditing] = useState<Employee | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [vacationModal, setVacationModal] = useState<string | null>(null);
  const [newVacStart, setNewVacStart] = useState('');
  const [newVacEnd, setNewVacEnd] = useState('');
  const [newVacType, setNewVacType] = useState<VacationEntry['type']>('VACATION');

  function openNew() { setEditing(emptyEmployee()); setIsNew(true); }
  function openEdit(emp: Employee) {
    setEditing({ ...emp, standardShifts: emp.standardShifts.map(s => ({ ...s })), fixedDaysOff: [...emp.fixedDaysOff] });
    setIsNew(false);
  }

  function handleSave() {
    if (!editing || !editing.name.trim()) return;
    if (isNew) { onChange([...employees, editing]); } else { onChange(employees.map(e => e.id === editing.id ? editing : e)); }
    setEditing(null);
  }

  function handleDelete(id: string) { onChange(employees.filter(e => e.id !== id)); }

  function updateEditing(patch: Partial<Employee>) {
    if (!editing) return;
    const updated = { ...editing, ...patch };
    if ('pensum' in patch && patch.pensum !== undefined) {
      updated.vacationDays = calcVacationDays(patch.pensum);
    }
    setEditing(updated);
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
    setEditing({ ...editing, standardShifts: [...editing.standardShifts, emptyStdShift()] });
  }

  function applyShiftTemplate(idx: number, templateId: ShiftTemplate) {
    if (!editing) return;
    const t = SHIFT_TEMPLATES.find(s => s.id === templateId);
    if (!t) return;
    const shifts = editing.standardShifts.map((s, i) =>
      i === idx ? { ...s, start: t.morning, end: t.afternoonEnd, isOpener: templateId === 'OPENER', lunchBreak: true, lunchDuration: 60, template: templateId } : s
    );
    setEditing({ ...editing, standardShifts: shifts });
  }

  function updateStdShift(idx: number, patch: Partial<StandardShift>) {
    if (!editing) return;
    const shifts = editing.standardShifts.map((s, i) => {
      if (i !== idx) return s;
      const updated = { ...s, ...patch };
      if ('start' in patch || 'end' in patch) {
        updated.template = 'CUSTOM';
        const [sh, sm] = updated.start.split(':').map(Number);
        const [eh, em] = updated.end.split(':').map(Number);
        const hours = (eh + em / 60) - (sh + sm / 60);
        if (hours > 5 && !updated.lunchBreak) { updated.lunchBreak = true; updated.lunchDuration = 60; }
      }
      return updated;
    });
    setEditing({ ...editing, standardShifts: shifts });
  }

  function removeStdShift(idx: number) {
    if (!editing) return;
    setEditing({ ...editing, standardShifts: editing.standardShifts.filter((_, i) => i !== idx) });
  }

  function addVacation(empId: string) {
    if (!newVacStart || !newVacEnd || newVacEnd < newVacStart) return;
    onVacationsChange([...vacations, {
      id: `vac_${Date.now()}`,
      employeeId: empId,
      startDate: newVacStart,
      endDate: newVacEnd,
      type: newVacType,
    }]);
    setNewVacStart(''); setNewVacEnd(''); setNewVacType('VACATION');
  }

  function deleteVacation(id: string) { onVacationsChange(vacations.filter(v => v.id !== id)); }
  function getEmployeeVacations(empId: string) { return vacations.filter(v => v.employeeId === empId).sort((a, b) => a.startDate.localeCompare(b.startDate)); }

  // Group employees
  const groups: { label: string; emps: Employee[] }[] = [
    { label: 'Apotheker/innen', emps: employees.filter(e => e.role === 'Apotheker/in') },
    { label: 'Pharma-Assistent/innen', emps: employees.filter(e => e.role === 'Pharma-Assistent/in') },
    { label: 'Lernende', emps: employees.filter(e => e.role === 'Lernende/r') },
    { label: 'Hauslieferdienst', emps: employees.filter(e => e.role === 'Hauslieferdienst') },
  ];

  function getAbsenceLabel(type: VacationEntry['type']): string {
    const info = ABSENCE_ENTRY_TYPES.find(a => a.type === type);
    return info?.shortLabel || type;
  }

  function getAbsenceColor(type: VacationEntry['type']): string {
    const info = ABSENCE_ENTRY_TYPES.find(a => a.type === type);
    return info?.color || '#f59e0b';
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">Team-Verwaltung</h2>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition">
          <Plus size={18} /> Mitarbeiter hinzufuegen
        </button>
      </div>

      {groups.map(group => group.emps.length > 0 && (
        <div key={group.label}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{group.label}</h3>
          <div className="grid gap-2">
            {group.emps.map(emp => {
              const empVacations = getEmployeeVacations(emp.id);
              return (
                <div key={emp.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-800">{emp.name} <span className="text-slate-400 text-sm">({emp.shortName})</span></div>
                      <div className="text-xs text-slate-500">
                        {emp.pensum}% &middot; {emp.vacationDays} Ferientage &middot; {emp.standardShifts.length} Schichten
                        {emp.role === 'Hauslieferdienst' && emp.hourlyRate && <> &middot; CHF {emp.hourlyRate}/h</>}
                        {emp.contractStart && <> &middot; ab {formatDateDE(emp.contractStart)}</>}
                        {emp.contractEnd && <> &middot; <span className="text-red-500">bis {formatDateDE(emp.contractEnd)}</span></>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {emp.role !== 'Hauslieferdienst' && (
                        <button onClick={() => setVacationModal(emp.id)} className="p-1.5 text-slate-400 hover:text-amber-500 transition" title="Ferien / Abwesenheiten"><Palmtree size={14} /></button>
                      )}
                      <button onClick={() => openEdit(emp)} className="p-1.5 text-slate-400 hover:text-emerald-500 transition"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {empVacations.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {empVacations.map(v => {
                        const color = getAbsenceColor(v.type);
                        const label = getAbsenceLabel(v.type);
                        const workDays = countWorkingDays(v.startDate, v.endDate);
                        return (
                          <span key={v.id} className="inline-flex items-center gap-1 text-xs border rounded-full px-2 py-0.5"
                            style={{ backgroundColor: color + '15', color, borderColor: color + '40' }}>
                            {label}: {formatDateDE(v.startDate)} - {formatDateDE(v.endDate)} ({workDays} AT)
                            <button onClick={() => deleteVacation(v.id)} className="hover:opacity-60"><X size={10} /></button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {employees.length === 0 && <p className="text-slate-400 text-center py-8">Noch keine Mitarbeiter erfasst.</p>}

      {/* Absence Modal */}
      {vacationModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Abwesenheiten - {employees.find(e => e.id === vacationModal)?.name}</h3>
              <button onClick={() => setVacationModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Typ</label>
                <select value={newVacType} onChange={e => setNewVacType(e.target.value as VacationEntry['type'])}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  {ABSENCE_ENTRY_TYPES.map(a => (
                    <option key={a.type} value={a.type}>{a.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Von</label>
                  <input type="date" value={newVacStart} onChange={e => setNewVacStart(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Bis</label>
                  <input type="date" value={newVacEnd} onChange={e => setNewVacEnd(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex items-end">
                  <button onClick={() => addVacation(vacationModal)} className="bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-emerald-600 transition"><Plus size={16} /></button>
                </div>
              </div>
              {newVacStart && newVacEnd && newVacEnd >= newVacStart && (
                <div className="text-xs text-slate-500">
                  = {countWorkingDays(newVacStart, newVacEnd)} Arbeitstage (Mo-Fr, ohne Feiertage)
                </div>
              )}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {getEmployeeVacations(vacationModal).map(v => {
                const color = getAbsenceColor(v.type);
                const label = getAbsenceLabel(v.type);
                const workDays = countWorkingDays(v.startDate, v.endDate);
                return (
                  <div key={v.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: color + '10', borderColor: color + '30' }}>
                    <div>
                      <span className="font-medium" style={{ color }}>{label}</span>
                      <span className="text-slate-600 ml-2">{formatDateDE(v.startDate)} bis {formatDateDE(v.endDate)}</span>
                      <span className="text-slate-400 ml-1">({workDays} AT)</span>
                    </div>
                    <button onClick={() => deleteVacation(v.id)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                );
              })}
              {getEmployeeVacations(vacationModal).length === 0 && <p className="text-xs text-slate-400 text-center py-4">Keine Abwesenheiten eingetragen.</p>}
            </div>
          </div>
        </div>
      )}

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
                  <input value={editing.name} onChange={e => updateEditing({ name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Kuerzel</label>
                  <input value={editing.shortName} onChange={e => updateEditing({ shortName: e.target.value })} maxLength={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Rolle</label>
                  <select value={editing.role} onChange={e => updateEditing({ role: e.target.value as Role })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Pensum (%)</label>
                  <input type="number" min={1} max={100} step={1} value={editing.pensum} onChange={e => updateEditing({ pensum: Number(e.target.value) })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Ferientage/Jahr</label>
                  <input type="number" min={0} max={50} step={0.5} value={editing.vacationDays} onChange={e => setEditing({ ...editing, vacationDays: Number(e.target.value) })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Vertragsbeginn</label>
                  <input type="date" value={editing.contractStart || ''} onChange={e => updateEditing({ contractStart: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Geburtstag</label>
                  <input type="date" value={editing.birthday || ''} onChange={e => updateEditing({ birthday: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Vertragsende</label>
                  <input type="date" value={editing.contractEnd || ''} onChange={e => updateEditing({ contractEnd: e.target.value || undefined })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              {editing.role === 'Hauslieferdienst' && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Stundenlohn (CHF)</label>
                  <input type="number" min={0} step={0.5} value={editing.hourlyRate || ''} onChange={e => updateEditing({ hourlyRate: Number(e.target.value) || undefined })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              )}

              {editing.role !== 'Hauslieferdienst' && (
                <>
                  {/* Fixed days off */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Fix-Freitage</label>
                    <div className="flex gap-2">
                      {DAY_NAMES.map((name, idx) => (
                        <button key={idx} onClick={() => toggleDayOff(idx)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition ${editing.fixedDaysOff.includes(idx) ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
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
                        <div key={idx} className="bg-slate-50 rounded-lg p-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <select value={shift.dayOfWeek} onChange={e => updateStdShift(idx, { dayOfWeek: Number(e.target.value) })} className="border border-slate-300 rounded px-2 py-1 text-sm">
                              {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                            </select>
                            {/* Template quick buttons */}
                            <div className="flex gap-1">
                              {SHIFT_TEMPLATES.map(t => (
                                <button key={t.id} onClick={() => applyShiftTemplate(idx, t.id)}
                                  className={`w-6 h-6 rounded text-xs font-bold border ${shift.template === t.id ? 'ring-2 ring-offset-1' : ''}`}
                                  style={{ borderColor: t.color, color: t.color, backgroundColor: t.color + '15' }}
                                  title={t.label}>
                                  {t.id === 'OPENER' ? 'O' : t.id}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => removeStdShift(idx)} className="text-red-400 hover:text-red-600 ml-auto"><X size={14} /></button>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <input type="time" value={shift.start} onChange={e => updateStdShift(idx, { start: e.target.value })} className="border border-slate-300 rounded px-1 py-0.5 text-xs" />
                            <span>-</span>
                            <input type="time" value={shift.end} onChange={e => updateStdShift(idx, { end: e.target.value })} className="border border-slate-300 rounded px-1 py-0.5 text-xs" />
                            <label className="flex items-center gap-1 ml-2">
                              <input type="checkbox" checked={shift.lunchBreak} onChange={e => updateStdShift(idx, { lunchBreak: e.target.checked })} />
                              Mittag
                            </label>
                            {shift.lunchBreak && (
                              <>
                                <input type="number" min={15} max={120} step={15} value={shift.lunchDuration} onChange={e => updateStdShift(idx, { lunchDuration: Number(e.target.value) })} className="w-12 border border-slate-300 rounded px-1 py-0.5 text-xs" />
                                <span>Min</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      {editing.standardShifts.length === 0 && <p className="text-xs text-slate-400 py-2">Keine Standard-Schichten definiert.</p>}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notizen</label>
                <textarea value={editing.notes} onChange={e => updateEditing({ notes: e.target.value })} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition">Abbrechen</button>
              <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-600 transition"><Save size={16} /> Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
