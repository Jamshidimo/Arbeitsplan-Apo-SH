import { useState, useEffect, useRef } from 'react';
import { Users, Calendar, Clock, BarChart3, Settings, Loader2 } from 'lucide-react';
import { useCloudStorage } from './hooks/useCloudStorage';
import { STORAGE_KEYS, DEFAULT_DAY_CONFIGS, DEFAULT_EMPLOYEES, DEFAULT_SETTINGS, calcVacationDays } from './constants';
import type { Employee, Shift, DayConfig, TimeEntry, VacationEntry, AppSettings, DayNote } from './types';
import EmployeeManager from './components/EmployeeManager';
import DayConfigManager from './components/DayConfigManager';
import ScheduleView from './components/ScheduleView';
import StempelView from './components/StempelView';
import StatsView from './components/StatsView';
import PinScreen from './components/PinScreen';

type Tab = 'stempeln' | 'dienstplan' | 'auswertung' | 'team' | 'vorgaben';

const TABS: { id: Tab; label: string; icon: typeof Clock }[] = [
  { id: 'stempeln', label: 'Stempeln', icon: Clock },
  { id: 'dienstplan', label: 'Dienstplan', icon: Calendar },
  { id: 'auswertung', label: 'Auswertung', icon: BarChart3 },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'vorgaben', label: 'Soll-Vorgaben', icon: Settings },
];

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('apoplan_unlocked') === 'true');
  const [activeTab, setActiveTab] = useState<Tab>('dienstplan');
  const [employees, setEmployees, syncingEmp] = useCloudStorage<Employee[]>(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
  const [shifts, setShifts, syncingShifts] = useCloudStorage<Shift[]>(STORAGE_KEYS.SHIFTS, []);
  const [dayConfigs, setDayConfigs] = useCloudStorage<DayConfig[]>(STORAGE_KEYS.DAY_CONFIGS, DEFAULT_DAY_CONFIGS);
  const [timeEntries, setTimeEntries] = useCloudStorage<TimeEntry[]>(STORAGE_KEYS.TIME_ENTRIES, []);
  const [vacations, setVacations] = useCloudStorage<VacationEntry[]>(STORAGE_KEYS.VACATIONS, []);
  const [appSettings, setAppSettings] = useCloudStorage<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  const [dayNotes, setDayNotes] = useCloudStorage<DayNote[]>(STORAGE_KEYS.DAY_NOTES, []);

  // One-time migration: recalculate vacation days based on pensum
  const migrated = useRef(false);
  useEffect(() => {
    if (migrated.current || syncingEmp || employees.length === 0) return;
    const needsMigration = employees.some(e => e.vacationDays === 25 && e.pensum !== 100);
    if (needsMigration) {
      const updated = employees.map(e => ({
        ...e,
        vacationDays: e.pensum === 100 ? 25 : calcVacationDays(e.pensum),
      }));
      setEmployees(updated);
    }
    migrated.current = true;
  }, [employees, syncingEmp]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!unlocked) {
    return <PinScreen onUnlock={() => setUnlocked(true)} />;
  }

  const syncing = syncingEmp || syncingShifts;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 rounded-lg p-1.5">
              <Calendar size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">ApoPlan</h1>
              <p className="text-xs text-slate-400">Dienstplaner Apotheke Steinhölzli</p>
            </div>
          </div>
          {syncing && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              Synchronisiere...
            </div>
          )}
        </div>
        <nav className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition whitespace-nowrap ${
                    activeTab === tab.id ? 'bg-slate-50 text-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}>
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'stempeln' && (
          <StempelView employees={employees} timeEntries={timeEntries} onChange={setTimeEntries} settings={appSettings} onSettingsChange={setAppSettings} />
        )}
        {activeTab === 'dienstplan' && (
          <ScheduleView employees={employees} shifts={shifts} dayConfigs={dayConfigs} vacations={vacations} onShiftsChange={setShifts} dayNotes={dayNotes} onDayNotesChange={setDayNotes} />
        )}
        {activeTab === 'auswertung' && (
          <StatsView employees={employees} shifts={shifts} timeEntries={timeEntries} />
        )}
        {activeTab === 'team' && (
          <EmployeeManager employees={employees} onChange={setEmployees} vacations={vacations} onVacationsChange={setVacations} />
        )}
        {activeTab === 'vorgaben' && (
          <DayConfigManager configs={dayConfigs} onChange={setDayConfigs} />
        )}
      </main>
    </div>
  );
}
