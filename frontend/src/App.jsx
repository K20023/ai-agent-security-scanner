import { useEffect, useState } from 'react';
import {
  Shield, LayoutDashboard, Radar, FileSearch, Settings,
  Bell, Search, AlertTriangle, TrendingUp, TrendingDown,
  Activity, Target
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { fetchScans, fetchScanDetail, createScan } from './api';

// ─── KPI Card ───────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, change, trend }) {
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-green-400' : 'text-red-400';

  return (
    <div className="bg-navy-800 border border-navy-600 rounded-lg p-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-navy-700 rounded">
          <Icon size={20} className="text-accent-cyan" />
        </div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="mt-3 text-3xl font-bold text-white">{value}</div>
      <div className={`mt-2 text-xs flex items-center gap-1 ${trendColor}`}>
        <TrendIcon size={12} />
        <span>{change} vs. last 7 days</span>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────
export default function App() {
  const [scans, setScans] = useState([]);
  const [latestDetail, setLatestDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function loadData() {
    try {
      const scansData = await fetchScans();
      setScans(scansData);

      if (scansData.length > 0) {
        const detail = await fetchScanDetail(scansData[0].scan_id);
        setLatestDetail(detail);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleNewScan() {
    setRunning(true);
    try {
      await createScan('mock');
      await loadData();
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ── Derived metrics ──────────────────────────────────────
  const totalFindings = scans.reduce((acc, s) => acc + s.total_attacks, 0);
  const avgSuccessRate = scans.length > 0
    ? (scans.reduce((acc, s) => acc + s.success_rate, 0) / scans.length).toFixed(1)
    : '0.0';

  const trendData = [...scans]
    .slice(0, 7)
    .reverse()
    .map((s) => ({
      name: `#${s.scan_id}`,
      total: s.total_attacks,
      successful: s.successful,
      blocked: s.blocked,
    }));

  const findingsByType = latestDetail
    ? latestDetail.findings.reduce((acc, f) => {
        const key = f.attack_type;
        if (!acc[key]) acc[key] = { type: key, count: 0, successCount: 0, totalSev: 0 };
        acc[key].count += 1;
        if (f.success) acc[key].successCount += 1;
        acc[key].totalSev += f.severity;
        return acc;
      }, {})
    : {};

  const heatmapData = Object.values(findingsByType).map(d => ({
    type: d.type.replace(/_/g, ' '),
    successRate: d.count > 0 ? (d.successCount / d.count) * 100 : 0,
  }));

  const severityByType = Object.values(findingsByType).map(d => ({
    type: d.type.replace(/_/g, ' '),
    avgSeverity: d.count > 0 ? d.totalSev / d.count : 0,
  }));

  const recentFindings = latestDetail
    ? [...latestDetail.findings]
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 5)
    : [];

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* ─── Sidebar ──────────────────────────────────── */}
      <aside className="w-60 bg-navy-800 border-r border-navy-700 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <Shield size={28} className="text-accent-cyan" />
          <div>
            <div className="text-white font-bold leading-tight">AI Agent</div>
            <div className="text-xs text-gray-400">Security Scanner</div>
          </div>
        </div>

        <nav className="space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active />
          <NavItem icon={Radar} label="Scans" />
          <NavItem icon={Target} label="Agents" />
          <NavItem icon={FileSearch} label="Findings" />
          <NavItem icon={Settings} label="Settings" />
        </nav>

        <div className="mt-auto p-3 bg-navy-700 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-accent-cyan" />
            <div className="text-xs font-semibold text-white">Proactive Security</div>
          </div>
          <div className="text-xs text-gray-400">Detect. Analyze. Protect.</div>
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────── */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Agent Security Scanner</h1>
            <p className="text-sm text-gray-400">
              Monitor, detect and analyze security risks in AI agent frameworks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search frameworks, agents, findings..."
                className="bg-navy-800 border border-navy-600 rounded pl-9 pr-4 py-2 text-sm w-72 focus:outline-none focus:border-accent-cyan"
              />
            </div>
            <button className="text-gray-400 hover:text-white"><Bell size={20} /></button>
            <button
              onClick={handleNewScan}
              disabled={running}
              className="px-4 py-2 bg-accent-cyan text-navy-900 font-semibold rounded hover:bg-cyan-400 disabled:opacity-50"
            >
              {running ? 'Running...' : 'New Scan'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <KpiCard icon={Activity} label="Attacks Run" value={totalFindings} change="+18%" trend="up" />
              <KpiCard icon={Target} label="Success Rate" value={`${avgSuccessRate}%`} change="+6.2%" trend="up" />
              <KpiCard icon={AlertTriangle} label="Critical Findings" value={scans.reduce((a, s) => a + s.successful, 0)} change="+23%" trend="up" />
              <KpiCard icon={Shield} label="Avg Severity" value="7.8" change="-0.6" trend="down" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Panel title="Attack Success Rates">
                {heatmapData.length > 0 ? (
                  <div className="space-y-2">
                    {heatmapData.map(row => (
                      <div key={row.type} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-32 capitalize">{row.type}</span>
                        <div className="flex-1 bg-navy-700 rounded h-6 relative overflow-hidden">
                          <div
                            className="h-full rounded transition-all"
                            style={{
                              width: `${row.successRate}%`,
                              background: row.successRate > 80 ? '#ef4444'
                                : row.successRate > 50 ? '#f97316'
                                : row.successRate > 20 ? '#eab308'
                                : '#22c55e'
                            }}
                          />
                        </div>
                        <span className="text-xs text-white w-12 text-right">
                          {row.successRate.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No data yet — run a scan</div>
                )}
              </Panel>

              <Panel title="Attack Trends Over Time">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#232d45" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                      <YAxis stroke="#6b7280" fontSize={11} />
                      <Tooltip
                        contentStyle={{ background: '#1a2234', border: '1px solid #232d45', borderRadius: 6 }}
                        labelStyle={{ color: '#e5e7eb' }}
                      />
                      <Line type="monotone" dataKey="total" stroke="#22d3ee" strokeWidth={2} />
                      <Line type="monotone" dataKey="successful" stroke="#ef4444" strokeWidth={2} />
                      <Line type="monotone" dataKey="blocked" stroke="#22c55e" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-500 text-sm">No trend data yet</div>
                )}
              </Panel>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Panel title="Average Severity by Attack Type">
                {severityByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={severityByType} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#232d45" />
                      <XAxis type="number" domain={[0, 10]} stroke="#6b7280" fontSize={11} />
                      <YAxis dataKey="type" type="category" stroke="#6b7280" fontSize={11} width={120} />
                      <Tooltip
                        contentStyle={{ background: '#1a2234', border: '1px solid #232d45', borderRadius: 6 }}
                        labelStyle={{ color: '#e5e7eb' }}
                      />
                      <Bar dataKey="avgSeverity" radius={[0, 4, 4, 0]}>
                        {severityByType.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.avgSeverity > 8 ? '#ef4444'
                              : entry.avgSeverity > 6 ? '#f97316'
                              : entry.avgSeverity > 4 ? '#eab308'
                              : '#22c55e'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-500 text-sm">No severity data</div>
                )}
              </Panel>

              <Panel title="Recent Findings">
                {recentFindings.length > 0 ? (
                  <div className="space-y-2">
                    {recentFindings.map((f, i) => (
                      <div key={i} className="flex items-start gap-3 p-2 bg-navy-700 rounded">
                        <AlertTriangle size={16} className="text-accent-orange mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate capitalize">
                            {f.attack_type.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {f.attack_payload.slice(0, 60)}...
                          </div>
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            background: f.severity > 8 ? '#7f1d1d' : f.severity > 6 ? '#7c2d12' : '#713f12',
                            color: f.severity > 8 ? '#fca5a5' : f.severity > 6 ? '#fdba74' : '#fde047',
                          }}
                        >
                          {f.severity.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No findings yet</div>
                )}
              </Panel>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────
function NavItem({ icon: Icon, label, active }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer ${
        active
          ? 'bg-accent-cyan/10 text-accent-cyan border-l-2 border-accent-cyan'
          : 'text-gray-400 hover:text-white hover:bg-navy-700'
      }`}
    >
      <Icon size={18} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="bg-navy-800 border border-navy-600 rounded-lg p-4">
      <div className="text-sm font-semibold text-white mb-3">{title}</div>
      {children}
    </div>
  );
}