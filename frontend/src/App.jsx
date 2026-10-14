import { useEffect, useState } from 'react';
import {
  Shield, LayoutDashboard, Radar, FileSearch, Settings as SettingsIcon,
  Bell, Search, AlertTriangle, TrendingUp, TrendingDown,
  Activity, Target
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend
} from 'recharts';
import {
  fetchScans,
  fetchScanDetail,
  createScan,
  fetchAggregateSummary,
} from './api';
import {
  ScansPage,
  AgentsPage,
  FindingsPage,
  SettingsPage,
} from './pages';

// ─── Colors per framework ───────────────────────────────────
const FRAMEWORK_COLORS = {
  'mock': '#22d3ee',
  'langchain-ollama': '#ef4444',
};

function frameworkColor(name) {
  if (FRAMEWORK_COLORS[name]) return FRAMEWORK_COLORS[name];
  const palette = ['#a855f7', '#22c55e', '#eab308', '#f97316', '#ec4899'];
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

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
  const [activePage, setActivePage] = useState('dashboard');
  const [scans, setScans] = useState([]);
  const [latestDetail, setLatestDetail] = useState(null);
  const [aggregate, setAggregate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  async function loadData() {
    try {
      const [scansData, aggData] = await Promise.all([
        fetchScans(),
        fetchAggregateSummary(),
      ]);
      setScans(scansData);
      setAggregate(aggData);

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

  const criticalFindings = latestDetail
    ? latestDetail.findings.filter((f) => f.severity > 8)
    : [];

  const totalAttacks = aggregate?.totals?.total_attacks ?? 0;
  const totalSuccess = aggregate?.totals?.successful ?? 0;
  const overallRate = aggregate?.totals?.success_rate ?? 0;

  let sevSum = 0;
  let sevCount = 0;
  aggregate?.frameworks?.forEach((fw) => {
    Object.values(fw.by_category || {}).forEach((cat) => {
      if (cat.successful > 0) {
        sevSum += cat.avg_severity * cat.successful;
        sevCount += cat.successful;
      }
    });
  });
  const avgSeverity = sevCount > 0 ? (sevSum / sevCount).toFixed(1) : '0.0';

  const filteredScans = searchQuery
    ? scans.filter((s) =>
        s.framework.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : scans;

  const filteredFindings = latestDetail
    ? latestDetail.findings.filter((f) =>
        searchQuery
          ? f.attack_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.attack_payload.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )
    : [];

  const trendData = [...scans]
    .slice(0, 7)
    .reverse()
    .map((s) => ({
      name: `#${s.scan_id}`,
      [s.framework]: s.success_rate,
    }));

  const allCategories = new Set();
  aggregate?.frameworks?.forEach((fw) => {
    Object.keys(fw.by_category || {}).forEach((c) => allCategories.add(c));
  });
  const categories = Array.from(allCategories);

  const heatmapRows = categories.map((cat) => {
    const row = { category: cat.replace(/_/g, ' ') };
    aggregate?.frameworks?.forEach((fw) => {
      const data = fw.by_category?.[cat];
      row[fw.framework] = data ? data.success_rate : 0;
    });
    return row;
  });

  const frameworkComparison = (aggregate?.frameworks || []).map((fw) => ({
    name: fw.framework,
    success_rate: fw.success_rate,
    total_attacks: fw.total_attacks,
    scans: fw.scans,
  }));

  const recentFindings = latestDetail
    ? [...latestDetail.findings]
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 5)
    : [];

  const frameworkNames = (aggregate?.frameworks || []).map((f) => f.framework);

  const pageTitles = {
    dashboard: 'Dashboard',
    scans: 'Scans',
    agents: 'Agents',
    findings: 'Findings',
    settings: 'Settings',
  };

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-navy-800 border-r border-navy-700 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <Shield size={28} className="text-accent-cyan" />
          <div>
            <div className="text-white font-bold leading-tight">AI Agent</div>
            <div className="text-xs text-gray-400">Security Scanner</div>
          </div>
        </div>

        <nav className="space-y-1">
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={activePage === 'dashboard'}
            onClick={() => setActivePage('dashboard')}
          />
          <NavItem
            icon={Radar}
            label="Scans"
            active={activePage === 'scans'}
            onClick={() => setActivePage('scans')}
          />
          <NavItem
            icon={Target}
            label="Agents"
            active={activePage === 'agents'}
            onClick={() => setActivePage('agents')}
          />
          <NavItem
            icon={FileSearch}
            label="Findings"
            active={activePage === 'findings'}
            onClick={() => setActivePage('findings')}
          />
          <NavItem
            icon={SettingsIcon}
            label="Settings"
            active={activePage === 'settings'}
            onClick={() => setActivePage('settings')}
          />
        </nav>

        <div className="mt-auto p-3 bg-navy-700 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-accent-cyan" />
            <div className="text-xs font-semibold text-white">Proactive Security</div>
          </div>
          <div className="text-xs text-gray-400">Detect. Analyze. Protect.</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {pageTitles[activePage]}
            </h1>
            <p className="text-sm text-gray-400">
              {activePage === 'dashboard' && `Aggregate comparison across ${frameworkNames.length} framework${frameworkNames.length !== 1 ? 's' : ''}.`}
              {activePage === 'scans' && `${filteredScans.length} scan${filteredScans.length !== 1 ? 's' : ''} recorded.`}
              {activePage === 'agents' && `${frameworkNames.length} framework${frameworkNames.length !== 1 ? 's' : ''} under evaluation.`}
              {activePage === 'findings' && `${filteredFindings.length} finding${filteredFindings.length !== 1 ? 's' : ''} in latest scan.`}
              {activePage === 'settings' && 'Project configuration and metadata.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-navy-800 border border-navy-600 rounded pl-9 pr-4 py-2 text-sm w-64 focus:outline-none focus:border-accent-cyan"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowNotifications((s) => !s)}
                className="text-gray-400 hover:text-white relative"
              >
                <Bell size={20} />
                {criticalFindings.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {criticalFindings.length > 9 ? '9+' : criticalFindings.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-10 w-80 bg-navy-800 border border-navy-600 rounded-lg shadow-xl z-50">
                  <div className="p-3 border-b border-navy-700 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Notifications</span>
                    <span className="text-xs text-gray-500">
                      {criticalFindings.length} critical
                    </span>
                  </div>
                  <div className="max-h-80 overflow-auto">
                    {criticalFindings.length === 0 ? (
                      <div className="p-4 text-xs text-gray-500">No critical findings.</div>
                    ) : (
                      criticalFindings.map((f) => (
                        <div
                          key={f.id}
                          className="p-3 border-b border-navy-700 last:border-0 hover:bg-navy-700/40"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={12} className="text-red-400" />
                            <span className="text-xs text-white capitalize">
                              {f.attack_type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-red-400 ml-auto font-mono">
                              {f.severity.toFixed(1)}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">
                            {f.attack_payload.slice(0, 60)}...
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
            {activePage === 'dashboard' && (
              <DashboardView
                totalAttacks={totalAttacks}
                totalSuccess={totalSuccess}
                overallRate={overallRate}
                avgSeverity={avgSeverity}
                frameworkComparison={frameworkComparison}
                trendData={trendData}
                heatmapRows={heatmapRows}
                frameworkNames={frameworkNames}
                latestDetail={latestDetail}
                recentFindings={recentFindings}
              />
            )}
            {activePage === 'scans' && <ScansPage scans={filteredScans} />}
            {activePage === 'agents' && <AgentsPage aggregate={aggregate} />}
            {activePage === 'findings' && (
              <FindingsPage latestDetail={latestDetail} />
            )}
            {activePage === 'settings' && <SettingsPage aggregate={aggregate} />}
          </>
        )}
      </main>
    </div>
  );
}

// ─── Dashboard View ─────────────────────────────────────────
function DashboardView({
  totalAttacks,
  totalSuccess,
  overallRate,
  avgSeverity,
  frameworkComparison,
  trendData,
  heatmapRows,
  frameworkNames,
  latestDetail,
  recentFindings,
}) {
  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Activity} label="Attacks Run" value={totalAttacks} change="+18%" trend="up" />
        <KpiCard icon={Target} label="Success Rate" value={`${overallRate}%`} change="+6.2%" trend="up" />
        <KpiCard icon={AlertTriangle} label="Critical Findings" value={totalSuccess} change="+23%" trend="up" />
        <KpiCard icon={Shield} label="Avg Severity" value={avgSeverity} change="-0.6" trend="down" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel title="Framework Risk Comparison">
          {frameworkComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={frameworkComparison} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232d45" />
                <XAxis type="number" domain={[0, 100]} stroke="#6b7280" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={11} width={140} />
                <Tooltip
                  contentStyle={{ background: '#1a2234', border: '1px solid #232d45', borderRadius: 6 }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <Bar dataKey="success_rate" radius={[0, 4, 4, 0]}>
                  {frameworkComparison.map((entry, i) => (
                    <Cell key={i} fill={frameworkColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 text-sm">No frameworks tested yet</div>
          )}
        </Panel>

        <Panel title="Attack Trends Over Time">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232d45" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#1a2234', border: '1px solid #232d45', borderRadius: 6 }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {frameworkNames.map((fw) => (
                  <Line
                    key={fw}
                    type="monotone"
                    dataKey={fw}
                    stroke={frameworkColor(fw)}
                    strokeWidth={2}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 text-sm">No trend data yet</div>
          )}
        </Panel>
      </div>

      <div className="mb-6">
        <Panel title="Attack Success Rate by Category and Framework">
          {heatmapRows.length > 0 && frameworkNames.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-gray-400 font-normal py-2 px-3">
                      Attack Category
                    </th>
                    {frameworkNames.map((fw) => (
                      <th key={fw} className="text-center text-gray-400 font-normal py-2 px-3">
                        {fw}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapRows.map((row, i) => (
                    <tr key={i} className="border-t border-navy-700">
                      <td className="py-2 px-3 text-gray-300 capitalize">
                        {row.category}
                      </td>
                      {frameworkNames.map((fw) => {
                        const value = row[fw] ?? 0;
                        const bg = value > 80 ? '#7f1d1d'
                          : value > 60 ? '#9a3412'
                          : value > 40 ? '#713f12'
                          : value > 20 ? '#14532d'
                          : '#1e293b';
                        const fg = value > 80 ? '#fca5a5'
                          : value > 60 ? '#fdba74'
                          : value > 40 ? '#fde047'
                          : value > 20 ? '#86efac'
                          : '#94a3b8';
                        return (
                          <td key={fw} className="py-2 px-3 text-center">
                            <span
                              className="inline-block w-16 py-1 rounded font-mono font-semibold"
                              style={{ background: bg, color: fg }}
                            >
                              {value.toFixed(0)}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">No category data yet</div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Latest Scan — Severity by Attack Type">
          {latestDetail && latestDetail.findings.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={Object.entries(
                  latestDetail.findings.reduce((acc, f) => {
                    const key = f.attack_type;
                    if (!acc[key]) acc[key] = { type: key, sev: 0, n: 0 };
                    acc[key].sev += f.severity;
                    acc[key].n += 1;
                    return acc;
                  }, {})
                ).map(([, d]) => ({
                  type: d.type.replace(/_/g, ' '),
                  avgSeverity: d.n > 0 ? d.sev / d.n : 0,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#232d45" />
                <XAxis type="number" domain={[0, 10]} stroke="#6b7280" fontSize={11} />
                <YAxis dataKey="type" type="category" stroke="#6b7280" fontSize={11} width={120} />
                <Tooltip
                  contentStyle={{ background: '#1a2234', border: '1px solid #232d45', borderRadius: 6 }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <Bar dataKey="avgSeverity" radius={[0, 4, 4, 0]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 text-sm">No data</div>
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
  );
}

// ─── Helpers ────────────────────────────────────────────────
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors ${
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