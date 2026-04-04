export type Role = 'Apotheker/in' | 'Pharma-Assistent/in' | 'Hauslieferdienst' | 'Lernende/r';

export type ShiftTemplate = 'OPENER' | 'X' | 'Y' | 'Z' | 'CUSTOM';

export interface StandardShift {
  dayOfWeek: number;
  start: string;
  end: string;
  isOpener: boolean;
  lunchBreak: boolean;
  lunchDuration: number;
  template: ShiftTemplate;
}

export interface Employee {
  id: string;
  name: string;
  shortName: string;
  color: string;
  role: Role;
  pensum: number;
  vacationDays: number;
  fixedDaysOff: number[];
  standardShifts: StandardShift[];
  notes: string;
  contractStart: string; // "YYYY-MM-DD" for saldo calculation start
  hourlyRate?: number;   // only for Hauslieferdienst
}

export type ShiftType = 'WORK' | 'VACATION' | 'SICK' | 'HOLIDAY';

export interface Shift {
  id: string;
  employeeId: string;
  date: string;
  start: string;
  end: string;
  type: ShiftType;
  isOpener: boolean;
  lunchBreak: boolean;
  lunchDuration: number;
  template: ShiftTemplate;
}

export interface DayConfig {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  minApotheker: number;
  minAssistent: number;
  isOpen: boolean;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut: string | null;
}

export interface VacationEntry {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
}

export interface AppSettings {
  bufferMinutes: number; // overtime buffer in minutes
}
