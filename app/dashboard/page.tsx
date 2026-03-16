'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import AgentDashboard from '@/components/AgentDashboard';
import type { AgentSubscription, Report } from '@/types';
import { FilePlus, ExternalLink } from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  complete: 'bg-emerald-100 text-emerald-700',
  processing: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-slate-100 text-slate-600',
  failed: 'bg-red-100 text-red-700',
};

export default function DashboardHomePage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<AgentSubscription | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/agent');
        return;
      }

      const userId = session.user.id;

      // Fetch subscription
      const { data: sub } = await supabase
        .from('agent_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single<AgentSubscription>();

      if (!sub) {
        router.replace('/agent');
        return;
      }

      setSubscription(sub);

      // Fetch recent reports (last 10)
      const { data: recentReports } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      setReports((recentReports as Report[]) ?? []);

      // Total count
      const { count: total } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      setTotalCount(total ?? 0);

      // Reports this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthly } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());

      setMonthCount(monthly ?? 0);
      setLoading(false);
    };

    load();
  }, [router]);

  if (loading || !subscription) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {subscription.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here is an overview of your report activity.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          <FilePlus className="w-4 h-4" />
          Run New Report
        </Link>
      </div>

      {/* Stats */}
      <AgentDashboard
        subscription={subscription}
        reportsCount={totalCount}
        reportsThisMonth={monthCount}
      />

      {/* Recent reports table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Recent Reports</h2>
        </div>

        {reports.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-slate-500">No reports yet. Run your first report to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Property Address</th>
                  <th className="px-5 py-3 font-medium">City</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {report.property_address}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{report.property_city}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {new Date(report.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_BADGE[report.status] ?? STATUS_BADGE.pending
                        }`}
                      >
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/dashboard/report/${report.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
