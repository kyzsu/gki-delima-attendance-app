// One-time database setup: applies schema.sql and seeds the admin account.
//   npm run db:setup            → schema + admin only
//   npm run db:setup -- --demo  → also seeds the demo employee + sample data
//
// Admin credentials come from ADMIN_EMAIL / ADMIN_PASSWORD (defaults are
// dev-only; always set real ones in production).
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "./db";
import { hashPassword } from "./auth";
import { addDaysStr, dateStr } from "./rules";

const here = path.dirname(fileURLToPath(import.meta.url));
const demo = process.argv.includes("--demo");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@gkidelima.org";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

async function main() {
  console.log("Applying schema…");
  await sql.unsafe(readFileSync(path.join(here, "schema.sql"), "utf8"));

  const [admin] = await sql`SELECT id FROM users WHERE email = ${ADMIN_EMAIL.toLowerCase()}`;
  if (admin) {
    console.log(`Admin ${ADMIN_EMAIL} already exists — skipping seed.`);
  } else {
    if (!process.env.ADMIN_PASSWORD) {
      console.warn("⚠ ADMIN_PASSWORD not set — seeding with the dev default 'admin123'.");
    }
    await sql`
      INSERT INTO users (name, nip, email, phone, password_hash, role, status)
      VALUES ('Admin Personalia', 'GKID-0001', ${ADMIN_EMAIL.toLowerCase()},
              '+62 811 0000 001', ${hashPassword(ADMIN_PASSWORD)}, 'admin', 'approved')
    `;
    console.log(`Seeded admin ${ADMIN_EMAIL}.`);
  }

  if (demo) {
    const email = "ruth.simanjuntak@gkidelima.org";
    const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing) {
      console.log("Demo employee already exists — skipping.");
    } else {
      const [ruth] = await sql`
        INSERT INTO users (name, nip, email, phone, password_hash, role, status, leave_balance)
        VALUES ('Ruth Simanjuntak', 'GKID-0214', ${email}, '+62 812 3456 789',
                ${hashPassword("gkidelima")}, 'employee', 'approved', 7)
        RETURNING id
      `;
      const uid = (ruth as { id: number }).id;
      const today = dateStr();
      const at = (date: string, h: number, m: number) =>
        // WIB timestamps (UTC+7, no DST)
        new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+07:00`);

      const d1 = addDaysStr(today, -1);
      const d2 = addDaysStr(today, -2);
      const d5 = addDaysStr(today, -5);
      await sql`
        INSERT INTO attendance (user_id, date, check_in, check_out, late) VALUES
        (${uid}, ${d1}, ${at(d1, 7, 52)}, ${at(d1, 16, 5)}, false),
        (${uid}, ${d2}, ${at(d2, 7, 48)}, ${at(d2, 16, 12)}, false),
        (${uid}, ${d5}, ${at(d5, 8, 6)}, ${at(d5, 16, 1)}, true)
      `;
      await sql`
        INSERT INTO requests (user_id, kind, title, detail, status, leave_type, start_date, days, dest, overnight, nights, amount, hours) VALUES
        (${uid}, 'dinas', 'Dinas — Bandung', '2 mlm · Rp 1.025.000', 'Disetujui',
         NULL, ${addDaysStr(today, 1)}, 3, 'Bandung', true, 2, 1025000, NULL),
        (${uid}, 'lembur', 'Lembur — Kamis', '2,0 jam', 'Menunggu',
         NULL, ${addDaysStr(today, -6)}, NULL, NULL, NULL, NULL, NULL, 2),
        (${uid}, 'cuti', 'Cuti Tahunan', ${"1 hari · " + today}, 'Disetujui',
         'tahunan', ${today}, 1, NULL, NULL, NULL, NULL, NULL)
      `;
      console.log("Seeded demo employee ruth.simanjuntak@gkidelima.org / gkidelima.");
    }
  }

  await sql.end();
  console.log("Done.");
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
