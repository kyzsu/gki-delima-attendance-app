import { Router } from "express";
import { z } from "zod";
import { db, type RequestRow, type UserRow } from "../db.ts";
import { publicUser, requireAdmin } from "../middleware.ts";
import { approveRequest } from "./requests.ts";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// Pending signups (status filter optional: ?status=pending|approved|rejected).
adminRouter.get("/users", (req, res) => {
  const status = req.query.status;
  const rows = (
    typeof status === "string"
      ? db.prepare("SELECT * FROM users WHERE status = ? ORDER BY id DESC").all(status)
      : db.prepare("SELECT * FROM users ORDER BY id DESC").all()
  ) as unknown as UserRow[];
  res.json(rows.map(publicUser));
});

const decisionSchema = z.object({ decision: z.enum(["approved", "rejected"]) });

adminRouter.post("/users/:id/decision", (req, res) => {
  const body = decisionSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "decision harus 'approved' atau 'rejected'." });
    return;
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(req.params.id)) as
    | UserRow
    | undefined;
  if (!user) {
    res.status(404).json({ error: "Pengguna tidak ditemukan." });
    return;
  }
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(body.data.decision, user.id);
  res.json({ id: user.id, status: body.data.decision });
});

adminRouter.get("/requests", (req, res) => {
  const status = req.query.status;
  const rows = (
    typeof status === "string"
      ? db.prepare("SELECT * FROM requests WHERE status = ? ORDER BY id DESC").all(status)
      : db.prepare("SELECT * FROM requests ORDER BY id DESC").all()
  ) as unknown as RequestRow[];
  res.json(rows);
});

const reqDecisionSchema = z.object({ decision: z.enum(["Disetujui", "Ditolak"]) });

adminRouter.post("/requests/:id/decision", (req, res) => {
  const body = reqDecisionSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "decision harus 'Disetujui' atau 'Ditolak'." });
    return;
  }
  const request = db.prepare("SELECT * FROM requests WHERE id = ?").get(Number(req.params.id)) as
    | RequestRow
    | undefined;
  if (!request) {
    res.status(404).json({ error: "Pengajuan tidak ditemukan." });
    return;
  }
  if (request.status !== "Menunggu") {
    res.status(409).json({ error: `Pengajuan sudah ${request.status}.` });
    return;
  }
  if (body.data.decision === "Disetujui") {
    approveRequest(request);
  } else {
    db.prepare("UPDATE requests SET status = 'Ditolak' WHERE id = ?").run(request.id);
  }
  res.json({ id: request.id, status: body.data.decision });
});
