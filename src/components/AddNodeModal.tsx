import React, { useState } from 'react';
import { X, Server, Plus } from 'lucide-react';
import { PuppetNode, NodeGroup } from '../types';

interface AddNodeModalProps {
  groups: NodeGroup[];
  onClose: () => void;
  onAddNode: (data: Partial<PuppetNode>) => void;
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({
  groups,
  onClose,
  onAddNode
}) => {
  const [certname, setCertname] = useState('');
  const [ip, setIp] = useState('10.20.1.');
  const [environment, setEnvironment] = useState('production');
  const [os, setOs] = useState('Ubuntu 24.04.1 LTS');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [classesText, setClassesText] = useState('profile::base\npuppetlabs::ntp');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certname.trim()) return;

    const classes = classesText
      .split('\n')
      .map(c => c.trim())
      .filter(Boolean);

    onAddNode({
      certname: certname.trim(),
      ip: ip.trim(),
      environment,
      os,
      groups: selectedGroup ? [selectedGroup] : [],
      classes
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Регистрация нового узла Puppet</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1 font-medium">FQDN / Имя сертификата (Certname) *</label>
            <input
              type="text"
              required
              placeholder="например: app-server-01.prod.acme.net"
              value={certname}
              onChange={(e) => setCertname(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">IP адрес</label>
              <input
                type="text"
                placeholder="10.20.1.55"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Операционная система</label>
              <select
                value={os}
                onChange={(e) => setOs(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Ubuntu 24.04.1 LTS">Ubuntu 24.04 LTS</option>
                <option value="RedHat Enterprise Linux 9.3">RedHat EL 9.3</option>
                <option value="Debian 12.5 (bookworm)">Debian 12</option>
                <option value="Rocky Linux 9.4">Rocky Linux 9</option>
                <option value="CentOS Stream 9">CentOS Stream 9</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Группа узлов</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="">Без группы</option>
                {groups.map((g) => (
                  <option key={g.name} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-medium">
              Назначенные классы (по одному на строку)
            </label>
            <textarea
              rows={3}
              value={classesText}
              onChange={(e) => setClassesText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Зарегистрировать узел</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
