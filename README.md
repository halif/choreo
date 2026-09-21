# Choreo v2.4 — Puppet Orchestration & Node Management Dashboard

**English version (EN)** | [Русская версия (RU)](./README_RU.md)

---

Choreo is a modern, real-time web dashboard for Puppet infrastructure management and node orchestration. It enables DevOps and infrastructure engineers to monitor fleet health, inspect catalog run reports, manage node classification groups, and trigger `puppet agent -t` runs in one click without UI or socket lockups.

---

## 🚀 Key Features

- **Fleet Overview & Node Monitoring**:
    - Auto-discovery of local Puppet Master and connected agent nodes.
    - Instant configuration status tracking: *Healthy*, *Failed*, *Changed*, *Configuration Drift*.
    - Detailed node telemetry: FQDN, IP address, environment (`production`), Puppet agent version, hardware resources (vCPU, RAM).
- **One-Click Agent Orchestration (`puppet agent -t`)**:
    - Non-blocking asynchronous trigger of `puppet agent -t` on individual nodes.
    - Multi-node batch run trigger across the entire fleet.
    - True background CLI execution with instant HTTP response (no socket freeze or perpetual spinners).
- **Report Ingestion & Catalog Analytics**:
    - Ingestion of structured Puppet reports via HTTP Webhooks (`/api/webhook/report` and `/api/reports`).
    - Comprehensive inspection of resource metrics, catalog compilation duration, and execution logs.
- **Node Classification & Groups**:
    - Organize nodes into logical groups and assign Puppet profile/role classes.
- **Real-Time Live Events (SSE)**:
    - Instant status notifications via Server-Sent Events for run dispatch, completion, and node state changes.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Express.js (Node.js), TypeScript (`tsx`), Server-Sent Events (SSE).
- **Build & Dev Tooling**: Vite 6, esbuild.
- **Infrastructure**: Linux, Puppet Server 7/8, Puppet Agent CLI.

---

## 📋 System Requirements

- **Node.js**: version 18.x or later.
- **Puppet Agent / Server**: binary located at `/opt/puppetlabs/bin/puppet` (or in `$PATH`).
- **Sudo Permissions**: passwordless sudo permission for running the puppet agent under the app user:
  ```bash
  # Add to /etc/sudoers or /etc/sudoers.d/puppet-agent
  <YOUR_USER> ALL=(ALL) NOPASSWD: /opt/puppetlabs/bin/puppet agent -t
  ```

---

## ⚙️ Quick Start

### 1. Clone the repository and install dependencies
```bash
git clone <REPOSITORY_URL> choreo
cd choreo
npm install
```

### 2. Development Mode
```bash
npm run dev
```
Open your browser and navigate to:  
👉 **http://localhost:3000** (or `http://<SERVER_IP>:3000`)

### 3. Production Build & Run
```bash
# Build frontend assets and bundle backend server
npm run build

# Start production server
npm start
```

---

## 📡 API Reference & Examples

### 1. Get Fleet Metrics & Puppet Master Host
```bash
curl -X GET http://localhost:3000/api/metrics
```
**Example Response:**
```json
{
  "puppetMasterHost": "kubenode1:8140",
  "totalNodes": 1,
  "compliantNodes": 1,
  "failedNodes": 0,
  "unresponsiveNodes": 0,
  "totalReportsToday": 39,
  "avgRunDuration": 2.5
}
```

### 2. List Registered Nodes
```bash
curl -X GET http://localhost:3000/api/nodes
```
**Example Response:**
```json
[
  {
    "certname": "kubenode1",
    "ip": "127.0.0.1",
    "environment": "production",
    "status": "unchanged",
    "puppetVersion": "7.34.0",
    "isAgentRunning": false
  }
]
```

### 3. Trigger Puppet Agent Run on a Node
Dispatches an instant, non-blocking background `puppet agent -t` execution:
```bash
curl -i -X POST http://localhost:3000/api/nodes/kubenode1/run \
  -H "Content-Type: application/json" \
  -d '{"forcedOutcome": "success"}'
```
**Example Response:**
```json
{
  "success": true,
  "message": "Puppet run started for kubenode1",
  "status": "running"
}
```

### 4. Send Puppet Run Report via Webhook
```bash
curl -X POST http://localhost:3000/api/webhook/report \
  -H "Content-Type: application/json" \
  -d '{
    "certname": "kubenode1",
    "status": "unchanged",
    "environment": "production",
    "metrics": {
      "total_time": 2.45,
      "resources_changed": 0,
      "resources_failed": 0
    },
    "logs": [
      { "level": "notice", "message": "Applied catalog in 2.45 seconds" }
    ]
  }'
```

### 5. Subscribe to Real-Time Event Stream (SSE)
```bash
curl -N -X GET http://localhost:3000/api/events
```
**Example Events:**
```text
data: {"id":"ev-1774136894000","type":"node_run_started","title":"Agent Run Initiated","certname":"kubenode1","message":"puppet agent -t triggered on kubenode1","timestamp":"2026-09-21T22:09:14.000Z"}
```

---

## 📁 Project Structure

```text
choreo/
├── server.ts             # Express backend, API endpoints, SSE bus, Puppet CLI wrapper
├── src/
│   ├── App.tsx           # Root UI dashboard and state coordination
│   ├── components/       # Reusable components (Header, NodesView, Reports, Groups, Modals)
│   ├── services/
│   │   └── api.ts        # Client API layer (non-blocking fetch, SSE subscription)
│   ├── types.ts          # Shared TypeScript type definitions
│   └── main.tsx          # React application entrypoint
├── package.json          # Project scripts and dependencies
├── vite.config.ts        # Vite configuration
├── LICENSE               # MIT License
├── README.md             # Primary English documentation
└── README_RU.md          # Russian documentation
```

---

## 📄 License

MIT
