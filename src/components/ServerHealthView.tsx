import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Server,
  Trash2,
  Thermometer,
  Cpu,
  HardDrive
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { useTranslation } from '../context/LanguageContext';

export const ServerHealthView: React.FC = () => {
  const { t, language } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(10);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchHealth = async () => {
    try {
      const res = await api.getServerHealth();
      setData(res);
      setLastRefreshed(new Date().toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US'));
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
        <span>{language === 'ru' ? 'Опрос телеметрии Puppet Master & JVM...' : 'Querying Puppet Master & JVM telemetry...'}</span>
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
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-amber-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {t.healthTitle}
              </h2>
              <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {t.runningStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {t.healthSubtitle}
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
            <option value={0}>{t.pause}</option>
          </select>

          <button
            onClick={fetchHealth}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.refreshBtn}</span>
          </button>

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
            title={language === 'ru' ? 'Очистить накопленную историю графиков' : 'Clear collected chart telemetry'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.clearHistoryBtn}</span>
          </button>

          <span className="text-[11px] font-mono text-slate-500 hidden md:inline ml-2">
            {t.lastUpdated}: {lastRefreshed || data?.updatedAt}
          </span>
        </div>
      </div>

      {/* 8 KPI Cards Strip with CPU Temperature */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">Status</span>
          <div className="mt-2 text-base font-black font-mono text-emerald-400 lowercase">
            {data?.status || 'running'}
          </div>
        </div>

        {/* Catalog mean (ms) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">{t.catalogMean}</span>
          <div className="mt-2 text-xl font-black font-mono text-amber-500">
            {timings.catalogMeanMs}
          </div>
        </div>

        {/* Report mean (ms) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">{t.reportMean}</span>
          <div className="mt-2 text-xl font-black font-mono text-emerald-400">
            {timings.reportMeanMs}
          </div>
        </div>

        {/* Total mean (ms) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">{t.totalMean}</span>
          <div className="mt-2 text-xl font-black font-mono text-purple-400">
            {timings.totalMeanMs}
          </div>
        </div>

        {/* Heap % */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">{t.heapPercent}</span>
          <div className="mt-2 text-xl font-black font-mono text-sky-400">
            {jvm.heapPercent}%
          </div>
        </div>

        {/* Heap Used */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">{t.heapUsed}</span>
          <div className="mt-2 text-sm font-black font-mono text-white">
            {jvm.heapUsedMB} / {jvm.heapMaxMB} MB
          </div>
        </div>

        {/* CPU % */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">{t.cpuPercent}</span>
          <div className="mt-2 text-xl font-black font-mono text-slate-200">
            {data?.cpuPercent || '0.2'}%
          </div>
        </div>

        {/* CPU Temperature */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">{t.cpuTemp}</span>
            <Thermometer className={`w-3.5 h-3.5 ${
              (data?.cpuTemp || 42) >= 82
                ? 'text-rose-400'
                : (data?.cpuTemp || 42) >= 68
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`} />
          </div>
          <div className="mt-2">
            <span className={`text-xl font-black font-mono ${
              (data?.cpuTemp || 42) >= 82
                ? 'text-rose-400'
                : (data?.cpuTemp || 42) >= 68
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}>
              {data?.cpuTemp ? `${data.cpuTemp}°C` : '42.5°C'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 truncate" title={data?.cpuTempSource}>
            {data?.cpuTempStatus === 'critical' ? t.cpuTempHot : data?.cpuTempStatus === 'warning' ? t.cpuTempWarm : t.cpuTempNormal}
          </div>
        </div>
      </div>

      {/* 4 Interactive Recharts Graphs (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: JVM Heap Usage */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>{t.jvmHeapUsage}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'ru' ? 'Занятая куча JVM (динамика циклов Garbage Collection)' : 'Active JVM heap size across Garbage Collection intervals'}
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
                <span>{t.jvmNonHeap}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'ru' ? 'Память загруженных классов, методов и метаданных JVM' : 'Loaded class metadata, bytecode cache, and JIT compilation spaces'}
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
                <span>{t.catalogRouteMean}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'ru' ? 'Время ответа эндпоинта компиляции каталогов `catalog/:certname`' : 'Latency of Puppet Server catalog compilation endpoint'}
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
                  formatter={(val: any) => [`${val} ms`, 'Compile Latency']}
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
                <span>{t.reportSubmissionMean}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'ru' ? 'Время приёма и валидации отчетов агентов через Webhook' : 'Ingestion and processing time of incoming transaction reports'}
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
                  formatter={(val: any) => [`${val} ms`, 'Ingest Latency']}
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

      {/* Host Hardware & System Telemetry */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                {t.hardwareTelemetry}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'ru' ? 'Спецификация хоста, параметры ядер процессора и датчики температуры' : 'Host specs, processor cores, and cooling telemetry'}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 self-start sm:self-auto">
            {data?.masterHost || 'localhost:8140'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* CPU & Thermal */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-medium flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                {t.thermalSensor}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                (data?.cpuTemp || 42) >= 82
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : (data?.cpuTemp || 42) >= 68
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {data?.cpuTempStatus === 'critical' ? t.cpuTempHot : data?.cpuTempStatus === 'warning' ? t.cpuTempWarm : t.cpuTempNormal}
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {data?.cpuTemp ? `${data.cpuTemp} °C` : '42.5 °C'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate" title={data?.cpuTempSource}>
              {data?.cpuTempSource || 'ACPI / Thermal Sensor'}
            </div>
          </div>

          {/* CPU Cores & Load */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <div className="text-slate-400 font-medium flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              {language === 'ru' ? 'Процессор и нагрузка' : 'CPU & Load Average'}
            </div>
            <div className="text-sm font-bold font-mono text-white">
              {data?.os?.cpus || 2} vCPU Cores ({data?.os?.arch || 'x86_64'})
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Load: {Array.isArray(data?.os?.loadAverage) ? data.os.loadAverage.map((v: number) => v.toFixed(2)).join(', ') : '0.12, 0.24, 0.18'}
            </div>
          </div>

          {/* OS Platform & Kernel */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <div className="text-slate-400 font-medium flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-purple-400" />
              {language === 'ru' ? 'Окружение ОС' : 'Operating System'}
            </div>
            <div className="text-sm font-bold font-mono text-white truncate" title={data?.os?.release}>
              {data?.os?.type || 'Linux'} {data?.os?.release || ''}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Platform: {data?.os?.platform || 'linux'}
            </div>
          </div>

          {/* System Memory & Uptime */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <div className="text-slate-400 font-medium flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              {language === 'ru' ? 'Память и Аптайм' : 'RAM & Uptime'}
            </div>
            <div className="text-sm font-bold font-mono text-white">
              {data?.os?.usedMemMB || 1240} / {data?.os?.totalMemMB || 4096} MB
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Uptime: {Math.floor((data?.uptime || 7200) / 3600)}h {Math.floor(((data?.uptime || 7200) % 3600) / 60)}m
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
