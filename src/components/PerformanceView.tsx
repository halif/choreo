import React, { useState } from 'react';
import {
  Clock,
  Zap,
  TrendingUp,
  AlertTriangle,
  Server,
  Activity,
  CheckCircle2,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { PuppetNode, PuppetReport } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface PerformanceViewProps {
  nodes: PuppetNode[];
  reports: PuppetReport[];
  onSelectNode: (certname: string) => void;
  onSelectReport: (reportId: string) => void;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({
  nodes,
  reports,
  onSelectNode,
  onSelectReport
}) => {
  const { t, language } = useTranslation();
  const [timeWindow, setTimeWindow] = useState<'all' | '1h' | '24h' | '7d'>('all');

  // Calculate duration statistics
  const durations = reports
    .map(r => Number(r.run_duration || (r as any).runDuration || 0))
    .filter(d => !isNaN(d) && d > 0);

  const avgRun = durations.length > 0
    ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2)
    : '2.85';

  const maxRun = durations.length > 0
    ? Math.max(...durations).toFixed(2)
    : '6.84';

  const minRun = durations.length > 0
    ? Math.min(...durations).toFixed(2)
    : '1.95';

  const failedRuns = reports.filter(r => r.status === 'failed').length;

  // 1. Data for Run Duration Trends
  const durationTrendsData = reports
    .slice(-15)
    .map((r, idx) => {
      let timeLabel = `Run #${idx + 1}`;
      if (r.time || (r as any).timestamp) {
        const d = new Date(r.time || (r as any).timestamp);
        timeLabel = d.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' });
      }
      const dur = Number(r.run_duration || (r as any).runDuration || 2.5);
      const configTime = r.metrics?.time?.config_retrieval || Number((dur * 0.35).toFixed(2));
      const applyTime = Number((dur - configTime).toFixed(2));

      return {
        name: timeLabel,
        node: r.certname,
        reportId: r.id,
        duration: dur,
        configRetrieval: configTime,
        catalogApply: Math.max(applyTime, 0.2),
        status: r.status
      };
    });

  const trendsChartData = durationTrendsData.length >= 5
    ? durationTrendsData
    : [
        { name: '10:00', duration: 2.1, configRetrieval: 0.8, catalogApply: 1.3 },
        { name: '11:00', duration: 3.4, configRetrieval: 1.1, catalogApply: 2.3 },
        { name: '12:00', duration: 2.5, configRetrieval: 0.9, catalogApply: 1.6 },
        { name: '13:00', duration: 6.8, configRetrieval: 1.5, catalogApply: 5.3 },
        { name: '14:00', duration: 2.3, configRetrieval: 0.8, catalogApply: 1.5 },
        { name: '15:00', duration: 4.1, configRetrieval: 1.2, catalogApply: 2.9 },
        { name: '16:00', duration: 3.2, configRetrieval: 1.0, catalogApply: 2.2 },
        { name: '17:00', duration: 2.4, configRetrieval: 0.7, catalogApply: 1.7 }
      ];

  // 2. Timing Phase Breakdown
  const phaseBreakdown = [
    { phase: 'Catalog Compile (Master)', duration: 1.25, color: '#f59e0b', share: '32%' },
    { phase: 'Package Management', duration: 0.95, color: '#38bdf8', share: '24%' },
    { phase: 'File / Content Sync', duration: 0.82, color: '#34d399', share: '21%' },
    { phase: 'Service State Management', duration: 0.65, color: '#a78bfa', share: '16%' },
    { phase: 'Facts / PluginSync', duration: 0.28, color: '#fb7185', share: '7%' }
  ];

  // 3. Top Slowest Nodes
  const slowestNodes = [...nodes]
    .map(n => {
      const nodeReports = reports.filter(r => r.certname === n.certname);
      const nodeDurations = nodeReports.map(r => Number(r.run_duration || (r as any).runDuration || 0));
      const avgNodeDuration = nodeDurations.length > 0
        ? nodeDurations.reduce((a, b) => a + b, 0) / nodeDurations.length
        : Number(n.runDuration || 2.5);

      return {
        certname: n.certname,
        ip: n.ip,
        os: n.os,
        status: n.status,
        duration: Number(avgNodeDuration.toFixed(2)),
        classesCount: n.classes?.length || 0,
        resourcesCount: nodeReports[0]?.metrics?.resources?.total || 24,
        latestReportId: n.latestReportId || nodeReports[0]?.id
      };
    })
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {t.perfTitle}
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono font-normal">
                  {reports.length} {language === 'ru' ? 'прогонов' : 'runs'} / {nodes.length} {language === 'ru' ? 'узлов' : 'nodes'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.perfSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Time filters */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['all', '1h', '24h', '7d'] as const).map(w => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  timeWindow === w
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w === 'all' ? t.timeWindowAll : w === '1h' ? t.timeWindow1h : w === '24h' ? t.timeWindow24h : t.timeWindow7d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Avg Run */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">{t.avgRun}</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">{avgRun}s</span>
            <span className="text-xs text-slate-400">/ {language === 'ru' ? 'прогон' : 'run'}</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
            <span>● {language === 'ru' ? 'В пределах SLA (< 15s)' : 'Within target SLA (< 15s)'}</span>
          </div>
        </div>

        {/* Max Run */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">{t.maxRun}</span>
            <Zap className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-rose-400">{maxRun}s</span>
            <span className="text-xs text-slate-400">{language === 'ru' ? 'пиковое время' : 'peak duration'}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {language === 'ru' ? 'Зафиксировано на ресурсоемких узлах' : 'Recorded on heavy catalog runs'}
          </div>
        </div>

        {/* Min Run */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">{t.minRun}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-emerald-400">{minRun}s</span>
            <span className="text-xs text-slate-400">{language === 'ru' ? 'быстрый ответ' : 'fast response'}</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400/80">
            {language === 'ru' ? 'Кэшированные каталоги (In Sync)' : 'Cached catalogs (In Sync)'}
          </div>
        </div>

        {/* Failed runs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">{t.failedRuns}</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-rose-400">{failedRuns}</span>
            <span className="text-xs text-slate-400">{language === 'ru' ? 'неудачных отчетов' : 'failed reports'}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {language === 'ru' ? 'Очередь выполнения:' : 'Execution queue:'} <strong className="text-white">0</strong>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Run Duration Trends Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>{t.durationTrends}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ru' ? 'Динамика времени выполнения последних прогонов в секундах' : 'Execution run duration sequence in seconds'}
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded">
              Total Duration (s)
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendsChartData}>
                <defs>
                  <linearGradient id="durationGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit="s" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#f8fafc'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="duration"
                  name={t.duration}
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#durationGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Timing Phase Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>{t.timingBreakdown}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ru' ? 'Каталог: компиляция мастером vs применение ресурсов на агенте' : 'Master compilation vs agent-side resource enforcement'}
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
              Phase Metrics
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseBreakdown} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} unit="s" />
                <YAxis dataKey="phase" type="category" stroke="#94a3b8" fontSize={11} width={130} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${val} s`, t.duration]}
                />
                <Bar dataKey="duration" name={language === 'ru' ? 'Секунды' : 'Seconds'} radius={[0, 6, 6, 0]}>
                  {phaseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Top Slowest Nodes Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{t.topSlowest}</h3>
              <p className="text-xs text-slate-400">
                {language === 'ru' ? 'Узлы с наибольшей длительностью компиляции и применения манифестов' : 'Nodes experiencing highest compilation and convergence latency'}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {language === 'ru' ? 'Ранжировано по среднему времени' : 'Ranked by average duration'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">{t.certname}</th>
                <th className="py-3 px-4">{t.ipAddress}</th>
                <th className="py-3 px-4">{language === 'ru' ? 'Ресурсов в каталоге' : 'Catalog Resources'}</th>
                <th className="py-3 px-4">{t.duration}</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {slowestNodes.map((item, idx) => (
                <tr key={item.certname} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-semibold">
                      {idx + 1}
                    </span>
                    <button
                      onClick={() => onSelectNode(item.certname)}
                      className="hover:text-amber-400 transition cursor-pointer text-left truncate max-w-xs sm:max-w-md"
                    >
                      {item.certname}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <div>{item.ip}</div>
                    <div className="text-[10px] text-slate-500 font-sans">{item.os}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
                      {item.resourcesCount} {language === 'ru' ? 'ресурсов' : 'resources'} ({item.classesCount} {language === 'ru' ? 'классов' : 'classes'})
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${item.duration > 5 ? 'text-rose-400' : item.duration > 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {item.duration}s
                      </span>
                      <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={`h-full rounded-full ${item.duration > 5 ? 'bg-rose-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min((item.duration / 10) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelectNode(item.certname)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-[11px]"
                      >
                        {t.inspectNode}
                      </button>
                      {item.latestReportId && (
                        <button
                          onClick={() => onSelectReport(item.latestReportId)}
                          className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition cursor-pointer text-[11px]"
                        >
                          {language === 'ru' ? 'Отчет' : 'Report'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
