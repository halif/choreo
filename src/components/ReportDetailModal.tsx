import React, { useState } from 'react';
import {
  X,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Code2,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Cpu,
  Search
} from 'lucide-react';
import { PuppetReport } from '../types';
import { StatusBadge } from './StatusBadge';

interface ReportDetailModalProps {
  report: PuppetReport | null;
  onClose: () => void;
  onSelectNode?: (certname: string) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  onClose,
  onSelectNode
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'logs' | 'timing' | 'raw'>('events');
  const [copied, setCopied] = useState(false);
  const [logFilterLevel, setLogFilterLevel] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');

  if (!report) return null;

  const res = report.metrics?.resources;
  const timeMetrics = report.metrics?.time;

  const handleCopyRaw = () => {
    navigator.clipboard?.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = report.logs?.filter((log) => {
    if (logFilterLevel !== 'all' && log.level !== logFilterLevel) return false;
    if (logSearch.trim() !== '') {
      const q = logSearch.toLowerCase().trim();
      return (
        log.message.toLowerCase().includes(q) ||
        log.source.toLowerCase().includes(q)
      );
    }
    return true;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-mono">
                  {report.certname}
                </h2>
                <StatusBadge status={report.status} size="sm" />
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {report.environment}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                <span>ID: {report.id}</span>
                <span>•</span>
                <span>Время: {new Date(report.time).toLocaleString()}</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">{report.run_duration}s прогон</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyRaw}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Скопировать JSON отчета"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 p-4 bg-slate-950/40 border-b border-slate-800 text-xs">
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Всего ресурсов</span>
            <span className="text-sm font-mono font-bold text-white">{res?.total ?? 0}</span>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">В норме</span>
            <span className="text-sm font-mono font-bold text-emerald-400">{res?.unchanged ?? 0}</span>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Изменено</span>
            <span className="text-sm font-mono font-bold text-sky-400">{res?.changed ?? 0}</span>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Ошибок</span>
            <span className="text-sm font-mono font-bold text-rose-400">{res?.failed ?? 0}</span>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Рассинхрон</span>
            <span className="text-sm font-mono font-bold text-amber-400">{res?.out_of_sync ?? 0}</span>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Версия манифеста</span>
            <span className="text-xs font-mono text-slate-300 truncate block" title={report.configuration_version}>
              {report.configuration_version || '8a4c11b'}
            </span>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 pt-3 border-b border-slate-800 bg-slate-900 text-xs">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-2 font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'events'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>События ресурсов ({report.resource_events?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-2 font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Лог выполнения агента ({report.logs?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('timing')}
            className={`px-3 py-2 font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'timing'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Время выполнения (Метрики)</span>
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`px-3 py-2 font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'raw'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON отчет</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 text-xs">
          {/* 1. RESOURCE EVENTS TAB */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              {(!report.resource_events || report.resource_events.length === 0) ? (
                <div className="p-12 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="font-medium text-slate-300">События изменений не зафиксированы</p>
                  <p className="text-slate-500 mt-1">Все ресурсы узла соответствуют целевому состоянию каталога (In Sync).</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {report.resource_events.map((event, idx) => {
                    const isFail = event.status === 'failure';
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-4 font-mono transition ${
                          isFail
                            ? 'bg-rose-950/20 border-rose-500/40'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-400">
                              {event.resource_type}[{event.title}]
                            </span>
                            <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${
                              isFail
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}>
                              {event.status}
                            </span>
                            {event.corrective_change && (
                              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                                Corrective
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 text-[11px]">
                            Свойство: <strong className="text-slate-200">{event.property}</strong>
                          </span>
                        </div>

                        {/* Diff / Message */}
                        <div className="mt-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs break-all">
                          <div className="text-slate-300">{event.message}</div>
                          {(event.previous_value || event.desired_value) && (
                            <div className="mt-2 pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              {event.previous_value && (
                                <div>
                                  <span className="text-slate-500 block">Предыдущее значение:</span>
                                  <span className="text-rose-400">{event.previous_value}</span>
                                </div>
                              )}
                              {event.desired_value && (
                                <div>
                                  <span className="text-slate-500 block">Требуемое значение:</span>
                                  <span className="text-emerald-400">{event.desired_value}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Manifest Line source */}
                        {event.file && (
                          <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1.5">
                            <span>Файл манифеста:</span>
                            <span className="text-slate-400 underline">{event.file}:{event.line || 1}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. PUPPET LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              {/* Log filter controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1">
                  {['all', 'err', 'warning', 'notice', 'info'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLogFilterLevel(lvl)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase transition cursor-pointer ${
                        logFilterLevel === lvl
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                <div className="relative w-48 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Фильтр по строкам лога..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 pl-8 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Logs output terminal */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-[11px] sm:text-xs max-h-[50vh] overflow-y-auto space-y-1.5 scrollbar-thin">
                {filteredLogs.length === 0 ? (
                  <div className="text-slate-500 py-4 text-center">
                    Логи отсутствуют или отфильтрованы.
                  </div>
                ) : (
                  filteredLogs.map((log, i) => {
                    const levelColors = {
                      err: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
                      warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                      notice: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                      info: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
                      debug: 'text-slate-400 bg-slate-800 border-slate-700'
                    }[log.level] || 'text-slate-400';

                    return (
                      <div key={i} className="flex items-start gap-2 leading-relaxed hover:bg-slate-900/50 p-1 rounded">
                        <span className={`px-1.5 py-0.2 rounded border text-[10px] font-bold uppercase shrink-0 ${levelColors}`}>
                          {log.level}
                        </span>
                        <span className="text-slate-500 shrink-0 select-none">
                          {new Date(log.time).toLocaleTimeString()}
                        </span>
                        <span className="text-slate-400 shrink-0 select-none">
                          [{log.source}]:
                        </span>
                        <span className={`break-all ${log.level === 'err' ? 'text-rose-300 font-semibold' : 'text-slate-200'}`}>
                          {log.message}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 3. TIMING METRICS TAB */}
          {activeTab === 'timing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Время выполнения по типам ресурсов</span>
                  </h4>
                  <div className="space-y-3 font-mono">
                    {timeMetrics && Object.entries(timeMetrics).map(([key, val]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 capitalize">{key.replace('_', ' ')}:</span>
                          <span className="text-white font-bold">{val} сек</span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{ width: `${Math.min((Number(val) / (timeMetrics.total || 30)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      <span>Итоги транзакции Puppet</span>
                    </h4>
                    <ul className="space-y-2 text-slate-300 font-mono text-xs">
                      <li className="flex justify-between py-1 border-b border-slate-800">
                        <span>Каталог скомпилирован:</span>
                        <span className="text-slate-100">{timeMetrics?.config_retrieval || 1.8}s</span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-slate-800">
                        <span>Версия Puppet агента:</span>
                        <span className="text-slate-100">{report.puppet_version}</span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-slate-800">
                        <span>Окружение Puppet:</span>
                        <span className="text-amber-400">{report.environment}</span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-slate-800">
                        <span>Событий failure:</span>
                        <span className={report.metrics?.events?.failure ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {report.metrics?.events?.failure || 0}
                        </span>
                      </li>
                      <li className="flex justify-between py-1">
                        <span>Общее время прогона:</span>
                        <span className="text-emerald-400 font-bold">{report.run_duration}s</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. RAW JSON TAB */}
          {activeTab === 'raw' && (
            <div className="relative">
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 max-h-[50vh] overflow-auto scrollbar-thin select-all">
                {JSON.stringify(report, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Puppet Enterprise / Open-Source Dashboard Compatibility</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
