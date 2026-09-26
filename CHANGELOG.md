# 📋 Changelog

All notable changes to **Choreo** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
