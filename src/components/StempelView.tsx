import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock, LogIn, LogOut } from 'lucide-react';
import type { Employee, TimeEntry } from '../types';

interface Props {
  employees: Employee[];
  timeEntries: TimeEntry[];
  onChange: (entries: TimeEntry[]) => void;
}

export default function StempelView({ employees, timeEntries, onChange }: Props) {
  const [now, setNow] = useState(new Date());
  const todayStr = format(now, 'yyyy-MM-dd');

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function getActiveEntry(empId: string): TimeEntry | undefined {
    return timeEntries.find(e => e.employeeId === empId && e.clockOut === null);
  }

  function getTodayEntries(empId: string): TimeEntry[] {
    return timeEntries.filter(e =>
      e.employeeId === empId && e.clockIn.startsWith(todayStr)
    );
  }

  function clockIn(empId: string) {
    const entry: TimeEntry = {
      id: `te_${Date.now()}`,
      employeeId: empId,
      clockIn: new Date().toISOString(),
      clockOut: null,
    };
    onChange([...timeEntries, entry]);
  }

  function clockOut(empId: string) {
    const active = getActiveEntry(empId);
    if (!active) return;
    onChange(timeEntries.map(e =>
      e.id === active.id ? { ...e, clockOut: new Date().toISOString() } : e
    ));
  }

  function calcHours(entry: TimeEntry): number {
    const start = new Date(entry.clockIn);
    const end = entry.clockOut ? new Date(entry.clockOut) : now;
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  return (
    <div className="space-y-4">
      {/* Clock Display */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-400 mb-2">
          <Clock size={20} />
          <span className="text-sm font-medium">Aktuelle Zeit</span>
        </div>
        <div className="text-5xl font-light text-slate-800 tabular-nums">
          {format(now, 'HH:mm:ss')}
        </div>
        <div className="text-slate-500 mt-1">{format(now, 'EEEE, dd. MMMM yyyy', { locale: de })}</div>
      </div>

      {/* Employee Clock Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {employees.map(emp => {
          const active = getActiveEntry(emp.id);
          const todayEntries = getTodayEntries(emp.id);
          const todayHours = todayEntries.reduce((sum, e) => sum + calcHours(e), 0);

          return (
            <div key={emp.id} className={`bg-white rounded-xl shadow-sm border-2 p-4 transition ${
              active ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: emp.color }} />
                  <span className="font-medium text-slate-800">{emp.name}</span>
                  {active && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Aktiv</span>}
                </div>
                <span className="text-sm text-slate-500">{todayHours.toFixed(1)}h heute</span>
              </div>

              {active ? (
                <button onClick={() => clockOut(emp.id)}
                  className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-2.5 rounded-lg hover:bg-red-600 transition font-medium">
                  <LogOut size={18} /> Ausstempeln
                </button>
              ) : (
                <button onClick={() => clockIn(emp.id)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-2.5 rounded-lg hover:bg-emerald-600 transition font-medium">
                  <LogIn size={18} /> Einstempeln
                </button>
              )}

              {/* Today's entries */}
              {todayEntries.length > 0 && (
                <div className="mt-3 space-y-1">
                  {todayEntries.map(entry => (
                    <div key={entry.id} className="flex justify-between text-xs text-slate-500">
                      <span>{format(new Date(entry.clockIn), 'HH:mm')} - {entry.clockOut ? format(new Date(entry.clockOut), 'HH:mm') : 'aktiv...'}</span>
                      <span>{calcHours(entry).toFixed(1)}h</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {employees.length === 0 && (
          <p className="text-slate-400 text-center py-8 col-span-2">Bitte zuerst Mitarbeiter im Tab "Team" erfassen.</p>
        )}
      </div>
    </div>
  );
}
