import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SumoHistoryContext from '../components/history/SumoHistoryContext';

export default function SumoHistory() {
  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-black to-red-950/20 pointer-events-none" />
      
      <div className="relative max-w-4xl mx-auto px-4 py-8">
        <Link to="/Leaderboard">
          <Button variant="ghost" className="mb-6 text-zinc-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-5xl font-black text-white mb-2">相撲の歴史</h1>
          <p className="text-xl text-zinc-400 font-medium">
            1,500 Years of Sacred Tradition
          </p>
        </div>

        <SumoHistoryContext />
      </div>
    </div>
  );
}