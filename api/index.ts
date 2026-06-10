// Vercel serverless entrypoint — every /api/* request is rewritten here
// (see vercel.json) and dispatched by the Express app, which routes on the
// original URL.
import { app } from "../server/app.js";

export default app;
