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
  contractEnd?: string;  // "YYYY-MM-DD" optional end date (Kuendigung)
  hourlyRate?: number;   // only for Hauslieferdienst
  birthday?: string;     // "YYYY-MM-DD"
}

export type ShiftType =
  | 'WORK'
  | 'VACATION'
  | 'SICK'
  | 'HOLIDAY'
  | 'MILITARY'         // Militaerdienst / Zivildienst
  | 'MATERNITY'        // Mutterschaftsurlaub
  | 'UNPAID_LEAVE'     // Unbezahlte Ferien
  | 'TRAINING'         // Weiterbildung (can be full or partial day)
  | 'APPOINTMENT';     // Termin / Arztbesuch (can be partial day)

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
  type: 'VACATION' | 'MILITARY' | 'MATERNITY' | 'UNPAID_LEAVE' | 'TRAINING' | 'APPOINTMENT';
  hoursOnly?: number; // for partial-day entries (TRAINING, APPOINTMENT) - hours absent
}

export interface AppSettings {
  bufferMinutes: number;
}

export interface DayNote {
  id: string;
  date: string;  // "YYYY-MM-DD"
  text: string;
}

// Custom holidays (editable by user in Einstellungen)
export interface CustomHoliday {
  id: string;
  date: string;   // "YYYY-MM-DD"
  name: string;
}

// Team meetings with attendance
export interface TeamMeeting {
  id: string;
  date: string;       // "YYYY-MM-DD"
  title: string;
  hours: number;       // hours spent on this meeting
  attendees: string[]; // employee IDs who attended
}

// Configurable absence credit percentages
export interface AbsenceCreditConfig {
  [absenceType: string]: number; // 0-100, percentage of pensum credited
}

// Per-holiday credit percentages (e.g. 0% for holidays on weekends)
export interface HolidayCreditConfig {
  [date: string]: number; // 0-100, default 100
}

// Time entry corrections (code-protected)
export interface TimeCorrection {
  id: string;
  employeeId: string;
  date: string;       // "YYYY-MM-DD"
  clockIn: string;    // "HH:mm"
  clockOut: string;   // "HH:mm"
  reason: string;
}

// Manual hour adjustments (credit/debit)
export interface HourAdjustment {
  id: string;
  employeeId: string;
  date: string;       // "YYYY-MM-DD"
  hours: number;      // positive = credit, negative = debit
  reason: string;
}
