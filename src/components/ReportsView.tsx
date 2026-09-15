import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';
import { PuppetReport } from '../types';
import { StatusBadge } from './StatusBadge';

interface ReportsViewProps {
  reports: PuppetReport[];
  selectedReportId: string | null;
  onSelectReport: (reportId: string) => void;
  onSelectNode: (certname: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reports,
  selectedReportId,
  onSelectReport,
  onSelectNode
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (envFilter !== 'all' && r.environment !== envFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matchNode = r.certname.toLowerCase().includes(q);
      const matchVersion = r.configuration_version?.toLowerCase().includes(q);
      const matchId = r.id.toLowerCase().includes(q);
      if (!matchNode && !matchVersion && !matchId) return false;
    }
    return true;
  });

  const formatRelativeTime = (timeStr: string) => {
    const ms = Date.now() - new Date(timeStr).getTime();
    const minutes = Math.floor(ms / (60 * 1000));
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    return `${days} д назад`;
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search by node or config version */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск отчетов по FQDN, номеру ревизии или ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300">
            <span className="text-slate-400">Статус:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">Все статусы</option>
              <option value="failed" className="bg-slate-900 text-slate-200">Сбои</option>
              <option value="changed" className="bg-slate-900 text-slate-200">С изменениями</option>
              <option value="unchanged" className="bg-slate-900 text-slate-200">Без изменений</option>
            </select>
          </div>

          {/* Environment filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300">
            <span className="text-slate-400">Окружение:</span>
            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">Все окружения</option>
              <option value="production" className="bg-slate-900 text-slate-200">Production</option>
              <option value="staging" className="bg-slate-900 text-slate-200">Staging</option>
              <option value="development" className="bg-slate-900 text-slate-200">Development</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Статус</th>
                <th className="p-3.5">Узел (Certname)</th>
                <th className="p-3.5">Время прогона</th>
                <th className="p-3.5">Окружение</th>
                <th className="p-3.5">Версия конфигурации</th>
                <th className="p-3.5">Метрики ресурсов</th>
                <th className="p-3.5">Длительность</th>
                <th className="p-3.5 text-right">Отчет</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Отчеты по заданным параметрам не найдены.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const res = report.metrics?.resources;
                  const isSelected = selectedReportId === report.id;

                  return (
                    <tr
                      key={report.id}
                      className={`hover:bg-slate-800/50 transition cursor-pointer ${
                        isSelected ? 'bg-amber-500/10' : ''
                      }`}
                      onClick={() => onSelectReport(report.id)}
                    >
                      {/* Status */}
                      <td className="p-3.5">
                        <StatusBadge status={report.status} size="sm" />
                      </td>

                      {/* Certname */}
                      <td className="p-3.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectNode(report.certname);
                          }}
                          className="font-mono text-xs sm:text-sm font-semibold text-slate-100 hover:text-amber-400 text-left transition truncate max-w-xs block"
                        >
                          {report.certname}
                        </button>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: {report.id}
                        </div>
                      </td>

                      {/* Run Time */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="text-slate-200 font-medium">
                          {formatRelativeTime(report.time)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(report.time).toLocaleDateString()} {new Date(report.time).toLocaleTimeString()}
                        </div>
                      </td>

                      {/* Environment */}
                      <td className="p-3.5">
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                          report.environment === 'production'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        }`}>
                          {report.environment}
                        </span>
                      </td>

                      {/* Config version */}
                      <td className="p-3.5 font-mono text-xs text-slate-300">
                        <div className="truncate max-w-[160px]" title={report.configuration_version}>
                          {report.configuration_version || 'N/A'}
                        </div>
                      </td>

                      {/* Metrics Badges */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          {res?.failed > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {res.failed} сбоев
                            </span>
                          )}
                          {res?.changed > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              {res.changed} изм
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {res?.unchanged ?? 0} в норме
                          </span>
                          <span className="text-slate-500">/ {res?.total ?? 0}</span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="p-3.5 font-mono text-xs text-slate-200 whitespace-nowrap">
                        {report.run_duration ? `${report.run_duration}s` : '—'}
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectReport(report.id);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 text-xs font-medium transition flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <span>Детали</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>Всего отчетов в реестре: {filteredReports.length}</span>
          <span className="font-mono text-[11px] text-slate-500">
            Puppet Transaction Report API
          </span>
        </div>
      </div>
    </div>
  );
};
