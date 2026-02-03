
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Position, TileType, Enemy, EnemyType, Gender, Theme, Weather, GameState, HighScoreEntry, Projectile 
} from './types';
import { GRID_SIZE, INITIAL_TIME, TICK_RATE, THEMES, TILE_COLORS, POWERUP_DURATION } from './constants';
import { generateMaze, getRandomPathPosition } from './utils/maze';

const LORE_MESSAGES = [
  "The golden idol was stolen centuries ago by the jungle spirits...",
  "Only one with a pure heart can navigate the shifting walls of the dungeon.",
  "Beware the shadows; the owls see everything even in the pitch black.",
  "Legend says a great fire-spirit once protected these halls.",
  "The coins are but crumbs leading to the ultimate hoard."
];

// --- Components ---

const GameHeader: React.FC<{
  gameState: GameState;
  theme: Theme;
  gender: Gender;
  weather: Weather;
  isDay: boolean;
  onThemeToggle: () => void;
  onGenderToggle: () => void;
  onPause: () => void;
  onReset: () => void;
}> = ({ gameState, theme, gender, weather, isDay, onThemeToggle, onGenderToggle, onPause, onReset }) => {
  return (
    <div className="flex flex-wrap items-center justify-between p-4 bg-black/60 backdrop-blur-md rounded-b-2xl shadow-2xl z-50 relative border-b border-green-900/30">
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Level</p>
          <p className="text-2xl font-bold text-emerald-400">{gameState.level}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Score</p>
          <p className="text-2xl font-bold text-yellow-400">{gameState.score}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Time</p>
          <p className={`text-2xl font-bold ${gameState.timeRemaining < 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
            {gameState.timeRemaining}s
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 sm:mt-0">
        <button onClick={onThemeToggle} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Change Theme">
          {theme === Theme.BRIGHT ? '☀️' : theme === Theme.DARK ? '🌙' : '🌈'}
        </button>
        <button onClick={onGenderToggle} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Change Character">
          {gender === Gender.BOY ? '👦' : '👧'}
        </button>
        <button onClick={onPause} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold transition-all active:scale-95">
          {gameState.isPaused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={onReset} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold transition-all active:scale-95">
          Reset
        </button>
      </div>
      
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 px-4 py-1 rounded-full text-xs text-gray-300">
         <span>Weather: {weather}</span>
         <span>|</span>
         <span>{isDay ? '☀️ Day' : '🌑 Night'}</span>
      </div>
    </div>
  );
};

const HighScoreTable: React.FC<{ scores: HighScoreEntry[] }> = ({ scores }) => {
  return (
    <div className="mt-8 w-full max-w-md bg-black/50 p-4 rounded-xl border border-yellow-900/30">
      <h3 className="text-yellow-500 font-bold mb-4 flex items-center gap-2">
        🏆 Hall of Fame
      </h3>
      <div className="space-y-2">
        {scores.length === 0 ? <p className="text-gray-500 text-sm">No scores yet explorer!</p> : 
          scores.map((s, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span className="text-gray-300">{i + 1}. {s.name}</span>
              <span className="text-yellow-400 font-mono">{s.score}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
};

export default function App() {
  const [maze, setMaze] = useState<TileType[][]>([]);
  const [playerPos, setPlayerPos] = useState<Position>({ x: 1, y: 1 });
  const [playerDir, setPlayerDir] = useState<Position>({ x: 0, y: 1 });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    highScore: 0,
    timeRemaining: INITIAL_TIME,
    isPaused: true, // Start paused for intro
    gameOver: false,
    victory: false,
    coinsCollected: 0,
    totalCoinsInLevel: 0,
    storyStep: 0,
    activeLore: null
  });
  const [gender, setGender] = useState<Gender>(Gender.BOY);
  const [theme, setTheme] = useState<Theme>(Theme.DARK);
  const [weather, setWeather] = useState<Weather>(Weather.CLEAR);
  const [isDay, setIsDay] = useState(true);
  const [highScores, setHighScores] = useState<HighScoreEntry[]>([]);
  const [isPowerupActive, setIsPowerupActive] = useState(false);

  const gameTimerRef = useRef<any>(null);
  const enemyTimerRef = useRef<any>(null);
  const projectileTimerRef = useRef<any>(null);

  const initLevel = useCallback((levelNum: number, currentScore: number) => {
    const newMaze = generateMaze(GRID_SIZE);
    let coins = 0;
    
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (newMaze[i][j] === TileType.PATH && Math.random() < 0.1) {
          newMaze[i][j] = TileType.COIN;
          coins++;
        }
        if (newMaze[i][j] === TileType.PATH && Math.random() < 0.02) {
          newMaze[i][j] = TileType.POWERUP;
        }
        if (newMaze[i][j] === TileType.PATH && Math.random() < 0.01) {
          newMaze[i][j] = TileType.SCROLL;
        }
      }
    }

    const newEnemies: Enemy[] = [];
    const enemyTypes = [EnemyType.SNAKE, EnemyType.OWL, EnemyType.BAT];
    for (let i = 0; i < Math.min(levelNum + 2, 8); i++) {
      const pos = getRandomPathPosition(newMaze, { x: 1, y: 1 });
      newEnemies.push({
        id: Math.random().toString(),
        type: enemyTypes[Math.floor(Math.random() * enemyTypes.length)],
        pos,
        direction: { x: 0, y: 0 }
      });
    }

    setMaze(newMaze);
    setPlayerPos({ x: 1, y: 1 });
    setProjectiles([]);
    setEnemies(newEnemies);
    setGameState(prev => ({
      ...prev,
      level: levelNum,
      score: currentScore,
      timeRemaining: INITIAL_TIME + (levelNum * 5),
      isPaused: levelNum === 1 ? true : false,
      gameOver: false,
      victory: false,
      coinsCollected: 0,
      totalCoinsInLevel: coins,
      storyStep: levelNum === 1 ? 0 : prev.storyStep,
      activeLore: null
    }));

    setWeather([Weather.CLEAR, Weather.RAIN, Weather.MIST][Math.floor(Math.random() * 3)]);
    setIsDay(Math.random() > 0.4);
  }, []);

  useEffect(() => {
    initLevel(1, 0);
    const stored = localStorage.getItem('jungle-explorer-scores');
    if (stored) setHighScores(JSON.parse(stored));
  }, [initLevel]);

  const saveHighScore = useCallback((score: number) => {
    const newEntry = { name: `Explorer ${Math.floor(Math.random() * 1000)}`, score, date: new Date().toLocaleDateString() };
    const updated = [...highScores, newEntry].sort((a, b) => b.score - a.score).slice(0, 5);
    setHighScores(updated);
    localStorage.setItem('jungle-explorer-scores', JSON.stringify(updated));
  }, [highScores]);

  const handleGameOver = useCallback(() => {
    setGameState(prev => ({ ...prev, gameOver: true }));
    saveHighScore(gameState.score);
  }, [gameState.score, saveHighScore]);

  const fireProjectile = useCallback(() => {
    if (gameState.isPaused || gameState.gameOver || gameState.victory) return;
    setProjectiles(prev => [
      ...prev,
      { id: Math.random().toString(), pos: { ...playerPos }, dir: { ...playerDir } }
    ]);
  }, [playerPos, playerDir, gameState]);

  const movePlayer = useCallback((dx: number, dy: number) => {
    if (gameState.gameOver || gameState.victory || gameState.isPaused) return;

    setPlayerDir({ x: dx, y: dy });
    setPlayerPos(prev => {
      const nx = prev.x + dx;
      const ny = prev.y + dy;

      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return prev;
      if (maze[ny][nx] === TileType.WALL) return prev;

      let scoreGain = 0;
      let coinsGain = 0;
      let loreFound = null;
      const newMaze = [...maze];

      if (maze[ny][nx] === TileType.COIN) {
        newMaze[ny][nx] = TileType.PATH;
        scoreGain = 10;
        coinsGain = 1;
      } else if (maze[ny][nx] === TileType.TREASURE) {
        setGameState(s => ({ ...s, victory: true }));
        scoreGain = 100 + gameState.timeRemaining * 2;
      } else if (maze[ny][nx] === TileType.POWERUP) {
        newMaze[ny][nx] = TileType.PATH;
        setIsPowerupActive(true);
        setTimeout(() => setIsPowerupActive(false), POWERUP_DURATION);
        scoreGain = 50;
      } else if (maze[ny][nx] === TileType.SCROLL) {
        newMaze[ny][nx] = TileType.PATH;
        loreFound = LORE_MESSAGES[Math.floor(Math.random() * LORE_MESSAGES.length)];
        scoreGain = 25;
      }

      setMaze(newMaze);
      setGameState(s => ({
        ...s,
        score: s.score + scoreGain,
        coinsCollected: s.coinsCollected + coinsGain,
        activeLore: loreFound
      }));

      return { x: nx, y: ny };
    });
  }, [maze, gameState]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState.activeLore) {
         if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') setGameState(s => ({ ...s, activeLore: null }));
         return;
      }
      switch (e.key) {
        case 'ArrowUp': case 'w': movePlayer(0, -1); break;
        case 'ArrowDown': case 's': movePlayer(0, 1); break;
        case 'ArrowLeft': case 'a': movePlayer(-1, 0); break;
        case 'ArrowRight': case 'd': movePlayer(1, 0); break;
        case ' ': fireProjectile(); break;
        case 'p': setGameState(s => ({ ...s, isPaused: !s.isPaused })); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [movePlayer, fireProjectile, gameState.activeLore]);

  useEffect(() => {
    if (gameState.isPaused || gameState.gameOver || gameState.victory) {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (enemyTimerRef.current) clearInterval(enemyTimerRef.current);
      if (projectileTimerRef.current) clearInterval(projectileTimerRef.current);
      return;
    }

    gameTimerRef.current = setInterval(() => {
      setGameState(s => {
        if (s.timeRemaining <= 1) {
          handleGameOver();
          return { ...s, timeRemaining: 0 };
        }
        return { ...s, timeRemaining: s.timeRemaining - 1 };
      });
    }, 1000);

    enemyTimerRef.current = setInterval(() => {
      setEnemies(prevEnemies => prevEnemies.map(enemy => {
        const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        const move = dirs[Math.floor(Math.random() * dirs.length)];
        const nx = enemy.pos.x + move.x;
        const ny = enemy.pos.y + move.y;
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && maze[ny][nx] !== TileType.WALL) {
          return { ...enemy, pos: { x: nx, y: ny } };
        }
        return enemy;
      }));
    }, isPowerupActive ? 800 : 400);

    projectileTimerRef.current = setInterval(() => {
      setProjectiles(prev => prev.map(p => ({
        ...p,
        pos: { x: p.pos.x + p.dir.x, y: p.pos.y + p.dir.y }
      })).filter(p => p.pos.x >= 0 && p.pos.x < GRID_SIZE && p.pos.y >= 0 && p.pos.y < GRID_SIZE && maze[p.pos.y][p.pos.x] !== TileType.WALL));
    }, 100);

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (enemyTimerRef.current) clearInterval(enemyTimerRef.current);
      if (projectileTimerRef.current) clearInterval(projectileTimerRef.current);
    };
  }, [gameState.isPaused, gameState.gameOver, gameState.victory, maze, handleGameOver, isPowerupActive]);

  useEffect(() => {
    setEnemies(prevEnemies => {
      const remainingEnemies = prevEnemies.filter(e => 
        !projectiles.some(p => Math.floor(p.pos.x) === e.pos.x && Math.floor(p.pos.y) === e.pos.y)
      );
      if (remainingEnemies.length < prevEnemies.length) {
        setGameState(s => ({ ...s, score: s.score + 50 }));
      }
      return remainingEnemies;
    });
  }, [projectiles]);

  useEffect(() => {
    if (isPowerupActive) return;
    const hit = enemies.some(e => e.pos.x === playerPos.x && e.pos.y === playerPos.y);
    if (hit) handleGameOver();
  }, [playerPos, enemies, handleGameOver, isPowerupActive]);

  const resetGame = () => initLevel(1, 0);
  const nextLevel = () => initLevel(gameState.level + 1, gameState.score);

  const getTileEmoji = (type: TileType) => {
    switch (type) {
      case TileType.WALL: return '🌳';
      case TileType.COIN: return '🟡';
      case TileType.TREASURE: return '💎';
      case TileType.POWERUP: return '⚡';
      case TileType.SCROLL: return '📜';
      default: return '';
    }
  };

  const getEnemyEmoji = (type: EnemyType) => {
    switch (type) {
      case EnemyType.SNAKE: return '🐍';
      case EnemyType.OWL: return '🦉';
      case EnemyType.BAT: return '🦇';
    }
  };

  // Visibility calculation for Dynamic Lighting
  const getLightingOpacity = (x: number, y: number) => {
    if (theme === Theme.BRIGHT) return 0; // Fully lit
    const dist = Math.sqrt(Math.pow(x - playerPos.x, 2) + Math.pow(y - playerPos.y, 2));
    if (isPowerupActive) return Math.min(dist * 0.1, 0.4);
    if (!isDay) return Math.min(dist * 0.35, 1);
    return Math.min(dist * 0.2, 0.9);
  };

  const weatherOverlay = useMemo(() => {
    if (weather === Weather.RAIN) {
      return (
        <div className="absolute inset-0 pointer-events-none opacity-40 z-40 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div 
              key={i} 
              className="absolute bg-blue-400 w-0.5 h-4 animate-pulse"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random()}s` }}
            />
          ))}
        </div>
      );
    }
    if (weather === Weather.MIST) {
      return <div className="absolute inset-0 pointer-events-none bg-white/20 blur-2xl z-40 opacity-30" />;
    }
    return null;
  }, [weather]);

  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-start overflow-hidden transition-all duration-700 ${THEMES[theme]}`}>
      <GameHeader 
        gameState={gameState} 
        theme={theme} 
        gender={gender} 
        weather={weather}
        isDay={isDay}
        onThemeToggle={() => setTheme(t => t === Theme.BRIGHT ? Theme.DARK : t === Theme.DARK ? Theme.COLORFUL : Theme.BRIGHT)}
        onGenderToggle={() => setGender(g => g === Gender.BOY ? Gender.GIRL : Gender.BOY)}
        onPause={() => setGameState(s => ({ ...s, isPaused: !s.isPaused }))}
        onReset={resetGame}
      />

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl p-4 relative">
        <div className={`relative p-2 rounded-xl shadow-2xl border-4 ${isPowerupActive ? 'border-yellow-400 animate-pulse' : 'border-emerald-800'} overflow-hidden`}>
          {!isDay && <div className="absolute inset-0 bg-blue-900/40 pointer-events-none z-30 mix-blend-multiply" />}
          {weatherOverlay}

          <div 
            className="grid gap-px bg-black/20" 
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
          >
            {maze.map((row, y) => row.map((tile, x) => {
              const opacity = getLightingOpacity(x, y);
              return (
                <div 
                  key={`${x}-${y}`} 
                  className={`w-6 h-6 sm:w-10 sm:h-10 flex items-center justify-center text-lg sm:text-2xl relative
                    ${tile === TileType.WALL ? TILE_COLORS.WALL[theme] : TILE_COLORS.PATH[theme]}`}
                >
                  <div className="z-0 opacity-100">{getTileEmoji(tile)}</div>
                  
                  {/* Dynamic Light Mask */}
                  <div 
                    className="absolute inset-0 bg-black z-10 transition-opacity duration-300 pointer-events-none" 
                    style={{ opacity }} 
                  />

                  {/* Player */}
                  {playerPos.x === x && playerPos.y === y && (
                    <div className={`z-20 transform transition-transform duration-100 ${isPowerupActive ? 'scale-125' : ''}`}>
                      {gender === Gender.BOY ? '👦' : '👧'}
                      {/* Local light bloom */}
                      <div className="absolute inset-[-100%] bg-yellow-400/20 blur-xl rounded-full pointer-events-none" />
                    </div>
                  )}

                  {/* Enemies */}
                  {enemies.map(enemy => enemy.pos.x === x && enemy.pos.y === y && (
                    <div key={enemy.id} className="z-10 animate-bounce" style={{ opacity: opacity > 0.8 ? 0 : 1 }}>
                      {getEnemyEmoji(enemy.type)}
                    </div>
                  ))}

                  {/* Projectiles */}
                  {projectiles.map(p => Math.floor(p.pos.x) === x && Math.floor(p.pos.y) === y && (
                    <div key={p.id} className="z-30 text-yellow-500 animate-pulse">🔥</div>
                  ))}
                </div>
              );
            }))}
          </div>
        </div>

        {/* Controls */}
        <div className="md:hidden mt-8 flex gap-4">
          <div className="grid grid-cols-3 gap-2">
            <div />
            <button onClick={() => movePlayer(0, -1)} className="w-12 h-12 bg-emerald-700/80 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg">W</button>
            <div />
            <button onClick={() => movePlayer(-1, 0)} className="w-12 h-12 bg-emerald-700/80 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg">A</button>
            <button onClick={() => movePlayer(0, 1)} className="w-12 h-12 bg-emerald-700/80 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg">S</button>
            <button onClick={() => movePlayer(1, 0)} className="w-12 h-12 bg-emerald-700/80 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg">D</button>
          </div>
          <button onClick={fireProjectile} className="w-24 h-24 bg-red-600/80 rounded-full flex flex-col items-center justify-center text-xs font-black text-white shadow-xl animate-pulse">
            <span className="text-3xl">🔥</span>
            FIRE
          </button>
        </div>

        {/* Narrative Scroll / Lore Overlay */}
        {gameState.activeLore && (
          <div className="absolute inset-0 bg-black/70 z-[100] flex items-center justify-center p-8 backdrop-blur-sm">
             <div className="bg-amber-100 text-amber-900 p-8 rounded-lg shadow-2xl max-w-md border-4 border-amber-800 font-serif transform -rotate-1">
                <h3 className="text-2xl font-bold mb-4 border-b-2 border-amber-800/20">Ancient Inscription</h3>
                <p className="text-lg italic leading-relaxed">"{gameState.activeLore}"</p>
                <p className="mt-6 text-sm opacity-50 text-right">- The Jungle Chronicles</p>
                <button 
                  onClick={() => setGameState(s => ({ ...s, activeLore: null }))}
                  className="mt-8 w-full py-2 bg-amber-800 text-amber-50 rounded font-bold hover:bg-amber-700"
                >
                  CONTINUE
                </button>
             </div>
          </div>
        )}

        {/* Intro Cutscene / Welcome */}
        {gameState.storyStep === 0 && gameState.isPaused && !gameState.gameOver && !gameState.victory && (
          <div className="absolute inset-0 bg-black z-[110] flex flex-col items-center justify-center p-12 text-center overflow-auto">
            <div className="max-w-xl animate-fade-in">
              <h1 className="text-6xl font-black text-emerald-400 mb-8 tracking-tighter uppercase italic">The Jungle Depths</h1>
              <div className="space-y-6 text-xl text-gray-300 leading-relaxed font-light">
                <p>You stand before the mouth of the <span className="text-yellow-400 font-bold">Zoltan Dungeon</span>. Somewhere in these shifting jungle mazes lies the Great Treasure.</p>
                <p>Armed with your <span className="text-red-400 font-bold">Spirit Fire</span> (Space/Fire Button), you must navigate the shadows, collect the lost gold, and survive the ancient predators.</p>
                <p className="text-emerald-500 font-bold">Use WASD or Arrows to move. Find the Diamond to descend deeper.</p>
              </div>
              <button 
                onClick={() => setGameState(s => ({ ...s, isPaused: false, storyStep: 1 }))}
                className="mt-12 px-12 py-6 bg-emerald-600 hover:bg-emerald-500 rounded-full text-3xl font-black transition-all shadow-2xl hover:scale-105 uppercase"
              >
                Enter the Dungeon
              </button>
            </div>
          </div>
        )}

        {/* Endgame / Final Victory */}
        {gameState.level >= 10 && gameState.victory && (
          <div className="absolute inset-0 bg-yellow-500 z-[120] flex flex-col items-center justify-center text-center p-12">
             <h2 className="text-7xl font-black text-black mb-8 animate-bounce">THE ETERNAL HOARD!</h2>
             <p className="text-2xl text-black font-bold max-w-lg mb-12">You have reached the bottom of the Zoltan Dungeon. The gold is yours, and the spirits bow to your fire!</p>
             <p className="text-5xl font-mono text-white drop-shadow-lg mb-12">Final Score: {gameState.score}</p>
             <button onClick={resetGame} className="px-12 py-6 bg-black text-yellow-400 rounded-full text-3xl font-bold transition-all shadow-2xl">
               NEW ADVENTURE
             </button>
          </div>
        )}

        {/* Regular Game Over / Victory Modals */}
        {(gameState.gameOver || (gameState.victory && gameState.level < 10) || (gameState.isPaused && gameState.storyStep !== 0)) && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 text-center p-6 rounded-2xl">
            {gameState.gameOver && (
              <>
                <h2 className="text-5xl font-black text-red-500 mb-4 animate-bounce">RECLAIMED BY NATURE!</h2>
                <p className="text-xl text-gray-300 mb-6">The predators caught your scent. You collected {gameState.score} points.</p>
                <button onClick={resetGame} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-full text-2xl font-bold transition-all">
                  RETRY
                </button>
              </>
            )}
            {gameState.victory && gameState.level < 10 && (
              <>
                <h2 className="text-5xl font-black text-yellow-400 mb-4 animate-pulse">PATHWAY UNLOCKED!</h2>
                <p className="text-xl text-gray-300 mb-6">You found the exit! Descending to level {gameState.level + 1}...</p>
                <button onClick={nextLevel} className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full text-2xl font-bold transition-all shadow-lg hover:shadow-yellow-400/50">
                  DESCEND ➡️
                </button>
              </>
            )}
            {gameState.isPaused && gameState.storyStep !== 0 && (
              <>
                <h2 className="text-5xl font-black text-blue-400 mb-8">RESTING...</h2>
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                   <button onClick={() => setGameState(s => ({ ...s, isPaused: false }))} className="px-6 py-4 bg-emerald-600 rounded-xl font-bold text-xl">RESUME</button>
                   <button onClick={resetGame} className="px-6 py-4 bg-red-600 rounded-xl font-bold text-xl">RESET</button>
                </div>
              </>
            )}
            <HighScoreTable scores={highScores} />
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl h-12 bg-black/10 mt-auto border border-dashed border-emerald-900/20 flex items-center justify-center text-emerald-900/30 uppercase tracking-tighter text-[10px] rounded-lg mb-2">
        Sponsors: The Jungle Preservation Society
      </div>

      <footer className="w-full p-4 flex flex-col sm:flex-row justify-between items-center text-xs text-emerald-900/60 font-bold tracking-widest uppercase">
        <p>(C) Noam Gold AI 2026</p>
        <div className="flex gap-4 items-center">
           <a href="mailto:goldnoamai@gmail.com" className="hover:text-emerald-400 transition-colors">Send Feedback</a>
           <span className="opacity-40">|</span>
           <span>goldnoamai@gmail.com</span>
        </div>
      </footer>
    </div>
  );
}
