import React, { useState, useEffect, useCallback } from 'react';
import {
  PuppetNode,
  PuppetReport,
  NodeGroup,
  DashboardMetrics,
  LivePuppetEvent
} from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { OverviewView } from './components/OverviewView';
import { NodesView } from './components/NodesView';
import { ReportsView } from './components/ReportsView';
import { GroupsView } from './components/GroupsView';
import { NodeDetailModal } from './components/NodeDetailModal';
import { ReportDetailModal } from './components/ReportDetailModal';
import { AddNodeModal } from './components/AddNodeModal';
import { WebhookIntegrationModal } from './components/WebhookIntegrationModal';
import { Check, AlertCircle, Info, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [currentEnvironment, setCurrentEnvironment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [nodes, setNodes] = useState<PuppetNode[]>([]);
  const [reports, setReports] = useState<PuppetReport[]>([]);
  const [groups, setGroups] = useState<NodeGroup[]>([]);
  const [liveEvents, setLiveEvents] = useState<LivePuppetEvent[]>([]);

  const [selectedNodeCertname, setSelectedNodeCertname] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const [isFleetRunning, setIsFleetRunning] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const loadData = useCallback(async () => {
    try {
      const [m, n, r, g] = await Promise.all([
        api.getMetrics(),
        api.getNodes({ environment: currentEnvironment }),
        api.getReports({ environment: currentEnvironment }),
        api.getGroups()
      ]);
      setMetrics(m);
      setNodes(n);
      setReports(r);
      setGroups(g);
    } catch (err) {
      console.error('Error loading Puppet data:', err);
    }
  }, [currentEnvironment]);

  // Initial load and environment change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // SSE Live Event Bus subscription
  useEffect(() => {
    const unsubscribe = api.subscribeToEvents((event) => {
      setIsLiveConnected(true);

      if (event.type === 'connected') {
        return;
      }

      setLiveEvents((prev) => [event, ...prev.slice(0, 49)]);

      if (event.type === 'report_received') {
        showToast(event.message, event.status === 'failed' ? 'warning' : 'success');
        loadData();
      } else if (event.type === 'node_run_started') {
        setNodes((prev) =>
          prev.map((n) => (n.certname === event.certname ? { ...n, isAgentRunning: true } : n))
        );
      } else if (event.type === 'node_run_finished') {
        setNodes((prev) =>
          prev.map((n) => (n.certname === event.certname ? { ...n, isAgentRunning: false, status: event.status || n.status } : n))
        );
        loadData();
      } else if (event.type === 'node_updated') {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Trigger Run on single node
  const handleTriggerRun = async (certname: string, forcedOutcome?: string) => {
    try {
      showToast(`Запуск puppet agent -t на ${certname}...`, 'info');
      setNodes((prev) =>
        prev.map((n) => (n.certname === certname ? { ...n, isAgentRunning: true } : n))
      );
      await api.triggerNodeRun(certname, forcedOutcome);
    } catch (err: any) {
      showToast(err.message || 'Ошибка запуска агента', 'warning');
    }
  };

  // Trigger Run on all nodes
  const handleTriggerFleetRun = async () => {
    setIsFleetRunning(true);
    showToast('Инициализирован запуск Puppet агентов на всем флоте узлов', 'info');
    try {
      await api.triggerFleetRun();
      setTimeout(() => {
        setIsFleetRunning(false);
        showToast('Прогон Puppet агентов на всех узлах успешно завершен', 'success');
        loadData();
      }, 3500);
    } catch (err: any) {
      setIsFleetRunning(false);
      showToast(err.message || 'Ошибка запуска флота', 'warning');
    }
  };

  // Trigger run on multiple selected nodes
  const handleBatchRun = (certnames: string[]) => {
    showToast(`Запуск Puppet на ${certnames.length} выбранных узлах...`, 'info');
    certnames.forEach((c, idx) => {
      setTimeout(() => {
        handleTriggerRun(c);
      }, idx * 400);
    });
  };

  // Delete node
  const handleDeleteNode = async (certname: string) => {
    try {
      await api.deleteNode(certname);
      showToast(`Узел ${certname} успешно удален из системы`, 'info');
      if (selectedNodeCertname === certname) {
        setSelectedNodeCertname(null);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Ошибка удаления узла', 'warning');
    }
  };

  // Update node
  const handleUpdateNode = async (certname: string, data: Partial<PuppetNode>) => {
    try {
      await api.updateNode(certname, data);
      showToast(`Конфигурация узла ${certname} сохранена`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Ошибка обновления узла', 'warning');
    }
  };

  // Add node
  const handleAddNode = async (data: Partial<PuppetNode>) => {
    try {
      await api.createNode(data);
      showToast(`Узел ${data.certname} успешно зарегистрирован`, 'success');
      loadData();
      setActiveTab('nodes');
    } catch (err: any) {
      showToast(err.message || 'Ошибка регистрации узла', 'warning');
    }
  };

  // Create Group
  const handleCreateGroup = async (groupData: Partial<NodeGroup>) => {
    try {
      await api.createGroup(groupData);
      showToast(`Группа узлов ${groupData.name} создана`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Ошибка создания группы', 'warning');
    }
  };

  const activeNode = nodes.find((n) => n.certname === selectedNodeCertname) || null;
  const activeReport = reports.find((r) => r.id === selectedReportId) || null;
  const failedNodesCount = nodes.filter((n) => n.status === 'failed').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        currentEnvironment={currentEnvironment}
        onEnvironmentChange={(env) => setCurrentEnvironment(env)}
        onTriggerFleetRun={handleTriggerFleetRun}
        isFleetRunning={isFleetRunning}
        onOpenAddNode={() => setShowAddNodeModal(true)}
        onOpenIntegration={() => setShowIntegrationModal(true)}
        isLiveConnected={isLiveConnected}
      />

      {/* Tabs Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        nodeCount={nodes.length}
        failedCount={failedNodesCount}
        reportCount={reports.length}
        groupCount={groups.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <OverviewView
            metrics={metrics}
            nodes={nodes}
            liveEvents={liveEvents}
            onSelectNode={(certname) => setSelectedNodeCertname(certname)}
            onSelectReport={(reportId) => setSelectedReportId(reportId)}
            onFilterStatus={(status) => {
              setSelectedStatus(status);
              setActiveTab('nodes');
            }}
            onTriggerRun={handleTriggerRun}
          />
        )}

        {/* Tab 2: Nodes */}
        {activeTab === 'nodes' && (
          <NodesView
            nodes={nodes}
            selectedStatus={selectedStatus}
            onStatusChange={(status) => setSelectedStatus(status)}
            onSelectNode={(certname) => setSelectedNodeCertname(certname)}
            onSelectReport={(reportId) => setSelectedReportId(reportId)}
            onTriggerRun={handleTriggerRun}
            onDeleteNode={handleDeleteNode}
            onBatchRun={handleBatchRun}
          />
        )}

        {/* Tab 3: Reports */}
        {activeTab === 'reports' && (
          <ReportsView
            reports={reports}
            selectedReportId={selectedReportId}
            onSelectReport={(reportId) => setSelectedReportId(reportId)}
            onSelectNode={(certname) => setSelectedNodeCertname(certname)}
          />
        )}

        {/* Tab 4: Groups & Classes */}
        {activeTab === 'groups' && (
          <GroupsView
            groups={groups}
            onSelectGroupFilter={(groupName) => {
              setActiveTab('nodes');
            }}
            onCreateGroup={handleCreateGroup}
          />
        )}
      </main>

      {/* Node Detail Modal */}
      {activeNode && (
        <NodeDetailModal
          node={activeNode}
          reports={reports}
          onClose={() => setSelectedNodeCertname(null)}
          onTriggerRun={handleTriggerRun}
          onSelectReport={(reportId) => {
            setSelectedNodeCertname(null);
            setSelectedReportId(reportId);
          }}
          onUpdateNode={handleUpdateNode}
        />
      )}

      {/* Report Detail Modal */}
      {activeReport && (
        <ReportDetailModal
          report={activeReport}
          onClose={() => setSelectedReportId(null)}
          onSelectNode={(certname) => {
            setSelectedReportId(null);
            setSelectedNodeCertname(certname);
          }}
        />
      )}

      {/* Add Node Modal */}
      {showAddNodeModal && (
        <AddNodeModal
          groups={groups}
          onClose={() => setShowAddNodeModal(false)}
          onAddNode={handleAddNode}
        />
      )}

      {/* Integration & Simulator Webhook Modal */}
      {showIntegrationModal && (
        <WebhookIntegrationModal
          onClose={() => setShowIntegrationModal(false)}
          onReportSimulated={() => loadData()}
        />
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs sm:text-sm font-medium ${
            toastMessage.type === 'warning'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-rose-950/40'
              : toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-950/40'
              : 'bg-slate-900/95 text-slate-100 border-slate-700 shadow-slate-950/60'
          }`}>
            {toastMessage.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : toastMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
