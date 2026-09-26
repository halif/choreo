# 🎭 Choreo v2.5.0

> **Modern, Real-Time Web Dashboard & Control Plane for Puppet Master & Fleet Infrastructure**

[![Release](https://img.shields.io/badge/release-v2.5.0-amber.svg)](https://github.com/halif/choreo/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Puppet](https://img.shields.io/badge/puppet-7.x%20%7C%208.x-orange.svg)](https://puppet.com/)
[![React](https://img.shields.io/badge/frontend-React%2018%20%2B%20Tailwind-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/backend-Express%20%2B%20TypeScript-green.svg)](https://nodejs.org/)

---

## 🌟 Overview

**Choreo** is an open-source, lightweight, and modern alternative to Puppet Enterprise Console and PuppetBoard. It provides system administrators and DevOps engineers with real-time observability and remote run control over Puppet Agent nodes across multiple environments (`production`, `staging`, `development`).

Featuring live Server-Sent Events (SSE), instant report ingestion via webhooks, and single-click execution of `puppet agent -t`, Choreo helps you track infrastructure state and configuration drift effortlessly.

---

## ✨ Features

- 🖥️ **Live Node Fleet Inventory:** View node statuses (`unchanged`, `changed`, `failed`, `unresponsive`), FQDN, IPs, operating systems, assigned classes, and environments.
- ⚡ **One-Click Agent Runs:** Trigger `puppet agent -t` directly on individual nodes or batch execute across the entire fleet.
- 📄 **Deep Report Inspection:** Inspect detailed Puppet transaction reports including resource metrics (unchanged / changed / failed), run durations, and full execution logs.
- 🔄 **Real-Time Live Event Bus:** Built-in Server-Sent Events (SSE) stream instant run progress and report ingestion without requiring manual page refreshes.
- 🏷️ **Node Groups & ENC Classification:** Manage node classifications and environment assignments from a sleek interface.
- 🛡️ **Lightweight & Self-Contained:** Runs seamlessly on the same machine as your Puppet Server or on a dedicated monitoring host.

---

## 🏗️ Architecture

```
[ Puppet Agent Nodes ]
        │
        │ 1. Catalog run & report generation
        ▼
[ Puppet Server / Master ]
        │
        │ 2. Webhook report processor (/api/webhook/report)
        ▼
┌────────────────────────────────────────────────────────┐
│                      CHOREO v2.5.0                     │
│                                                        │
│  [ Express API + SSE Bus ] ─── (port 3000)             │
│            ▲                                           │
│            │ JSON State & Node Inventory               │
│            ▼                                           │
│  [ React SPA + Tailwind CSS + Lucide Icons ]           │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Requirements
- Node.js (v18.x or v20.x+)
- npm or yarn
- Puppet Server 7.x / 8.x (optional for development mode)

### 2. Installation & Setup

Clone the repository:
```bash
git clone https://github.com/halif/choreo.git
cd choreo
```

Install dependencies:
```bash
npm install
```

### 3. Build & Run

**Production Mode:**
```bash
# Build the React frontend
npm run build

# Start the Node.js server
npm run start
# Or using node directly:
node server.ts
```

**Development Mode (Hot Reloading):**
```bash
npm run dev
```

Choreo will be accessible at: `http://<YOUR_SERVER_IP>:3000`

---

## ⚙️ Configuring Puppet Server Webhook

To automatically send Puppet reports to Choreo after each agent run, configure a custom report processor on your Puppet Server.

### Step 1: Create Report Processor Script
On your Puppet Server, create `/etc/puppetlabs/puppet/choreo_report.rb`:

```ruby
require 'puppet'
require 'net/http'
require 'uri'
require 'json'

Puppet::Reports.register_report(:choreo) do
  desc "Send Puppet run reports to Choreo dashboard"

  def process
    uri = URI.parse("http://127.0.0.1:3000/api/webhook/report")
    payload = {
      certname: self.host,
      status: self.status,
      environment: self.environment,
      run_duration: self.metrics["time"]["total"] rescue 0.0,
      configuration_version: self.configuration_version,
      logs: self.logs.map { |l| { level: l.level.to_s, message: l.message, time: l.time.to_s } }
    }

    http = Net::HTTP.new(uri.host, uri.port)
    request = Net::HTTP::Post.new(uri.request_uri, { 'Content-Type' => 'application/json' })
    request.body = payload.to_json
    http.request(request) rescue nil
  end
end
```

### Step 2: Enable in `puppet.conf`
In `/etc/puppetlabs/puppet/puppet.conf` under `[master]` or `[server]`:

```ini
[master]
reports = store, choreo
```

Restart Puppet Server:
```bash
sudo systemctl restart puppetserver
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/metrics` | Returns cluster health metrics, run durations, and 24h timeline |
| `GET` | `/api/nodes` | List all discovered Puppet nodes |
| `GET` | `/api/reports` | List recent Puppet transaction reports |
| `GET` | `/api/reports/:id` | Fetch detailed report logs & resource stats |
| `POST` | `/api/webhook/report` | Webhook endpoint for Puppet Server report submission |
| `POST` | `/api/run/:certname` | Triggers `puppet agent -t` remotely on the specified node |
| `GET` | `/api/events` | Server-Sent Events (SSE) live event stream |

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!
Feel free to open an [Issue](https://github.com/halif/choreo/issues) or submit a [Pull Request](https://github.com/halif/choreo/pulls).

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).
