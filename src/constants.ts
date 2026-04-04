import type { DayConfig, Employee, Role } from './types';

export const HOURS_PER_WEEK_FULL = 42;
export const VACATION_DAYS_FULL = 25; // at 100% pensum

export function calcVacationDays(pensum: number): number {
  return Math.round((pensum / 100) * VACATION_DAYS_FULL * 10) / 10;
}

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

function emp(id: string, name: string, shortName: string, color: string, role: Role, pensum: number): Employee {
  return { id, name, shortName, color, role, pensum, vacationDays: calcVacationDays(pensum), fixedDaysOff: [0], standardShifts: [], notes: '' };
}

export const DEFAULT_EMPLOYEES: Employee[] = [
  // Apothekerinnen
  emp('emp_mj', 'M. Jamshidi', 'MJ', '#10b981', 'Apotheker/in', 100),
  emp('emp_cb', 'CB', 'CB', '#3b82f6', 'Apotheker/in', 57),
  emp('emp_em', 'EM', 'EM', '#f59e0b', 'Apotheker/in', 57),
  emp('emp_cl', 'CL', 'CL', '#ef4444', 'Apotheker/in', 36),
  // Pharma-Assistentinnen
  emp('emp_kb', 'KB', 'KB', '#8b5cf6', 'Pharma-Assistent/in', 34),
  emp('emp_mf', 'MF', 'MF', '#ec4899', 'Pharma-Assistent/in', 13),
  emp('emp_sr', 'SR', 'SR', '#14b8a6', 'Pharma-Assistent/in', 40),
  emp('emp_dr', 'DR', 'DR', '#f97316', 'Pharma-Assistent/in', 41),
  emp('emp_nl', 'NL', 'NL', '#6366f1', 'Pharma-Assistent/in', 80),
  emp('emp_jl', 'JL', 'JL', '#84cc16', 'Pharma-Assistent/in', 80),
  emp('emp_ho', 'HO', 'HO', '#06b6d4', 'Pharma-Assistent/in', 100),
  emp('emp_ma', 'MA', 'MA', '#a855f7', 'Pharma-Assistent/in', 58),
  emp('emp_dk', 'DK', 'DK', '#e11d48', 'Pharma-Assistent/in', 50),
  emp('emp_yd', 'YD', 'YD', '#0ea5e9', 'Pharma-Assistent/in', 20),
  // Lernende
  emp('emp_jb', 'JB', 'JB', '#d946ef', 'Lernende/r', 60),
  emp('emp_lf', 'LF', 'LF', '#fb923c', 'Lernende/r', 60),
];

export const STORAGE_KEYS = {
  EMPLOYEES: 'apoplan_employees',
  SHIFTS: 'apoplan_shifts',
  DAY_CONFIGS: 'apoplan_dayconfigs',
  TIME_ENTRIES: 'apoplan_timeentries',
  VACATIONS: 'apoplan_vacations',
};
