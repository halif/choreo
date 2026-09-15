import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Server,
  Layers,
  Code2,
  CheckCircle2,
  Tag,
  ArrowRight
} from 'lucide-react';
import { NodeGroup } from '../types';

interface GroupsViewProps {
  groups: NodeGroup[];
  onSelectGroupFilter: (groupName: string) => void;
  onCreateGroup: (group: Partial<NodeGroup>) => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  groups,
  onSelectGroupFilter,
  onCreateGroup
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [classesText, setClassesText] = useState('profile::base\npuppetlabs::ntp');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const classes = classesText
      .split('\n')
      .map(c => c.trim())
      .filter(Boolean);

    onCreateGroup({
      name: name.trim(),
      description: description.trim(),
      environment,
      classes,
      variables: {}
    });

    setName('');
    setDescription('');
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-amber-400" />
            <span>Группы узлов и классификация (Node Groups &amp; Classes)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Группируйте серверы по ролям и автоматически назначайте манифесты и переменные окружения
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Создать группу узлов</span>
        </button>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((grp) => (
          <div
            key={grp.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-100 text-base flex items-center gap-2">
                    <span>{grp.name}</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{grp.description}</p>
                </div>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                  grp.environment === 'production'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                }`}>
                  {grp.environment}
                </span>
              </div>

              {/* Node count pill */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                  <Server className="w-3.5 h-3.5 text-amber-400" />
                  Узлов в группе: <strong className="text-white">{grp.nodeCount ?? 0}</strong>
                </span>
              </div>

              {/* Assigned Classes */}
              <div className="mt-3">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
                  Назначенные классы ({grp.classes.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {grp.classes.map((cls) => (
                    <span
                      key={cls}
                      className="px-2 py-1 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300"
                    >
                      {cls}
                    </span>
                  ))}
                </div>
              </div>

              {/* Variables preview if any */}
              {grp.variables && Object.keys(grp.variables).length > 0 && (
                <div className="mt-3">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
                    Hiera / Классовые переменные:
                  </span>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800/80 font-mono text-[11px] text-amber-400/90 space-y-0.5">
                    {Object.entries(grp.variables).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-slate-400">{k}:</span> {String(v)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => onSelectGroupFilter(grp.name)}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Показать узлы группы</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-amber-400" />
              <span>Создать группу узлов</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Название группы</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Edge Caching Nodes"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Описание</label>
                <input
                  type="text"
                  placeholder="Назначение группы и правила"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Окружение</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Классы Puppet (по одному на строку)
                </label>
                <textarea
                  rows={4}
                  value={classesText}
                  onChange={(e) => setClassesText(e.target.value)}
                  placeholder="profile::nginx&#10;puppetlabs::ntp"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer"
                >
                  Сохранить группу
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
