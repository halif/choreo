# 🎭 Choreo v2.6.0

> **Modern, Real-Time Web Dashboard & Control Plane for Puppet Master & Fleet Infrastructure**

[![Release](https://img.shields.io/badge/release-v2.6.0-amber.svg)](https://github.com/halif/choreo/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Puppet](https://img.shields.io/badge/puppet-7.x%20%7C%208.x-orange.svg)](https://puppet.com/)
[![React](https://img.shields.io/badge/frontend-React%2018%20%2B%20Tailwind-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/backend-Express%20%2B%20TypeScript-green.svg)](https://nodejs.org/)

[🇷🇺 Русская версия (README.ru.md)](./README_RU.md)

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

### 1. Requirements (Clean Server Prerequisites)
On a fresh Linux server (Ubuntu/Debian, CentOS/AlmaLinux/RHEL), ensure `curl` and `git` are installed:
```bash
# Ubuntu / Debian:
sudo apt-get update && sudo apt-get install -y curl git

# RHEL / CentOS / Rocky / AlmaLinux:
sudo dnf install -y curl git
```

---

### 2. Recommended: One-Click Automated Systemd Service Install 🌟
If you are deploying Choreo as a background service on a clean server, use the included installer script. It automatically detects your OS, installs Node.js 20 LTS (if missing or outdated), builds the frontend, and creates/starts the `choreo.service` daemon:

```bash
git clone https://github.com/halif/choreo.git
cd choreo
bash install-service.sh
```

To manage the background service:
```bash
sudo systemctl status choreo
sudo systemctl restart choreo
sudo journalctl -u choreo -f
```

---

### 3. Manual Installation & Development Mode

If you prefer to run Choreo manually or in development mode:

Clone the repository:
```bash
git clone https://github.com/halif/choreo.git
cd choreo
```

Install dependencies:
```bash
npm install
```

**Production Mode:**
```bash
# Build the React frontend
npm run build

# Start the Node.js server
npm run start
# Or using node directly:
node dist/server.cjs
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
require 'time'

Puppet::Reports.register_report(:choreo) do
  desc "Send Puppet run reports to Choreo dashboard"

  def process
    uri = URI.parse("http://127.0.0.1:3000/api/webhook/report")

    # Safe run duration calculation (e.g. 3.29s)
    total_time = 0.0
    if self.metrics && self.metrics['time']
      raw_time = self.metrics['time']['total'] || 0.0
      total_time = raw_time.to_f.round(2) rescue 0.0
    end

    # Resource metrics extraction
    res_metrics = { total: 0, unchanged: 0, changed: 0, failed: 0, out_of_sync: 0 }
    if self.metrics && self.metrics['resources']
      res = self.metrics['resources']
      res_metrics[:total]       = (res['total'] || 0).to_i
      res_metrics[:unchanged]   = (res['unchanged'] || 0).to_i
      res_metrics[:changed]     = (res['changed'] || 0).to_i
      res_metrics[:failed]      = (res['failed'] || 0).to_i
      res_metrics[:out_of_sync] = (res['out_of_sync'] || 0).to_i
    end

    # Safe log messages with ISO-8601 timestamps
    formatted_logs = (self.logs || []).map do |l|
      log_time = nil
      if l.respond_to?(:time) && l.time
        log_time = l.time.respond_to?(:iso8601) ? l.time.iso8601 : l.time.to_s
      end
      log_time ||= Time.now.iso8601

      {
        level: l.level.to_s,
        message: l.message.to_s,
        source: (l.source || 'Puppet').to_s,
        time: log_time
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
