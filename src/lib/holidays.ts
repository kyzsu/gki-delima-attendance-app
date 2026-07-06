export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

/** Indonesian national holidays. Starter set — only the fixed-date national
 *  holidays are listed (dates that never move). Movable ones (Idul Fitri, Idul
 *  Adha, Nyepi, Waisak, Wafat/Kenaikan Isa, Tahun Baru Islam, Maulid) change
 *  yearly per the SKB 3 Menteri and should be appended once published. */
export const HOLIDAYS: Holiday[] = [
  { date: "2026-01-01", name: "Tahun Baru Masehi" },
  { date: "2026-05-01", name: "Hari Buruh" },
  { date: "2026-06-01", name: "Hari Lahir Pancasila" },
  { date: "2026-08-17", name: "Hari Kemerdekaan RI" },
  { date: "2026-12-25", name: "Hari Raya Natal" },
];

const HOLIDAY_BY_DATE = new Map(HOLIDAYS.map((h) => [h.date, h.name]));

export const holidayOn = (date: string): string | null => HOLIDAY_BY_DATE.get(date) ?? null;
