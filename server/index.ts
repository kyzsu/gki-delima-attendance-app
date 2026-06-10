// Local development entrypoint — Vercel uses api/index.ts instead.
import { app } from "./app.ts";
import { DEMO_MODE } from "./rules.ts";

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`GKI Delima API · http://localhost:${PORT}  (demo mode: ${DEMO_MODE ? "on" : "off"})`);
});
