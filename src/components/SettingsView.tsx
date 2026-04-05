import { useState } from 'react';
import { Plus, X, Lock, Check } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { DayConfig, Employee, CustomHoliday, TeamMeeting, TimeCorrection, HourAdjustment, TimeEntry } from '../types';
import { DAY_NAMES_LONG, CORRECTION_CODE } from '../constants';
import { getAllHolidaysForYear } from '../services/holidays';

interface Props {
  configs: DayConfig[];
  onConfigsChange: (configs: DayConfig[]) => void;
  employees: Employee[];
  customHolidays: CustomHoliday[];
  onCustomHolidaysChange: (holidays: CustomHoliday[]) => void;
  teamMeetings: TeamMeeting[];
  onTeamMeetingsChange: (meetings: TeamMeeting[]) => void;
  timeCorrections: TimeCorrection[];
  onTimeCorrectionsChange: (corrections: TimeCorrection[]) => void;
  hourAdjustments: HourAdjustment[];
  onHourAdjustmentsChange: (adjustments: HourAdjustment[]) => void;
  timeEntries: TimeEntry[];
  onTimeEntriesChange: (entries: TimeEntry[]) => void;
}

export default function SettingsView({
  configs, onConfigsChange,
  employees,
  customHolidays, onCustomHolidaysChange,
  teamMeetings, onTeamMeetingsChange,
  timeCorrections, onTimeCorrectionsChange,
  hourAdjustments, onHourAdjustmentsChange,
  timeEntries, onTimeEntriesChange,
}: Props) {
  const [section, setSection] = useState<'hours' | 'holidays' | 'meetings' | 'corrections' | 'adjustments'>('hours');
  const [codeInput, setCodeInput] = useState('');
  const [correctionUnlocked, setCorrectionUnlocked] = useState(false);

  // Holiday state
  const [newHolDate, setNewHolDate] = useState('');
  const [newHolName, setNewHolName] = useState('');
  const [holYear, setHolYear] = useState(new Date().getFullYear());

  // Meeting state
  const [newMeetDate, setNewMeetDate] = useState('');
  const [newMeetTitle, setNewMeetTitle] = useState('');

  // Correction state
  const [corrEmp, setCorrEmp] = useState('');
  const [corrDate, setCorrDate] = useState('');
  const [corrIn, setCorrIn] = useState('');
  const [corrOut, setCorrOut] = useState('');
  const [corrReason, setCorrReason] = useState('');

  // Adjustment state
  const [adjEmp, setAdjEmp] = useState('');
  const [adjDate, setAdjDate] = useState('');
  const [adjHours, setAdjHours] = useState('');
  const [adjReason, setAdjReason] = useState('');

  function updateConfig(dayOfWeek: number, patch: Partial<DayConfig>) {
    onConfigsChange(configs.map(c => c.dayOfWeek === dayOfWeek ? { ...c, ...patch } : c));
  }

  function addCustomHoliday() {
    if (!newHolDate || !newHolName.trim()) return;
    onCustomHolidaysChange([...customHolidays, { id: `hol_${Date.now()}`, date: newHolDate, name: newHolName.trim() }]);
    setNewHolDate(''); setNewHolName('');
  }

  function addMeeting() {
    if (!newMeetDate || !newMeetTitle.trim()) return;
    onTeamMeetingsChange([...teamMeetings, { id: `meet_${Date.now()}`, date: newMeetDate, title: newMeetTitle.trim(), attendees: [] }]);
    setNewMeetDate(''); setNewMeetTitle('');
  }

  function toggleAttendee(meetingId: string, empId: string) {
    onTeamMeetingsChange(teamMeetings.map(m => {
      if (m.id !== meetingId) return m;
      const attendees = m.attendees.includes(empId)
        ? m.attendees.filter(a => a !== empId)
        : [...m.attendees, empId];
      return { ...m, attendees };
    }));
  }

  function unlockCorrections() {
    if (codeInput === CORRECTION_CODE) { setCorrectionUnlocked(true); setCodeInput(''); }
  }

  function addCorrection() {
    if (!corrEmp || !corrDate || !corrIn || !corrOut) return;
    // Add as a TimeCorrection record
    onTimeCorrectionsChange([...timeCorrections, {
      id: `corr_${Date.now()}`, employeeId: corrEmp, date: corrDate, clockIn: corrIn, clockOut: corrOut, reason: corrReason,
    }]);
    // Also add as actual TimeEntry so it counts in stats
    const clockInISO = new Date(`${corrDate}T${corrIn}:00`).toISOString();
    const clockOutISO = new Date(`${corrDate}T${corrOut}:00`).toISOString();
    onTimeEntriesChange([...timeEntries, {
      id: `te_corr_${Date.now()}`, employeeId: corrEmp, clockIn: clockInISO, clockOut: clockOutISO,
    }]);
    setCorrEmp(''); setCorrDate(''); setCorrIn(''); setCorrOut(''); setCorrReason('');
  }

  function addAdjustment() {
    if (!adjEmp || !adjDate || !adjHours) return;
    onHourAdjustmentsChange([...hourAdjustments, {
      id: `adj_${Date.now()}`, employeeId: adjEmp, date: adjDate, hours: Number(adjHours), reason: adjReason,
    }]);
    setAdjEmp(''); setAdjDate(''); setAdjHours(''); setAdjReason('');
  }

  const planEmployees = employees.filter(e => e.role !== 'Hauslieferdienst');
  const allHolidays = getAllHolidaysForYear(holYear);

  const tabs = [
    { id: 'hours' as const, label: 'Oeffnungszeiten' },
    { id: 'holidays' as const, label: 'Feiertage' },
    { id: 'meetings' as const, label: 'Teamsitzungen' },
    { id: 'corrections' as const, label: 'Stempelkorrekturen' },
    { id: 'adjustments' as const, label: 'Stunden-Korrekturen' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Einstellungen</h2>

      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition border-b-2 ${
              section === t.id ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Opening Hours */}
      {section === 'hours' && (
        <div className="grid gap-3">
          {configs.map(config => (
            <div key={config.dayOfWeek} className={`bg-white rounded-lg shadow-sm border border-slate-200 p-4 transition ${!config.isOpen ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-700">{DAY_NAMES_LONG[config.dayOfWeek]}</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={config.isOpen}
                    onChange={e => updateConfig(config.dayOfWeek, { isOpen: e.target.checked })}
                    className="accent-emerald-500" />
                  Geoeffnet
                </label>
              </div>
              {config.isOpen && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Oeffnung</label>
                    <input type="time" value={config.openTime}
                      onChange={e => updateConfig(config.dayOfWeek, { openTime: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Schliessung</label>
                    <input type="time" value={config.closeTime}
                      onChange={e => updateConfig(config.dayOfWeek, { closeTime: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Holidays */}
      {section === 'holidays' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Feiertage {holYear}</h3>
              <div className="flex gap-1">
                <button onClick={() => setHolYear(y => y - 1)} className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">&larr;</button>
                <button onClick={() => setHolYear(y => y + 1)} className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">&rarr;</button>
              </div>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {allHolidays.map(h => {
                const isCustom = customHolidays.some(c => c.date === h.date);
                const dayName = format(new Date(h.date + 'T00:00:00'), 'EE', { locale: de });
                return (
                  <div key={h.date} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-slate-50">
                    <div>
                      <span className="text-slate-500 w-8 inline-block">{dayName}</span>
                      <span className="text-slate-700 font-medium ml-2">{h.date}</span>
                      <span className="text-slate-600 ml-3">{h.name}</span>
                      {isCustom && <span className="text-xs text-emerald-600 ml-2">(manuell)</span>}
                    </div>
                    {isCustom && (
                      <button onClick={() => onCustomHolidaysChange(customHolidays.filter(c => c.date !== h.date))}
                        className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Feiertag hinzufuegen</h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Datum</label>
                <input type="date" value={newHolDate} onChange={e => setNewHolDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Name</label>
                <input value={newHolName} onChange={e => setNewHolName(e.target.value)}
                  placeholder="z.B. Betriebsferien"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={addCustomHoliday} className="bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-emerald-600"><Plus size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Team Meetings */}
      {section === 'meetings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Neue Teamsitzung</h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Datum</label>
                <input type="date" value={newMeetDate} onChange={e => setNewMeetDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Titel</label>
                <input value={newMeetTitle} onChange={e => setNewMeetTitle(e.target.value)}
                  placeholder="z.B. Monats-Meeting"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={addMeeting} className="bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-emerald-600"><Plus size={16} /></button>
            </div>
          </div>
          <div className="space-y-3">
            {teamMeetings.sort((a, b) => b.date.localeCompare(a.date)).map(meeting => (
              <div key={meeting.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-slate-700">{meeting.title}</span>
                    <span className="text-sm text-slate-500 ml-2">{meeting.date}</span>
                    <span className="text-xs text-slate-400 ml-2">({meeting.attendees.length} anwesend)</span>
                  </div>
                  <button onClick={() => onTeamMeetingsChange(teamMeetings.filter(m => m.id !== meeting.id))}
                    className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {planEmployees.map(emp => {
                    const attended = meeting.attendees.includes(emp.id);
                    return (
                      <button key={emp.id} onClick={() => toggleAttendee(meeting.id, emp.id)}
                        className={`px-2 py-1 rounded text-xs font-medium transition border ${
                          attended
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                        {attended && <Check size={10} className="inline mr-0.5" />}
                        {emp.shortName || emp.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {teamMeetings.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Keine Teamsitzungen erfasst.</p>}
          </div>
        </div>
      )}

      {/* Time Corrections */}
      {section === 'corrections' && (
        <div className="space-y-4">
          {!correctionUnlocked && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lock size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Code eingeben um Korrekturen vorzunehmen</span>
              </div>
              <div className="flex gap-2">
                <input type="password" placeholder="Code" value={codeInput}
                  onChange={e => setCodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && unlockCorrections()}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-40" />
                <button onClick={unlockCorrections} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm">Entsperren</button>
              </div>
            </div>
          )}
          {correctionUnlocked && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Stempelzeit nachtragen</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Mitarbeiter</label>
                    <select value={corrEmp} onChange={e => setCorrEmp(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Waehlen...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Datum</label>
                    <input type="date" value={corrDate} onChange={e => setCorrDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">Ein</label>
                      <input type="time" value={corrIn} onChange={e => setCorrIn(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">Aus</label>
                      <input type="time" value={corrOut} onChange={e => setCorrOut(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Grund</label>
                    <input value={corrReason} onChange={e => setCorrReason(e.target.value)}
                      placeholder="z.B. Vergessen auszustempeln"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <button onClick={addCorrection} className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-600">Nachtragen</button>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Bisherige Korrekturen</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {timeCorrections.sort((a, b) => b.date.localeCompare(a.date)).map(c => {
                    const emp = employees.find(e => e.id === c.employeeId);
                    return (
                      <div key={c.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-slate-50">
                        <div>
                          <span className="font-medium text-slate-700">{emp?.shortName || '?'}</span>
                          <span className="text-slate-500 ml-2">{c.date}</span>
                          <span className="text-slate-600 ml-2">{c.clockIn}-{c.clockOut}</span>
                          {c.reason && <span className="text-slate-400 ml-2 text-xs">({c.reason})</span>}
                        </div>
                        <button onClick={() => onTimeCorrectionsChange(timeCorrections.filter(x => x.id !== c.id))}
                          className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                      </div>
                    );
                  })}
                  {timeCorrections.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Keine Korrekturen.</p>}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hour Adjustments */}
      {section === 'adjustments' && (
        <div className="space-y-4">
          {!correctionUnlocked && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lock size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Code eingeben um Korrekturen vorzunehmen</span>
              </div>
              <div className="flex gap-2">
                <input type="password" placeholder="Code" value={codeInput}
                  onChange={e => setCodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && unlockCorrections()}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-40" />
                <button onClick={unlockCorrections} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm">Entsperren</button>
              </div>
            </div>
          )}
          {correctionUnlocked && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Stunden gutschreiben / abziehen</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Mitarbeiter</label>
                    <select value={adjEmp} onChange={e => setAdjEmp(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Waehlen...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Datum</label>
                    <input type="date" value={adjDate} onChange={e => setAdjDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Stunden (+/-)</label>
                    <input type="number" step={0.25} value={adjHours} onChange={e => setAdjHours(e.target.value)}
                      placeholder="z.B. 2 oder -1.5"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Grund</label>
                    <input value={adjReason} onChange={e => setAdjReason(e.target.value)}
                      placeholder="z.B. Ueberstunden-Korrektur"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <button onClick={addAdjustment} className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-600">Hinzufuegen</button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Bisherige Anpassungen</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {hourAdjustments.sort((a, b) => b.date.localeCompare(a.date)).map(a => {
                    const emp = employees.find(e => e.id === a.employeeId);
                    return (
                      <div key={a.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-slate-50">
                        <div>
                          <span className="font-medium text-slate-700">{emp?.shortName || '?'}</span>
                          <span className="text-slate-500 ml-2">{a.date}</span>
                          <span className={`ml-2 font-medium ${a.hours >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {a.hours >= 0 ? '+' : ''}{a.hours}h
                          </span>
                          {a.reason && <span className="text-slate-400 ml-2 text-xs">({a.reason})</span>}
                        </div>
                        <button onClick={() => onHourAdjustmentsChange(hourAdjustments.filter(x => x.id !== a.id))}
                          className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                      </div>
                    );
                  })}
                  {hourAdjustments.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Keine Anpassungen.</p>}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
