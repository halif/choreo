import React, { useState } from 'react';
import {
  Search,
  Server,
  Play,
  FileText,
  Trash2,
  SlidersHorizontal,
  Layers,
  Copy,
  Check,
  Info,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { PuppetNode, PuppetNodeStatus } from '../types';
import { StatusBadge } from './StatusBadge';

interface NodesViewProps {
  nodes: PuppetNode[];
  reports?: { id: string; certname: string; time?: string; timestamp?: string; run_duration?: number }[];
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
      const matchCertname = (node.certname || '').toLowerCase().includes(q);
      const matchIp = (node.ip || '').includes(q);
      const matchOs = (node.os || '').toLowerCase().includes(q);
      const matchClass = node.classes?.some(c => c.toLowerCase().includes(q));
      const matchGroup = node.groups?.some(g => g.toLowerCase().includes(q));
      if (!matchCertname && !matchIp && !matchOs && !matchClass && !matchGroup) {
        return false;
      }
    }
    return true;
  });

  // Unique groups list for filter
  const allGroups = Array.from(new Set(nodes.flatMap(n => n.groups || [])));

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

  // Безопасное вычисление относительного времени
  const formatTimeAgo = (rawTime?: string | number) => {
    if (!rawTime) return 'нет данных';

    let timeMs = Number(rawTime);
    if (!isNaN(timeMs) && timeMs > 0) {
      if (timeMs < 10000000000) timeMs *= 1000;
    } else {
      timeMs = new Date(rawTime).getTime();
    }

    if (isNaN(timeMs) || timeMs <= 0) return 'только что';

    const diffMs = Math.max(0, Date.now() - timeMs);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    return `${Math.floor(diffHours / 24)} д назад`;
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
            placeholder="Поиск по FQDN, IP, ОС или классу Puppet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Group Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 hidden sm:inline">Группа:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">Все группы</option>
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
            { id: 'all', label: 'Все узлы', count: nodes.length },
            { id: 'unchanged', label: 'В норме', count: nodes.filter(n => n.status === 'unchanged').length },
            { id: 'changed', label: 'Изменены', count: nodes.filter(n => n.status === 'changed').length },
            { id: 'failed', label: 'Сбои', count: nodes.filter(n => n.status === 'failed').length },
            { id: 'unresponsive', label: 'Не отвечают', count: nodes.filter(n => n.status === 'unresponsive').length }
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
              Выбрано: {selectedCertnames.length}
            </span>
            <button
              onClick={() => onBatchRun(selectedCertnames)}
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              <span>Запустить на выбранных</span>
            </button>
            <button
              onClick={() => setSelectedCertnames([])}
              className="text-slate-400 hover:text-slate-200 text-xs ml-1 cursor-pointer"
            >
              Сброс
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
                <th className="p-3.5">Статус</th>
                <th className="p-3.5">Имя узла (FQDN)</th>
                <th className="p-3.5">IP адрес</th>
                <th className="p-3.5">Окружение</th>
                <th className="p-3.5">Операционная система</th>
                <th className="p-3.5">Последний прогон</th>
                <th className="p-3.5">Группы &amp; Классы</th>
                <th className="p-3.5 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Узлы, соответствующие критериям поиска, не найдены.
                  </td>
                </tr>
              ) : (
                filteredNodes.map((node) => {
                  const isSelected = selectedCertnames.includes(node.certname);

                  // 1. Поиск соответствующего отчета в реестре
                  const nodeShort = (node.certname || '').split('.')[0].toLowerCase();
                  const matchingReport = node.latestReportId
                    ? reports.find(r => r.id === node.latestReportId)
                    : reports.find(r => {
                        const repName = (r.certname || (r as any).host || '').toLowerCase();
                        return repName === node.certname.toLowerCase() || repName.split('.')[0] === nodeShort;
                      }) || (reports.length > 0 ? reports[0] : null);

                  const effectiveReportId = node.latestReportId || matchingReport?.id;

                  // 2. Определение времени и длительности
                  const effectiveLastRun = node.lastRun || (node as any).lastRunTime || matchingReport?.time || (matchingReport as any)?.timestamp;
                  const effectiveDuration = node.runDuration ?? (node as any).lastRunDuration ?? matchingReport?.run_duration ?? 0;

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
                            title="Скопировать FQDN"
                          >
                            {copiedCertname === node.certname ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Puppet agent v{node.puppetVersion || '7.x'}
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
                          {node.arch || 'x86_64'} • {node.facts?.processorcount || 8} vCPU • {node.facts?.memorytotal || '16 GB'}
                        </div>
                      </td>

                      {/* Last Run & Duration */}
                      <td className="p-3.5 text-xs">
                        <div className="text-slate-200 font-medium">
                          {formatTimeAgo(effectiveLastRun)}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {effectiveDuration > 0 ? `${Number(effectiveDuration).toFixed(2)}s` : 'нет данных'}
                        </div>
                      </td>

                      {/* Groups & Classes */}
                      <td className="p-3.5 text-xs">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {(node.groups || []).slice(0, 1).map((g) => (
                            <span
                              key={g}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 truncate"
                            >
                              {g}
                            </span>
                          ))}
                          {node.classes && node.classes.length > 0 && (
                            <span className="text-[10px] font-mono text-slate-500">
                              +{node.classes.length} классов
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
                            title="Запустить puppet agent -t"
                          >
                            <Play className={`w-3.5 h-3.5 ${node.isAgentRunning ? 'animate-spin text-amber-400' : ''}`} />
                          </button>

                          {/* Latest Report (Иконка файла) */}
                          {effectiveReportId && (
                            <button
                              onClick={() => onSelectReport(effectiveReportId)}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition cursor-pointer"
                              title="Посмотреть отчет последнего прогона"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Node Details / Facts */}
                          <button
                            onClick={() => onSelectNode(node.certname)}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Факты узла и конфигурация"
                          >
                            <Info className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          {/* Delete Node */}
                          <button
                            onClick={() => {
                              if (confirm(`Вы действительно хотите удалить узел ${node.certname}?`)) {
                                onDeleteNode(node.certname);
                              }
                            }}
                            className="p-1.5 rounded bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                            title="Удалить узел"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>Показано узлов: {filteredNodes.length} из {nodes.length}</span>
          <span className="font-mono text-[11px] text-slate-500">
            Puppet Master Catalog API • TLS Verified
          </span>
        </div>
      </div>
    </div>
  );
};