import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  Server,
  Cpu,
  Clock,
  Layers,
  Zap,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Trash2,
  Maximize2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { api } from '../services/api';

export const ServerHealthView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(10);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchHealth = async () => {
    try {
      const res = await api.getServerHealth();
      setData(res);
      setLastRefreshed(new Date().toLocaleTimeString('ru-RU'));
    } catch (err) {
      console.error('Failed to load server health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    if (refreshInterval > 0) {
      const timer = setInterval(fetchHealth, refreshInterval * 1000);
      return () => clearInterval(timer);
    }
  }, [refreshInterval]);

  const handleClearHistory = () => {
    if (data && data.history) {
      setData({
        ...data,
        history: data.history.slice(-1)
      });
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mr-3" />
        <span>Опрос телеметрии Puppet Master & JVM...</span>
      </div>
    );
  }

  const jvm = data?.jvm || {
    heapUsedMB: 1634,
    heapMaxMB: 2048,
    heapPercent: 79.8,
    nonHeapMB: 395
  };

  const timings = data?.timings || {
    catalogMeanMs: 1219,
    reportMeanMs: 37,
    totalMeanMs: 203
  };

  const history = data?.history || [];

  return (
    <div className="space-y-6">
      {/* Top Header Controls (Как в OpenVox) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-amber-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Puppet Master & Server Health
              </h2>
              <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                RUNNING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Телеметрия JVM, сборщика мусора и скорость обработки маршрутов Puppet Server
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
          >
            <option value={5}>5s</option>
            <option value={10}>10s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
            <option value={0}>Пауза</option>
          </select>

          <button
            onClick={fetchHealth}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Обновить</span>
          </button>

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
            title="Очистить накопленную историю графиков"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Очистить историю</span>
          </button>

          <span className="text-[11px] font-mono text-slate-500 hidden md:inline ml-2">
            Обновлено: {lastRefreshed || data?.updatedAt}
          </span>
        </div>
      </div>

      {/* 7 KPI Cards Strip (В точности как в OpenVox) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">Status</span>
          <div className="mt-2 text-base font-black font-mono text-emerald-400 lowercase">
            {data?.status || 'running'}
          </div>
        </div>

        {/* Catalog mean (ms) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">Catalog mean (ms)</span>
          <div className="mt-2 text-xl font-black font-mono text-amber-500">
            {timings.catalogMeanMs}
          </div>
        </div>

        {/* Report mean (ms) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">Report mean (ms)</span>
          <div className="mt-2 text-xl font-black font-mono text-emerald-400">
            {timings.reportMeanMs}
          </div>
        </div>

        {/* Total mean (ms) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">Total mean (ms)</span>
          <div className="mt-2 text-xl font-black font-mono text-purple-400">
            {timings.totalMeanMs}
          </div>
        </div>

        {/* Heap % */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">Heap %</span>
          <div className="mt-2 text-xl font-black font-mono text-sky-400">
            {jvm.heapPercent}%
          </div>
        </div>

        {/* Heap Used */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">Heap Used</span>
          <div className="mt-2 text-sm font-black font-mono text-white">
            {jvm.heapUsedMB} / {jvm.heapMaxMB} MB
          </div>
        </div>

        {/* CPU % */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">CPU %</span>
          <div className="mt-2 text-xl font-black font-mono text-slate-200">
            {data?.cpuPercent || '0.2'}%
          </div>
        </div>
      </div>

      {/* 4 Interactive Recharts Graphs (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: JVM Heap Usage (Классическая пила сборщика мусора GC) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>JVM Heap Usage</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Занятая куча JVM (динамика циклов Garbage Collection)
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded">
              Limit: {jvm.heapMaxMB} MB
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} unit=" MB" domain={[0, 2048]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${val} MB`, 'Used Heap']}
                />
                <Line
                  type="monotone"
                  dataKey="heapUsedMB"
                  name="Used"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: JVM Non-Heap (Metaspace) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <span>JVM Non-Heap (Metaspace)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Память загруженных классов, методов и метаданных JVM
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
              ~{jvm.nonHeapMB} MB
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} unit=" MB" domain={[0, 600]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${val} MB`, 'Metaspace']}
                />
                <Line
                  type="monotone"
                  dataKey="nonHeapMB"
                  name="Metaspace"
                  stroke="#c084fc"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 3: Catalog Route Mean (ms) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Catalog Route Mean (ms)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Время ответа эндпоинта компиляции каталогов `catalog/:certname`
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
              Avg: {timings.catalogMeanMs} ms
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} unit=" ms" domain={[0, 3200]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${val} ms`, 'Время компиляции']}
                />
                <Line
                  type="stepAfter"
                  dataKey="catalogMeanMs"
                  name="Catalog Mean"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 4: Report Submission Mean (ms) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Report Submission Mean (ms)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Время приёма и валидации отчетов агентов через Webhook
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
              Avg: {timings.reportMeanMs} ms
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} unit=" ms" domain={[0, 60]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${val} ms`, 'Время приема']}
                />
                <Line
                  type="stepAfter"
                  dataKey="reportMeanMs"
                  name="Report Mean"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
