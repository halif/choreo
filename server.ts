import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  PuppetNode,
  PuppetReport,
  NodeGroup,
  DashboardMetrics,
  LivePuppetEvent,
  PuppetNodeStatus
} from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ----------------------------------------------------
// SSE (Server-Sent Events) for Real-Time Updates
// ----------------------------------------------------
const sseClients: Set<Response> = new Set();

function broadcastEvent(event: LivePuppetEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  }
}

// ----------------------------------------------------
// Seed Data
// ----------------------------------------------------
const initialGroups: NodeGroup[] = [
  {
    id: 'grp-web',
    name: 'Production Web Tier',
    description: 'Nginx edge reverse-proxies and ingress nodes',
    environment: 'production',
    classes: ['profile::nginx', 'profile::ssl_certs', 'profile::firewall', 'puppetlabs::ntp'],
    variables: { 'nginx_worker_processes': 'auto', 'ssl_protocols': 'TLSv1.2 TLSv1.3' }
  },
  {
    id: 'grp-db',
    name: 'Database Cluster',
    description: 'PostgreSQL primary and read-replica database hosts',
    environment: 'production',
    classes: ['profile::postgresql::server', 'profile::backup::wal_e', 'profile::sysctl::db_tuning'],
    variables: { 'shared_buffers': '16GB', 'max_connections': '500' }
  },
  {
    id: 'grp-k8s',
    name: 'Kubernetes Nodes',
    description: 'K8s control planes and compute workers',
    environment: 'production',
    classes: ['profile::kubernetes::node', 'profile::containerd', 'profile::monitoring::node_exporter'],
    variables: { 'cluster_name': 'k8s-prod-us-east', 'pod_network_cidr': '10.244.0.0/16' }
  },
  {
    id: 'grp-staging',
    name: 'Staging & CI Fleet',
    description: 'Pre-production testbeds and continuous integration runners',
    environment: 'staging',
    classes: ['profile::ci::runner', 'profile::docker', 'puppetlabs::ntp'],
    variables: { 'docker_registry': 'registry.internal.acme.net' }
  }
];

let nodes: PuppetNode[] = [
  {
    certname: 'web-01.prod.acme.net',
    environment: 'production',
    ip: '10.20.1.11',
    os: 'Ubuntu 24.04.1 LTS',
    arch: 'x86_64',
    puppetVersion: '8.4.0',
    status: 'unchanged',
    lastRun: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    runDuration: 24.8,
    groups: ['Production Web Tier'],
    classes: ['profile::nginx', 'profile::ssl_certs', 'puppetlabs::ntp', 'profile::firewall'],
    facts: {
      fqdn: 'web-01.prod.acme.net',
      ipaddress: '10.20.1.11',
      operatingsystem: 'Ubuntu',
      osfamily: 'Debian',
      kernel: 'Linux',
      kernelrelease: '6.8.0-45-generic',
      architecture: 'x86_64',
      processorcount: 8,
      memorytotal: '31.35 GiB',
      uptime: '47 days 12 hours',
      puppetversion: '8.4.0',
      rubyversion: '3.2.3',
      timezone: 'UTC',
      domain: 'prod.acme.net'
    }
  },
  {
    certname: 'web-02.prod.acme.net',
    environment: 'production',
    ip: '10.20.1.12',
    os: 'Ubuntu 24.04.1 LTS',
    arch: 'x86_64',
    puppetVersion: '8.4.0',
    status: 'changed',
    lastRun: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    runDuration: 36.4,
    groups: ['Production Web Tier'],
    classes: ['profile::nginx', 'profile::ssl_certs', 'puppetlabs::ntp', 'profile::firewall'],
    correctiveChanges: 1,
    facts: {
      fqdn: 'web-02.prod.acme.net',
      ipaddress: '10.20.1.12',
      operatingsystem: 'Ubuntu',
      osfamily: 'Debian',
      kernel: 'Linux',
      kernelrelease: '6.8.0-45-generic',
      architecture: 'x86_64',
      processorcount: 8,
      memorytotal: '31.35 GiB',
      uptime: '47 days 11 hours',
      puppetversion: '8.4.0',
      rubyversion: '3.2.3',
      timezone: 'UTC',
      domain: 'prod.acme.net'
    }
  },
  {
    certname: 'api-gw.prod.acme.net',
    environment: 'production',
    ip: '10.20.1.20',
    os: 'Debian 12.5 (bookworm)',
    arch: 'x86_64',
    puppetVersion: '8.4.0',
    status: 'failed',
    lastRun: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    runDuration: 18.2,
    groups: ['Production Web Tier'],
    classes: ['profile::envoy', 'profile::ssl_certs', 'profile::firewall'],
    facts: {
      fqdn: 'api-gw.prod.acme.net',
      ipaddress: '10.20.1.20',
      operatingsystem: 'Debian',
      osfamily: 'Debian',
      kernel: 'Linux',
      kernelrelease: '6.1.0-21-amd64',
      architecture: 'x86_64',
      processorcount: 16,
      memorytotal: '62.88 GiB',
      uptime: '112 days',
      puppetversion: '8.4.0',
      rubyversion: '3.1.2',
      timezone: 'UTC',
      domain: 'prod.acme.net'
    }
  },
  {
    certname: 'db-master.prod.acme.net',
    environment: 'production',
    ip: '10.20.2.10',
    os: 'RedHat Enterprise Linux 9.3',
    arch: 'x86_64',
    puppetVersion: '8.4.0',
    status: 'unchanged',
    lastRun: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    runDuration: 42.1,
    groups: ['Database Cluster'],
    classes: ['profile::postgresql::server', 'profile::backup::wal_e', 'puppetlabs::ntp'],
    facts: {
      fqdn: 'db-master.prod.acme.net',
      ipaddress: '10.20.2.10',
      operatingsystem: 'RedHat',
      osfamily: 'RedHat',
      kernel: 'Linux',
      kernelrelease: '5.14.0-362.24.1.el9_3.x86_64',
      architecture: 'x86_64',
      processorcount: 32,
      memorytotal: '125.8 GiB',
      uptime: '210 days',
      puppetversion: '8.4.0',
      rubyversion: '3.2.2',
      timezone: 'UTC',
      domain: 'prod.acme.net'
    }
  },
  {
    certname: 'db-replica-01.prod.acme.net',
    environment: 'production',
    ip: '10.20.2.11',
    os: 'RedHat Enterprise Linux 9.3',
    arch: 'x86_64',
    puppetVersion: '8.4.0',
    status: 'unchanged',
    lastRun: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    runDuration: 39.5,
    groups: ['Database Cluster'],
    classes: ['profile::postgresql::server', 'puppetlabs::ntp'],
    facts: {
      fqdn: 'db-replica-01.prod.acme.net',
      ipaddress: '10.20.2.11',
      operatingsystem: 'RedHat',
      osfamily: 'RedHat',
      kernel: 'Linux',
      kernelrelease: '5.14.0-362.24.1.el9_3.x86_64',
      architecture: 'x86_64',
      processorcount: 32,
      memorytotal: '125.8 GiB',
      uptime: '209 days',
      puppetversion: '8.4.0',
      rubyversion: '3.2.2',
      timezone: 'UTC',
      domain: 'prod.acme.net'
    }
  },
  {
    certname: 'k8s-control-01.prod.acme.net',
    environment: 'production',
    ip: '10.20.3.10',
    os: 'Ubuntu 22.04.4 LTS',
    arch: 'x86_64',
    puppetVersion: '8.4.0',
    status: 'unchanged',
    lastRun: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    runDuration: 28.3,
    groups: ['Kubernetes Nodes'],
    classes: ['profile::kubernetes::node', 'profile::containerd', 'puppetlabs::ntp'],
    facts: {
      fqdn: 'k8s-control-01.prod.acme.net',
      ipaddress: '10.20.3.10',
      operatingsystem: 'Ubuntu',
      osfamily: 'Debian',
      kernel: 'Linux',
      kernelrelease: '5.15.0-107-generic',
      architecture: 'x86_64',
      processorcount: 16,
      memorytotal: '62.88 GiB',
      uptime: '89 days',
      puppetversion: '8.4.0',
      rubyversion: '3.0.2',
      timezone: 'UTC',
      domain: 'prod.acme.net'
    }
  },
  {
    certname: 'k8s-worker-01.prod.acme.net',
    environment: 'production',
    ip: '10.20.3.21',
    os: 'Ubuntu 22.04.4 LTS',
    arch: 'x86_64',
    puppetVersion: '8.4.0',
    status: 'changed',
    lastRun: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    runDuration: 31.0,
    groups: ['Kubernetes Nodes'],
    classes: ['profile::kubernetes::node', 'profile::containerd', 'puppetlabs::ntp'],
    facts: {
      fqdn: 'k8s-worker-01.prod.acme.net',
      ipaddress: '10.20.3.21',
      operatingsystem: 'Ubuntu',
      osfamily: 'Debian',
      kernel: 'Linux',
      kernelrelease: '5.15.0-107-generic',
      architecture: 'x86_64',
      processorcount: 32,
      memorytotal: '125.8 GiB',
      uptime: '89 days',
      puppetversion: '8.4.0',
      rubyversion: '3.0.2',
      timezone: 'UTC',
      domain: 'prod.acme.net'
    }
  },
  {
    certname: 'k8s-worker-02.prod.acme.net',
    environment: 'production',
    ip: '10.20.3.22',
    os: 'Ubuntu 22.04.4 LTS',
    arch: 'x86_64',
    puppetVersion: '8.3.1',
    status: 'unresponsive',
    lastRun: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    runDuration: 0,
    groups: ['Kubernetes Nodes'],
    classes: ['profile::kubernetes::node', 'profile::containerd', 'puppetlabs::ntp'],
    facts: {
      fqdn: 'k8s-worker-02.prod.acme.net',
      ipaddress: '10.20.3.22',
      operatingsystem: 'Ubuntu',
      osfamily: 'Debian',
      kernel: 'Linux',
      kernelrelease: '5.15.0-107-generic',
      architecture: 'x86_64',
      processorcount: 32,
      memorytotal: '125.8 GiB',
      uptime: '88 days',
      puppetversion: '8.3.1',
      rubyversion: '3.0.2',
      timezone: 'UTC',
      domain: 'prod.acme.net'
    }
  },
  {
    certname: 'ci-runner-01.stg.acme.net',
    environment: 'staging',
    ip: '10.30.5.15',
    os: 'Rocky Linux 9.4 (Blue Onyx)',
    arch: 'x86_64',
    puppetVersion: '8.4.0',
    status: 'failed',
    lastRun: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
    runDuration: 14.7,
    groups: ['Staging & CI Fleet'],
    classes: ['profile::ci::runner', 'profile::docker', 'puppetlabs::ntp'],
    facts: {
      fqdn: 'ci-runner-01.stg.acme.net',
      ipaddress: '10.30.5.15',
      operatingsystem: 'Rocky',
      osfamily: 'RedHat',
      kernel: 'Linux',
      kernelrelease: '5.14.0-427.13.1.el9_4.x86_64',
      architecture: 'x86_64',
      processorcount: 16,
      memorytotal: '62.88 GiB',
      uptime: '15 days',
      puppetversion: '8.4.0',
      rubyversion: '3.2.2',
      timezone: 'UTC',
      domain: 'stg.acme.net'
    }
  },
  {
    certname: 'stage-app.stg.acme.net',
    environment: 'staging',
    ip: '10.30.5.20',
    os: 'Ubuntu 24.04.1 LTS',
    arch: 'x86_64',
    puppetVersion: '8.4.0',
    status: 'unchanged',
    lastRun: new Date(Date.now() - 19 * 60 * 1000).toISOString(),
    runDuration: 22.6,
    groups: ['Staging & CI Fleet'],
    classes: ['profile::docker', 'puppetlabs::ntp'],
    facts: {
      fqdn: 'stage-app.stg.acme.net',
      ipaddress: '10.30.5.20',
      operatingsystem: 'Ubuntu',
      osfamily: 'Debian',
      kernel: 'Linux',
      kernelrelease: '6.8.0-45-generic',
      architecture: 'x86_64',
      processorcount: 8,
      memorytotal: '15.6 GiB',
      uptime: '19 days',
      puppetversion: '8.4.0',
      rubyversion: '3.2.3',
      timezone: 'UTC',
      domain: 'stg.acme.net'
    }
  },
  {
    certname: 'dev-sandbox-01.dev.acme.net',
    environment: 'development',
    ip: '10.40.1.5',
    os: 'Debian 12.5 (bookworm)',
    arch: 'aarch64',
    puppetVersion: '8.4.0',
    status: 'pending',
    lastRun: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    runDuration: 19.3,
    groups: [],
    classes: ['puppetlabs::ntp', 'profile::developer_tools'],
    facts: {
      fqdn: 'dev-sandbox-01.dev.acme.net',
      ipaddress: '10.40.1.5',
      operatingsystem: 'Debian',
      osfamily: 'Debian',
      kernel: 'Linux',
      kernelrelease: '6.1.0-21-arm64',
      architecture: 'aarch64',
      processorcount: 4,
      memorytotal: '7.8 GiB',
      uptime: '3 days',
      puppetversion: '8.4.0',
      rubyversion: '3.1.2',
      timezone: 'UTC',
      domain: 'dev.acme.net'
    }
  }
];

let reports: PuppetReport[] = [
  {
    id: 'rep-api-gw-fail-01',
    certname: 'api-gw.prod.acme.net',
    environment: 'production',
    status: 'failed',
    configuration_version: '1726298104 (git: 8a4c11b)',
    puppet_version: '8.4.0',
    time: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    run_duration: 18.2,
    metrics: {
      resources: {
        total: 164,
        unchanged: 158,
        changed: 1,
        failed: 1,
        failed_to_restart: 0,
        out_of_sync: 2,
        skipped: 4,
        scheduled: 0
      },
      time: {
        config_retrieval: 1.84,
        exec: 3.2,
        package: 2.1,
        service: 6.4,
        file: 4.66,
        total: 18.2
      },
      events: {
        total: 6,
        failure: 1,
        success: 1,
        noop: 4
      }
    },
    resource_events: [
      {
        resource_type: 'File',
        title: '/etc/envoy/envoy.yaml',
        property: 'content',
        previous_value: '{md5}4a88b577a7b8e',
        desired_value: '{md5}9f12c84d62b1a',
        message: 'content changed {md5}4a88b577a7b8e to {md5}9f12c84d62b1a',
        status: 'success',
        file: '/etc/puppetlabs/code/environments/production/modules/profile/manifests/envoy.pp',
        line: 42
      },
      {
        resource_type: 'Service',
        title: 'envoy',
        property: 'ensure',
        previous_value: 'stopped',
        desired_value: 'running',
        message: 'Could not start Service[envoy]: Execution of /bin/systemctl start envoy returned 1: Job for envoy.service failed because the control process exited with error code. See "systemctl status envoy.service" and "journalctl -xeu envoy.service" for details. [Address already in use: :8080]',
        status: 'failure',
        file: '/etc/puppetlabs/code/environments/production/modules/profile/manifests/envoy.pp',
        line: 78
      }
    ],
    logs: [
      {
        level: 'info',
        source: 'Puppet',
        message: 'Loading facts',
        time: new Date(Date.now() - 8 * 60 * 1000).toISOString()
      },
      {
        level: 'info',
        source: 'Puppet',
        message: 'Caching catalog for api-gw.prod.acme.net',
        time: new Date(Date.now() - 8 * 60 * 1000 + 2000).toISOString()
      },
      {
        level: 'info',
        source: 'Puppet',
        message: 'Applying configuration version 1726298104 (git: 8a4c11b)',
        time: new Date(Date.now() - 8 * 60 * 1000 + 4000).toISOString()
      },
      {
        level: 'notice',
        source: '/Stage[main]/Profile::Envoy/File[/etc/envoy/envoy.yaml]/content',
        message: 'content changed {md5}4a88b577a7b8e to {md5}9f12c84d62b1a',
        time: new Date(Date.now() - 8 * 60 * 1000 + 7000).toISOString(),
        file: '/etc/puppetlabs/code/environments/production/modules/profile/manifests/envoy.pp',
        line: 42
      },
      {
        level: 'info',
        source: '/Stage[main]/Profile::Envoy/File[/etc/envoy/envoy.yaml]',
        message: 'Scheduling refresh of Service[envoy]',
        time: new Date(Date.now() - 8 * 60 * 1000 + 7100).toISOString()
      },
      {
        level: 'err',
        source: '/Stage[main]/Profile::Envoy/Service[envoy]/ensure',
        message: 'change from stopped to running failed: Execution of /bin/systemctl start envoy returned 1: Job for envoy.service failed (address already in use :8080)',
        time: new Date(Date.now() - 8 * 60 * 1000 + 12000).toISOString(),
        file: '/etc/puppetlabs/code/environments/production/modules/profile/manifests/envoy.pp',
        line: 78
      },
      {
        level: 'notice',
        source: 'Puppet',
        message: 'Applied catalog in 18.20 seconds with 1 error and 1 notice',
        time: new Date(Date.now() - 8 * 60 * 1000 + 18200).toISOString()
      }
    ]
  },
  {
    id: 'rep-ci-runner-fail-01',
    certname: 'ci-runner-01.stg.acme.net',
    environment: 'staging',
    status: 'failed',
    configuration_version: '1726296540 (git: 4f1092a)',
    puppet_version: '8.4.0',
    time: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
    run_duration: 14.7,
    metrics: {
      resources: {
        total: 112,
        unchanged: 110,
        changed: 0,
        failed: 1,
        failed_to_restart: 0,
        out_of_sync: 1,
        skipped: 1,
        scheduled: 0
      },
      time: {
        config_retrieval: 1.2,
        exec: 1.5,
        package: 8.4,
        service: 1.6,
        file: 2.0,
        total: 14.7
      },
      events: {
        total: 2,
        failure: 1,
        success: 0,
        noop: 1
      }
    },
    resource_events: [
      {
        resource_type: 'Package',
        title: 'docker-ce',
        property: 'ensure',
        previous_value: 'absent',
        desired_value: '26.1.4-1.el9',
        message: 'Execution of /usr/bin/dnf -d 0 -e 1 -y install docker-ce-26.1.4-1.el9 returned 1: Package docker-ce-26.1.4-1.el9.x86_64 GPG key retrieval failed: [Errno 14] HTTPS Error 404 - Not Found for https://download.docker.com/linux/centos/gpg',
        status: 'failure',
        file: '/etc/puppetlabs/code/environments/staging/modules/docker/manifests/install.pp',
        line: 19
      }
    ],
    logs: [
      {
        level: 'info',
        source: 'Puppet',
        message: 'Applying configuration version 1726296540',
        time: new Date(Date.now() - 17 * 60 * 1000).toISOString()
      },
      {
        level: 'err',
        source: '/Stage[main]/Docker::Install/Package[docker-ce]/ensure',
        message: 'change from absent to 26.1.4-1.el9 failed: GPG key retrieval failed',
        time: new Date(Date.now() - 17 * 60 * 1000 + 8400).toISOString(),
        file: '/etc/puppetlabs/code/environments/staging/modules/docker/manifests/install.pp',
        line: 19
      },
      {
        level: 'warning',
        source: '/Stage[main]/Docker::Service/Service[docker]',
        message: 'Skipping because of failed dependencies: Package[docker-ce]',
        time: new Date(Date.now() - 17 * 60 * 1000 + 8600).toISOString()
      }
    ]
  },
  {
    id: 'rep-web-02-changed-01',
    certname: 'web-02.prod.acme.net',
    environment: 'production',
    status: 'changed',
    configuration_version: '1726295100 (git: 8a4c11b)',
    puppet_version: '8.4.0',
    time: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    run_duration: 36.4,
    metrics: {
      resources: {
        total: 182,
        unchanged: 179,
        changed: 3,
        failed: 0,
        failed_to_restart: 0,
        out_of_sync: 3,
        skipped: 0,
        scheduled: 0
      },
      time: {
        config_retrieval: 2.1,
        exec: 12.3,
        package: 3.5,
        service: 8.2,
        file: 10.3,
        total: 36.4
      },
      events: {
        total: 3,
        failure: 0,
        success: 3,
        noop: 0
      }
    },
    resource_events: [
      {
        resource_type: 'File',
        title: '/etc/ssl/certs/star_acme_net.crt',
        property: 'content',
        previous_value: '{md5}01928471abc1',
        desired_value: '{md5}ee912857ffa3',
        message: 'certificate renewed (valid until 2027-09-14)',
        status: 'success',
        corrective_change: true
      },
      {
        resource_type: 'File',
        title: '/etc/nginx/sites-available/prod_portal.conf',
        property: 'content',
        previous_value: '{md5}88219491039a',
        desired_value: '{md5}cc9182390192',
        message: 'updated upstream proxy headers for HTTP/2',
        status: 'success'
      },
      {
        resource_type: 'Service',
        title: 'nginx',
        property: 'ensure',
        previous_value: 'running',
        desired_value: 'running',
        message: 'Triggered refresh from 2 dependent events',
        status: 'success'
      }
    ],
    logs: [
      {
        level: 'info',
        source: 'Puppet',
        message: 'Caching catalog for web-02.prod.acme.net',
        time: new Date(Date.now() - 32 * 60 * 1000).toISOString()
      },
      {
        level: 'notice',
        source: '/Stage[main]/Profile::Ssl_certs/File[/etc/ssl/certs/star_acme_net.crt]/content',
        message: 'certificate renewed (valid until 2027-09-14) [CORRECTIVE CHANGE]',
        time: new Date(Date.now() - 32 * 60 * 1000 + 5000).toISOString()
      },
      {
        level: 'notice',
        source: '/Stage[main]/Profile::Nginx/File[/etc/nginx/sites-available/prod_portal.conf]/content',
        message: 'content changed',
        time: new Date(Date.now() - 32 * 60 * 1000 + 12000).toISOString()
      },
      {
        level: 'notice',
        source: '/Stage[main]/Profile::Nginx/Service[nginx]',
        message: 'Triggered reload of nginx service: /bin/systemctl reload nginx (exit 0)',
        time: new Date(Date.now() - 32 * 60 * 1000 + 22000).toISOString()
      },
      {
        level: 'notice',
        source: 'Puppet',
        message: 'Applied catalog in 36.40 seconds with 3 changes',
        time: new Date(Date.now() - 32 * 60 * 1000 + 36400).toISOString()
      }
    ]
  },
  {
    id: 'rep-web-01-unchanged-01',
    certname: 'web-01.prod.acme.net',
    environment: 'production',
    status: 'unchanged',
    configuration_version: '1726295100 (git: 8a4c11b)',
    puppet_version: '8.4.0',
    time: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    run_duration: 24.8,
    metrics: {
      resources: {
        total: 182,
        unchanged: 182,
        changed: 0,
        failed: 0,
        failed_to_restart: 0,
        out_of_sync: 0,
        skipped: 0,
        scheduled: 0
      },
      time: {
        config_retrieval: 1.9,
        exec: 4.1,
        package: 2.2,
        service: 5.1,
        file: 11.5,
        total: 24.8
      },
      events: {
        total: 0,
        failure: 0,
        success: 0,
        noop: 0
      }
    },
    resource_events: [],
    logs: [
      {
        level: 'info',
        source: 'Puppet',
        message: 'Caching catalog for web-01.prod.acme.net',
        time: new Date(Date.now() - 14 * 60 * 1000).toISOString()
      },
      {
        level: 'notice',
        source: 'Puppet',
        message: 'Applied catalog in 24.80 seconds: 182 resources in sync',
        time: new Date(Date.now() - 14 * 60 * 1000 + 24800).toISOString()
      }
    ]
  }
];

// Map latest report IDs to nodes
nodes = nodes.map(node => {
  const latestReport = reports.find(r => r.certname === node.certname);
  if (latestReport) {
    return { ...node, latestReportId: latestReport.id };
  }
  return node;
});

// ----------------------------------------------------
// API Endpoints
// ----------------------------------------------------

// SSE Endpoint for Live Events
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to Puppet Live Event Bus', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Dashboard Metrics Summary
app.get('/api/metrics', (_req: Request, res: Response) => {
  const totalNodes = nodes.length;
  const compliantNodes = nodes.filter(n => n.status === 'unchanged').length;
  const changedNodes = nodes.filter(n => n.status === 'changed').length;
  const failedNodes = nodes.filter(n => n.status === 'failed').length;
  const unresponsiveNodes = nodes.filter(n => n.status === 'unresponsive').length;
  const pendingNodes = nodes.filter(n => n.status === 'pending').length;

  const validDurations = nodes.filter(n => n.runDuration > 0).map(n => n.runDuration);
  const avgRunDuration = validDurations.length
    ? Number((validDurations.reduce((a, b) => a + b, 0) / validDurations.length).toFixed(1))
    : 0;

  // Generate 24-hour timeline history buckets
  const now = Date.now();
  const historyTimeline = Array.from({ length: 8 }).map((_, idx) => {
    const timeBucket = new Date(now - (7 - idx) * 3 * 3600 * 1000);
    const label = timeBucket.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      timestamp: label,
      unchanged: Math.floor(Math.random() * 4) + 8,
      changed: Math.floor(Math.random() * 3) + (idx % 2 === 0 ? 1 : 2),
      failed: idx === 7 ? 2 : (idx % 3 === 0 ? 1 : 0)
    };
  });

  const metrics: DashboardMetrics = {
    totalNodes,
    compliantNodes,
    changedNodes,
    failedNodes,
    unresponsiveNodes,
    pendingNodes,
    totalReportsToday: reports.length + 38,
    avgRunDuration,
    historyTimeline
  };

  res.json(metrics);
});

// List Nodes
app.get('/api/nodes', (req: Request, res: Response) => {
  const { status, environment, group, query } = req.query;
  let filtered = [...nodes];

  if (status && typeof status === 'string' && status !== 'all') {
    filtered = filtered.filter(n => n.status === status);
  }
  if (environment && typeof environment === 'string' && environment !== 'all') {
    filtered = filtered.filter(n => n.environment === environment);
  }
  if (group && typeof group === 'string' && group !== 'all') {
    filtered = filtered.filter(n => n.groups.includes(group));
  }
  if (query && typeof query === 'string' && query.trim() !== '') {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(
      n =>
        n.certname.toLowerCase().includes(q) ||
        n.ip.includes(q) ||
        n.os.toLowerCase().includes(q) ||
        n.classes.some(c => c.toLowerCase().includes(q))
    );
  }

  res.json(filtered);
});

// Get Single Node Details
app.get('/api/nodes/:certname', (req: Request, res: Response) => {
  const { certname } = req.params;
  const node = nodes.find(n => n.certname === certname);
  if (!node) {
    return res.status(404).json({ error: `Node ${certname} not found` });
  }

  const nodeReports = reports.filter(r => r.certname === certname);
  res.json({ node, reports: nodeReports });
});

// Create / Register New Node
app.post('/api/nodes', (req: Request, res: Response) => {
  const { certname, environment, ip, os, groups, classes } = req.body;
  if (!certname || typeof certname !== 'string') {
    return res.status(400).json({ error: 'certname is required' });
  }

  if (nodes.some(n => n.certname === certname)) {
    return res.status(409).json({ error: `Node ${certname} already exists` });
  }

  const newNode: PuppetNode = {
    certname,
    environment: environment || 'production',
    ip: ip || '10.20.1.' + (100 + nodes.length),
    os: os || 'Ubuntu 24.04 LTS',
    arch: 'x86_64',
    puppetVersion: '8.4.0',
    status: 'unchanged',
    lastRun: new Date().toISOString(),
    runDuration: 21.4,
    groups: Array.isArray(groups) ? groups : [],
    classes: Array.isArray(classes) ? classes : ['puppetlabs::ntp', 'profile::base'],
    facts: {
      fqdn: certname,
      ipaddress: ip || '10.20.1.' + (100 + nodes.length),
      operatingsystem: os?.includes('RedHat') ? 'RedHat' : 'Ubuntu',
      osfamily: os?.includes('RedHat') ? 'RedHat' : 'Debian',
      kernel: 'Linux',
      kernelrelease: '6.8.0-generic',
      architecture: 'x86_64',
      processorcount: 8,
      memorytotal: '16.0 GiB',
      uptime: '1 day',
      puppetversion: '8.4.0',
      rubyversion: '3.2.3',
      timezone: 'UTC',
      domain: certname.split('.').slice(1).join('.') || 'acme.net'
    }
  };

  nodes.unshift(newNode);

  broadcastEvent({
    id: `ev-${Date.now()}`,
    type: 'node_updated',
    title: 'New Node Enrolled',
    certname: newNode.certname,
    status: newNode.status,
    message: `Node ${newNode.certname} registered in ${newNode.environment}`,
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newNode);
});

// Update Node
app.put('/api/nodes/:certname', (req: Request, res: Response) => {
  const { certname } = req.params;
  const idx = nodes.findIndex(n => n.certname === certname);
  if (idx === -1) {
    return res.status(404).json({ error: `Node ${certname} not found` });
  }

  const { environment, groups, classes } = req.body;
  nodes[idx] = {
    ...nodes[idx],
    environment: environment ?? nodes[idx].environment,
    groups: Array.isArray(groups) ? groups : nodes[idx].groups,
    classes: Array.isArray(classes) ? classes : nodes[idx].classes
  };

  broadcastEvent({
    id: `ev-${Date.now()}`,
    type: 'node_updated',
    title: 'Node Configuration Modified',
    certname,
    status: nodes[idx].status,
    message: `Node ${certname} attributes updated`,
    timestamp: new Date().toISOString()
  });

  res.json(nodes[idx]);
});

// Delete / Decommission Node
app.delete('/api/nodes/:certname', (req: Request, res: Response) => {
  const { certname } = req.params;
  const idx = nodes.findIndex(n => n.certname === certname);
  if (idx === -1) {
    return res.status(404).json({ error: `Node ${certname} not found` });
  }

  nodes.splice(idx, 1);
  reports = reports.filter(r => r.certname !== certname);

  broadcastEvent({
    id: `ev-${Date.now()}`,
    type: 'node_updated',
    title: 'Node Decommissioned',
    certname,
    message: `Node ${certname} and associated reports deleted from dashboard`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, message: `Node ${certname} removed` });
});

// Trigger Puppet Agent Run on Node (Simulated execution with live progress)
app.post('/api/nodes/:certname/run', (req: Request, res: Response) => {
  const { certname } = req.params;
  const { forcedOutcome } = req.body; // 'success' | 'failed' | 'changed' | undefined
  const node = nodes.find(n => n.certname === certname);
  if (!node) {
    return res.status(404).json({ error: `Node ${certname} not found` });
  }

  // Set running status
  node.isAgentRunning = true;

  broadcastEvent({
    id: `ev-${Date.now()}`,
    type: 'node_run_started',
    title: 'Agent Run Initiated',
    certname,
    message: `puppet agent -t triggered on ${certname}`,
    timestamp: new Date().toISOString()
  });

  // Complete agent run asynchronously after short realistic execution delay
  setTimeout(() => {
    node.isAgentRunning = false;

    // Determine outcome
    const outcome: PuppetNodeStatus = forcedOutcome || (
      certname.includes('api-gw') && forcedOutcome !== 'success'
        ? 'unchanged' // fix it if triggered!
        : certname.includes('ci-runner') && forcedOutcome !== 'success'
        ? 'changed'
        : 'unchanged'
    );

    node.status = outcome;
    node.lastRun = new Date().toISOString();
    const duration = Number((15 + Math.random() * 15).toFixed(1));
    node.runDuration = duration;

    // Generate new Puppet Report
    const reportId = `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newReport: PuppetReport = {
      id: reportId,
      certname,
      environment: node.environment,
      status: outcome === 'unresponsive' ? 'failed' : outcome,
      configuration_version: `${Math.floor(Date.now() / 1000)} (git: ${Math.random().toString(36).substring(2, 9)})`,
      puppet_version: node.puppetVersion,
      time: new Date().toISOString(),
      run_duration: duration,
      metrics: {
        resources: {
          total: 160 + Math.floor(Math.random() * 20),
          unchanged: outcome === 'unchanged' ? 172 : outcome === 'changed' ? 169 : 158,
          changed: outcome === 'changed' ? 3 : 0,
          failed: outcome === 'failed' ? 1 : 0,
          failed_to_restart: 0,
          out_of_sync: outcome === 'changed' ? 3 : outcome === 'failed' ? 1 : 0,
          skipped: outcome === 'failed' ? 2 : 0,
          scheduled: 0
        },
        time: {
          config_retrieval: Number((1.5 + Math.random()).toFixed(2)),
          exec: Number((2 + Math.random() * 3).toFixed(2)),
          package: Number((2 + Math.random() * 2).toFixed(2)),
          service: Number((3 + Math.random() * 2).toFixed(2)),
          file: Number((4 + Math.random() * 3).toFixed(2)),
          total: duration
        },
        events: {
          total: outcome === 'changed' ? 3 : outcome === 'failed' ? 2 : 0,
          failure: outcome === 'failed' ? 1 : 0,
          success: outcome === 'changed' ? 3 : 0,
          noop: 0
        }
      },
      resource_events: outcome === 'changed' ? [
        {
          resource_type: 'File',
          title: '/etc/security/limits.d/99-app.conf',
          property: 'content',
          previous_value: 'nofile 65535',
          desired_value: 'nofile 1048576',
          message: 'updated ulimit for system services',
          status: 'success'
        },
        {
          resource_type: 'Service',
          title: 'systemd-logind',
          property: 'ensure',
          previous_value: 'running',
          desired_value: 'running',
          message: 'reloaded configuration',
          status: 'success'
        }
      ] : outcome === 'failed' ? [
        {
          resource_type: 'Service',
          title: 'app-service',
          property: 'ensure',
          previous_value: 'stopped',
          desired_value: 'running',
          message: 'Failed to bind port: already allocated by PID 1420',
          status: 'failure'
        }
      ] : [],
      logs: [
        {
          level: 'info',
          source: 'Puppet',
          message: `Retrieving pluginfacts & plugins from master`,
          time: new Date(Date.now() - duration * 1000).toISOString()
        },
        {
          level: 'info',
          source: 'Puppet',
          message: `Caching catalog for ${certname}`,
          time: new Date(Date.now() - duration * 1000 + 1500).toISOString()
        },
        {
          level: outcome === 'failed' ? 'err' : 'notice',
          source: 'Puppet',
          message: outcome === 'failed'
            ? 'Catalog failed with 1 resource failure'
            : outcome === 'changed'
            ? 'Catalog applied with 3 corrective state changes'
            : 'Catalog applied: all resources in sync',
          time: new Date().toISOString()
        }
      ]
    };

    reports.unshift(newReport);
    node.latestReportId = reportId;

    broadcastEvent({
      id: `ev-${Date.now()}`,
      type: 'node_run_finished',
      title: `Agent Run Finished: ${certname}`,
      certname,
      status: node.status,
      reportId,
      message: `puppet agent completed in ${duration}s with status: ${outcome}`,
      timestamp: new Date().toISOString()
    });

    broadcastEvent({
      id: `ev-${Date.now() + 1}`,
      type: 'report_received',
      title: 'New Puppet Report Ingested',
      certname,
      status: node.status,
      reportId,
      message: `Report ${reportId} recorded for ${certname}`,
      timestamp: new Date().toISOString()
    });
  }, 1800);

  res.json({ message: `Agent run dispatched for ${certname}`, status: 'running' });
});

// Trigger Agent Run on All Nodes
app.post('/api/nodes/run-all', (_req: Request, res: Response) => {
  nodes.forEach((n, idx) => {
    setTimeout(() => {
      n.isAgentRunning = true;
      broadcastEvent({
        id: `ev-${Date.now()}-${idx}`,
        type: 'node_run_started',
        title: 'Fleet Run Dispatched',
        certname: n.certname,
        message: `Agent execution triggered for ${n.certname}`,
        timestamp: new Date().toISOString()
      });

      setTimeout(() => {
        n.isAgentRunning = false;
        // Keep or update status
        if (n.status === 'unresponsive') {
          // might stay unresponsive
        } else if (n.status === 'failed') {
          n.status = 'unchanged'; // remediation
        }
        n.lastRun = new Date().toISOString();
        broadcastEvent({
          id: `ev-${Date.now()}-${idx}-done`,
          type: 'node_run_finished',
          title: `Fleet Run Completed: ${n.certname}`,
          certname: n.certname,
          status: n.status,
          message: `Run finished with status ${n.status}`,
          timestamp: new Date().toISOString()
        });
      }, 1500 + idx * 300);
    }, idx * 200);
  });

  res.json({ message: `Fleet run initiated on ${nodes.length} nodes` });
});

// List Reports (Paginated & Filterable)
app.get('/api/reports', (req: Request, res: Response) => {
  const { certname, status, environment, limit = 50 } = req.query;
  let filtered = [...reports];

  if (certname && typeof certname === 'string' && certname !== 'all') {
    filtered = filtered.filter(r => r.certname === certname);
  }
  if (status && typeof status === 'string' && status !== 'all') {
    filtered = filtered.filter(r => r.status === status);
  }
  if (environment && typeof environment === 'string' && environment !== 'all') {
    filtered = filtered.filter(r => r.environment === environment);
  }

  const lim = Math.min(Number(limit) || 50, 100);
  res.json(filtered.slice(0, lim));
});

// Get Single Report
app.get('/api/reports/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const report = reports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ error: `Report ${id} not found` });
  }
  res.json(report);
});

// Ingest Real Puppet Report (HTTP Report Processor endpoint)
app.post('/api/reports', (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || (!payload.certname && !payload.host)) {
    return res.status(400).json({ error: 'Invalid puppet report payload: missing certname or host' });
  }

  const certname = payload.certname || payload.host;
  const environment = payload.environment || 'production';
  const status: 'unchanged' | 'changed' | 'failed' | 'pending' =
    payload.status || (payload.metrics?.resources?.failed > 0 ? 'failed' : payload.metrics?.resources?.changed > 0 ? 'changed' : 'unchanged');

  const reportId = payload.id || `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const runDuration = payload.run_duration || payload.metrics?.time?.total || 22.0;

  const newReport: PuppetReport = {
    id: reportId,
    certname,
    environment,
    status,
    configuration_version: payload.configuration_version || String(Date.now()),
    puppet_version: payload.puppet_version || '8.4.0',
    time: payload.time || new Date().toISOString(),
    run_duration: Number(runDuration),
    metrics: payload.metrics || {
      resources: {
        total: 100,
        unchanged: status === 'unchanged' ? 100 : 95,
        changed: status === 'changed' ? 5 : 0,
        failed: status === 'failed' ? 1 : 0,
        failed_to_restart: 0,
        out_of_sync: status === 'changed' ? 5 : status === 'failed' ? 1 : 0,
        skipped: 0,
        scheduled: 0
      },
      time: {
        config_retrieval: 1.5,
        exec: 2.0,
        package: 3.0,
        service: 2.5,
        file: 4.0,
        total: Number(runDuration)
      },
      events: {
        total: status === 'unchanged' ? 0 : 2,
        failure: status === 'failed' ? 1 : 0,
        success: status === 'changed' ? 2 : 0,
        noop: 0
      }
    },
    resource_events: payload.resource_events || [],
    logs: payload.logs || [
      {
        level: status === 'failed' ? 'err' : 'notice',
        source: 'Puppet',
        message: `Report ingested via HTTP webhook for ${certname}`,
        time: new Date().toISOString()
      }
    ]
  };

  reports.unshift(newReport);

  // Update or create node
  let node = nodes.find(n => n.certname === certname);
  if (node) {
    node.status = status;
    node.lastRun = newReport.time;
    node.runDuration = newReport.run_duration;
    node.latestReportId = reportId;
  } else {
    node = {
      certname,
      environment,
      ip: payload.ip || '10.20.1.' + (100 + nodes.length),
      os: payload.os || 'Linux',
      arch: payload.arch || 'x86_64',
      puppetVersion: newReport.puppet_version,
      status,
      lastRun: newReport.time,
      runDuration: newReport.run_duration,
      groups: [],
      classes: [],
      facts: {
        fqdn: certname,
        ipaddress: '10.20.1.' + (100 + nodes.length),
        operatingsystem: 'Linux',
        osfamily: 'Debian',
        kernel: 'Linux',
        kernelrelease: '6.8.0',
        architecture: 'x86_64',
        processorcount: 4,
        memorytotal: '8.0 GiB',
        uptime: '1 day',
        puppetversion: newReport.puppet_version,
        rubyversion: '3.2.0',
        timezone: 'UTC',
        domain: certname.split('.').slice(1).join('.') || 'internal'
      },
      latestReportId: reportId
    };
    nodes.unshift(node);
  }

  broadcastEvent({
    id: `ev-${Date.now()}`,
    type: 'report_received',
    title: 'Puppet Report Ingested',
    certname,
    status,
    reportId,
    message: `Report received from ${certname} (${status})`,
    timestamp: new Date().toISOString()
  });

  res.status(201).json({ success: true, reportId, certname, status });
});

// List Groups
app.get('/api/groups', (_req: Request, res: Response) => {
  const enriched = initialGroups.map(g => ({
    ...g,
    nodeCount: nodes.filter(n => n.groups.includes(g.name)).length
  }));
  res.json(enriched);
});

// Create Group
app.post('/api/groups', (req: Request, res: Response) => {
  const { name, description, environment, classes, variables } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }

  const newGroup: NodeGroup = {
    id: `grp-${Date.now()}`,
    name,
    description: description || '',
    environment: environment || 'production',
    classes: Array.isArray(classes) ? classes : [],
    variables: variables || {},
    nodeCount: 0
  };

  initialGroups.push(newGroup);
  res.status(201).json(newGroup);
});

// ----------------------------------------------------
// Vite Middleware / Static Serving
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Puppet Dashboard running on http://localhost:${PORT}`);
  });
}

startServer();
