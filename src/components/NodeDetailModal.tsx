import React, { useState } from 'react';
import {
  X,
  Server,
  Play,
  FileText,
  Terminal,
  Database,
  Layers,
  Search,
  Plus,
  Trash2,
  Clock,
  RefreshCw,
  Info
} from 'lucide-react';
import { PuppetNode, PuppetReport } from '../types';
import { StatusBadge } from './StatusBadge';
import { api } from '../services/api';
import { useTranslation } from '../context/LanguageContext';

interface NodeDetailModalProps {
  node: PuppetNode | null;
  reports: PuppetReport[];
  onClose: () => void;
  onTriggerRun: (certname: string, forcedOutcome?: string) => void;
  onSelectReport: (reportId: string) => void;
  onUpdateNode: (certname: string, data: Partial<PuppetNode>) => void;
}

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  node,
  reports,
  onClose,
  onTriggerRun,
  onSelectReport,
  onUpdateNode
}) => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<'facts' | 'classes' | 'history' | 'terminal'>('facts');
  const [factsSearch, setFactsSearch] = useState('');
  const [newClassInput, setNewClassInput] = useState('');
  const [isEditingClasses, setIsEditingClasses] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isRunningTerminal, setIsRunningTerminal] = useState(false);
  const [isSyncingFacts, setIsSyncingFacts] = useState(false);
  const [factsSyncNotice, setFactsSyncNotice] = useState<string | null>(null);

  if (!node) return null;

  const handleSyncFacts = async () => {
    setIsSyncingFacts(true);
    setFactsSyncNotice(null);
    try {
      const res = await api.syncNodeFacts(node.certname);
      if (res && res.facts) {
        onUpdateNode(node.certname, { facts: res.facts });
        const count = res.count || Object.keys(res.facts).length;
        setFactsSyncNotice(
          language === 'ru'
            ? `Синхронизировано ${count} фактов Facter`
            : `Synchronized ${count} Facter facts`
        );
      }
    } catch (e: any) {
      setFactsSyncNotice(
        language === 'ru'
          ? `Ошибка синхронизации: ${e.message}`
          : `Sync error: ${e.message}`
      );
    } finally {
      setIsSyncingFacts(false);
      setTimeout(() => setFactsSyncNotice(null), 4000);
    }
  };

  const nodeReports = reports.filter(r => r.certname === node.certname);

  // Facts filtering
  const factsEntries = Object.entries(node.facts || {}).filter(([k, v]) => {
    if (factsSearch.trim() === '') return true;
    const q = factsSearch.toLowerCase().trim();
    return k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q);
  });

  const handleAddClass = () => {
    if (!newClassInput.trim()) return;
    const updated = Array.from(new Set([...node.classes, newClassInput.trim()]));
    onUpdateNode(node.certname, { classes: updated });
    setNewClassInput('');
  };

  const handleRemoveClass = (cls: string) => {
    const updated = node.classes.filter(c => c !== cls);
    onUpdateNode(node.certname, { classes: updated });
  };

  const handleRunAgentInteractive = (forcedOutcome?: string) => {
    setIsRunningTerminal(true);
    setTerminalLogs([
      `$ puppet agent -t --environment ${node.environment}`,
      `Info: Using configured environment '${node.environment}'`,
      `Info: Retrieving pluginfacts & plugins from puppetserver.prod.acme.net`,
      `Info: Loading facts for ${node.certname}`,
      `Info: Caching catalog for ${node.certname}...`
    ]);

    setTimeout(() => {
      setTerminalLogs(prev => [
        ...prev,
        `Info: Applying configuration version ${Math.floor(Date.now() / 1000)}`,
        `Notice: /Stage[main]/Puppetlabs::Ntp/File[/etc/ntp.conf]: In sync`,
        `Notice: /Stage[main]/Profile::Base/Package[htop]: In sync`
      ]);
    }, 900);

    setTimeout(() => {
      if (forcedOutcome === 'failed') {
        setTerminalLogs(prev => [
          ...prev,
          `Error: /Stage[main]/Service[custom-app]: Failed to start: Process returned code 1`,
          `Notice: Applied catalog with 1 failure`
        ]);
      } else if (forcedOutcome === 'changed') {
        setTerminalLogs(prev => [
          ...prev,
          `Notice: /Stage[main]/Profile::Ssl_certs/File[/etc/ssl/cert.pem]: content changed`,
          `Notice: Applied catalog in 22.4 seconds with 1 state change`
        ]);
      } else {
        setTerminalLogs(prev => [
          ...prev,
          `Notice: Applied catalog in 19.80 seconds: ${node.classes.length * 15} resources in sync`,
          `Info: Creating state file /opt/puppetlabs/puppet/cache/state/state.yaml`
        ]);
      }
      setIsRunningTerminal(false);
      onTriggerRun(node.certname, forcedOutcome);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-mono">
                  {node.certname}
                </h2>
                <StatusBadge status={node.status} size="sm" />
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {node.environment}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                <span>IP: {node.ip}</span>
                <span>•</span>
                <span>{language === 'ru' ? 'ОС:' : 'OS:'} {node.os}</span>
                <span>•</span>
                <span>Agent: v{node.puppetVersion}</span>
                <span>•</span>
                <span>{language === 'ru' ? 'Посл. прогон:' : 'Last run:'} {new Date(node.lastRun).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveTab('terminal');
                handleRunAgentInteractive();
              }}
              disabled={node.isAgentRunning || isRunningTerminal}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow"
            >
              <Play className={`w-3.5 h-3.5 ${node.isAgentRunning || isRunningTerminal ? 'animate-spin' : ''}`} />
              <span>puppet agent -t</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-4 pt-3 border-b border-slate-800 bg-slate-900 text-xs">
          <button
            onClick={() => setActiveTab('facts')}
            className={`px-3 py-2 font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'facts'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t.tabFacts} ({factsEntries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`px-3 py-2 font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'classes'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{language === 'ru' ? 'Классы & Группы' : 'Classes & Groups'} ({node.classes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-2 font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t.tabHistory} ({nodeReports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-2 font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'terminal'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{t.tabTerminal}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 text-xs">
          {/* 1. FACTS TAB */}
          {activeTab === 'facts' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={t.searchFactsPlaceholder}
                    value={factsSearch}
                    onChange={(e) => setFactsSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={handleSyncFacts}
                  disabled={isSyncingFacts}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 font-medium text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                  title={t.syncFacts}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFacts ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{isSyncingFacts ? t.factsSyncing : t.syncFacts}</span>
                </button>
              </div>

              {factsSyncNotice && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{factsSyncNotice}</span>
                </div>
              )}

              {factsEntries.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-amber-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-200 text-sm">
                      {factsSearch.trim()
                        ? (language === 'ru' ? 'Ничего не найдено по фильтру' : 'No facts match the query')
                        : (language === 'ru' ? 'Факты Facter ещё не загружены' : 'No Facter facts loaded yet')}
                    </h5>
                    <p className="text-slate-400 text-xs max-w-md mx-auto mt-1">
                      {factsSearch.trim()
                        ? (language === 'ru'
                            ? `По запросу "${factsSearch}" фактов не обнаружено. Попробуйте сбросить поисковый запрос.`
                            : `No facts found matching "${factsSearch}". Try clearing your search query.`)
                        : (language === 'ru'
                            ? 'Puppet-отчет содержит только статусы применения каталога. Факты Facter (память, процессор, ОС) передаются отдельно.'
                            : 'Puppet reports include catalog run statuses. Facter hardware and OS telemetry is synchronized separately.')}
                    </p>
                  </div>
                  {!factsSearch.trim() && (
                    <button
                      onClick={handleSyncFacts}
                      disabled={isSyncingFacts}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition cursor-pointer shadow mt-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFacts ? 'animate-spin' : ''}`} />
                      <span>{language === 'ru' ? 'Запросить факты у узла (Run Facter)' : 'Request node facts (Run Facter)'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3 w-1/3">{language === 'ru' ? 'Имя факта (Fact Name)' : 'Fact Key'}</th>
                        <th className="p-3">{language === 'ru' ? 'Значение (Value)' : 'Value'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {factsEntries.map(([k, v]) => (
                        <tr key={k} className="hover:bg-slate-900/40 transition">
                          <td className="p-3 font-semibold text-amber-400 select-all">{k}</td>
                          <td className="p-3 text-slate-200 break-all select-all">
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 2. CLASSES & GROUPS TAB */}
          {activeTab === 'classes' && (
            <div className="space-y-6">
              {/* Node Groups */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>{language === 'ru' ? 'Привязанные группы узлов' : 'Assigned Node Groups'}</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {node.groups.length === 0 ? (
                    <span className="text-slate-500 text-xs">
                      {language === 'ru' ? 'Узел не привязан к группам.' : 'Node is not assigned to any group.'}
                    </span>
                  ) : (
                    node.groups.map((g) => (
                      <span
                        key={g}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-medium text-xs flex items-center gap-2"
                      >
                        <span>{g}</span>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Assigned Classes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    <span>{language === 'ru' ? 'Назначенные Puppet классы' : 'Assigned Puppet Classes'}</span>
                  </h4>
                  <button
                    onClick={() => setIsEditingClasses(!isEditingClasses)}
                    className="text-xs text-amber-400 hover:underline cursor-pointer"
                  >
                    {isEditingClasses
                      ? (language === 'ru' ? 'Готово' : 'Done')
                      : (language === 'ru' ? 'Редактировать' : 'Edit')}
                  </button>
                </div>

                {isEditingClasses && (
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      placeholder={t.addClassPlaceholder}
                      value={newClassInput}
                      onChange={(e) => setNewClassInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
                      className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 flex-1 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      onClick={handleAddClass}
                      className="px-3 py-1.5 rounded bg-amber-500 text-slate-950 font-semibold text-xs cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addClassBtn}</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {node.classes.map((cls) => (
                    <div
                      key={cls}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 font-mono text-xs"
                    >
                      <span className="text-slate-200 font-semibold">{cls}</span>
                      {isEditingClasses && (
                        <button
                          onClick={() => handleRemoveClass(cls)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. REPORT HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {nodeReports.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  {language === 'ru' ? 'Отчетов для данного узла пока не сохранено.' : 'No reports saved for this node yet.'}
                </div>
              ) : (
                nodeReports.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => onSelectReport(r.id)}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={r.status} size="sm" />
                      <div>
                        <div className="font-mono text-xs font-semibold text-white">
                          {language === 'ru' ? 'Конфигурация' : 'Config'} {r.configuration_version}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(r.time).toLocaleString()} • {r.run_duration}s {language === 'ru' ? 'прогон' : 'run'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {r.metrics?.resources?.changed || 0} {language === 'ru' ? 'изм' : 'changed'} / {r.metrics?.resources?.failed || 0} {language === 'ru' ? 'сбоев' : 'failed'}
                      </span>
                      <FileText className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 4. INTERACTIVE TERMINAL TAB */}
          {activeTab === 'terminal' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400">
                  {language === 'ru' ? 'Симуляция прогона с разными исходами:' : 'Simulate agent run with outcomes:'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunAgentInteractive('unchanged')}
                    disabled={isRunningTerminal}
                    className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium cursor-pointer"
                  >
                    {t.statusUnchanged} (Success)
                  </button>
                  <button
                    onClick={() => handleRunAgentInteractive('changed')}
                    disabled={isRunningTerminal}
                    className="px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-medium cursor-pointer"
                  >
                    {t.statusChanged} (Change)
                  </button>
                  <button
                    onClick={() => handleRunAgentInteractive('failed')}
                    disabled={isRunningTerminal}
                    className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium cursor-pointer"
                  >
                    {t.statusFailed} (Fail)
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs max-h-[45vh] overflow-y-auto space-y-1 text-slate-200">
                {terminalLogs.length === 0 ? (
                  <div className="text-slate-500 py-6 text-center">
                    {language === 'ru'
                      ? 'Нажмите "puppet agent -t" вверху или выберите сценарий выше для запуска агента.'
                      : 'Click "puppet agent -t" above or choose a scenario to trigger live execution.'}
                  </div>
                ) : (
                  terminalLogs.map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.startsWith('Error:')
                          ? 'text-rose-400'
                          : line.startsWith('Notice:')
                          ? 'text-emerald-400'
                          : line.startsWith('$')
                          ? 'text-amber-400 font-bold'
                          : 'text-slate-300'
                      }
                    >
                      {line}
                    </div>
                  ))
                )}
                {isRunningTerminal && (
                  <div className="flex items-center gap-2 text-amber-400 pt-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>
                      {language === 'ru' ? 'Выполняется транзакция каталога Puppet...' : 'Executing Puppet catalog transaction...'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Puppet Node Management</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
