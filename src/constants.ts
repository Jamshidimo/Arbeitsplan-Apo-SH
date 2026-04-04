import type { DayConfig, Role } from './types';

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

export const STORAGE_KEYS = {
  EMPLOYEES: 'apoplan_employees',
  SHIFTS: 'apoplan_shifts',
  DAY_CONFIGS: 'apoplan_dayconfigs',
  TIME_ENTRIES: 'apoplan_timeentries',
  VACATIONS: 'apoplan_vacations',
};
