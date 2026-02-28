import Layout from './Layout.jsx';
import Leaderboard from './Leaderboard.jsx';
import RikishiPage from './RikishiPage';
import ComparePage from './ComparePage';
import BashoDivisionPage from './BashoDivisionPage';
import AdminImport from './AdminImport.jsx';
import { BrowserRouter as Router, Navigate, Route, Routes, useParams } from 'react-router-dom';

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
          <Route path="/" element={<Navigate to="/leaderboard" replace />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/rikishi/:id" element={<RikishiPage />} />
          <Route path="/compare/:a/:b" element={<ComparePage />} />
          <Route path="/basho/:bashoId/:division" element={<BashoDivisionPage />} />
          <Route path="/wrestler/:rid" element={<WrestlerRedirect />} />
          <Route path="/admin/import" element={<AdminImport />} />
          <Route path="*" element={<Navigate to="/leaderboard" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}