import { useState } from 'react';
import { Users, Calendar, Clock, BarChart3, Settings } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { STORAGE_KEYS, DEFAULT_DAY_CONFIGS, DEFAULT_EMPLOYEES } from './constants';
import type { Employee, Shift, DayConfig, TimeEntry, VacationEntry } from './types';
import EmployeeManager from './components/EmployeeManager';
import DayConfigManager from './components/DayConfigManager';
import ScheduleView from './components/ScheduleView';
import StempelView from './components/StempelView';
import StatsView from './components/StatsView';

type Tab = 'stempeln' | 'dienstplan' | 'auswertung' | 'team' | 'vorgaben';

const TABS: { id: Tab; label: string; icon: typeof Clock }[] = [
  { id: 'stempeln', label: 'Stempeln', icon: Clock },
  { id: 'dienstplan', label: 'Dienstplan', icon: Calendar },
  { id: 'auswertung', label: 'Auswertung', icon: BarChart3 },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'vorgaben', label: 'Soll-Vorgaben', icon: Settings },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dienstplan');
  const [employees, setEmployees] = useLocalStorage<Employee[]>(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
  const [shifts, setShifts] = useLocalStorage<Shift[]>(STORAGE_KEYS.SHIFTS, []);
  const [dayConfigs, setDayConfigs] = useLocalStorage<DayConfig[]>(STORAGE_KEYS.DAY_CONFIGS, DEFAULT_DAY_CONFIGS);
  const [timeEntries, setTimeEntries] = useLocalStorage<TimeEntry[]>(STORAGE_KEYS.TIME_ENTRIES, []);
  const [vacations, _setVacations] = useLocalStorage<VacationEntry[]>(STORAGE_KEYS.VACATIONS, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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
        </div>

        {/* Tab Navigation */}
        <nav className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-slate-50 text-slate-800'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}>
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'stempeln' && (
          <StempelView employees={employees} timeEntries={timeEntries} onChange={setTimeEntries} />
        )}
        {activeTab === 'dienstplan' && (
          <ScheduleView
            employees={employees}
            shifts={shifts}
            dayConfigs={dayConfigs}
            vacations={vacations}
            onShiftsChange={setShifts}
          />
        )}
        {activeTab === 'auswertung' && (
          <StatsView employees={employees} shifts={shifts} timeEntries={timeEntries} />
        )}
        {activeTab === 'team' && (
          <EmployeeManager employees={employees} onChange={setEmployees} />
        )}
        {activeTab === 'vorgaben' && (
          <DayConfigManager configs={dayConfigs} onChange={setDayConfigs} />
        )}
      </main>
    </div>
  );
}
