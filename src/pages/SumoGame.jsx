import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SumoGame() {
  const [gameState, setGameState] = useState('ready'); // ready, playing, gameOver
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('sumo_high_score') || '0'));
  const [player1Pos, setPlayer1Pos] = useState(200);
  const [player2Pos, setPlayer2Pos] = useState(400);
  const [player1Pushing, setPlayer1Pushing] = useState(false);
  const [player2Pushing, setPlayer2Pushing] = useState(false);
  const gameLoopRef = useRef(null);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !player1Pushing) {
        e.preventDefault();
        setPlayer1Pushing(true);
        setTimeout(() => setPlayer1Pushing(false), 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, player1Pushing]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    gameLoopRef.current = setInterval(() => {
      // AI opponent pushes randomly
      if (Math.random() < 0.02) {
        setPlayer2Pushing(true);
        setTimeout(() => setPlayer2Pushing(false), 200);
      }

      setPlayer1Pos(prev => {
        let newPos = prev;
        if (player1Pushing) {
          newPos += 8;
        }
        if (player2Pushing && Math.abs(prev - player2Pos) < 50) {
          newPos -= 6;
        }
        
        // Slowly drift towards center
        if (!player1Pushing && !player2Pushing) {
          if (prev < 250) newPos += 0.5;
          if (prev > 250) newPos -= 0.5;
        }

        // Check if pushed out of ring
        if (newPos <= 50 || newPos >= 550) {
          endGame();
          return prev;
        }

        return Math.max(50, Math.min(550, newPos));
      });

      setPlayer2Pos(prev => {
        let newPos = prev;
        if (player2Pushing) {
          newPos -= 8;
        }
        if (player1Pushing && Math.abs(prev - player1Pos) < 50) {
          newPos += 6;
        }

        // Slowly drift towards center
        if (!player1Pushing && !player2Pushing) {
          if (prev < 350) newPos += 0.5;
          if (prev > 350) newPos -= 0.5;
        }

        // Check if pushed out of ring
        if (newPos <= 50 || newPos >= 550) {
          endGame();
          return prev;
        }

        return Math.max(50, Math.min(550, newPos));
      });

      setScore(s => s + 1);
    }, 50);

    return () => clearInterval(gameLoopRef.current);
  }, [gameState, player1Pushing, player2Pushing, player1Pos, player2Pos]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setPlayer1Pos(200);
    setPlayer2Pos(400);
    setPlayer1Pushing(false);
    setPlayer2Pushing(false);
  };

  const endGame = () => {
    setGameState('gameOver');
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('sumo_high_score', score.toString());
    }
    clearInterval(gameLoopRef.current);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <Link to="/Leaderboard" className="absolute top-4 left-4">
        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-white mb-2">🤼 SUMO CLASH 🤼</h1>
        <p className="text-zinc-400">Press SPACE to push your opponent out of the ring!</p>
      </div>

      {/* Game Canvas */}
      <div className="relative bg-gradient-to-b from-amber-100 to-amber-200 rounded-lg overflow-hidden border-4 border-amber-800" 
           style={{ width: '600px', height: '300px' }}>
        
        {/* Ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[500px] h-[200px] rounded-full border-4 border-amber-900 bg-amber-50/30" />
        </div>

        {/* Center Line */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-32 bg-amber-900" />

        {/* Player 1 (Blue) */}
        <div 
          className={`absolute bottom-20 transition-transform ${player1Pushing ? 'scale-110' : 'scale-100'}`}
          style={{ left: `${player1Pos}px`, transform: 'translateX(-50%)' }}
        >
          <div className="text-6xl">🟦</div>
          <div className="text-xs text-center font-bold text-blue-600">YOU</div>
        </div>

        {/* Player 2 (Red) */}
        <div 
          className={`absolute bottom-20 transition-transform ${player2Pushing ? 'scale-110' : 'scale-100'}`}
          style={{ left: `${player2Pos}px`, transform: 'translateX(-50%)' }}
        >
          <div className="text-6xl">🟥</div>
          <div className="text-xs text-center font-bold text-red-600">CPU</div>
        </div>

        {/* Game Over Overlay */}
        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-4xl font-black text-white mb-2">GAME OVER</h2>
              <p className="text-2xl text-amber-400 mb-4">Score: {score}</p>
              <p className="text-zinc-400 mb-6">High Score: {highScore}</p>
              <Button onClick={startGame} className="bg-amber-600 hover:bg-amber-700">
                <RotateCcw className="w-4 h-4 mr-2" />
                Play Again
              </Button>
            </div>
          </div>
        )}

        {/* Ready Screen */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl font-black text-white mb-4">Ready to Wrestle?</h2>
              <p className="text-zinc-400 mb-6">Press SPACE to push your opponent!</p>
              <Button onClick={startGame} size="lg" className="bg-amber-600 hover:bg-amber-700">
                START GAME
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Score Display */}
      {gameState === 'playing' && (
        <div className="mt-6 flex gap-8 text-center">
          <div>
            <div className="text-2xl font-black text-white">{score}</div>
            <div className="text-xs text-zinc-500">SCORE</div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400">{highScore}</div>
            <div className="text-xs text-zinc-500">HIGH SCORE</div>
          </div>
        </div>
      )}
    </div>
  );
}