import type { DayConfig, Employee, Role, ShiftTemplate, ShiftType } from './types';

export const HOURS_PER_WEEK_FULL = 42;
export const VACATION_DAYS_FULL = 25;

export function calcVacationDays(pensum: number): number {
  return Math.round((pensum / 100) * VACATION_DAYS_FULL * 10) / 10;
}

export const ROLES: Role[] = [
  'Apotheker/in',
  'Pharma-Assistent/in',
  'Lernende/r',
  'Hauslieferdienst',
];

// Shift templates with colors
export const SHIFT_TEMPLATES: { id: ShiftTemplate; label: string; color: string; morning: string; morningEnd: string; afternoon: string; afternoonEnd: string }[] = [
  { id: 'OPENER', label: 'Opener', color: '#10b981', morning: '07:30', morningEnd: '12:00', afternoon: '13:00', afternoonEnd: '17:00' },
  { id: 'X', label: 'Schicht X', color: '#3b82f6', morning: '09:00', morningEnd: '13:00', afternoon: '14:00', afternoonEnd: '18:30' },
  { id: 'Y', label: 'Schicht Y', color: '#f59e0b', morning: '07:45', morningEnd: '12:00', afternoon: '13:00', afternoonEnd: '17:15' },
  { id: 'Z', label: 'Schicht Z', color: '#8b5cf6', morning: '09:00', morningEnd: '13:00', afternoon: '14:00', afternoonEnd: '18:30' },
];

export function getTemplateColor(template: ShiftTemplate): string {
  const t = SHIFT_TEMPLATES.find(s => s.id === template);
  return t?.color ?? '#94a3b8';
}

export const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const DAY_NAMES_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export const DEFAULT_DAY_CONFIGS: DayConfig[] = [
  { dayOfWeek: 1, openTime: '08:00', closeTime: '18:30', isOpen: true },
  { dayOfWeek: 2, openTime: '08:00', closeTime: '18:30', isOpen: true },
  { dayOfWeek: 3, openTime: '08:00', closeTime: '18:30', isOpen: true },
  { dayOfWeek: 4, openTime: '08:00', closeTime: '18:30', isOpen: true },
  { dayOfWeek: 5, openTime: '08:00', closeTime: '18:30', isOpen: true },
  { dayOfWeek: 6, openTime: '08:00', closeTime: '16:00', isOpen: true },
];

function emp(id: string, name: string, shortName: string, role: Role, pensum: number): Employee {
  return { id, name, shortName, color: '#94a3b8', role, pensum, vacationDays: calcVacationDays(pensum), fixedDaysOff: [0], standardShifts: [], notes: '', contractStart: '2025-01-01' };
}

export const DEFAULT_EMPLOYEES: Employee[] = [
  emp('emp_mj', 'M. Jamshidi', 'MJ', 'Apotheker/in', 100),
  emp('emp_cb', 'CB', 'CB', 'Apotheker/in', 57),
  emp('emp_em', 'EM', 'EM', 'Apotheker/in', 57),
  emp('emp_cl', 'CL', 'CL', 'Apotheker/in', 36),
  emp('emp_kb', 'KB', 'KB', 'Pharma-Assistent/in', 34),
  emp('emp_mf', 'MF', 'MF', 'Pharma-Assistent/in', 13),
  emp('emp_sr', 'SR', 'SR', 'Pharma-Assistent/in', 40),
  emp('emp_dr', 'DR', 'DR', 'Pharma-Assistent/in', 41),
  emp('emp_nl', 'NL', 'NL', 'Pharma-Assistent/in', 80),
  emp('emp_jl', 'JL', 'JL', 'Pharma-Assistent/in', 80),
  emp('emp_ho', 'HO', 'HO', 'Pharma-Assistent/in', 100),
  emp('emp_ma', 'MA', 'MA', 'Pharma-Assistent/in', 58),
  emp('emp_dk', 'DK', 'DK', 'Pharma-Assistent/in', 50),
  emp('emp_yd', 'YD', 'YD', 'Pharma-Assistent/in', 20),
  emp('emp_jb', 'JB', 'JB', 'Lernende/r', 60),
  emp('emp_lf', 'LF', 'LF', 'Lernende/r', 60),
];

// Absence type labels and colors
export const ABSENCE_TYPES: { type: ShiftType; label: string; color: string; shortLabel: string; allowPartial: boolean }[] = [
  { type: 'VACATION', label: 'Ferien', color: '#f59e0b', shortLabel: 'Ferien', allowPartial: false },
  { type: 'SICK', label: 'Krank', color: '#ef4444', shortLabel: 'Krank', allowPartial: false },
  { type: 'HOLIDAY', label: 'Feiertag', color: '#3b82f6', shortLabel: 'Feiertag', allowPartial: false },
  { type: 'MILITARY', label: 'Militaer-/Zivildienst', color: '#6366f1', shortLabel: 'Militaer', allowPartial: false },
  { type: 'MATERNITY', label: 'Mutterschaftsurlaub', color: '#ec4899', shortLabel: 'Muttersch.', allowPartial: false },
  { type: 'UNPAID_LEAVE', label: 'Unbezahlte Ferien', color: '#78716c', shortLabel: 'Unbez.', allowPartial: false },
  { type: 'TRAINING', label: 'Weiterbildung', color: '#0ea5e9', shortLabel: 'Weiterbild.', allowPartial: true },
  { type: 'APPOINTMENT', label: 'Termin/Arztbesuch', color: '#14b8a6', shortLabel: 'Termin', allowPartial: true },
];

export function getAbsenceInfo(type: ShiftType) {
  return ABSENCE_TYPES.find(a => a.type === type);
}

export const STORAGE_KEYS = {
  EMPLOYEES: 'apoplan_employees',
  SHIFTS: 'apoplan_shifts',
  DAY_CONFIGS: 'apoplan_dayconfigs',
  TIME_ENTRIES: 'apoplan_timeentries',
  VACATIONS: 'apoplan_vacations',
  SETTINGS: 'apoplan_settings',
  DAY_NOTES: 'apoplan_daynotes',
  CUSTOM_HOLIDAYS: 'apoplan_custom_holidays',
  TEAM_MEETINGS: 'apoplan_team_meetings',
  TIME_CORRECTIONS: 'apoplan_time_corrections',
  HOUR_ADJUSTMENTS: 'apoplan_hour_adjustments',
};

export const DEFAULT_SETTINGS = {
  bufferMinutes: 15,
};

export const CORRECTION_CODE = '1380';
