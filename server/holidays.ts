// National holidays. Fetched per year from a public Indonesian holiday API
// (api-harilibur) so movable dates (Idul Fitri, Nyepi, Waisak, etc.) stay
// correct year to year. Cached in memory; falls back to the fixed-date
// national holidays if the API is unreachable.

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

const API = "https://api-harilibur.vercel.app/api";

const cache = new Map<number, Holiday[]>();
const inflight = new Map<number, Promise<Holiday[]>>();

/** Only the fixed-date national holidays — used when the API call fails. */
function fallback(year: number): Holiday[] {
  return [
    { date: `${year}-01-01`, name: "Tahun Baru Masehi" },
    { date: `${year}-05-01`, name: "Hari Buruh" },
    { date: `${year}-06-01`, name: "Hari Lahir Pancasila" },
    { date: `${year}-08-17`, name: "Hari Kemerdekaan RI" },
    { date: `${year}-12-25`, name: "Hari Raya Natal" },
  ];
}

function pad(d: string): string {
  const [y, m, day] = d.split("-");
  return `${y}-${(m ?? "").padStart(2, "0")}-${(day ?? "").padStart(2, "0")}`;
}

async function fetchHolidays(year: number): Promise<Holiday[]> {
  const res = await fetch(`${API}?year=${year}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`holiday api ${res.status}`);
  const raw = (await res.json()) as {
    holiday_date: string;
    holiday_name: string;
    is_national_holiday: boolean;
  }[];
  const seen = new Set<string>();
  const out: Holiday[] = [];
  for (const h of raw) {
    if (!h.is_national_holiday) continue;
    const date = pad(h.holiday_date);
    if (seen.has(date)) continue;
    seen.add(date);
    out.push({ date, name: h.holiday_name });
  }
  if (out.length === 0) throw new Error("holiday api empty");
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getHolidays(year: number): Promise<Holiday[]> {
  const cached = cache.get(year);
  if (cached) return cached;
  const running = inflight.get(year);
  if (running) return running;
  const p = fetchHolidays(year)
    .then((list) => list)
    .catch(() => fallback(year))
    .then((list) => {
      cache.set(year, list);
      inflight.delete(year);
      return list;
    });
  inflight.set(year, p);
  return p;
}

/** Holiday name for a date, or null. */
export async function holidayName(date: string): Promise<string | null> {
  const list = await getHolidays(Number(date.slice(0, 4)));
  return list.find((h) => h.date === date)?.name ?? null;
}
