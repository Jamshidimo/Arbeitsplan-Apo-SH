import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock, Lock, Settings } from 'lucide-react';
import type { Employee, TimeEntry, AppSettings } from '../types';

interface Props {
  employees: Employee[];
  timeEntries: TimeEntry[];
  onChange: (entries: TimeEntry[]) => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

const BUFFER_CODE = '1380';

export default function StempelView({ employees, timeEntries, onChange, settings, onSettingsChange }: Props) {
  const [now, setNow] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeUnlocked, setCodeUnlocked] = useState(false);
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

  function toggleClock(empId: string) {
    const active = getActiveEntry(empId);
    if (active) {
      onChange(timeEntries.map(e =>
        e.id === active.id ? { ...e, clockOut: new Date().toISOString() } : e
      ));
    } else {
      const entry: TimeEntry = {
        id: `te_${Date.now()}`,
        employeeId: empId,
        clockIn: new Date().toISOString(),
        clockOut: null,
      };
      onChange([...timeEntries, entry]);
    }
  }

  function calcHours(entry: TimeEntry): number {
    const start = new Date(entry.clockIn);
    const end = entry.clockOut ? new Date(entry.clockOut) : now;
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  function calcTodayHours(empId: string): number {
    return getTodayEntries(empId).reduce((sum, e) => sum + calcHours(e), 0);
  }

  function unlockSettings() {
    if (codeInput === BUFFER_CODE) {
      setCodeUnlocked(true);
      setCodeInput('');
    }
  }

  // Group employees by role
  const apotheker = employees.filter(e => e.role === 'Apotheker/in');
  const assistenten = employees.filter(e => e.role === 'Pharma-Assistent/in');
  const lernende = employees.filter(e => e.role === 'Lernende/r');
  const hauslieferdienst = employees.filter(e => e.role === 'Hauslieferdienst');

  function renderGroup(label: string, emps: Employee[]) {
    if (emps.length === 0) return null;
    return (
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</h3>
        <div className="flex flex-wrap gap-2">
          {emps.map(emp => {
            const active = !!getActiveEntry(emp.id);
            const hours = calcTodayHours(emp.id);
            const isHauslieferdienst = emp.role === 'Hauslieferdienst';
            return (
              <button key={emp.id} onClick={() => toggleClock(emp.id)}
                className={`relative px-3 py-2 rounded-lg text-sm font-medium transition shadow-sm min-w-[80px] text-center ${
                  active
                    ? 'bg-emerald-500 text-white shadow-emerald-200'
                    : 'bg-amber-100 text-amber-800 shadow-amber-100'
                }`}>
                <div className="font-bold">{emp.shortName || emp.name}</div>
                {hours > 0 && <div className="text-xs opacity-80">{hours.toFixed(1)}h</div>}
                {isHauslieferdienst && emp.hourlyRate && hours > 0 && (
                  <div className="text-xs opacity-70">CHF {(hours * emp.hourlyRate).toFixed(2)}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Clock Display */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
          <Clock size={16} />
          <span className="text-xs font-medium">Aktuelle Zeit</span>
        </div>
        <div className="text-4xl font-light text-slate-800 tabular-nums">
          {format(now, 'HH:mm:ss')}
        </div>
        <div className="text-sm text-slate-500">{format(now, 'EEEE, dd. MMMM yyyy', { locale: de })}</div>
      </div>

      {/* Employee Buttons grouped */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Ein-/Ausstempeln</h2>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Eingestempelt</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block border border-amber-200" /> Ausgestempelt</span>
          </div>
        </div>
        {renderGroup('Apotheker/innen', apotheker)}
        {renderGroup('Pharma-Assistent/innen', assistenten)}
        {renderGroup('Lernende', lernende)}
        {renderGroup('Hauslieferdienst', hauslieferdienst)}
      </div>

      {/* Today's detail */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Heutige Zeiten</h3>
        <div className="space-y-1 text-sm">
          {employees.filter(e => getTodayEntries(e.id).length > 0).map(emp => (
            <div key={emp.id} className="flex items-center gap-2">
              <span className="font-medium text-slate-700 w-16">{emp.shortName}</span>
              <div className="flex gap-2 flex-wrap text-xs text-slate-500">
                {getTodayEntries(emp.id).map(entry => (
                  <span key={entry.id}>
                    {format(new Date(entry.clockIn), 'HH:mm')}-{entry.clockOut ? format(new Date(entry.clockOut), 'HH:mm') : '...'}
                  </span>
                ))}
              </div>
              <span className="ml-auto text-xs font-medium text-slate-600">{calcTodayHours(emp.id).toFixed(1)}h</span>
            </div>
          ))}
          {employees.filter(e => getTodayEntries(e.id).length > 0).length === 0 && (
            <p className="text-xs text-slate-400">Heute noch keine Eintraege.</p>
          )}
        </div>
      </div>

      {/* Buffer Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Pufferzeit: {settings.bufferMinutes} Min.</span>
          </div>
          <button onClick={() => setShowSettings(!showSettings)}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <Lock size={12} /> Aendern
          </button>
        </div>
        {showSettings && !codeUnlocked && (
          <div className="mt-3 flex gap-2">
            <input type="password" placeholder="Code eingeben" value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && unlockSettings()}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-40" />
            <button onClick={unlockSettings}
              className="bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm">OK</button>
          </div>
        )}
        {showSettings && codeUnlocked && (
          <div className="mt-3 flex items-center gap-2">
            <label className="text-sm text-slate-600">Pufferzeit (Minuten):</label>
            <input type="number" min={0} max={60} step={5} value={settings.bufferMinutes}
              onChange={e => onSettingsChange({ ...settings, bufferMinutes: Number(e.target.value) })}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-20" />
            <button onClick={() => { setShowSettings(false); setCodeUnlocked(false); }}
              className="text-xs text-slate-400 hover:text-slate-600">Fertig</button>
          </div>
        )}
      </div>
    </div>
  );
}
