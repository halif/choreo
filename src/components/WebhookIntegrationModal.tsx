import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Terminal,
  Copy,
  Check,
  Play,
  Send,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap
} from 'lucide-react';
import { api } from '../services/api';

interface WebhookIntegrationModalProps {
  onClose: () => void;
  onReportSimulated: () => void;
}

export const WebhookIntegrationModal: React.FC<WebhookIntegrationModalProps> = ({
  onClose,
  onReportSimulated
}) => {
  const [copiedConf, setCopiedConf] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  const puppetConfSnippet = `# /etc/puppetlabs/puppet/puppet.conf (на Puppet Master / Puppetserver)
[master]
reports = puppet_dashboard,store
reporturl = ${window.location.origin}/api/reports

# Или используя универсальный HTTP-процессор:
report_format = 12
`;

  const curlSnippet = `curl -X POST ${window.location.origin}/api/reports \\
  -H "Content-Type: application/json" \\
  -d '{
    "certname": "db-analytics.prod.acme.net",
    "environment": "production",
    "status": "changed",
    "configuration_version": "1726299000",
    "puppet_version": "8.4.0",
    "run_duration": 28.5,
    "metrics": {
      "resources": { "total": 140, "unchanged": 138, "changed": 2, "failed": 0, "out_of_sync": 2 }
    },
    "resource_events": [
      {
        "resource_type": "File",
        "title": "/etc/postgresql/16/main/postgresql.conf",
        "property": "content",
        "message": "content changed (max_connections updated)",
        "status": "success"
      }
    ],
    "logs": [
      { "level": "notice", "source": "Puppet", "message": "Catalog applied successfully with 2 changes" }
    ]
  }'`;

  const handleCopy = (text: string, type: 'conf' | 'curl') => {
    navigator.clipboard?.writeText(text);
    if (type === 'conf') {
      setCopiedConf(true);
      setTimeout(() => setCopiedConf(false), 2000);
    } else {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  const handleSimulateScenario = async (type: 'changed' | 'failed' | 'clean') => {
    setIsSimulating(true);
    setSimulationResult(null);

    const certname = type === 'failed'
      ? 'redis-cache-01.prod.acme.net'
      : type === 'changed'
      ? 'auth-service.prod.acme.net'
      : 'log-collector-01.prod.acme.net';

    const payload = {
      certname,
      environment: 'production',
      status: type === 'clean' ? 'unchanged' : type,
      configuration_version: `${Math.floor(Date.now() / 1000)} (git: rev-${Math.random().toString(36).substring(2, 7)})`,
      puppet_version: '8.4.0',
      run_duration: Number((12 + Math.random() * 10).toFixed(1)),
      metrics: {
        resources: {
          total: 125,
          unchanged: type === 'clean' ? 125 : type === 'changed' ? 123 : 124,
          changed: type === 'changed' ? 2 : 0,
          failed: type === 'failed' ? 1 : 0,
          failed_to_restart: 0,
          out_of_sync: type === 'changed' ? 2 : type === 'failed' ? 1 : 0,
          skipped: 0,
          scheduled: 0
        },
        time: {
          config_retrieval: 1.4,
          exec: 2.1,
          package: 3.5,
          service: 2.8,
          file: 4.2,
          total: 14.0
        },
        events: {
          total: type === 'clean' ? 0 : 2,
          failure: type === 'failed' ? 1 : 0,
          success: type === 'changed' ? 2 : 0,
          noop: 0
        }
      },
      resource_events: type === 'failed' ? [
        {
          resource_type: 'Service',
          title: 'redis-server',
          property: 'ensure',
          previous_value: 'stopped',
          desired_value: 'running',
          message: 'Failed to start redis: can not bind to 0.0.0.0:6379, address in use',
          status: 'failure',
          file: '/etc/puppetlabs/code/environments/production/modules/redis/manifests/service.pp',
          line: 34
        }
      ] : type === 'changed' ? [
        {
          resource_type: 'File',
          title: '/etc/security/limits.conf',
          property: 'content',
          previous_value: '1024',
          desired_value: '65535',
          message: 'updated max open files ulimit for app user',
          status: 'success'
        },
        {
          resource_type: 'Service',
          title: 'auth-app',
          property: 'ensure',
          previous_value: 'running',
          desired_value: 'running',
          message: 'Triggered reload from File[/etc/security/limits.conf]',
          status: 'success'
        }
      ] : [],
      logs: [
        {
          level: 'info',
          source: 'Puppet',
          message: `Applying catalog for ${certname}`,
          time: new Date().toISOString()
        },
        {
          level: type === 'failed' ? 'err' : 'notice',
          source: 'Puppet',
          message: type === 'failed'
            ? 'Execution failed: Service[redis-server] could not be started'
            : type === 'changed'
            ? 'Catalog applied with 2 state changes'
            : 'Catalog applied: all 125 resources in sync',
          time: new Date().toISOString()
        }
      ]
    };

    try {
      await api.ingestReport(payload);
      setSimulationResult(`Отчет успешно принят для узла ${certname}! Проверьте раздел "Отчеты" и ленту событий.`);
      onReportSimulated();
    } catch (err: any) {
      setSimulationResult(`Ошибка симуляции: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Интеграция с Puppet Master и Симулятор Отчетов
              </h2>
              <p className="text-xs text-slate-400">
                Принимайте отчеты в реальном времени от Puppet Server или тестируйте сценарии
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Real-time Simulator Section */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm">
                Интерактивный симулятор отчетов Puppet в реальном времени
              </h3>
            </div>
            <p className="text-slate-300 mb-4">
              Нажмите одну из кнопок ниже, чтобы отправить сгенерированный Puppet-отчет в API.
              Благодаря Server-Sent Events (SSE) дэшборд мгновенно обновит графики, узлы и ленту событий.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => handleSimulateScenario('clean')}
                disabled={isSimulating}
                className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-semibold transition cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Отправить успешный отчет (In Sync)</span>
              </button>

              <button
                onClick={() => handleSimulateScenario('changed')}
                disabled={isSimulating}
                className="px-3.5 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-semibold transition cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Отправить отчет с изменениями (Changed)</span>
              </button>

              <button
                onClick={() => handleSimulateScenario('failed')}
                disabled={isSimulating}
                className="px-3.5 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold transition cursor-pointer flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Отправить сбойный отчет (Failed Service)</span>
              </button>
            </div>

            {simulationResult && (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300 font-mono text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{simulationResult}</span>
              </div>
            )}
          </div>

          {/* Integration Option 1: puppet.conf */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400" />
                <span>1. Настройка Puppet Master (puppet.conf)</span>
              </h4>
              <button
                onClick={() => handleCopy(puppetConfSnippet, 'conf')}
                className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-mono text-[11px]"
              >
                {copiedConf ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Скопировать</span>
              </button>
            </div>
            <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto">
              {puppetConfSnippet}
            </pre>
          </div>

          {/* Integration Option 2: Curl HTTP POST */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <span>2. Прямая отправка отчета через cURL (HTTP POST /api/reports)</span>
              </h4>
              <button
                onClick={() => handleCopy(curlSnippet, 'curl')}
                className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-mono text-[11px]"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Скопировать</span>
              </button>
            </div>
            <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto">
              {curlSnippet}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Puppet REST / Webhook Protocol Specification</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
