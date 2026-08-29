export interface HolidaySuggestion {
  date: string; // "yyyy-MM-dd"
  label: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function addDays(year: number, month: number, day: number, delta: number): string {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + delta);
  return toDateStr(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Easter Sunday (Gregorian) for a given year — anonymous Gregorian algorithm
 * (Meeus/Jones/Butcher). Everything else moves relative to this date.
 */
function computeEasterSunday(year: number): { month: number; day: number } {
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
  return { month, day };
}

/** National Brazilian holidays for a given year — fixed dates plus Easter-derived ones, as suggestions the owner can add with one click. */
export function getBrazilianHolidays(year: number): HolidaySuggestion[] {
  const easter = computeEasterSunday(year);

  return [
    { date: toDateStr(year, 1, 1), label: "Confraternização Universal" },
    { date: addDays(year, easter.month, easter.day, -47), label: "Carnaval" },
    { date: addDays(year, easter.month, easter.day, -2), label: "Sexta-feira Santa" },
    { date: toDateStr(year, 4, 21), label: "Tiradentes" },
    { date: toDateStr(year, 5, 1), label: "Dia do Trabalho" },
    { date: addDays(year, easter.month, easter.day, 60), label: "Corpus Christi" },
    { date: toDateStr(year, 9, 7), label: "Independência do Brasil" },
    { date: toDateStr(year, 10, 12), label: "Nossa Senhora Aparecida" },
    { date: toDateStr(year, 11, 2), label: "Finados" },
    { date: toDateStr(year, 11, 15), label: "Proclamação da República" },
    { date: toDateStr(year, 12, 25), label: "Natal" },
  ].sort((a, b) => a.date.localeCompare(b.date));
}
