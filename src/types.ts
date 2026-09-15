export type PuppetNodeStatus = 'unchanged' | 'changed' | 'failed' | 'unresponsive' | 'pending';

export interface PuppetNode {
  certname: string;
  environment: string;
  ip: string;
  os: string;
  arch: string;
  puppetVersion: string;
  status: PuppetNodeStatus;
  lastRun: string;
  runDuration: number;
  groups: string[];
  classes: string[];
  facts: {
    fqdn: string;
    ipaddress: string;
    operatingsystem: string;
    osfamily: string;
    kernel: string;
    kernelrelease: string;
    architecture: string;
    processorcount: number;
    memorytotal: string;
    uptime: string;
    puppetversion: string;
    rubyversion: string;
    timezone: string;
    domain: string;
    [key: string]: any;
  };
  latestReportId?: string;
  isAgentRunning?: boolean;
  correctiveChanges?: number;
}

export interface ResourceMetric {
  total: number;
  unchanged: number;
  changed: number;
  failed: number;
  failed_to_restart: number;
  out_of_sync: number;
  skipped: number;
  scheduled: number;
}

export interface TimeMetric {
  config_retrieval: number;
  exec: number;
  package: number;
  service: number;
  file: number;
  total: number;
  [key: string]: number;
}

export interface EventMetric {
  total: number;
  failure: number;
  success: number;
  noop: number;
}

export interface PuppetResourceEvent {
  id?: string;
  resource_type: string;
  title: string;
  property: string;
  previous_value?: string;
  desired_value?: string;
  message: string;
  status: 'success' | 'failure' | 'noop';
  corrective_change?: boolean;
  file?: string;
  line?: number;
}

export interface PuppetLogMessage {
  level: 'debug' | 'info' | 'notice' | 'warning' | 'err';
  message: string;
  source: string;
  time: string;
  file?: string;
  line?: number;
}

export interface PuppetReport {
  id: string;
  certname: string;
  environment: string;
  status: 'unchanged' | 'changed' | 'failed' | 'pending';
  configuration_version: string;
  puppet_version: string;
  time: string;
  run_duration: number;
  metrics: {
    resources: ResourceMetric;
    time: TimeMetric;
    events: EventMetric;
  };
  resource_events: PuppetResourceEvent[];
  logs: PuppetLogMessage[];
  corrective_change?: boolean;
}

export interface NodeGroup {
  id: string;
  name: string;
  description: string;
  environment: string;
  classes: string[];
  variables: Record<string, string>;
  nodeCount?: number;
}

export interface DashboardMetrics {
  totalNodes: number;
  compliantNodes: number;
  changedNodes: number;
  failedNodes: number;
  unresponsiveNodes: number;
  pendingNodes: number;
  totalReportsToday: number;
  avgRunDuration: number;
  historyTimeline: {
    timestamp: string;
    unchanged: number;
    changed: number;
    failed: number;
  }[];
}

export interface LivePuppetEvent {
  id: string;
  type: 'connected' | 'report_received' | 'node_updated' | 'node_run_started' | 'node_run_finished' | 'alert';
  title: string;
  certname: string;
  status?: PuppetNodeStatus;
  reportId?: string;
  message: string;
  timestamp: string;
}
