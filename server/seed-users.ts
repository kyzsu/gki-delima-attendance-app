// One-off: wipe every non-admin user (and their attendance/requests) and
// seed a fresh employee roster. Each seeded user must change their password
// on first login (must_change_password = true).
//
//   node --env-file-if-exists=.env --env-file-if-exists=.env.local \
//        --import tsx server/seed-users.ts
import { sql } from "./db.js";
import { hashPassword } from "./auth.js";

const DEFAULT_PASSWORD = "gkidelima2026";

const NAMES = ["Rinno", "Derian", "Kristin", "Dian", "Nikson", "Immanuel", "Yohana", "Sugi"];
const emailOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "") + "@gkidelima.org";

async function main() {
  const nonAdmin = sql`SELECT id FROM users WHERE role <> 'admin'`;

  console.log("Removing non-admin users and their data…");
  await sql`DELETE FROM attendance_photos WHERE attendance_id IN (SELECT id FROM attendance WHERE user_id IN (${nonAdmin}))`;
  await sql`DELETE FROM attendance WHERE user_id IN (${nonAdmin})`;
  // request_attachments cascade when their request rows are deleted.
  await sql`DELETE FROM requests WHERE user_id IN (${nonAdmin})`;
  const removed = await sql`DELETE FROM users WHERE role <> 'admin' RETURNING id`;
  console.log(`  removed ${removed.length} user(s).`);

  const hash = hashPassword(DEFAULT_PASSWORD);
  console.log("Seeding roster…");
  let i = 1;
  for (const name of NAMES) {
    const email = emailOf(name);
    const nip = `GKID-${1000 + i}`;
    const phone = `+62 811 0000 ${String(1000 + i)}`;
    await sql`
      INSERT INTO users (name, nip, email, phone, password_hash, role, status, must_change_password, leave_balance)
      VALUES (${name}, ${nip}, ${email}, ${phone}, ${hash}, 'employee', 'approved', true, 12)
    `;
    console.log(`  ${name.padEnd(10)} ${email}`);
    i++;
  }

  console.log(`\nDefault password for all: ${DEFAULT_PASSWORD}`);
  console.log("Each must change their password on first login.");
  const [{ n }] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM users`;
  console.log(`Total users now: ${n}`);
}

// Retry the connect a few times — a paused Supabase project often times out
// on the first attempt and wakes for the next.
async function run() {
  for (let attempt = 1; ; attempt++) {
    try {
      await main();
      return;
    } catch (err) {
      const timedOut = err instanceof Error && "code" in err && err.code === "CONNECT_TIMEOUT";
      if (timedOut && attempt < 4) {
        console.log(
          `Connect timed out (attempt ${attempt}/4) — retrying in 5s. ` +
            `If this persists, the Supabase project is probably paused or port 6543 is blocked.`,
        );
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw err;
    }
  }
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
