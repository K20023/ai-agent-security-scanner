// API client for the AI Agent Security Scanner backend

const API_BASE = 'http://127.0.0.1:8000';

export async function fetchScans() {
  const res = await fetch(`${API_BASE}/scans`);
  if (!res.ok) throw new Error('Failed to fetch scans');
  return res.json();
}

export async function fetchScanDetail(scanId) {
  const res = await fetch(`${API_BASE}/scans/${scanId}`);
  if (!res.ok) throw new Error(`Failed to fetch scan ${scanId}`);
  return res.json();
}

export async function createScan(framework = 'mock') {
  const res = await fetch(`${API_BASE}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ framework }),
  });
  if (!res.ok) throw new Error('Failed to create scan');
  return res.json();
}