import express from "express";
import type { NextFunction, Request, Response } from "express";
import { authRouter } from "./routes/auth.ts";
import { attendanceRouter } from "./routes/attendance.ts";
import { requestsRouter } from "./routes/requests.ts";
import { adminRouter } from "./routes/admin.ts";
import { CHURCH, DEMO_MODE, GEOFENCE_RADIUS_M } from "./rules.ts";

export const app = express();
app.use(express.json());

// Dev-only CORS — in production the SPA and the API share an origin
// (Vercel serves both), so cross-origin headers are unnecessary.
if (process.env.NODE_ENV !== "production") {
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
}

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
