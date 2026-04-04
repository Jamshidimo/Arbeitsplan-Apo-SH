export type Role = 'Apotheker/in' | 'Pharma-Assistent/in' | 'Aushilfe' | 'Lernende/r';

export interface StandardShift {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start: string;     // "HH:mm"
  end: string;       // "HH:mm"
  isOpener: boolean;
}

export interface Employee {
  id: string;
  name: string;
  shortName: string;
  color: string;
  role: Role;
  pensum: number;        // 0-100 (percentage, 100% = 42h/week)
  vacationDays: number;  // yearly entitlement
  fixedDaysOff: number[]; // day of week numbers (0=Sun, 1=Mon, ...)
  standardShifts: StandardShift[];
  notes: string;
}

export type ShiftType = 'WORK' | 'VACATION' | 'SICK' | 'HOLIDAY';

export interface Shift {
  id: string;
  employeeId: string;
  date: string;      // "YYYY-MM-DD"
  start: string;     // "HH:mm"
  end: string;       // "HH:mm"
  type: ShiftType;
  isOpener: boolean;
}

export interface DayConfig {
  dayOfWeek: number;       // 1=Monday ... 6=Saturday
  openTime: string;        // "HH:mm"
  closeTime: string;       // "HH:mm"
  minApotheker: number;
  minAssistent: number;
  isOpen: boolean;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: string;    // ISO string
  clockOut: string | null;
}

export interface VacationEntry {
  id: string;
  employeeId: string;
  startDate: string;  // "YYYY-MM-DD"
  endDate: string;    // "YYYY-MM-DD"
}
