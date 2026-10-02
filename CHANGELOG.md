# 📋 Changelog

All notable changes to **Choreo** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.6.0] - 2026-10-02

### 🚀 Added
- **Automated Service Installer (`install-service.sh`):**
    - Interactive terminal installer with rich ANSI colors and ASCII branding.
    - Automatic detection and setup of Node.js 20 LTS via official NodeSource repository (fixes incompatibility on legacy OS distributions like Ubuntu 20.04/CentOS).
    - Automatically provisions `/etc/systemd/system/choreo.service`, enables and launches the systemd daemon.
- **Enhanced Puppet Report Processor (`choreo.rb`):**
    - Added strict ISO-8601 timestamps (`l.time.iso8601`) for all log events.
    - Extracted real resource counters (`total`, `unchanged`, `changed`, `failed`, `out_of_sync`) from Puppet report payload.
    - Rounded run execution durations to 2 decimal places (`.round(2)`).

### 🛠️ Fixed
- **`Invalid Date` in Agent Execution Logs:** Fixed parsing failure in `ReportDetailModal` by introducing safe fallback formatting and ISO timestamps in the report ingestion pipeline.
- **Run Duration Precision:** Cleaned up excessive floating point decimal strings (e.g., `3.287815292s`) to a crisp `3.29s прогон`.
- **Node.js Backward Compatibility:** Replaced optional chaining syntax in server bundle for seamless execution across different Node.js environments.

---

## [2.5.0] - 2026-09-26

### 🚀 Added
- **Direct Report Access in Inventory (`NodesView`):** Added `FileText` action button (`📄`) next to the run trigger (`▶`), allowing instant navigation to the transaction report for any Puppet node.
- **Smart Failsafe Report Binding:** Automated fallback that correlates reports by certname or short hostname if explicit IDs were temporarily unmapped.
- **Unified Webhook Handling:** Structured report storage supporting both `/api/webhook/report` and `/api/reports`.

### 🛠️ Fixed
- **Timestamp & Duration Parsing:** Fixed `NaN д назад` / `Invalid Date` errors by supporting ISO strings, Unix timestamps (seconds & milliseconds), and Puppet native time metrics.
- **Node-to-Report Linkage (`latestReportId`):** In `server.ts`, mapped `latestReportId`, `lastRun`, and `runDuration` directly to inventory nodes upon incoming webhook reports and manual agent executions.
- **Field Consistency:** Harmonized duration fields (`run_duration` and `runDuration`) across API schemas, frontend views, and SSE live streams.

---

## [2.4.0] - Prior Release
- Initial implementation of SSE live event bus.
- Real-time fleet overview dashboard with node status distribution.
- Remote agent execution support (`puppet agent -t`).
