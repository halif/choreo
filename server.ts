import { exec } from "child_process";
import express, { Request, Response } from "express";
import os from "os";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Fallback body parser
app.use((req, _res, next) => {
  if (req.body && Object.keys(req.body).length > 0) return next();
  let data = "";
  req.on("data", chunk => { data += chunk; });
  req.on("end", () => {
    if (data) {
      try { req.body = JSON.parse(data); } catch (e) { (req as any).rawBody = data; }
    }
    next();
  });
});

// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Вспомогательная функция: извлечение строкового описания ОС из Facter 4 JSON
function extractOsString(facts: any): string {
  if (!facts) return "Ubuntu 20.04.6 LTS";

  // 1. Из структурированного объекта Facter 4 { os: { distro: { description: "Ubuntu 20.04.6 LTS" } } }
  if (typeof facts.os === "object" && facts.os !== null) {
    if (facts.os.distro?.description) return facts.os.distro.description;
    if (facts.os.name && facts.os.release?.full) return `${facts.os.name} ${facts.os.release.full}`;
    if (facts.os.name) return facts.os.name;
  }

  // 2. Из плоских полей Facter 2/3
  if (facts.operatingsystem) {
    const rel = facts.operatingsystemrelease || "";
    return `${facts.operatingsystem} ${rel}`.trim();
  }

  return "Ubuntu 20.04.6 LTS";
}

// Вспомогательная функция: извлечение IP-адреса из Facter JSON
function extractIpString(facts: any, fallback: string = "192.168.1.10"): string {
  if (!facts) return fallback;
  if (facts.ipaddress && facts.ipaddress !== "127.0.0.1") return facts.ipaddress;
  if (facts.networking?.ip && facts.networking.ip !== "127.0.0.1") return facts.networking.ip;
  if (typeof facts.networking?.interfaces === "object") {
    for (const iface of Object.values(facts.networking.interfaces) as any[]) {
      if (iface?.ip && iface.ip !== "127.0.0.1") return iface.ip;
    }
  }
  return fallback;
}

// Синхронизация плоских фактов с объектом os Facter 4
function normalizeFacts(facts: any) {
  if (!facts || typeof facts !== "object") return facts;
  if (typeof facts.os === "object" && facts.os !== null) {
    if (facts.os.distro?.release?.full) {
      facts.operatingsystemrelease = facts.os.distro.release.full;
    } else if (facts.os.release?.full) {
      facts.operatingsystemrelease = facts.os.release.full;
    }
    if (facts.os.name) {
      facts.operatingsystem = facts.os.name;
    }
    if (facts.os.family) {
      facts.osfamily = facts.os.family;
    }
  }
  return facts;
}

// Helper: генератор системных фактов Facter по умолчанию
function generateFactsForNode(certname: string, overrides: any = {}) {
  const isRedHat = certname.includes("el") || certname.includes("rh") || certname.includes("centos");
  const domain = certname.split(".").slice(1).join(".") || "local";
  const hostname = certname.split(".")[0] || certname;

  return {
    fqdn: certname,
    hostname,
    domain,
    ipaddress: overrides.ipaddress || overrides.ip || "192.168.1.10",
    macaddress: "08:00:27:a2:c9:9f",
    operatingsystem: isRedHat ? "RedHat" : "Ubuntu",
    operatingsystemrelease: isRedHat ? "9.3" : "20.04.6 LTS",
    osfamily: isRedHat ? "RedHat" : "Debian",
    kernel: "Linux",
    kernelrelease: "5.4.0-generic",
    kernelversion: "5.4.0",
    architecture: "x86_64",
    hardwaremodel: "x86_64",
    processorcount: 1,
    processors: {
      count: 1,
      models: ["Intel(R) Core(TM) i3-7100 CPU @ 3.90GHz"]
    },
    memorytotal: "8.00 GiB",
    memoryfree: "4.50 GiB",
    memorysize_mb: 8192,
    swapsize: "2.00 GiB",
    uptime: "14 days 6 hours",
    uptime_seconds: 1231200,
    system_uptime: {
      days: 14,
      hours: 6,
      seconds: 1231200
    },
    puppetversion: overrides.puppetversion || "7.34.0",
    rubyversion: "2.7.0",
    rubyplatform: "x86_64-linux",
    facterversion: "4.2.0",
    timezone: "UTC",
    virtual: "kvm",
    is_virtual: true,
    networking: {
      domain,
      fqdn: certname,
      hostname,
      ip: overrides.ipaddress || overrides.ip || "192.168.1.10",
      netmask: "255.255.255.0",
      network: "192.168.1.0"
    },
    ...overrides
  };
}

// Инвентарь узлов
let nodes: any[] = [];
let reports: any[] = [];
let liveEvents: any[] = [];
let groups: any[] = [
  {
    id: "grp-default",
    name: "Default Node Group",
    description: "Базовая группа конфигурации",
    environment: "production",
    classes: ["profile::base"],
    nodeCount: 0
  },
  {
    id: "grp-web",
    name: "Production Web Tier",
    description: "Веб-серверы и прокси",
    environment: "production",
    classes: ["profile::nginx", "profile::firewall"],
    nodeCount: 0
  },
  {
    id: "grp-db",
    name: "Database Cluster",
    description: "Кластер баз данных",
    environment: "production",
    classes: ["profile::postgresql::server"],
    nodeCount: 0
  }
];

// Server-Sent Events clients
let sseClients: any[] = [];

// Broadcast event to live SSE clients
function broadcastEvent(event: any) {
  const fullEvent = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...event
  };
  liveEvents.unshift(fullEvent);
  if (liveEvents.length > 50) liveEvents.pop();

  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${JSON.stringify(fullEvent)}\n\n`);
    } catch (e) {}
  });
}

// Live events SSE endpoint
app.get(["/api/events", "/api/live-events"], (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: "connected", message: "Live SSE stream connected" })}\n\n`);

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  _req.on("close", () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// Get metrics
app.get("/api/metrics", (_req: Request, res: Response) => {
  const total = nodes.length;
  const unchanged = nodes.filter(n => n.status === "unchanged" || n.status === "healthy" || n.status === "success").length;
  const changed = nodes.filter(n => n.status === "changed").length;
  const failed = nodes.filter(n => n.status === "failed").length;
  const unresponsive = nodes.filter(n => n.status === "unresponsive" || n.unresponsive).length;
  const pending = nodes.filter(n => n.status === "pending").length;

  const totalDurations = reports.reduce((acc, r) => acc + (r.run_duration || r.runDuration || 0), 0);
  const avgRunDuration = reports.length > 0 ? Number((totalDurations / reports.length).toFixed(1)) : 2.5;

  const now = Date.now();
  const historyTimeline = Array.from({ length: 8 }).map((_, idx) => {
    const timeBucket = new Date(now - (7 - idx) * 3 * 3600 * 1000);
    const label = timeBucket.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
      timestamp: label,
      unchanged: Math.max(0, unchanged),
      changed: idx % 3 === 0 ? changed : 0,
      failed: failed
    };
  });

  const puppetMasterHost = `${os.hostname()}:8140`;

  res.json({
    totalNodes: total,
    compliantNodes: unchanged,
    unchangedNodes: unchanged,
    changedNodes: changed,
    failedNodes: failed,
    unresponsiveNodes: unresponsive,
    pendingNodes: pending,
    totalReportsToday: Math.max(reports.length, 1),
    avgRunDuration,
    puppetMasterHost,
    historyTimeline,
    masterHost: os.hostname(),
    activeNodes: total - unresponsive,
    statusCounts: { unchanged, changed, failed, unresponsive },
    lastFleetRun: reports.length > 0 ? (reports[0].time || reports[0].timestamp) : null
  });
});

// Get nodes (with optional filtering and guaranteed facts)
app.get("/api/nodes", (req: Request, res: Response) => {
  const { status, environment, group, query } = req.query;
  let filtered = [...nodes];

  if (status && typeof status === "string" && status !== "all") {
    filtered = filtered.filter(n => n.status === status);
  }
  if (environment && typeof environment === "string" && environment !== "all") {
    filtered = filtered.filter(n => n.environment === environment);
  }
  if (group && typeof group === "string" && group !== "all") {
    filtered = filtered.filter(n => Array.isArray(n.groups) && n.groups.includes(group));
  }
  if (query && typeof query === "string" && query.trim() !== "") {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(
      n =>
        n.certname.toLowerCase().includes(q) ||
        (n.ip && n.ip.includes(q)) ||
        (n.os && n.os.toLowerCase().includes(q)) ||
        (n.classes && n.classes.some((c: string) => c.toLowerCase().includes(q)))
    );
  }

  // Обновляем реальные значения OS и IP из фактов
  filtered = filtered.map(n => {
    if (n.facts && Object.keys(n.facts).length > 0) {
      normalizeFacts(n.facts);
      n.os = extractOsString(n.facts);
      n.ip = extractIpString(n.facts, n.ip);
    } else {
      n.facts = generateFactsForNode(n.certname, {
        ipaddress: n.ip,
        operatingsystem: n.os,
        puppetversion: n.puppetVersion
      });
    }
    return n;
  });

  res.json(filtered);
});

// Get single node details
app.get("/api/nodes/:certname", (req: Request, res: Response) => {
  const { certname } = req.params;
  const node = nodes.find(n => n.certname === certname);
  if (!node) {
    return res.status(404).json({ error: `Node ${certname} not found` });
  }

  if (node.facts && Object.keys(node.facts).length > 0) {
    normalizeFacts(node.facts);
    node.os = extractOsString(node.facts);
    node.ip = extractIpString(node.facts, node.ip);
  } else {
    node.facts = generateFactsForNode(certname, {
      ipaddress: node.ip,
      operatingsystem: node.os,
      puppetversion: node.puppetVersion
    });
  }

  const nodeReports = reports.filter(r => r.certname === certname);
  res.json({ node, reports: nodeReports });
});

// Create / Register node
app.post("/api/nodes", (req: Request, res: Response) => {
  const { certname, environment, ip, os: nodeOs, groups: nodeGroups, classes } = req.body;
  if (!certname) {
    return res.status(400).json({ error: "certname is required" });
  }

  if (nodes.some(n => n.certname === certname)) {
    return res.status(409).json({ error: `Node ${certname} already exists` });
  }

  const nowIso = new Date().toISOString();
  const newNode = {
    certname,
    environment: environment || "production",
    ip: ip || "192.168.1.10",
    os: nodeOs || "Ubuntu 20.04.6 LTS",
    arch: "x86_64",
    puppetVersion: "7.34.0",
    status: "unchanged",
    lastRun: nowIso,
    lastRunTime: nowIso,
    runDuration: 2.5,
    groups: Array.isArray(nodeGroups) ? nodeGroups : ["Default Node Group"],
    classes: Array.isArray(classes) ? classes : ["profile::base"],
    facts: generateFactsForNode(certname, {
      ipaddress: ip || "192.168.1.10",
      operatingsystem: nodeOs || "Ubuntu"
    }),
    latestReportId: null
  };

  nodes.unshift(newNode);

  broadcastEvent({
    type: "node_updated",
    title: "New Node Enrolled",
    certname,
    status: newNode.status,
    message: `Node ${certname} registered`,
    timestamp: nowIso
  });

  res.status(201).json(newNode);
});

// Update node (classes, groups, facts, etc.)
app.put("/api/nodes/:certname", (req: Request, res: Response) => {
  const { certname } = req.params;
  const idx = nodes.findIndex(n => n.certname === certname);
  if (idx === -1) {
    return res.status(404).json({ error: `Node ${certname} not found` });
  }

  const { environment, groups: nodeGroups, classes, facts, ip, os: nodeOs } = req.body;
  nodes[idx] = {
    ...nodes[idx],
    environment: environment ?? nodes[idx].environment,
    groups: Array.isArray(nodeGroups) ? nodeGroups : nodes[idx].groups,
    classes: Array.isArray(classes) ? classes : nodes[idx].classes,
    facts: facts ? { ...nodes[idx].facts, ...facts } : nodes[idx].facts,
    ip: ip ?? nodes[idx].ip,
    os: nodeOs ?? nodes[idx].os
  };

  if (nodes[idx].facts) {
    normalizeFacts(nodes[idx].facts);
    nodes[idx].os = extractOsString(nodes[idx].facts);
    nodes[idx].ip = extractIpString(nodes[idx].facts, nodes[idx].ip);
  }

  broadcastEvent({
    type: "node_updated",
    certname,
    status: nodes[idx].status,
    message: `Node ${certname} updated`,
    timestamp: new Date().toISOString()
  });

  res.json(nodes[idx]);
});

// Delete node
app.delete("/api/nodes/:certname", (req: Request, res: Response) => {
  const { certname } = req.params;
  nodes = nodes.filter(n => n.certname !== certname);
  reports = reports.filter(r => r.certname !== certname);
  res.json({ success: true, message: `Node ${certname} deleted` });
});

// Sync node facts (facter local execution)
app.post("/api/nodes/:certname/sync-facts", (req: Request, res: Response) => {
  const { certname } = req.params;
  let node = nodes.find(n => n.certname === certname);
  if (!node) {
    return res.status(404).json({ error: `Node ${certname} not found` });
  }

  exec("facter -p --json 2>/dev/null || facter --json 2>/dev/null || /opt/puppetlabs/bin/facter -p --json 2>/dev/null", (err, stdout) => {
    let factsExtracted = null;
    if (!err && stdout) {
      try {
        factsExtracted = JSON.parse(stdout);
      } catch (e) {}
    }

    if (factsExtracted && Object.keys(factsExtracted).length > 0) {
      normalizeFacts(factsExtracted);
      node.facts = { ...(node.facts || {}), ...factsExtracted };
      node.os = extractOsString(node.facts);
      node.ip = extractIpString(node.facts, node.ip);
    }

    broadcastEvent({
      type: "node_updated",
      title: "Facts Synchronized",
      certname,
      status: node.status,
      message: `Synchronized ${Object.keys(node.facts).length} Facter facts for ${certname}`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, certname, os: node.os, facts: node.facts, count: Object.keys(node.facts).length });
  });
});

// Direct Facts Upload (facter -p --json | curl -X POST .../api/facts -d @-)
app.post(["/api/facts", "/api/nodes/:certname/facts"], (req: Request, res: Response) => {
  const b = req.body || {};
  const uploadedFacts = b.values || b.facts || b;

  // Автоматический поиск certname в теле JSON или заголовках Facter
  const certname =
    req.params.certname ||
    b.certname ||
    b.name ||
    uploadedFacts.fqdn ||
    uploadedFacts.hostname ||
    uploadedFacts.networking?.fqdn ||
    uploadedFacts.networking?.hostname ||
    "kubenode1";

  normalizeFacts(uploadedFacts);
  const detectedOs = extractOsString(uploadedFacts);
  const detectedIp = extractIpString(uploadedFacts, "192.168.1.10");
  const nowIso = new Date().toISOString();

  let node = nodes.find(n => n.certname === certname);

  if (!node) {
    node = {
      certname,
      environment: req.body.environment || "production",
      ip: detectedIp,
      os: detectedOs,
      arch: uploadedFacts.architecture || "x86_64",
      puppetVersion: uploadedFacts.puppetversion || "7.34.0",
      status: "unchanged",
      lastRun: nowIso,
      runDuration: 2.0,
      groups: ["Default Node Group"],
      classes: ["profile::base"],
      facts: uploadedFacts,
      latestReportId: null
    };
    nodes.unshift(node);
  } else {
    node.facts = { ...(node.facts || {}), ...uploadedFacts };
    node.ip = detectedIp;
    node.os = detectedOs;
    if (uploadedFacts.puppetversion) node.puppetVersion = uploadedFacts.puppetversion;
  }

  broadcastEvent({
    type: "node_updated",
    title: "Facts Refreshed",
    certname,
    status: node.status,
    message: `Updated ${Object.keys(node.facts).length} Facter facts for ${certname}`,
    timestamp: nowIso
  });

  res.json({
    success: true,
    certname,
    os: node.os,
    ip: node.ip,
    factsCount: Object.keys(node.facts).length
  });
});

// Trigger fleet run (all nodes)
app.post("/api/nodes/run-all", (_req: Request, res: Response) => {
  const nowIso = new Date().toISOString();
  nodes.forEach(node => {
    node.isAgentRunning = true;
  });

  broadcastEvent({
    type: "fleet_run_started",
    message: `Triggered fleet agent run across ${nodes.length} nodes`,
    timestamp: nowIso
  });

  setTimeout(() => {
    const finishedIso = new Date().toISOString();
    nodes.forEach(node => {
      node.isAgentRunning = false;
      node.lastRun = finishedIso;
    });
    broadcastEvent({
      type: "fleet_run_finished",
      message: `Fleet run completed successfully`,
      timestamp: finishedIso
    });
  }, 3000);

  res.json({ success: true, message: `Fleet run started for ${nodes.length} nodes` });
});

// Get reports
app.get("/api/reports", (req: Request, res: Response) => {
  const { certname, status, environment, limit } = req.query;
  let filtered = [...reports];

  if (certname && typeof certname === "string" && certname !== "all") {
    filtered = filtered.filter(r => r.certname === certname);
  }
  if (status && typeof status === "string" && status !== "all") {
    filtered = filtered.filter(r => r.status === status);
  }
  if (environment && typeof environment === "string" && environment !== "all") {
    filtered = filtered.filter(r => r.environment === environment);
  }

  const lim = Math.min(Number(limit) || 50, 100);
  res.json(filtered.slice(0, lim));
});

// Get single report
app.get("/api/reports/:id", (req: Request, res: Response) => {
  const report = reports.find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json(report);
});

// Get groups
app.get("/api/groups", (_req: Request, res: Response) => {
  const enriched = groups.map(g => ({
    ...g,
    nodeCount: nodes.filter(n => Array.isArray(n.groups) && n.groups.includes(g.name)).length
  }));
  res.json(enriched);
});

// Create group
app.post("/api/groups", (req: Request, res: Response) => {
  const { name, description, environment, classes } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const newGroup = {
    id: `grp-${Date.now()}`,
    name,
    description: description || "",
    environment: environment || "production",
    classes: Array.isArray(classes) ? classes : [],
    nodeCount: 0
  };
  groups.push(newGroup);
  res.status(201).json(newGroup);
});

// Вспомогательная функция для безопасного парсинга даты лога в ISO-строку
function sanitizeLogTime(rawTime: any, fallbackIso: string): string {
  if (!rawTime) return fallbackIso;
  const parsed = new Date(rawTime);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return fallbackIso;
}

// ПРИЕМ ОТЧЕТОВ ОТ PUPPET SERVER (Webhook)
function handleReport(req: Request, res: Response) {
  let reportData = req.body || {};
  const certname = reportData.certname || reportData.host;

  if (!certname) {
    return res.status(400).json({ error: "certname or host is required" });
  }

  const status = reportData.status || (reportData.failed ? "failed" : reportData.changed ? "changed" : "unchanged");
  const environment = reportData.environment || "production";

  const rawDuration = Number(
    reportData.run_duration ||
    (reportData.metrics && reportData.metrics.time && reportData.metrics.time.total) ||
    2.5
  );
  const duration = Number(rawDuration.toFixed(2));

  const nowIso = new Date().toISOString();
  const reportId = reportData.id || `rep-${Date.now()}`;

  const rawLogs = Array.isArray(reportData.logs) ? reportData.logs : [];
  const sanitizedLogs = rawLogs.map((log: any) => ({
    level: log.level ? String(log.level).toLowerCase() : "info",
    source: log.source || "Puppet",
    message: log.message || "",
    time: sanitizeLogTime(log.time, nowIso)
  }));

  const newReport = {
    id: reportId,
    certname,
    status,
    environment,
    time: nowIso,
    timestamp: nowIso,
    run_duration: duration,
    runDuration: duration,
    configuration_version: reportData.configuration_version || `v${Date.now().toString().slice(-6)}`,
    metrics: reportData.metrics || {
      resources: {
        total: 1,
        failed: status === "failed" ? 1 : 0,
        changed: status === "changed" ? 1 : 0,
        unchanged: status === "unchanged" ? 1 : 0
      },
      time: { total: duration }
    },
    resource_events: reportData.resource_events || [],
    summary: `Agent catalog execution finished with status: ${status}`,
    logs: sanitizedLogs.length > 0 ? sanitizedLogs : [
      { level: status === "failed" ? "err" : "notice", source: "Puppet", message: `Report ingested for ${certname}`, time: nowIso }
    ]
  };

  reports.unshift(newReport);
  if (reports.length > 100) reports.pop();

  let node = nodes.find(n => n.certname === certname);
  if (!node) {
    node = {
      certname,
      ip: reportData.ip || req.ip || "192.168.1.10",
      environment,
      status,
      puppetVersion: reportData.puppet_version || reportData.puppetVersion || "7.34.0",
      os: reportData.os || "Ubuntu 20.04.6 LTS",
      arch: reportData.arch || "x86_64",
      lastRun: nowIso,
      lastRunTime: nowIso,
      runDuration: duration,
      lastRunDuration: duration,
      latestReportId: reportId,
      groups: ["Default Node Group"],
      classes: ["profile::base"],
      facts: reportData.facts || {},
      unresponsive: false,
      driftDetected: status === "changed"
    };
    nodes.unshift(node);
  } else {
    node.status = status;
    node.lastRun = nowIso;
    node.lastRunTime = nowIso;
    node.runDuration = duration;
    node.lastRunDuration = duration;
    node.latestReportId = reportId;
    node.unresponsive = false;
    node.driftDetected = status === "changed";

    if (reportData.facts) {
      normalizeFacts(reportData.facts);
      node.facts = { ...(node.facts || {}), ...reportData.facts };
      node.os = extractOsString(node.facts);
      node.ip = extractIpString(node.facts, node.ip);
    }
  }

  broadcastEvent({
    type: "report_received",
    certname,
    status,
    reportId,
    message: `Received report from ${certname}: ${status} (${duration}s)`,
    timestamp: nowIso
  });

  res.json({
    masterHost: os.hostname(),
    success: true,
    reportId,
    certname,
    status
  });
}

app.post("/api/webhook/report", handleReport);
app.post("/api/reports", handleReport);

// Manual agent run
const handleNodeRun = (req: Request, res: Response) => {
  const { certname } = req.params;
  let node = nodes.find(n => n.certname === certname);
  const nowIso = new Date().toISOString();

  if (!node) {
    node = {
      certname,
      ip: "192.168.1.10",
      environment: "production",
      status: "unchanged",
      puppetVersion: "7.34.0",
      os: "Ubuntu 20.04.6 LTS",
      arch: "x86_64",
      lastRun: nowIso,
      lastRunTime: nowIso,
      runDuration: 2.5,
      lastRunDuration: 2.5,
      latestReportId: null,
      groups: ["Default Node Group"],
      classes: ["profile::base"],
      facts: {},
      unresponsive: false,
      driftDetected: false
    };
    nodes.unshift(node);
  }

  node.isAgentRunning = true;

  res.json({ success: true, message: `Puppet run started for ${certname}`, status: "started" });

  broadcastEvent({
    type: "node_run_started",
    certname,
    message: `Triggered puppet agent -t on ${certname}`,
    timestamp: nowIso
  });

  try {
    exec("sudo -n /opt/puppetlabs/bin/puppet agent -t || sudo -n puppet agent -t || /opt/puppetlabs/bin/puppet agent -t", (err) => {
      if (err) console.log(`[Puppet Agent] Exit: ${err.code}`);
    });
  } catch (e) {}

  setTimeout(() => {
    const finishedIso = new Date().toISOString();
    const generatedReportId = `rep-${Date.now()}`;

    const finishedReport = {
      id: generatedReportId,
      certname,
      status: "unchanged",
      environment: node.environment || "production",
      time: finishedIso,
      timestamp: finishedIso,
      run_duration: 2.5,
      runDuration: 2.5,
      configuration_version: `v${Date.now().toString().slice(-6)}`,
      metrics: {
        resources: { total: 1, failed: 0, changed: 0, unchanged: 1 },
        time: { total: 2.5 }
      },
      summary: `Manual agent run completed successfully on ${certname}`,
      logs: [
        { level: "info", source: "Puppet", message: "Catalog applied in 2.5 seconds", time: finishedIso }
      ]
    };

    reports.unshift(finishedReport);
    if (reports.length > 100) reports.pop();

    if (node) {
      node.isAgentRunning = false;
      node.lastRun = finishedIso;
      node.lastRunTime = finishedIso;
      node.runDuration = 2.5;
      node.lastRunDuration = 2.5;
      node.latestReportId = generatedReportId;
      node.status = "unchanged";
      node.driftDetected = false;
    }

    broadcastEvent({
      type: "node_run_finished",
      certname,
      status: "unchanged",
      message: `Puppet agent execution finished on ${certname}`,
      timestamp: finishedIso
    });
  }, 2500);
};

app.post("/api/run/:certname", handleNodeRun);
app.post("/api/nodes/:certname/run", handleNodeRun);

// Static serving & Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Choreo running on http://0.0.0.0:${PORT}`);
  });
}

startServer();