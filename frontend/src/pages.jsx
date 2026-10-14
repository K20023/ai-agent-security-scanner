// pages.jsx
// Additional page views rendered by the sidebar navigation.

import { AlertTriangle, Server, Settings as SettingsIcon, Shield } from 'lucide-react';

// ─── Scans Page ─────────────────────────────────────────────
export function ScansPage({ scans }) {
  if (!scans || scans.length === 0) {
    return <EmptyState title="No scans yet" message="Click 'New Scan' to run your first scan." />;
  }

  return (
    <div className="bg-navy-800 border border-navy-600 rounded-lg p-4">
      <div className="text-sm font-semibold text-white mb-3">All Scans</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 text-left border-b border-navy-700">
              <th className="py-2 px-3 font-normal">ID</th>
              <th className="py-2 px-3 font-normal">Framework</th>
              <th className="py-2 px-3 font-normal">Attacks</th>
              <th className="py-2 px-3 font-normal">Success</th>
              <th className="py-2 px-3 font-normal">Blocked</th>
              <th className="py-2 px-3 font-normal">Rate</th>
              <th className="py-2 px-3 font-normal">Started</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((s) => (
              <tr key={s.scan_id} className="border-b border-navy-700 hover:bg-navy-700/40">
                <td className="py-2 px-3 text-gray-300 font-mono">#{s.scan_id}</td>
                <td className="py-2 px-3 text-white">{s.framework}</td>
                <td className="py-2 px-3 text-gray-300">{s.total_attacks}</td>
                <td className="py-2 px-3 text-red-400">{s.successful}</td>
                <td className="py-2 px-3 text-green-400">{s.blocked}</td>
                <td className="py-2 px-3">
                  <span
                    className="px-2 py-0.5 rounded font-mono"
                    style={{
                      background: s.success_rate > 80 ? '#7f1d1d' : s.success_rate > 50 ? '#7c2d12' : '#14532d',
                      color: s.success_rate > 80 ? '#fca5a5' : s.success_rate > 50 ? '#fdba74' : '#86efac',
                    }}
                  >
                    {s.success_rate.toFixed(1)}%
                  </span>
                </td>
                <td className="py-2 px-3 text-gray-500 text-xs">
                  {new Date(s.started_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Agents Page ────────────────────────────────────────────
export function AgentsPage({ aggregate }) {
  const frameworks = aggregate?.frameworks || [];

  if (frameworks.length === 0) {
    return <EmptyState title="No agents tested yet" message="Run a scan to see framework metrics." />;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {frameworks.map((fw) => (
        <div key={fw.framework} className="bg-navy-800 border border-navy-600 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-navy-700 rounded">
              <Server size={20} className="text-accent-cyan" />
            </div>
            <div>
              <div className="text-white font-semibold">{fw.framework}</div>
              <div className="text-xs text-gray-500">{fw.scans} scan{fw.scans !== 1 ? 's' : ''}</div>
            </div>
          </div>

          <div className="space-y-2">
            <StatRow label="Total attacks" value={fw.total_attacks} />
            <StatRow label="Successful" value={fw.successful} color="#ef4444" />
            <StatRow label="Blocked" value={fw.blocked} color="#22c55e" />
            <StatRow
              label="Success rate"
              value={`${fw.success_rate.toFixed(1)}%`}
              color={
                fw.success_rate > 80 ? '#ef4444'
                : fw.success_rate > 50 ? '#f97316'
                : '#22c55e'
              }
            />
          </div>

          {Object.keys(fw.by_category || {}).length > 0 && (
            <div className="mt-4 pt-3 border-t border-navy-700">
              <div className="text-xs text-gray-500 mb-2">By category</div>
              {Object.entries(fw.by_category).map(([cat, data]) => (
                <div key={cat} className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-400 capitalize">{cat.replace(/_/g, ' ')}</span>
                  <span className="text-white font-mono">{data.success_rate.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Findings Page ──────────────────────────────────────────
export function FindingsPage({ latestDetail }) {
  const findings = latestDetail?.findings || [];

  if (findings.length === 0) {
    return <EmptyState title="No findings yet" message="Run a scan to populate this page." />;
  }

  const sorted = [...findings].sort((a, b) => b.severity - a.severity);

  return (
    <div className="bg-navy-800 border border-navy-600 rounded-lg p-4">
      <div className="text-sm font-semibold text-white mb-3">
        All Findings — Latest Scan #{latestDetail.scan.id} ({latestDetail.scan.framework})
      </div>
      <div className="space-y-2">
        {sorted.map((f) => (
          <div key={f.id} className="flex items-start gap-3 p-3 bg-navy-700 rounded">
            <AlertTriangle
              size={16}
              className="mt-0.5"
              style={{
                color: f.severity > 8 ? '#ef4444' : f.severity > 6 ? '#f97316' : '#eab308',
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-white capitalize">
                  {f.attack_type.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-500">
                  {f.success ? 'succeeded' : 'blocked'}
                </span>
              </div>
              <div className="text-xs text-gray-500 font-mono truncate">
                {f.attack_payload.slice(0, 100)}...
              </div>
              {f.evidence && (
                <div className="text-xs text-gray-600 truncate mt-1">
                  → {f.evidence.slice(0, 100)}
                </div>
              )}
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded font-mono flex-shrink-0"
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
    </div>
  );
}

// ─── Settings Page ──────────────────────────────────────────
export function SettingsPage({ aggregate }) {
  return (
    <div className="bg-navy-800 border border-navy-600 rounded-lg p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-navy-700 rounded">
          <SettingsIcon size={24} className="text-accent-cyan" />
        </div>
        <div>
          <div className="text-lg font-semibold text-white">Project Settings</div>
          <div className="text-xs text-gray-500">Configuration and metadata</div>
        </div>
      </div>

      <div className="space-y-4 text-sm">
        <SettingRow label="Project" value="AI Agent Security Scanner" />
        <SettingRow label="Version" value="0.1.0" />
        <SettingRow label="API Endpoint" value="http://127.0.0.1:8000" mono />
        <SettingRow label="Frameworks Registered" value={aggregate?.totals?.frameworks ?? 0} />
        <SettingRow label="Total Scans Run" value={aggregate?.totals?.scans ?? 0} />
        <SettingRow label="Total Attacks Executed" value={aggregate?.totals?.total_attacks ?? 0} />
      </div>

      <div className="mt-6 pt-4 border-t border-navy-700">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-accent-cyan" />
          <span className="text-xs text-gray-400">
            All scans run locally. No data leaves this machine.
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────
function StatRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="font-mono" style={{ color: color || '#e5e7eb' }}>{value}</span>
    </div>
  );
}

function SettingRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-navy-700">
      <span className="text-gray-400">{label}</span>
      <span className={mono ? 'text-gray-200 font-mono text-xs' : 'text-white'}>{value}</span>
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="bg-navy-800 border border-navy-600 rounded-lg p-12 text-center">
      <div className="text-white font-semibold mb-2">{title}</div>
      <div className="text-sm text-gray-500">{message}</div>
    </div>
  );
}