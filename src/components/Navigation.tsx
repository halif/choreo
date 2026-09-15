import React from 'react';
import { LayoutDashboard, Server, FileText, FolderKanban } from 'lucide-react';

export type TabType = 'overview' | 'nodes' | 'reports' | 'groups';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  nodeCount: number;
  failedCount: number;
  reportCount: number;
  groupCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  nodeCount,
  failedCount,
  reportCount,
  groupCount
}) => {
  const tabs = [
    {
      id: 'overview' as TabType,
      label: 'Сводка',
      icon: LayoutDashboard,
      badge: failedCount > 0 ? `${failedCount} сбоев` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    },
    {
      id: 'nodes' as TabType,
      label: 'Узлы (Nodes)',
      icon: Server,
      badge: String(nodeCount),
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    },
    {
      id: 'reports' as TabType,
      label: 'Отчеты Puppet',
      icon: FileText,
      badge: String(reportCount),
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    },
    {
      id: 'groups' as TabType,
      label: 'Группы & Классы',
      icon: FolderKanban,
      badge: String(groupCount),
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    }
  ];

  return (
    <nav className="border-b border-slate-800 bg-slate-900/60 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${tab.badgeColor}`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
