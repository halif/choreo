# 📋 Changelog

All notable changes to **Choreo** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.6.5] - 2026-10-10

### 🚀 Added
- **Run Performance Analytics View:**
    - Dedicated **Run Performance** tab inspired by OpenVox Control Center.
    - 4 Key performance indicators: **Avg Run**, **Max Run**, **Min Run**, and **Failed Runs** counter.
    - Interactive **Run Duration Trends** area chart with Recharts visualizing execution spikes over time.
    - **Timing Phase Breakdown** bar chart: isolates master catalog compilation time, package installs, file synchronizations, and service states.
    - **Top Slowest Nodes** rankings table with direct one-click navigation to node telemetry and full transaction reports.
- **Brand Identity & Favicon:**
    - Added vector `favicon.svg` with high-resolution amber gradient and signature `C` badge.
    - Embedded SVG & Apple touch icon references in `index.html`.
- **Hardened GitHub Actions CI/CD Pipeline:**
    - Integrated automated container **Smoke Test** that boots the newly created Docker container and verifies `/api/metrics` health check before registry publication.
    - Added automated security audit jobs (`npm audit` & Aqua Security's **Trivy** vulnerability scanner).
    - Automated Multi-stage Docker builds pushed to GitHub Container Registry (`ghcr.io/halif/choreo`).

### 🛠️ Fixed
- **Synchronous Report Clipboard Copy:**
    - Fixed clipboard copying failures over insecure local HTTP networks (`http://192.168.x.x:3000`) by implementing a synchronous DOM textarea selection fallback alongside `navigator.clipboard`.
    - Added visual copy confirmation badge and toast notification.
- **Facter 4 Ingestion:** Fixed certname resolution when piping `facter -p --json` into `/api/nodes/:certname/facts`.

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
