import React from 'react';
import {
  CheckCircle2,
  RefreshCw,
  XCircle,
  Clock,
  Server,
  Zap,
  ArrowUpRight,
  Play,
  FileText,
  Activity,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { DashboardMetrics, PuppetNode, LivePuppetEvent } from '../types';
import { StatusBadge } from './StatusBadge';

interface OverviewViewProps {
  metrics: DashboardMetrics | null;
  nodes: PuppetNode[];
  liveEvents: LivePuppetEvent[];
  onSelectNode: (certname: string) => void;
  onSelectReport: (reportId: string) => void;
  onFilterStatus: (status: string) => void;
  onTriggerRun: (certname: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  metrics,
  nodes,
  liveEvents,
  onSelectNode,
  onSelectReport,
  onFilterStatus,
  onTriggerRun
}) => {
  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mr-3" />
        <span>Загрузка телеметрии Puppet...</span>
      </div>
    );
  }

  const failedNodesList = nodes.filter(n => n.status === 'failed');
  const complianceRate = metrics.totalNodes > 0
    ? ((metrics.compliantNodes / metrics.totalNodes) * 100).toFixed(1)
    : '0';

  const donutData = [
    { name: 'В норме', value: metrics.compliantNodes, color: '#10b981' },
    { name: 'Изменены', value: metrics.changedNodes, color: '#0ea5e9' },
    { name: 'Сбои', value: metrics.failedNodes, color: '#f43f5e' },
    { name: 'Не отвечают', value: metrics.unresponsiveNodes, color: '#f59e0b' },
    { name: 'Ожидают', value: metrics.pendingNodes, color: '#a855f7' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Critical Alert Banner if failed nodes exist */}
      {failedNodesList.length > 0 && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-rose-950/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-rose-200 text-sm sm:text-base flex items-center gap-2">
                <span>Обнаружены сбои конфигурации Puppet ({failedNodesList.length} узла)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 font-mono">
                  CRITICAL
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-rose-300/80 mt-1 max-w-2xl">
                Узлы не смогли применить манифесты из-за ошибок запуска сервисов или недоступности пакетов.
                Рекомендуется проверить отчеты и логи выполнения.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => onFilterStatus('failed')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-slate-950 transition cursor-pointer flex items-center gap-1.5 shadow"
            >
              <span>Показать сбойные узлы</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Nodes */}
        <div
          onClick={() => onFilterStatus('all')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Всего узлов</span>
            <Server className="w-4 h-4 group-hover:text-amber-400 transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
            {metrics.totalNodes}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Комплаенс:</span>
            <span className="font-mono text-emerald-400 font-semibold">{complianceRate}%</span>
          </div>
        </div>

        {/* Compliant / Unchanged */}
        <div
          onClick={() => onFilterStatus('unchanged')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-4 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">В норме</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
            {metrics.compliantNodes}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 truncate">
            Без изменений каталога
          </div>
        </div>

        {/* Changed */}
        <div
          onClick={() => onFilterStatus('changed')}
          className="bg-slate-900 border border-slate-800 hover:border-sky-500/40 rounded-xl p-4 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-sky-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Изменены</span>
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-sky-400">
            {metrics.changedNodes}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 truncate">
            Скорректировано Puppet
          </div>
        </div>

        {/* Failed */}
        <div
          onClick={() => onFilterStatus('failed')}
          className={`border rounded-xl p-4 transition cursor-pointer group ${
            metrics.failedNodes > 0
              ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Сбои</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-400">
            {metrics.failedNodes}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 truncate">
            {metrics.failedNodes > 0 ? 'Требуют внимания' : 'Нет ошибок'}
          </div>
        </div>

        {/* Unresponsive */}
        <div
          onClick={() => onFilterStatus('unresponsive')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Не отвечают</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
            {metrics.unresponsiveNodes}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 truncate">
            Таймаут прогона agent
          </div>
        </div>

        {/* Average Duration */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Ср. время</span>
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
            {metrics.avgRunDuration}
            <span className="text-sm font-normal text-slate-400 ml-1">сек</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 truncate">
            Применение каталога
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runs History Timeline */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white text-sm sm:text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Динамика прогонов Puppet (24 часа)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Распределение статусов отчетов агентов по временным интервалам
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                В норме
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                Изменен
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Сбой
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.historyTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUnchanged" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorChanged" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="unchanged"
                  name="В норме"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorUnchanged)"
                />
                <Area
                  type="monotone"
                  dataKey="changed"
                  name="Изменены"
                  stroke="#0ea5e9"
                  fillOpacity={1}
                  fill="url(#colorChanged)"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  name="Сбои"
                  stroke="#f43f5e"
                  fillOpacity={1}
                  fill="url(#colorFailed)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Node Distribution Donut */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <span>Статусы узлов</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Текущее состояние парка Puppet
            </p>
          </div>

          <div className="h-48 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
            {donutData.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="truncate">{d.name}:</span>
                <span className="font-mono font-bold text-white ml-auto">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two columns: Nodes Needing Attention & Real-Time Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nodes with Failures / Changes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white text-sm sm:text-base flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Узлы, требующие внимания</span>
            </h3>
            <span className="text-xs text-slate-400">
              {failedNodesList.length} сбоев
            </span>
          </div>

          {failedNodesList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs sm:text-sm border border-dashed border-slate-800 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              Все узлы находятся в актуальном состоянии без зарегистрированных сбоев!
            </div>
          ) : (
            <div className="space-y-2.5">
              {failedNodesList.map((node) => (
                <div
                  key={node.certname}
                  className="p-3 bg-slate-950 border border-rose-500/20 hover:border-rose-500/40 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        onClick={() => onSelectNode(node.certname)}
                        className="font-mono text-sm font-semibold text-white hover:text-amber-400 cursor-pointer truncate"
                      >
                        {node.certname}
                      </span>
                      <StatusBadge status={node.status} size="sm" />
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2 font-mono">
                      <span>IP: {node.ip}</span>
                      <span>•</span>
                      <span>ОС: {node.os}</span>
                      <span>•</span>
                      <span>{new Date(node.lastRun).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    {node.latestReportId && (
                      <button
                        onClick={() => onSelectReport(node.latestReportId!)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                        title="Открыть отчет"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>Отчет</span>
                      </button>
                    )}
                    <button
                      onClick={() => onTriggerRun(node.certname)}
                      disabled={node.isAgentRunning}
                      className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                      title="Запустить puppet agent -t"
                    >
                      <Play className={`w-3.5 h-3.5 ${node.isAgentRunning ? 'animate-spin' : ''}`} />
                      <span>{node.isAgentRunning ? 'Запуск...' : 'Повторить'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real-time Activity Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm sm:text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Лента событий Puppet (Live Stream)</span>
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Авто-обновление
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {liveEvents.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Ожидание событий от агентов Puppet...
                </div>
              ) : (
                liveEvents.slice(0, 8).map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200">{evt.title}</span>
                        {evt.status && <StatusBadge status={evt.status} size="sm" showLabel={false} />}
                      </div>
                      <div className="font-mono text-[11px] text-amber-400/90 truncate mt-0.5">
                        {evt.certname}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5 line-clamp-1">
                        {evt.message}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Прослушивание SSE сокета: <code className="text-slate-300 font-mono">/api/events</code></span>
            <span>{liveEvents.length} событий зафиксировано</span>
          </div>
        </div>
      </div>
    </div>
  );
};
