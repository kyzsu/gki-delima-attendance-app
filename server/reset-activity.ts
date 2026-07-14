// One-off: wipe every non-admin employee's activity data (attendance,
// selfies, breaks, requests) and restore the fresh-seed baseline
// (leave_balance = 12, must_change_password = true) — without touching the
// accounts themselves. Meant for clearing out verification/test traffic
// before real employees start using the app.
//
//   npm run reset:activity
import { sql } from "./db.js";

async function main() {
  const nonAdmin = sql`SELECT id FROM users WHERE role <> 'admin'`;

  console.log("Clearing activity data for non-admin users…");
  const photos = await sql`
    DELETE FROM attendance_photos WHERE attendance_id IN (
      SELECT id FROM attendance WHERE user_id IN (${nonAdmin})
    ) RETURNING id
  `;
  const attendance = await sql`DELETE FROM attendance WHERE user_id IN (${nonAdmin}) RETURNING id`;
  const breaks = await sql`DELETE FROM breaks WHERE user_id IN (${nonAdmin}) RETURNING id`;
  // request_attachments cascade automatically via their FK to requests.
  const requests = await sql`DELETE FROM requests WHERE user_id IN (${nonAdmin}) RETURNING id`;

  console.log("Restoring fresh-seed baseline…");
  const reset = await sql`
    UPDATE users
    SET leave_balance = 12, must_change_password = true
    WHERE role <> 'admin'
    RETURNING id, name, email
  `;

  console.log(`  attendance_photos removed: ${photos.length}`);
  console.log(`  attendance removed: ${attendance.length}`);
  console.log(`  breaks removed: ${breaks.length}`);
  console.log(`  requests removed: ${requests.length}`);
  console.log(`  users reset (leave_balance=12, must_change_password=true): ${reset.length}`);
  reset.forEach((u) => console.log(`    ${(u as { name: string }).name} <${(u as { email: string }).email}>`));

  await sql.end();
  console.log("Done.");
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
