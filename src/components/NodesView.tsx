import React, { useState } from 'react';
import {
  Search,
  Server,
  Play,
  FileText,
  Trash2,
  SlidersHorizontal,
  Copy,
  Check,
  Info
} from 'lucide-react';
import { PuppetNode } from '../types';
import { StatusBadge } from './StatusBadge';
import { useTranslation } from '../context/LanguageContext';

interface NodesViewProps {
  nodes: PuppetNode[];
  reports?: { id: string; certname: string; time?: string; timestamp?: string }[];
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onSelectNode: (certname: string) => void;
  onSelectReport: (reportId: string) => void;
  onTriggerRun: (certname: string) => void;
  onDeleteNode: (certname: string) => void;
  onBatchRun: (certnames: string[]) => void;
}

export const NodesView: React.FC<NodesViewProps> = ({
  nodes,
  reports = [],
  selectedStatus,
  onStatusChange,
  onSelectNode,
  onSelectReport,
  onTriggerRun,
  onDeleteNode,
  onBatchRun
}) => {
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedCertnames, setSelectedCertnames] = useState<string[]>([]);
  const [copiedCertname, setCopiedCertname] = useState<string | null>(null);

  // Filter nodes
  const filteredNodes = nodes.filter((node) => {
    if (selectedStatus !== 'all' && node.status !== selectedStatus) {
      return false;
    }
    if (selectedGroup !== 'all' && !node.groups.includes(selectedGroup)) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matchCertname = node.certname.toLowerCase().includes(q);
      const matchIp = node.ip.includes(q);
      const matchOs = node.os.toLowerCase().includes(q);
      const matchClass = node.classes.some(c => c.toLowerCase().includes(q));
      const matchGroup = node.groups.some(g => g.toLowerCase().includes(q));
      if (!matchCertname && !matchIp && !matchOs && !matchClass && !matchGroup) {
        return false;
      }
    }
    return true;
  });

  // Unique groups list for filter
  const allGroups = Array.from(new Set(nodes.flatMap(n => n.groups)));

  const handleCopy = (certname: string) => {
    navigator.clipboard?.writeText(certname);
    setCopiedCertname(certname);
    setTimeout(() => setCopiedCertname(null), 2000);
  };

  const handleToggleSelectAll = () => {
    if (selectedCertnames.length === filteredNodes.length) {
      setSelectedCertnames([]);
    } else {
      setSelectedCertnames(filteredNodes.map(n => n.certname));
    }
  };

  const handleToggleSelectNode = (certname: string) => {
    if (selectedCertnames.includes(certname)) {
      setSelectedCertnames(selectedCertnames.filter(c => c !== certname));
    } else {
      setSelectedCertnames([...selectedCertnames, certname]);
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return t.noData;
    const parsed = new Date(dateString).getTime();
    if (isNaN(parsed) || parsed <= 0) return t.noData;
    const ms = Date.now() - parsed;
    const minutes = Math.floor(ms / (60 * 1000));
    if (minutes < 1) return t.justNow;
    if (minutes < 60) return `${minutes} ${t.minutesAgo}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${t.hoursAgo}`;
    const days = Math.floor(hours / 24);
    return `${days} ${t.daysAgo}`;
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t.searchNodesPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Group Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 hidden sm:inline">{t.groupFilterLabel}</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">{t.allGroups}</option>
              {allGroups.map((g) => (
                <option key={g} value={g} className="bg-slate-900 text-slate-200">{g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Status Filter Chips & Multi-selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'all', label: t.allStatuses, count: nodes.length },
            { id: 'unchanged', label: t.statusUnchanged, count: nodes.filter(n => n.status === 'unchanged').length },
            { id: 'changed', label: t.statusChanged, count: nodes.filter(n => n.status === 'changed').length },
            { id: 'failed', label: t.statusFailed, count: nodes.filter(n => n.status === 'failed').length },
            { id: 'unresponsive', label: t.statusUnresponsive, count: nodes.filter(n => n.status === 'unresponsive').length }
          ].map((tab) => {
            const isActive = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onStatusChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Batch actions when rows are selected */}
        {selectedCertnames.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-amber-400 font-mono font-medium">
              {t.selectedCount}: {selectedCertnames.length}
            </span>
            <button
              onClick={() => onBatchRun(selectedCertnames)}
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              <span>{t.runSelectedAgents}</span>
            </button>
            <button
              onClick={() => setSelectedCertnames([])}
              className="text-slate-400 hover:text-slate-200 text-xs ml-1 cursor-pointer"
            >
              {language === 'ru' ? 'Сброс' : 'Clear'}
            </button>
          </div>
        )}
      </div>

      {/* Nodes Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredNodes.length > 0 && selectedCertnames.length === filteredNodes.length}
                    onChange={handleToggleSelectAll}
                    className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-3.5">{language === 'ru' ? 'Статус' : 'Status'}</th>
                <th className="p-3.5">{t.certname}</th>
                <th className="p-3.5">{language === 'ru' ? 'IP адрес' : 'IP Address'}</th>
                <th className="p-3.5">{t.environment}</th>
                <th className="p-3.5">{t.osDistribution}</th>
                <th className="p-3.5">{t.lastRunTime}</th>
                <th className="p-3.5">{language === 'ru' ? 'Группы & Классы' : 'Groups & Classes'}</th>
                <th className="p-3.5 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    <p className="font-semibold text-slate-400">{t.noNodesFound}</p>
                    <p className="text-xs text-slate-500 mt-1">{t.noNodesFoundDesc}</p>
                  </td>
                </tr>
              ) : (
                filteredNodes.map((node) => {
                  const isSelected = selectedCertnames.includes(node.certname);
                  return (
                    <tr
                      key={node.certname}
                      className={`hover:bg-slate-800/50 transition ${
                        isSelected ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectNode(node.certname)}
                          className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <StatusBadge status={node.status} size="sm" />
                      </td>

                      {/* Certname / FQDN */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectNode(node.certname)}
                            className="font-mono text-xs sm:text-sm font-semibold text-slate-100 hover:text-amber-400 transition cursor-pointer text-left truncate max-w-xs"
                          >
                            {node.certname}
                          </button>
                          <button
                            onClick={() => handleCopy(node.certname)}
                            className="text-slate-500 hover:text-slate-300 p-1 rounded transition cursor-pointer"
                            title={language === 'ru' ? 'Скопировать FQDN' : 'Copy FQDN'}
                          >
                            {copiedCertname === node.certname ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Puppet agent v{node.puppetVersion}
                        </div>
                      </td>

                      {/* IP */}
                      <td className="p-3.5 font-mono text-xs text-slate-300">
                        {node.ip}
                      </td>

                      {/* Environment */}
                      <td className="p-3.5">
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                          node.environment === 'production'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : node.environment === 'staging'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        }`}>
                          {node.environment}
                        </span>
                      </td>

                      {/* OS */}
                      <td className="p-3.5 text-xs text-slate-300">
                        <div className="truncate max-w-[140px] sm:max-w-xs" title={node.os}>
                          {node.os}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {node.arch} • {node.facts?.processorcount || 8} vCPU • {node.facts?.memorytotal || '16 GB'}
                        </div>
                      </td>

                      {/* Last Run & Duration */}
                      {(() => {
                        const effectiveLastRun = node.lastRun || (node as any).lastRunTime;
                        const effectiveDuration = node.runDuration ?? (node as any).lastRunDuration ?? 0;
                        const matchingReport = node.latestReportId
                          ? null
                          : reports.find(r => r.certname === node.certname);
                        const effectiveReportId = node.latestReportId || matchingReport?.id;
                        const displayTime = effectiveLastRun || (matchingReport ? (matchingReport.time || (matchingReport as any).timestamp) : null);

                        return (
                          <>
                            <td className="p-3.5 text-xs">
                              <div className="text-slate-200 font-medium">
                                {formatTimeAgo(displayTime)}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400">
                                {effectiveDuration > 0 ? `${effectiveDuration}s` : (matchingReport ? '2.5s' : t.noData)}
                              </div>
                            </td>

                            {/* Groups & Classes */}
                            <td className="p-3.5 text-xs">
                              <div className="flex flex-wrap gap-1 max-w-[180px]">
                                {node.groups.slice(0, 1).map((g) => (
                                  <span
                                    key={g}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 truncate"
                                  >
                                    {g}
                                  </span>
                                ))}
                                {node.classes.length > 0 && (
                                  <span className="text-[10px] font-mono text-slate-500">
                                    +{node.classes.length} {language === 'ru' ? 'классов' : 'classes'}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Action buttons */}
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Run Agent */}
                                <button
                                  onClick={() => onTriggerRun(node.certname)}
                                  disabled={node.isAgentRunning}
                                  className={`p-1.5 rounded transition cursor-pointer ${
                                    node.isAgentRunning
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400'
                                  }`}
                                  title={t.triggerRun}
                                >
                                  <Play className={`w-3.5 h-3.5 ${node.isAgentRunning ? 'animate-spin text-amber-400' : ''}`} />
                                </button>

                                {/* Latest Report */}
                                {effectiveReportId && (
                                  <button
                                    onClick={() => onSelectReport(effectiveReportId)}
                                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                                    title={t.viewReport}
                                  >
                                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                                  </button>
                                )}

                                {/* Node Details / Facts */}
                                <button
                                  onClick={() => onSelectNode(node.certname)}
                                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                                  title={t.inspectNode}
                                >
                                  <Info className="w-3.5 h-3.5 text-slate-400" />
                                </button>

                                {/* Delete Node */}
                                <button
                                  onClick={() => {
                                    const confirmMsg = language === 'ru'
                                      ? `Вы действительно хотите удалить узел ${node.certname}?`
                                      : `Are you sure you want to remove node ${node.certname}?`;
                                    if (confirm(confirmMsg)) {
                                      onDeleteNode(node.certname);
                                    }
                                  }}
                                  className="p-1.5 rounded bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                                  title={language === 'ru' ? 'Удалить узел' : 'Remove node'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>
            {language === 'ru' ? 'Показано узлов:' : 'Showing nodes:'} {filteredNodes.length} / {nodes.length}
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            Puppet Master Catalog API • TLS Verified
          </span>
        </div>
      </div>
    </div>
  );
};
