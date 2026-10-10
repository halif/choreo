# 🎭 Choreo v2.6.5

> **Modern, Real-Time Web Dashboard & Control Plane for Puppet Master & Fleet Infrastructure**

[![CI/CD Pipeline](https://github.com/halif/choreo/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/halif/choreo/actions/workflows/ci-cd.yml)
[![Release](https://img.shields.io/badge/release-v2.6.5-amber.svg)](https://github.com/halif/choreo/releases)
[![Docker](https://img.shields.io/badge/docker-ghcr.io-blue.svg)](https://github.com/halif/choreo/pkgs/container/choreo)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Puppet](https://img.shields.io/badge/puppet-7.x%20%7C%208.x-orange.svg)](https://puppet.com/)
[![React](https://img.shields.io/badge/frontend-React%2019%20%2B%20Tailwind-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/backend-Express%20%2B%20TypeScript-green.svg)](https://nodejs.org/)

[🇷🇺 Русская версия (README.ru.md)](./README_RU.md)

---

## 🌟 Overview

**Choreo** is an open-source, lightweight, and modern alternative to Puppet Enterprise Console and PuppetBoard. It provides system administrators and DevOps engineers with real-time observability and remote run control over Puppet Agent nodes across multiple environments (`production`, `staging`, `development`).

Featuring live Server-Sent Events (SSE), instant report ingestion via webhooks, automated Facter facts synchronization, and single-click execution of `puppet agent -t`, Choreo helps you track infrastructure state and configuration drift effortlessly.

---

## ✨ Features

- 🖥️ **Live Node Fleet Inventory:** View node statuses (`unchanged`, `changed`, `failed`, `unresponsive`), FQDN, IPs, operating systems, assigned classes, and environments.
- ⚡ **One-Click Agent Runs:** Trigger `puppet agent -t` directly on individual nodes or batch execute across the entire fleet.
- 🔍 **Native Facter 4 Ingestion & Live Sync:** Ingest structured facts directly (`facter -p --json`) with auto-detected OS distributions, network interfaces, and hardware specs.
- 📄 **Deep Report Inspection:** Inspect detailed Puppet transaction reports including resource metrics (unchanged / changed / failed), run durations, diffs, and full execution logs.
- 📋 **Reliable JSON Report Export:** One-click copy for raw Puppet reports with synchronous HTTP fallback support.
- 🔄 **Real-Time Live Event Bus:** Built-in Server-Sent Events (SSE) stream instant run progress and report ingestion without requiring manual page refreshes.
- 🏷️ **Node Groups & ENC Classification:** Manage node classifications and environment assignments from a sleek interface.
- 🐳 **Docker & CI/CD Ready:** Automated GitHub Actions pipeline with container publishing to GitHub Container Registry (GHCR).

---

## 🏗️ Architecture

```
[ Puppet Agent Nodes ]
        │
        │ 1. Catalog run & report generation / Facter facts
        ▼
[ Puppet Server / Master ]
        │
        │ 2. Webhook report processor (/api/webhook/report)
        ▼
┌────────────────────────────────────────────────────────┐
│                      CHOREO v2.6.1                     │
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

### Option A: Run via Docker (Fastest) 🐳

Choreo is published directly to GitHub Container Registry:

```bash
docker run -d \
  --name choreo \
  -p 3000:3000 \
  --restart always \
  ghcr.io/halif/choreo:latest
```

Open `http://<YOUR_SERVER_IP>:3000` in your browser.

---

### Option B: Automated Systemd Service Install 🌟
If you are deploying Choreo as a system daemon on a clean Linux server (Ubuntu/Debian, CentOS/AlmaLinux/RHEL):

```bash
git clone https://github.com/halif/choreo.git
cd choreo
bash install-service.sh
```

Manage the service:
```bash
sudo systemctl status choreo
sudo systemctl restart choreo
sudo journalctl -u choreo -f
```

---

### Option C: Manual Installation & Development

```bash
git clone https://github.com/halif/choreo.git
cd choreo
npm install

# Production build and run:
npm run build
npm start

# Development mode (Hot-reload):
npm run dev
```

Choreo UI will be available at `http://<YOUR_SERVER_IP>:3000`.

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
require 'time'

Puppet::Reports.register_report(:choreo) do
  desc "Send Puppet run reports to Choreo dashboard"

  def process
    uri = URI.parse("http://192.168.1.9:3000/api/reports")
    total_time = self.metrics['time'] && self.metrics['time']['total'] ? self.metrics['time']['total'].round(2) : 0.0

    res_metrics = {
      total: self.resource_statuses.size,
      unchanged: self.resource_statuses.values.count { |r| !r.changed && !r.failed },
      changed: self.resource_statuses.values.count { |r| r.changed && !r.failed },
      failed: self.resource_statuses.values.count { |r| r.failed },
      out_of_sync: self.resource_statuses.values.count { |r| r.out_of_sync }
    }

    formatted_logs = self.logs.map do |log|
      {
        level: log.level.to_s,
        message: log.message.to_s,
        source: log.source.to_s,
        time: log.time.iso8601
      }
    end

    payload = {
      certname: self.host.to_s,
      status: self.status.to_s,
      environment: self.environment.to_s,
      puppetVersion: Puppet.version.to_s,
      configuration_version: self.configuration_version.to_s,
      run_duration: total_time,
      metrics: {
        time: { total: total_time },
        resources: res_metrics
      },
      logs: formatted_logs
    }

    http = Net::HTTP.new(uri.host, uri.port)
    http.read_timeout = 5
    http.open_timeout = 5

    request = Net::HTTP::Post.new(uri.request_uri, { 'Content-Type' => 'application/json' })
    request.body = payload.to_json
    response = http.request(request)
    Puppet.info "Choreo report sent for #{self.host}: HTTP #{response.code}"
  rescue => e
    Puppet.err "Failed to send report to Choreo: #{e.class} - #{e.message}"
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

## 💻 Syncing Node Facts (Facter)

To send live hardware and OS telemetry from any node to Choreo:

```bash
facter -p --json | curl -X POST http://<CHOREO_IP>:3000/api/nodes/<CERTNAME>/facts \
  -H "Content-Type: application/json" \
  -d @-
```
Or click the **"Sync Facts"** button directly inside the Node Details modal in the web interface.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/metrics` | Cluster health metrics, run durations, and 24h timeline |
| `GET` | `/api/nodes` | List all discovered Puppet nodes |
| `GET` | `/api/nodes/:certname` | Node facts, details, and execution history |
| `POST` | `/api/nodes/:certname/facts` | Ingest structured Facter JSON for node |
| `POST` | `/api/nodes/:certname/sync-facts` | Run local facter and refresh node telemetry |
| `GET` | `/api/reports` | List recent Puppet transaction reports |
| `GET` | `/api/reports/:id` | Fetch detailed report logs & resource stats |
| `POST` | `/api/reports` | Webhook endpoint for Puppet report submission |
| `POST` | `/api/run/:certname` | Triggers `puppet agent -t` remotely on node |
| `GET` | `/api/events` | Server-Sent Events (SSE) live event stream |

---

## 🔄 CI/CD Pipeline

The project features a continuous integration and deployment pipeline powered by GitHub Actions (`.github/workflows/ci-cd.yml`):
- **Lint & Build:** Validates TypeScript types (`tsc --noEmit`) and compiles bundles.
- **Docker Build & Push:** Automates multi-stage Docker build and pushes images to **GHCR** (`ghcr.io/halif/choreo`).
- **Automated Deploy:** Supports optional zero-downtime SSH deployments to your Puppet Master host.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!
Feel free to open an [Issue](https://github.com/halif/choreo/issues) or submit a [Pull Request](https://github.com/halif/choreo/pulls).

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).
