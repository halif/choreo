import React from 'react';
import { Server, Play, Plus, Radio, Layers, Terminal, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentEnvironment: string;
  onEnvironmentChange: (env: string) => void;
  onTriggerFleetRun: () => void;
  isFleetRunning: boolean;
  onOpenAddNode: () => void;
  onOpenIntegration: () => void;
  isLiveConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentEnvironment,
  onEnvironmentChange,
  onTriggerFleetRun,
  isFleetRunning,
  onOpenAddNode,
  onOpenIntegration,
  isLiveConnected
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Branding & Puppet Master Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 text-slate-950 font-black text-xl select-none">
              C
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  Choreo
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 tracking-wider">
                  v2.4
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  master: puppetserver.prod.acme.net:8140
                </span>
                <span className="text-slate-600">|</span>
                <span className="flex items-center gap-1 text-[11px]">
                  <Radio className={`w-3 h-3 ${isLiveConnected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  {isLiveConnected ? (
                    <span className="text-emerald-400 font-mono">LIVE SSE</span>
                  ) : (
                    <span className="text-slate-500">Offline</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* Environment Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px] hidden sm:inline">Окружение:</span>
            <select
              value={currentEnvironment}
              onChange={(e) => onEnvironmentChange(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-slate-900 text-slate-200">Все окружения</option>
              <option value="production" className="bg-slate-900 text-slate-200">Production</option>
              <option value="staging" className="bg-slate-900 text-slate-200">Staging</option>
              <option value="development" className="bg-slate-900 text-slate-200">Development</option>
            </select>
          </div>

          {/* Integration / Simulator Button */}
          <button
            id="btn-open-integration"
            onClick={onOpenIntegration}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Интеграция с Puppet Master и симуляция отчетов"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Webhook &amp; Симулятор</span>
            <span className="sm:hidden">Webhook</span>
          </button>

          {/* Trigger Fleet Run */}
          <button
            id="btn-trigger-fleet-run"
            onClick={onTriggerFleetRun}
            disabled={isFleetRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              isFleetRunning
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 cursor-wait'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Запустить puppet agent -t на всех узлах"
          >
            <Play className={`w-3.5 h-3.5 ${isFleetRunning ? 'animate-spin text-amber-400' : 'text-slate-300'}`} />
            <span>{isFleetRunning ? 'Выполняется прогон...' : 'Запустить прогон флота'}</span>
          </button>

          {/* Add Node Button */}
          <button
            id="btn-add-node"
            onClick={onOpenAddNode}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить узел</span>
          </button>
        </div>
      </div>
    </header>
  );
};
