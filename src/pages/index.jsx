import { useMemo, useState } from 'react';
import Layout from './Layout.jsx';
import Leaderboard from './Leaderboard.jsx';
import RikishiPage from './RikishiPage';
import ComparePage from './ComparePage';
import BashoDivisionPage from './BashoDivisionPage';
import NotFoundPage from './NotFoundPage';
import AdminImport from './AdminImport.jsx';
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';

const DIVISIONS = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];
const BASHO_RE = /^\d{6}$/;

function HomePage() {
  const navigate = useNavigate();

  const [rikishiId, setRikishiId] = useState('');
  const [rikishiError, setRikishiError] = useState('');

  const [bashoId, setBashoId] = useState('');
  const [division, setDivision] = useState('makuuchi');
  const [bashoError, setBashoError] = useState('');

  const [rikishiA, setRikishiA] = useState('');
  const [rikishiB, setRikishiB] = useState('');
  const [compareError, setCompareError] = useState('');

  const cards = useMemo(
    () => 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3',
    [],
  );

  const goRikishi = () => {
    const id = String(rikishiId || '').trim();
    if (!id) {
      setRikishiError('Please enter a rikishi id.');
      return;
    }
    setRikishiError('');
    navigate(`/rikishi/${encodeURIComponent(id)}`);
  };

  const goBasho = () => {
    const id = String(bashoId || '').trim();
    if (!BASHO_RE.test(id)) {
      setBashoError('Basho must be a 6-digit YYYYMM value.');
      return;
    }
    setBashoError('');
    navigate(`/basho/${encodeURIComponent(id)}/${encodeURIComponent(division)}`);
  };

  const goCompare = () => {
    const a = String(rikishiA || '').trim();
    const b = String(rikishiB || '').trim();
    if (!a || !b) {
      setCompareError('Enter both rikishi ids.');
      return;
    }
    if (a === b) {
      setCompareError('Rikishi ids must be different.');
      return;
    }
    setCompareError('');
    navigate(`/compare/${encodeURIComponent(a)}/${encodeURIComponent(b)}`);
  };

  return (
    <div className="mx-auto max-w-6xl p-4 text-zinc-200 sm:p-6">
      <section className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-white">SumoWatch</h1>
        <p className="mt-2 text-sm text-zinc-400">Choose where to go next.</p>
      </section>

      <section className={cards}>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-lg font-semibold text-white">Rikishi</h2>
          <p className="mt-1 text-sm text-zinc-400">Open a rikishi profile by id.</p>

          <label htmlFor="home-rikishi-input" className="mt-4 block text-xs text-zinc-400">
            Rikishi id
          </label>
          <input
            id="home-rikishi-input"
            data-testid="home-rikishi-input"
            type="text"
            value={rikishiId}
            onChange={(e) => {
              setRikishiId(e.target.value);
              setRikishiError('');
            }}
            placeholder="rks_0001"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
          />
          {rikishiError && (
            <p className="mt-2 text-xs text-red-400" role="alert">{rikishiError}</p>
          )}

          <button
            data-testid="home-rikishi-go"
            type="button"
            onClick={goRikishi}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Go
          </button>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-lg font-semibold text-white">Basho standings</h2>
          <p className="mt-1 text-sm text-zinc-400">Open division standings for a basho.</p>

          <label htmlFor="home-basho-input" className="mt-4 block text-xs text-zinc-400">
            Basho (YYYYMM)
          </label>
          <input
            id="home-basho-input"
            data-testid="home-basho-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={bashoId}
            onChange={(e) => {
              setBashoId(e.target.value);
              setBashoError('');
            }}
            placeholder="202401"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
          />

          <label htmlFor="home-basho-division" className="mt-3 block text-xs text-zinc-400">
            Division
          </label>
          <select
            id="home-basho-division"
            data-testid="home-basho-division"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
          >
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {bashoError && (
            <p className="mt-2 text-xs text-red-400" role="alert">{bashoError}</p>
          )}

          <button
            data-testid="home-basho-go"
            type="button"
            onClick={goBasho}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Go
          </button>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 md:col-span-2 xl:col-span-1">
          <h2 className="text-lg font-semibold text-white">Compare</h2>
          <p className="mt-1 text-sm text-zinc-400">Compare two rikishi head-to-head.</p>

          <label htmlFor="home-compare-a" className="mt-4 block text-xs text-zinc-400">
            Rikishi A
          </label>
          <input
            id="home-compare-a"
            data-testid="home-compare-a"
            type="text"
            value={rikishiA}
            onChange={(e) => {
              setRikishiA(e.target.value);
              setCompareError('');
            }}
            placeholder="rks_0001"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
          />

          <label htmlFor="home-compare-b" className="mt-3 block text-xs text-zinc-400">
            Rikishi B
          </label>
          <input
            id="home-compare-b"
            data-testid="home-compare-b"
            type="text"
            value={rikishiB}
            onChange={(e) => {
              setRikishiB(e.target.value);
              setCompareError('');
            }}
            placeholder="rks_0002"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
          />

          {compareError && (
            <p className="mt-2 text-xs text-red-400" role="alert">{compareError}</p>
          )}

          <button
            data-testid="home-compare-go"
            type="button"
            onClick={goCompare}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Go
          </button>
        </article>
      </section>
    </div>
  );
}

function WrestlerRedirect() {
  const { rid } = useParams();
  const target = `/rikishi/${encodeURIComponent(String(rid || '').trim())}`;
  return <Navigate to={target} replace />;
}

export default function Pages() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/rikishi/:id" element={<RikishiPage />} />
          <Route path="/compare/:a/:b" element={<ComparePage />} />
          <Route path="/basho/:bashoId/:division" element={<BashoDivisionPage />} />
          <Route path="/wrestler/:rid" element={<WrestlerRedirect />} />
          <Route path="/admin/import" element={<AdminImport />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}