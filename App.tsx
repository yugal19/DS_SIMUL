import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StoreItem,
  NodeStatus,
  ReplicationTask,
  LogEntry,
  LogType,
  WalEntry,
} from "./types";
import Terminal from "./components/Terminal";
import StoreViewer from "./components/StoreViewer";
import RetryQueue from "./components/RetryQueue";
import WalViewer from "./components/WalViewer";
import { analyzeSystemState } from "./services/geminiService";
import {
  Activity,
  Server,
  ServerCrash,
  ShieldCheck,
  AlertOctagon,
  BrainCircuit,
  Settings,
} from "lucide-react";

// --- Simulation Constants ---
const RETRY_INTERVAL_MS = 3000;
const REPLICA_LATENCY_MS = 500;
const WAL_FLUSH_DELAY_MS = 2500; // Time it takes for Replica to apply WAL to Store

export default function App() {
  // --- State ---
  const [primaryStore, setPrimaryStore] = useState<Record<string, StoreItem>>(
    {}
  );
  const [replicaStore, setReplicaStore] = useState<Record<string, StoreItem>>(
    {}
  );
  const [replicaWal, setReplicaWal] = useState<WalEntry[]>([]);
  const [replicaStatus, setReplicaStatus] = useState<NodeStatus>("ONLINE");
  const [retryQueue, setRetryQueue] = useState<ReplicationTask[]>([]);

  // Logs for separate terminals
  const [primaryLogs, setPrimaryLogs] = useState<LogEntry[]>([]);
  const [replicaLogs, setReplicaLogs] = useState<LogEntry[]>([]);
  const [clientLogs, setClientLogs] = useState<LogEntry[]>([]);

  // AI Analysis
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Refs for async operations to access current state
  const replicaStatusRef = useRef(replicaStatus);
  useEffect(() => {
    replicaStatusRef.current = replicaStatus;
  }, [replicaStatus]);

  // --- Helpers ---
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addLog = useCallback(
    (
      node: "PRIMARY" | "REPLICA" | "CLIENT" | "SYSTEM",
      type: LogType,
      message: string
    ) => {
      const entry: LogEntry = {
        id: generateId(),
        timestamp: Date.now(),
        node,
        type,
        message,
      };

      if (node === "PRIMARY") setPrimaryLogs((prev) => [...prev, entry]);
      else if (node === "REPLICA") setReplicaLogs((prev) => [...prev, entry]);
      else setClientLogs((prev) => [...prev, entry]);
    },
    []
  );

  // --- Core Logic: Replica WAL Flusher ---
  useEffect(() => {
    if (replicaWal.length === 0) return;

    const timer = setTimeout(() => {
      const entryToApply = replicaWal[0];

      setReplicaStore((prev) => ({
        ...prev,
        [entryToApply.key]: {
          key: entryToApply.key,
          value: entryToApply.value,
          timestamp: entryToApply.timestamp,
          version: entryToApply.version,
        },
      }));

      setReplicaWal((prev) => prev.slice(1));
      addLog(
        "REPLICA",
        LogType.SUCCESS,
        `WAL Applied to Store: ${entryToApply.key} v${entryToApply.version}`
      );
    }, WAL_FLUSH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [replicaWal, addLog]);

  const attemptReplication = useCallback(
    async (task: ReplicationTask) => {
      await new Promise((resolve) => setTimeout(resolve, REPLICA_LATENCY_MS));

      const status = replicaStatusRef.current;

      if (status === "OFFLINE") {
        addLog(
          "PRIMARY",
          LogType.WARN,
          `Replication failed for key [${task.key}]. Replica unreachable.`
        );
        return false;
      }

      const walEntry: WalEntry = {
        id: generateId(),
        key: task.key,
        value: task.value,
        version: task.version,
        timestamp: Date.now(),
      };

      setReplicaWal((prev) => [...prev, walEntry]);

      addLog(
        "REPLICA",
        LogType.WAL,
        `Persisted to Disk (WAL): ${task.key} v${task.version}`
      );
      addLog(
        "PRIMARY",
        LogType.SUCCESS,
        `Replication ACK received for [${task.key}]`
      );

      return true;
    },
    [addLog]
  );

  // --- applyPut: used both by internal logic & incoming client requests ---
  const applyPut = useCallback(
    async (key: string, value: string) => {
      if (!key) return;

      addLog(
        "CLIENT",
        LogType.INFO,
        `PUT /kv/${key} body={"value": "${value}"}`
      );

      // compute version using functional state update to avoid stale closure
      let newVersion = 1;
      setPrimaryStore((prev) => {
        newVersion = (prev[key]?.version || 0) + 1;
        const newItem: StoreItem = {
          key,
          value,
          timestamp: Date.now(),
          version: newVersion,
        };
        return { ...prev, [key]: newItem };
      });

      addLog("PRIMARY", LogType.WAL, `BEGIN TRANSACTION ${generateId()}`);
      addLog("PRIMARY", LogType.WAL, `SET ${key}=${value} v${newVersion}`);
      addLog("PRIMARY", LogType.WAL, `COMMIT`);
      addLog("PRIMARY", LogType.SUCCESS, `Stored locally: ${key}`);

      const task: ReplicationTask = {
        id: generateId(),
        key,
        value,
        version: newVersion,
        attempts: 0,
        lastAttempt: 0,
      };

      const success = await attemptReplication(task);

      if (!success) {
        setRetryQueue((prev) => {
          const filtered = prev.filter((t) => t.key !== key);
          return [
            ...filtered,
            { ...task, attempts: 1, lastAttempt: Date.now() },
          ];
        });
        addLog("PRIMARY", LogType.ERROR, `Added [${key}] to Retry Queue`);
      }
    },
    [attemptReplication, addLog]
  );

  // --- Poll the dev-server queue for incoming client PUTs ---
  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const res = await fetch("/sim-requests");
        if (!res.ok) return;
        const items: Array<{ key: string; value: string }> = await res.json();
        if (!mounted || !items || items.length === 0) return;
        for (const it of items) {
          // apply each incoming request
          // eslint-disable-next-line no-await-in-loop
          await applyPut(it.key, it.value);
        }
      } catch (e) {
        // ignore network errors
      }
    };

    poll();
    const id = setInterval(poll, 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [applyPut]);

  // --- Core Logic: Retry Worker ---
  useEffect(() => {
    const worker = setInterval(async () => {
      if (retryQueue.length === 0) return;

      const now = Date.now();
      const nextTask = retryQueue.find(
        (t) => now - t.lastAttempt > RETRY_INTERVAL_MS
      );

      if (nextTask) {
        addLog(
          "SYSTEM",
          LogType.INFO,
          `RetryWorker: Processing ${nextTask.key} (Attempt ${
            nextTask.attempts + 1
          })`
        );

        const success = await attemptReplication(nextTask);

        if (success) {
          setRetryQueue((prev) => prev.filter((t) => t.id !== nextTask.id));
          addLog(
            "SYSTEM",
            LogType.SUCCESS,
            `RetryWorker: sync successful for ${nextTask.key}`
          );
        } else {
          setRetryQueue((prev) =>
            prev.map((t) =>
              t.id === nextTask.id
                ? { ...t, attempts: t.attempts + 1, lastAttempt: now }
                : t
            )
          );
        }
      }
    }, 1000);

    return () => clearInterval(worker);
  }, [retryQueue, attemptReplication, addLog]);

  const handleForceRetry = () => {
    if (retryQueue.length === 0) return;
    addLog("SYSTEM", LogType.WARN, "Manual sync triggered by Admin");
    setRetryQueue((prev) => prev.map((t) => ({ ...t, lastAttempt: 0 })));
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const allLogs = [...primaryLogs, ...replicaLogs, ...clientLogs].sort(
        (a, b) => a.timestamp - b.timestamp
      );
      const analysis = await analyzeSystemState(
        allLogs.filter((l) => l.node === "PRIMARY"),
        retryQueue,
        primaryStore,
        replicaStore
      );
      setAiAnalysis(analysis);
    } catch (e) {
      setAiAnalysis("Error running analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isConsistent = retryQueue.length === 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-6 font-sans">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-violet-300 bg-clip-text text-transparent flex items-center gap-3">
            <Activity className="text-emerald-400" />
            DistriKV Simulator
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Distributed Key-Value Store with Leader-Follower Replication
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div
            className={`px-4 py-2 rounded-full border flex items-center gap-2 ${
              isConsistent
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            {isConsistent ? (
              <ShieldCheck size={18} />
            ) : (
              <AlertOctagon size={18} />
            )}
            <span className="font-semibold text-sm">
              {isConsistent ? "SYSTEM CONSISTENT" : "INCONSISTENT STATE"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Client Console card (instruction only) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings size={16} /> Client Console
            </h2>

            <div>
              <p className="text-xs text-slate-500">
                Client Console is now a separate app. Open it in another
                terminal / port and send PUTs to:
              </p>
              <pre className="mt-3 bg-slate-950 p-3 rounded text-xs text-slate-300">
                POST http://localhost:3000/sim-put {"{ key, value }"}
              </pre>
              <p className="text-xs text-slate-400 mt-2">
                Or run the lightweight client app (port 3001) you created.
              </p>
            </div>
          </div>

          {/* Network Simulation Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Server size={16} /> Network Simulation
            </h2>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  const newStatus =
                    replicaStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
                  setReplicaStatus(newStatus);
                  addLog(
                    "SYSTEM",
                    LogType.WARN,
                    `Network: Replica Node marked as ${newStatus}`
                  );
                }}
                className={`w-full py-2 px-4 rounded border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  replicaStatus === "ONLINE"
                    ? "bg-emerald-900/30 border-emerald-800 text-emerald-300 hover:bg-emerald-900/50"
                    : "bg-rose-900/30 border-rose-800 text-rose-300 hover:bg-rose-900/50"
                }`}
              >
                {replicaStatus === "ONLINE" ? (
                  <Server size={16} />
                ) : (
                  <ServerCrash size={16} />
                )}
                Replica Status: {replicaStatus}
              </button>
              <p className="text-xs text-slate-500 leading-relaxed">
                Toggle OFFLINE to simulate network partition or replica crash.
                Writes keep succeeding on the primary while replication queues
                up.
              </p>
            </div>
          </div>

          {/* Gemini Admin */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BrainCircuit size={16} /> Gemini System Admin
            </h2>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-slate-800 to-purple-300 hover:from-slate-700 hover:to-purple-200 text-slate-950 font-semibold py-2 rounded transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <span className="animate-pulse">Analyzing Logs...</span>
              ) : (
                <>Analyze Consistency</>
              )}
            </button>

            {aiAnalysis && (
              <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800 text-xs text-slate-300 leading-relaxed animate-in fade-in slide-in-from-top-2">
                <span className="font-bold text-purple-300 block mb-1">
                  Gemini Report:
                </span>
                comming in future
              </div>
            )}
          </div>
        </div>

        {/* Primary Column */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex items-center gap-2 text-emerald-300 mb-[-10px]">
            <Server size={20} />
            <h2 className="font-bold text-lg">Node A (Primary)</h2>
            <span className="text-xs bg-emerald-900/40 text-emerald-200 px-2 py-0.5 rounded ml-auto">
              Leader
            </span>
          </div>

          <Terminal
            title="Primary Logs (WAL)"
            logs={primaryLogs}
            nodeColor="text-emerald-300"
            heightClass="h-72"
          />

          <div className="grid grid-cols-1 gap-4 max-h-64 overflow-auto">
            <StoreViewer
              title="Local Storage (Primary)"
              data={primaryStore}
              highlightKeys={retryQueue.map((t) => t.key)}
            />
          </div>

          <RetryQueue queue={retryQueue} onForceRetry={handleForceRetry} />
        </div>

        {/* Replica Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div
            className={`flex items-center gap-2 mb-[-10px] ${
              replicaStatus === "ONLINE" ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {replicaStatus === "ONLINE" ? (
              <Server size={20} />
            ) : (
              <ServerCrash size={20} />
            )}
            <h2 className="font-bold text-lg">Node B (Replica)</h2>
            <span
              className={`text-xs px-2 py-0.5 rounded ml-auto ${
                replicaStatus === "ONLINE"
                  ? "bg-emerald-900/40 text-emerald-200"
                  : "bg-rose-900/40 text-rose-200"
              }`}
            >
              {replicaStatus === "ONLINE"
                ? "Follower (Sync)"
                : "Follower (Down)"}
            </span>
          </div>

          <WalViewer entries={replicaWal} />

          <Terminal
            title="Replica Logs"
            logs={replicaLogs}
            nodeColor={
              replicaStatus === "ONLINE" ? "text-emerald-300" : "text-rose-300"
            }
            heightClass="h-48"
          />

          <div className="max-h-64 overflow-auto">
            <StoreViewer title="Local Storage (Replica)" data={replicaStore} />
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-xs text-slate-500">
            <h4 className="font-bold text-slate-400 mb-2 uppercase">
              Topology Info
            </h4>
            <div className="flex justify-between border-b border-slate-800 pb-1 mb-1">
              <span>Replication Strategy</span>
              <span className="text-slate-300">
                Async (Eventual Consistency)
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1 mb-1">
              <span>Retry Policy</span>
              <span className="text-slate-300">Fixed Interval (3s)</span>
            </div>
            <div className="flex justify-between">
              <span>Durability</span>
              <span className="text-slate-300">WAL (Simulated)</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
