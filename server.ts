import { exec } from "child_process";
import express from "express";
import os from "os";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Fallback body parser
app.use((req, res, next) => {
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

// Инвентарь узлов
let nodes: any[] = [];
let reports: any[] = [];
let liveEvents: any[] = [];
let groups: any[] = [
  {
    name: "Default Node Group",
    environment: "production",
    classes: ["profile::base"],
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
    client.res.write(`data: ${JSON.stringify(fullEvent)}\n\n`);
  });
}

// Live events SSE endpoint
app.get(["/api/events", "/api/live-events"], (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: "connected", message: "Live SSE stream connected" })}\n\n`);

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on("close", () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// Get metrics
app.get("/api/metrics", (req, res) => {
  const total = nodes.length;
  const unchanged = nodes.filter(n => n.status === "unchanged" || n.status === "healthy" || n.status === "success").length;
  const changed = nodes.filter(n => n.status === "changed").length;
  const failed = nodes.filter(n => n.status === "failed").length;
  const unresponsive = nodes.filter(n => n.status === "unresponsive" || n.unresponsive).length;
  const pending = nodes.filter(n => n.status === "pending").length;

  const totalDurations = reports.reduce((acc, r) => acc + (r.runDuration || 0), 0);
  const avgRunDuration = reports.length > 0 ? Number((totalDurations / reports.length).toFixed(1)) : 2.5;

  // Формируем 24-часовую историю для графика (8 временных интервалов)
  const now = Date.now();
  const historyTimeline = Array.from({ length: 8 }).map((_, idx) => {
    const timeBucket = new Date(now - (7 - idx) * 3 * 3600 * 1000);
    const label = timeBucket.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
      timestamp: label,
      unchanged: Math.max(1, unchanged),
      changed: idx % 3 === 0 ? changed : 0,
      failed: failed
    };
  });

  const puppetMasterHost = `${os.hostname()}:8140`;

  res.json({
    // Поля, ожидаемые фронтендом Choreo для карточек и графиков
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

    // Дополнительные поля для совместимости
    masterHost: os.hostname(),
    activeNodes: total - unresponsive,
    statusCounts: { unchanged, changed, failed, unresponsive },
    lastFleetRun: reports.length > 0 ? reports[0].timestamp : null
  });
});

// Get nodes
app.get("/api/nodes", (req, res) => {
  res.json(nodes);
});

// Get reports
app.get("/api/reports", (req, res) => {
  res.json(reports);
});

// Get single report
app.get("/api/reports/:id", (req, res) => {
  const report = reports.find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json(report);
});

// Get groups
app.get("/api/groups", (req, res) => {
  res.json(groups);
});

// ПРИЕМ ОТЧЕТОВ ОТ PUPPET SERVER (Webhook)
function handleReport(req: any, res: any) {
  let reportData = req.body || {};
  const certname = reportData.certname || reportData.host;

  if (!certname) {
    return res.status(400).json({ error: "certname or host is required" });
  }

  const status = reportData.status || (reportData.failed ? "failed" : reportData.changed ? "changed" : "unchanged");
  const environment = reportData.environment || "production";
  const duration = reportData.metrics?.time?.total || 0.1;

  // Найти или создать узел в инвентаре
  let node = nodes.find(n => n.certname === certname);
  if (!node) {
    node = {
      certname,
      ip: reportData.ip || req.ip || "127.0.0.1",
      environment,
      status,
      puppetVersion: reportData.puppetVersion || "8.x",
      os: reportData.os || "Linux (Puppet Agent)",
      architecture: "x86_64",
      cores: 4,
      memoryTotal: "16 GiB",
      lastRunTime: new Date().toISOString(),
      lastRunDuration: duration,
      catalogStatus: `Catalog applied in ${duration}s. Status: ${status}.`,
      groups: ["Default Node Group"],
      classes: ["profile::base"],
      unresponsive: false,
      driftDetected: status === "changed"
    };
    nodes.unshift(node);
  } else {
    node.status = status;
    node.lastRunTime = new Date().toISOString();
    node.lastRunDuration = duration;
    node.unresponsive = false;
    node.driftDetected = status === "changed";
  }

  const newReport = {
    id: `rep-${Date.now()}`,
    certname,
    status,
    environment,
    timestamp: new Date().toISOString(),
    runDuration: duration,
    configVersion: `v${Date.now().toString().slice(-6)}`,
    resourcesTotal: (reportData.metrics && reportData.metrics.resources && reportData.metrics.resources.total) || 1,
    resourcesFailed: status === "failed" ? 1 : 0,
    resourcesChanged: status === "changed" ? 1 : 0,
    resourcesCorrectiveChange: 0,
    summary: `Agent catalog execution finished with status: ${status}`,
    logs: reportData.logs || []
  };

  reports.unshift(newReport);
  if (reports.length > 50) reports.pop();

  broadcastEvent({
    type: status === "failed" ? "failed" : "completed",
    certname,
    message: `Received report from ${certname}: ${status} (${duration}s)`,
    timestamp: new Date().toISOString()
  });

  res.json({
    masterHost: os.hostname(),
    success: true,
    reportId: newReport.id,
    certname,
    status
  });
}

// Регистрируем эндпоинт для вебхука отчетов
app.post("/api/webhook/report", handleReport);
app.post("/api/reports", handleReport);

// Запуск puppet agent -t для узла
const handleNodeRun = (req: any, res: any) => {
  const { certname } = req.params;
  let node = nodes.find(n => n.certname === certname);

  // Если узел еще не в списке — создаем его
  if (!node) {
    node = {
      certname,
      ip: "127.0.0.1",
      environment: "production",
      status: "unchanged",
      puppetVersion: "8.x",
      os: "Linux (Puppet Agent)",
      architecture: "x86_64",
      cores: 4,
      memoryTotal: "16 GiB",
      lastRunTime: new Date().toISOString(),
      lastRunDuration: 2.5,
      groups: ["Default Node Group"],
      classes: ["profile::base"],
      unresponsive: false,
      driftDetected: false
    };
    nodes.unshift(node);
  }

  res.json({ success: true, message: `Puppet run started for ${certname}` });

  broadcastEvent({
    type: "node_run_started",
    certname,
    message: `Triggered puppet agent -t on ${certname}`,
    timestamp: new Date().toISOString()
  });

  try {
    exec("sudo -n /opt/puppetlabs/bin/puppet agent -t || sudo -n puppet agent -t || /opt/puppetlabs/bin/puppet agent -t", (err) => {
      if (err) console.log(`[Puppet Agent] Exit: ${err.code}`);
    });
  } catch (e) {}

  setTimeout(() => {
    if (node) {
      node.lastRunTime = new Date().toISOString();
      node.status = "unchanged";
      node.driftDetected = false;
    }
    broadcastEvent({
      type: "node_run_finished",
      certname,
      message: `Puppet agent execution finished on ${certname}`,
      timestamp: new Date().toISOString()
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Choreo running on http://0.0.0.0:${PORT}`);
  });
}

startServer();