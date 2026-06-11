import express from "express";
import type { NextFunction, Request, Response } from "express";
import { authRouter } from "./routes/auth.js";
import { attendanceRouter, photosRouter } from "./routes/attendance.js";
import { requestsRouter } from "./routes/requests.js";
import { adminRouter } from "./routes/admin.js";
import { CHURCH, DEMO_MODE, GEOFENCE_RADIUS_M } from "./rules.js";

export const app = express();
// Check-in/out selfies arrive as ~100–300 KB base64 data URLs.
app.use(express.json({ limit: "3mb" }));

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

// Caching policy: API responses are per-user and refetched after every
// mutation, so default to private/no-cache; /api/config is static per
// deployment and overrides with a public CDN cache below.
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-cache");
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, demoMode: DEMO_MODE });
});

// Public geofence config so the frontend doesn't hardcode coordinates.
// s-maxage lets Vercel's CDN serve this without invoking the function;
// stale-while-revalidate keeps it instant when the cache expires.
app.get("/api/config", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
  res.json({ church: CHURCH, geofenceRadiusM: GEOFENCE_RADIUS_M, demoMode: DEMO_MODE });
});

app.use("/api/auth", authRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/photos", photosRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan." });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Terjadi kesalahan pada server." });
});
