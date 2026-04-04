import type { DayConfig, Employee, Role } from './types';

export const HOURS_PER_WEEK_FULL = 42;

export const ROLES: Role[] = [
  'Apotheker/in',
  'Pharma-Assistent/in',
  'Aushilfe',
  'Lernende/r',
];

export const EMPLOYEE_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16',
];

export const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const DAY_NAMES_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export const DEFAULT_DAY_CONFIGS: DayConfig[] = [
  { dayOfWeek: 1, openTime: '08:00', closeTime: '18:30', minApotheker: 1, minAssistent: 2, isOpen: true },
  { dayOfWeek: 2, openTime: '08:00', closeTime: '18:30', minApotheker: 1, minAssistent: 2, isOpen: true },
  { dayOfWeek: 3, openTime: '08:00', closeTime: '18:30', minApotheker: 1, minAssistent: 2, isOpen: true },
  { dayOfWeek: 4, openTime: '08:00', closeTime: '18:30', minApotheker: 1, minAssistent: 2, isOpen: true },
  { dayOfWeek: 5, openTime: '08:00', closeTime: '18:30', minApotheker: 1, minAssistent: 2, isOpen: true },
  { dayOfWeek: 6, openTime: '08:00', closeTime: '16:00', minApotheker: 1, minAssistent: 1, isOpen: true },
];

export const DEFAULT_EMPLOYEES: Employee[] = [
  // Apothekerinnen
  { id: 'emp_mj', name: 'M. Jamshidi', shortName: 'MJ', color: '#10b981', role: 'Apotheker/in', pensum: 100, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  { id: 'emp_cb', name: 'CB', shortName: 'CB', color: '#3b82f6', role: 'Apotheker/in', pensum: 57, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  { id: 'emp_em', name: 'EM', shortName: 'EM', color: '#f59e0b', role: 'Apotheker/in', pensum: 57, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  { id: 'emp_cl', name: 'CL', shortName: 'CL', color: '#ef4444', role: 'Apotheker/in', pensum: 36, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  // Pharma-Assistentinnen
  { id: 'emp_kb', name: 'KB', shortName: 'KB', color: '#8b5cf6', role: 'Pharma-Assistent/in', pensum: 34, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  { id: 'emp_mf', name: 'MF', shortName: 'MF', color: '#ec4899', role: 'Pharma-Assistent/in', pensum: 13, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  { id: 'emp_sr', name: 'SR', shortName: 'SR', color: '#14b8a6', role: 'Pharma-Assistent/in', pensum: 40, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  { id: 'emp_dr', name: 'DR', shortName: 'DR', color: '#f97316', role: 'Pharma-Assistent/in', pensum: 41, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  { id: 'emp_nl', name: 'NL', shortName: 'NL', color: '#6366f1', role: 'Pharma-Assistent/in', pensum: 80, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  { id: 'emp_jl', name: 'JL', shortName: 'JL', color: '#84cc16', role: 'Pharma-Assistent/in', pensum: 80, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  { id: 'emp_ho', name: 'HO', shortName: 'HO', color: '#06b6d4', role: 'Pharma-Assistent/in', pensum: 100, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  { id: 'emp_ma', name: 'MA', shortName: 'MA', color: '#a855f7', role: 'Pharma-Assistent/in', pensum: 58, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  { id: 'emp_dk', name: 'DK', shortName: 'DK', color: '#e11d48', role: 'Pharma-Assistent/in', pensum: 50, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  { id: 'emp_yd', name: 'YD', shortName: 'YD', color: '#0ea5e9', role: 'Pharma-Assistent/in', pensum: 20, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  // Lernende
  { id: 'emp_jb', name: 'JB', shortName: 'JB', color: '#d946ef', role: 'Lernende/r', pensum: 60, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
  { id: 'emp_lf', name: 'LF', shortName: 'LF', color: '#fb923c', role: 'Lernende/r', pensum: 60, vacationDays: 25, fixedDaysOff: [0], standardShifts: [], notes: '' },
];

export const STORAGE_KEYS = {
  EMPLOYEES: 'apoplan_employees',
  SHIFTS: 'apoplan_shifts',
  DAY_CONFIGS: 'apoplan_dayconfigs',
  TIME_ENTRIES: 'apoplan_timeentries',
  VACATIONS: 'apoplan_vacations',
};
