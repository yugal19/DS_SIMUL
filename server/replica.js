// server/replica.js
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
let store = {};
let wal = [];
let logs = [];
let isOnline = true;
const now = () => Date.now();
const log = (node, type, msg) => {
  const entry = {
    id: String(Math.random()).slice(2),
    timestamp: now(),
    node,
    type,
    message: msg,
  };
  logs.push(entry);
  console.log(`[REPLICA] ${type} - ${msg}`);
};

// Toggle online/offline (POST /toggle)
app.post("/toggle", (req, res) => {
  isOnline = !isOnline;
  log(
    "SYSTEM",
    "WARN",
    `Replica toggled to ${isOnline ? "ONLINE" : "OFFLINE"}`
  );
  res.json({ status: isOnline ? "ONLINE" : "OFFLINE" });
});

// Accept replication from Primary
app.post("/replicate", (req, res) => {
  if (!isOnline) {
    log("REPLICA", "ERROR", `Received replication but currently OFFLINE`);
    return res.status(503).json({ error: "Replica Offline" });
  }

  const { key, value, version } = req.body;
  if (!key) return res.status(400).json({ error: "missing key" });

  const walEntry = { key, value, version, ts: now() };
  wal.push(walEntry);
  log("REPLICA", "WAL", `Persisted WAL ${key} v${version}`);

  // Apply WAL to store after a delay (simulate WAL flush / apply)
  setTimeout(() => {
    store[key] = { key, value, version, timestamp: now() };
    log("REPLICA", "SUCCESS", `Applied WAL -> Store ${key} v${version}`);
  }, 2500);

  res.json({ status: "ok" });
});

// endpoints to let frontend poll logs/state
app.get("/logs", (req, res) => {
  res.json({ store, wal, logs, isOnline });
});

app.get("/store", (req, res) => {
  res.json({ store });
});

app.listen(PORT, () =>
  console.log(`REPLICA running on http://localhost:${PORT}`)
);
