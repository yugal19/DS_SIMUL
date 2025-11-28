# REST-based Mini Distributed Key-Value Store (w/ Replication Simulation)

A lightweight, browser-based simulator demonstrating:

- Leader–Follower replication
- Write-Ahead Logging (WAL)
- Retry queue & failure handling
- Replica crashes & network partitions
- Real-time logs and storage visualization

---

## 🚀 Run Locally

The project runs **two separate UIs**, just like real-world systems where the client and server are separate nodes:

- **Simulator UI** (Primary + Replica) → Port **3000**
- **Client Console** (sends PUT requests) → Port **3001**

#

# What is This Project?

This simulator visually demonstrates how:

- The **Client Console** sends PUT requests (key-value pairs)
- The **Primary Node** writes to WAL, stores data, and attempts replication
- The **Replica Node** receives WAL entries and applies them with delay
- Replication failures trigger the **Retry Queue**
- Turning Replica OFFLINE simulates network failure
- Turning Replica ONLINE resumes replication

Everything is shown live using log panels and storage views.

---

# System Architecture (Short Description)

- Client Console sends PUT to `/sim-put`
- Simulator backend (via Vite dev server plugin) queues request
- Primary Node:
  - Reads queued request
  - Writes to local store
  - Logs WAL entries
  - Attempts async replication to Replica
- Replica Node:
  - Receives WAL entries
  - Applies entries after delay
  - Can go ONLINE/OFFLINE
- Retry Worker retries failed replications every 3 seconds

---

# Folder Structure

```
project/
│
├── src/ # Simulator (Primary + Replica + UI)
│ ├── components/ # Terminal, Logs, Store viewer, WAL viewer
│ ├── services/ # Analysis services
│ ├── App.tsx # Main distributed system code
│ └── vite.config.ts # REST endpoints (sim-put, sim-requests)
│
└── client-console/ # Separate client app
└── src/
└── App.js
```

---

## 📥 Installation & Setup

## 1️⃣ Install dependencies for Simulator

```bash
npm install
```

## 2️⃣Install dependencies for Client Console

```bash
cd client-console
npm install
```
