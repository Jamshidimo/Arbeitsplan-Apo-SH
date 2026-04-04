// Swiss holidays for Canton Bern
function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface Holiday {
  date: string;   // "YYYY-MM-DD"
  name: string;
}

export function getHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  return [
    { date: `${year}-01-01`, name: 'Neujahr' },
    { date: `${year}-01-02`, name: 'Berchtoldstag' },
    { date: formatDate(addDays(easter, -2)), name: 'Karfreitag' },
    { date: formatDate(easter), name: 'Ostersonntag' },
    { date: formatDate(addDays(easter, 1)), name: 'Ostermontag' },
    { date: `${year}-05-01`, name: 'Tag der Arbeit' },
    { date: formatDate(addDays(easter, 39)), name: 'Auffahrt' },
    { date: formatDate(addDays(easter, 49)), name: 'Pfingstsonntag' },
    { date: formatDate(addDays(easter, 50)), name: 'Pfingstmontag' },
    { date: `${year}-08-01`, name: 'Nationalfeiertag' },
    { date: `${year}-12-25`, name: 'Weihnachten' },
    { date: `${year}-12-26`, name: 'Stephanstag' },
  ];
}

export function isHoliday(dateStr: string): Holiday | undefined {
  const year = parseInt(dateStr.substring(0, 4));
  return getHolidays(year).find(h => h.date === dateStr);
}
