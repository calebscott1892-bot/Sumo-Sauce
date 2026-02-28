import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const ENTITY_STORAGE_KEY = 'admin_import_entity';

function routeForEntity(entity) {
  return entity === 'Wrestler'
    ? '/api/admin/import/wrestlers'
    : '/api/admin/import/basho-records';
}

function parseJsonArray(rawText) {
  const parsed = JSON.parse(rawText);
  if (!Array.isArray(parsed)) {
    throw new Error('JSON must be an array.');
  }
  return parsed;
}

export default function AdminImport() {
  const [entity, setEntity] = useState('Wrestler');
  const [adminToken, setAdminToken] = useState('');
  const [jsonText, setJsonText] = useState('[\n  \n]');
  const [dryRun, setDryRun] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(ENTITY_STORAGE_KEY);
    if (saved === 'Wrestler' || saved === 'BashoRecord') {
      setEntity(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ENTITY_STORAGE_KEY, entity);
  }, [entity]);

  const endpoint = useMemo(() => routeForEntity(entity), [entity]);

  const handleSubmit = async () => {
    setError('');
    setReport(null);

    let payload;
    try {
      payload = parseJsonArray(jsonText);
    } catch (e) {
      setError(`JSON parse error: ${String(e?.message || e)}`);
      return;
    }

    if (!adminToken.trim()) {
      setError('Admin token is required.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${endpoint}?dry_run=${dryRun ? '1' : '0'}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken.trim(),
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body?.error || `Request failed with status ${response.status}`);
        return;
      }

      setReport(body);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-black mb-3">Admin Import (Phase 2)</h1>

        <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <div className="text-sm font-bold text-zinc-300">Entity</div>
              <select
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2"
              >
                <option value="Wrestler">Wrestler</option>
                <option value="BashoRecord">BashoRecord</option>
              </select>
            </label>

            <label className="space-y-2">
              <div className="text-sm font-bold text-zinc-300">Admin Token</div>
              <input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="X-ADMIN-TOKEN"
                className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
            Dry run (validate only, no writes)
          </label>

          <label className="space-y-2 block">
            <div className="text-sm font-bold text-zinc-300">JSON Array Payload</div>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="h-64 w-full rounded-md border border-zinc-700 bg-black px-3 py-2 font-mono text-sm"
              spellCheck={false}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-red-600 px-4 py-2 font-bold hover:bg-red-700 disabled:opacity-60"
            >
              {submitting ? 'Running...' : (dryRun ? 'Validate' : 'Import')}
            </button>
            <div className="text-xs text-zinc-400">Endpoint: {endpoint}</div>
          </div>

          {error && (
            <div className="rounded-md border border-red-700 bg-red-900/30 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          {report && (
            <div className="rounded-md border border-zinc-700 bg-black px-3 py-2">
              <div className="mb-2 text-sm font-bold text-zinc-300">Import Report</div>
              <pre className="overflow-x-auto text-xs text-zinc-200">
                {JSON.stringify(report, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <Link
          to="/leaderboard"
          className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 font-bold hover:bg-red-700"
        >
          Back to Leaderboard
        </Link>
      </div>
    </div>
  );
}
