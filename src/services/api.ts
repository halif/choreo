import { PuppetNode, PuppetReport, NodeGroup, DashboardMetrics, LivePuppetEvent } from '../types';

export const api = {
  async getMetrics(): Promise<DashboardMetrics> {
    const res = await fetch('/api/metrics');
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  },

  async getNodes(params?: { status?: string; environment?: string; group?: string; query?: string }): Promise<PuppetNode[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.environment && params.environment !== 'all') query.set('environment', params.environment);
    if (params?.group && params.group !== 'all') query.set('group', params.group);
    if (params?.query) query.set('query', params.query);

    const res = await fetch(`/api/nodes?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch nodes');
    return res.json();
  },

  async getNode(certname: string): Promise<{ node: PuppetNode; reports: PuppetReport[] }> {
    const res = await fetch(`/api/nodes/${encodeURIComponent(certname)}`);
    if (!res.ok) throw new Error(`Failed to fetch node ${certname}`);
    return res.json();
  },

  async createNode(data: Partial<PuppetNode>): Promise<PuppetNode> {
    const res = await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create node');
    }
    return res.json();
  },

  async updateNode(certname: string, data: Partial<PuppetNode>): Promise<PuppetNode> {
    const res = await fetch(`/api/nodes/${encodeURIComponent(certname)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update node');
    return res.json();
  },

  async deleteNode(certname: string): Promise<void> {
    const res = await fetch(`/api/nodes/${encodeURIComponent(certname)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete node');
  },

  async triggerNodeRun(certname: string, forcedOutcome?: string): Promise<{ message: string; status: string }> {
    fetch(`/api/nodes/${encodeURIComponent(certname)}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forcedOutcome: forcedOutcome || "success" })
    }).catch(e => console.warn("Background run trigger:", e));
    return { message: "Dispatched", status: "started" };
  },

  async triggerFleetRun(): Promise<{ message: string }> {
    const res = await fetch('/api/nodes/run-all', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger fleet run');
    return res.json();
  },

  async getReports(params?: { certname?: string; status?: string; environment?: string; limit?: number }): Promise<PuppetReport[]> {
    const query = new URLSearchParams();
    if (params?.certname && params.certname !== 'all') query.set('certname', params.certname);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.environment && params.environment !== 'all') query.set('environment', params.environment);
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await fetch(`/api/reports?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  async getReport(id: string): Promise<PuppetReport> {
    const res = await fetch(`/api/reports/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Failed to fetch report ${id}`);
    return res.json();
  },

  async ingestReport(reportData: any): Promise<{ success: boolean; reportId: string }> {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to ingest report');
    }
    return res.json();
  },

  async getGroups(): Promise<NodeGroup[]> {
    const res = await fetch('/api/groups');
    if (!res.ok) throw new Error('Failed to fetch node groups');
    return res.json();
  },

  async createGroup(data: Partial<NodeGroup>): Promise<NodeGroup> {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create node group');
    return res.json();
  },

  subscribeToEvents(onEvent: (event: LivePuppetEvent) => void): () => void {
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(parsed);
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };
    eventSource.onerror = () => {
      // EventSource automatically retries connection
    };

    return () => {
      eventSource.close();
    };
  }
};
