'use client';

import { BarChart3, FileText, CreditCard } from 'lucide-react';
import type { AgentSubscription } from '@/types';

interface AgentDashboardProps {
  subscription: AgentSubscription;
  reportsCount: number;
  reportsThisMonth: number;
}

const STAT_CARDS = [
  {
    key: 'month',
    label: 'Reports This Month',
    icon: BarChart3,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    key: 'total',
    label: 'Total Reports',
    icon: FileText,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    key: 'status',
    label: 'Subscription Status',
    icon: CreditCard,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
] as const;

export default function AgentDashboard({
  subscription,
  reportsCount,
  reportsThisMonth,
}: AgentDashboardProps) {
  const values: Record<string, string | number> = {
    month: reportsThisMonth,
    total: reportsCount,
    status: subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1),
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
        <div
          key={key}
          className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4"
        >
          <div className={`${bg} p-3 rounded-lg`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900">{values[key]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
