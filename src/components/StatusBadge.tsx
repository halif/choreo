import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { PuppetNodeStatus } from '../types';

interface StatusBadgeProps {
  status: PuppetNodeStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showLabel = true }) => {
  const getStatusConfig = (s: string) => {
    switch (s) {
      case 'unchanged':
        return {
          label: 'Без изменений (В норме)',
          shortLabel: 'В норме',
          icon: CheckCircle2,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dotColor: 'bg-emerald-400'
        };
      case 'changed':
        return {
          label: 'Изменен (Применено)',
          shortLabel: 'Изменен',
          icon: RefreshCw,
          bgColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
          dotColor: 'bg-sky-400'
        };
      case 'failed':
        return {
          label: 'Сбой (Ошибка каталога)',
          shortLabel: 'Сбой',
          icon: XCircle,
          bgColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dotColor: 'bg-rose-400'
        };
      case 'unresponsive':
        return {
          label: 'Не отвечает (Offline)',
          shortLabel: 'Не отвечает',
          icon: Clock,
          bgColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dotColor: 'bg-amber-400'
        };
      case 'pending':
        return {
          label: 'Ожидает (Pending)',
          shortLabel: 'Ожидает',
          icon: AlertTriangle,
          bgColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          dotColor: 'bg-purple-400'
        };
      default:
        return {
          label: s,
          shortLabel: s,
          icon: Clock,
          bgColor: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
          dotColor: 'bg-slate-400'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2'
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md border tracking-wide whitespace-nowrap ${config.bgColor} ${sizeClasses}`}
      title={config.label}
    >
      <Icon className={`${iconSizes} shrink-0`} />
      {showLabel && <span>{config.shortLabel}</span>}
    </span>
  );
};
