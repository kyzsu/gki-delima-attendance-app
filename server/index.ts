import express from "express";
import type { NextFunction, Request, Response } from "express";
import { authRouter } from "./routes/auth.ts";
import { attendanceRouter } from "./routes/attendance.ts";
import { requestsRouter } from "./routes/requests.ts";
import { adminRouter } from "./routes/admin.ts";
import { CHURCH, DEMO_MODE, GEOFENCE_RADIUS_M } from "./rules.ts";

const app = express();
app.use(express.json());

// Permissive CORS for local development (the Vite proxy makes this moot
// when the frontend runs through `npm run dev`).
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, demoMode: DEMO_MODE });
});

// Public geofence config so the frontend doesn't hardcode coordinates.
app.get("/api/config", (_req, res) => {
  res.json({ church: CHURCH, geofenceRadiusM: GEOFENCE_RADIUS_M, demoMode: DEMO_MODE });
});

app.use("/api/auth", authRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan." });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Terjadi kesalahan pada server." });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`GKI Delima API · http://localhost:${PORT}  (demo mode: ${DEMO_MODE ? "on" : "off"})`);
});
