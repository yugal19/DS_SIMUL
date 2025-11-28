// server/primary.js
import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4000;
const REPLICA_URL = "http://localhost:5000/replicate";
const REPLICA_STATUS_URL = "http://localhost:5000/toggle"; // optional

// In-memory store + WAL + retry queue + logs
let store = {};
let wal = [];
let retryQueue = [];
let logs = [];

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
  console.log(`[PRIMARY] ${type} - ${msg}`);
};

// POST /kv  => client writes here
app.post("/kv", async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: "missing key" });

  const version = (store[key]?.version || 0) + 1;
  const entry = { key, value, version, timestamp: now() };

  // persist to primary store + WAL
  store[key] = entry;
  wal.push({ ...entry, walTs: now() });
  log("PRIMARY", "WAL", `SET ${key} v${version}`);

  // attempt replication (fire-and-forget with ack)
  try {
    await axios.post(REPLICA_URL, { key, value, version });
    log("PRIMARY", "SUCCESS", `Replication ACK for ${key} v${version}`);
    return res.json({ status: "ok", replicated: true });
  } catch (err) {
    // push to retry queue
    const task = {
      id: String(Math.random()).slice(2),
      key,
      value,
      version,
      attempts: 1,
      lastAttempt: now(),
    };
    retryQueue.push(task);
    log("PRIMARY", "ERROR", `Replica unreachable, queued ${key}`);
    return res.json({ status: "ok", replicated: false });
  }
});

// Retry worker - tries queued replication every 3s
setInterval(async () => {
  if (retryQueue.length === 0) return;
  const task = retryQueue[0];
  const nowTs = now();
  if (nowTs - task.lastAttempt < 3000) return; // respect interval

  log("SYSTEM", "INFO", `Retrying ${task.key} attempt ${task.attempts + 1}`);
  try {
    await axios.post(REPLICA_URL, {
      key: task.key,
      value: task.value,
      version: task.version,
    });
    // success -> remove from queue
    retryQueue.shift();
    log("SYSTEM", "SUCCESS", `Retry success for ${task.key}`);
  } catch (e) {
    // update attempts and lastAttempt
    task.attempts += 1;
    task.lastAttempt = now();
    log(
      "SYSTEM",
      "WARN",
      `Retry failed for ${task.key} attempts=${task.attempts}`
    );
  }
}, 1000);

// endpoints for frontend to read state/logs
app.get("/logs", (req, res) => {
  res.json({ store, wal, retryQueue, logs });
});

app.get("/store", (req, res) => {
  res.json({ store });
});

app.listen(PORT, () =>
  console.log(`PRIMARY running on http://localhost:${PORT}`)
);
