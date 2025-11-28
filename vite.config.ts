import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// A tiny in-memory queue on the dev server so the client app can POST,
// and the browser simulator (App.tsx) can poll and fetch pending requests.
export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    react(),
    {
      name: "sim-dev-endpoints",
      configureServer(server) {
        // simple in-memory queue (server lifetime)
        const queue: Array<{ key: string; value: string }> = [];

        server.middlewares.use((req, res, next) => {
          if (!req.url) return next();

          // CORS for cross-port client console -> dev server requests
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");

          if (req.method === "OPTIONS") {
            res.statusCode = 200;
            res.end();
            return;
          }

          // POST /sim-put  -> client console will call this
          if (req.url === "/sim-put" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", () => {
              try {
                const parsed = JSON.parse(body || "{}");
                const key = String(parsed.key ?? "").trim();
                const value = parsed.value ?? "";

                if (!key) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ ok: false, error: "key required" }));
                  return;
                }

                queue.push({ key, value });
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ ok: true }));
              } catch (err) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: "invalid json" }));
              }
            });
            return;
          }

          // GET /sim-requests -> simulator polls and obtains queued requests (and clears them)
          if (req.url === "/sim-requests" && req.method === "GET") {
            const items = queue.splice(0, queue.length);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(items));
            return;
          }

          return next();
        });
      },
    },
  ],
});
