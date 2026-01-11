import Layout from "./Layout.jsx";

import Leaderboard from "./Leaderboard";

import DataImport from "./DataImport";

import SumoHistory from "./SumoHistory";

import Forum from "./Forum";

import ForumTopic from "./ForumTopic";

import SharedComparison from "./SharedComparison";

import SumoLegends from "./SumoLegends";

import Tournaments from "./Tournaments";

import TournamentHub from "./TournamentHub";

import Profile from "./Profile";

import PredictionGame from "./PredictionGame";

import PredictionLeague from "./PredictionLeague";

import MatchPredictor from "./MatchPredictor";

import SumoGame from "./SumoGame";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Leaderboard: Leaderboard,
    
    DataImport: DataImport,
    
    SumoHistory: SumoHistory,
    
    Forum: Forum,
    
    ForumTopic: ForumTopic,
    
    SharedComparison: SharedComparison,
    
    SumoLegends: SumoLegends,
    
    Tournaments: Tournaments,
    
    TournamentHub: TournamentHub,
    
    Profile: Profile,
    
    PredictionGame: PredictionGame,
    
    PredictionLeague: PredictionLeague,
    
    MatchPredictor: MatchPredictor,
    
    SumoGame: SumoGame,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Leaderboard />} />
                
                
                <Route path="/Leaderboard" element={<Leaderboard />} />
                
                <Route path="/DataImport" element={<DataImport />} />
                
                <Route path="/SumoHistory" element={<SumoHistory />} />
                
                <Route path="/Forum" element={<Forum />} />
                
                <Route path="/ForumTopic" element={<ForumTopic />} />
                
                <Route path="/SharedComparison" element={<SharedComparison />} />
                
                <Route path="/SumoLegends" element={<SumoLegends />} />
                
                <Route path="/Tournaments" element={<Tournaments />} />
                
                <Route path="/TournamentHub" element={<TournamentHub />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/PredictionGame" element={<PredictionGame />} />
                
                <Route path="/PredictionLeague" element={<PredictionLeague />} />
                
                <Route path="/MatchPredictor" element={<MatchPredictor />} />
                
                <Route path="/SumoGame" element={<SumoGame />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}