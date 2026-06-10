import { Router } from "express";
import { z } from "zod";
import { sql, type RequestRow, type UserRow } from "../db.ts";
import { publicUser, requireAdmin } from "../middleware.ts";
import { approveRequest } from "./requests.ts";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// Pending signups (status filter optional: ?status=pending|approved|rejected).
adminRouter.get("/users", async (req, res) => {
  const status = req.query.status;
  const rows =
    typeof status === "string"
      ? await sql<UserRow[]>`SELECT * FROM users WHERE status = ${status} ORDER BY id DESC`
      : await sql<UserRow[]>`SELECT * FROM users ORDER BY id DESC`;
  res.json(rows.map(publicUser));
});

const decisionSchema = z.object({ decision: z.enum(["approved", "rejected"]) });

adminRouter.post("/users/:id/decision", async (req, res) => {
  const body = decisionSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "decision harus 'approved' atau 'rejected'." });
    return;
  }
  const [user] = await sql<UserRow[]>`SELECT * FROM users WHERE id = ${Number(req.params.id) || 0}`;
  if (!user) {
    res.status(404).json({ error: "Pengguna tidak ditemukan." });
    return;
  }
  await sql`UPDATE users SET status = ${body.data.decision} WHERE id = ${user.id}`;
  res.json({ id: user.id, status: body.data.decision });
});

adminRouter.get("/requests", async (req, res) => {
  const status = req.query.status;
  const rows =
    typeof status === "string"
      ? await sql<RequestRow[]>`SELECT * FROM requests WHERE status = ${status} ORDER BY id DESC`
      : await sql<RequestRow[]>`SELECT * FROM requests ORDER BY id DESC`;
  res.json(rows);
});

const reqDecisionSchema = z.object({ decision: z.enum(["Disetujui", "Ditolak"]) });

adminRouter.post("/requests/:id/decision", async (req, res) => {
  const body = reqDecisionSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "decision harus 'Disetujui' atau 'Ditolak'." });
    return;
  }
  const [request] = await sql<RequestRow[]>`
    SELECT * FROM requests WHERE id = ${Number(req.params.id) || 0}
  `;
  if (!request) {
    res.status(404).json({ error: "Pengajuan tidak ditemukan." });
    return;
  }
  if (request.status !== "Menunggu") {
    res.status(409).json({ error: `Pengajuan sudah ${request.status}.` });
    return;
  }
  if (body.data.decision === "Disetujui") {
    await approveRequest(request);
  } else {
    await sql`UPDATE requests SET status = 'Ditolak' WHERE id = ${request.id}`;
  }
  res.json({ id: request.id, status: body.data.decision });
});
