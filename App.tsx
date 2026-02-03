
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Position, TileType, Enemy, EnemyType, Gender, Theme, Weather, GameState, HighScoreEntry, Projectile 
} from './types';
import { GRID_SIZE, INITIAL_TIME, TICK_RATE, THEMES, TILE_COLORS, POWERUP_DURATION } from './constants';
import { generateMaze, getRandomPathPosition } from './utils/maze';

const LORE_POOL = [
  "The Jungle King once ruled these halls with a golden scepter...",
  "The bat cries signify the maze is shifting its geometry.",
  "Only the pure of heart can see the diamond in the dark.",
  "Ancient spirits left these coins as a test of mortal greed.",
  "The spirit fire is the only weapon that can banish the jungle shadows.",
  "Beware the level of ten, where the treasure is most protected."
];

// --- Sub-components ---

const StoryOverlay: React.FC<{ 
  type: 'INTRO' | 'ENDGAME' | 'LORE'; 
  text?: string; 
  onClose: () => void;
}> = ({ type, text, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-6 animate-in fade-in duration-500">
      <div className="max-w-xl w-full text-center space-y-8 p-10 border-2 border-emerald-900/50 rounded-3xl bg-emerald-950/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-30" />
        
        {type === 'INTRO' && (
          <>
            <h1 className="text-6xl font-black font-fancy text-emerald-400 tracking-tighter uppercase italic drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">The Jungle Depths</h1>
            <div className="space-y-4 text-xl text-emerald-100/80 leading-relaxed font-light italic">
              <p>For centuries, the <span className="text-amber-400 font-bold">Zoltan Gold</span> lay dormant beneath the ancient foliage.</p>
              <p>You have been chosen to retrieve the relics. But you are not alone...</p>
              <p className="text-red-400 font-bold mt-4 uppercase tracking-widest text-sm">Beware the Predators. Use your Spirit Fire.</p>
            </div>
            <button 
              onClick={onClose}
              className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-2xl font-black transition-all hover:scale-110 shadow-[0_0_30px_rgba(5,150,105,0.4)] uppercase"
            >
              Enter the Abyss
            </button>
          </>
        )}

        {type === 'ENDGAME' && (
          <>
            <h1 className="text-6xl font-black font-fancy text-yellow-400 animate-pulse uppercase">Immortal Victory</h1>
            <div className="space-y-4 text-xl text-yellow-100/80 italic">
              <p>The deep jungle falls silent as you emerge with the <span className="text-amber-400 font-bold">Great Relic</span>.</p>
              <p>History will remember your name as the one who solved the shifting mazes.</p>
            </div>
            <button 
              onClick={onClose}
              className="px-12 py-5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full text-2xl font-black transition-all shadow-[0_0_40px_rgba(245,158,11,0.5)] uppercase"
            >
              New Legend
            </button>
          </>
        )}

        {type === 'LORE' && (
          <div className="bg-amber-50 text-amber-900 p-8 rounded-xl border-4 border-amber-800 shadow-2xl transform -rotate-1 font-serif">
            <h3 className="text-xl font-bold border-b-2 border-amber-800/20 pb-2 mb-4">Ancient Inscription</h3>
            <p className="text-2xl italic leading-relaxed">"{text}"</p>
            <button onClick={onClose} className="mt-8 px-6 py-2 bg-amber-800 text-white font-bold rounded hover:bg-amber-900 transition-colors">Close Parchment</button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [maze, setMaze] = useState<TileType[][]>([]);
  const [playerPos, setPlayerPos] = useState<Position>({ x: 1, y: 1 });
  const [playerFacing, setPlayerFacing] = useState<Position>({ x: 0, y: 1 });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    highScore: 0,
    timeRemaining: INITIAL_TIME,
    isPaused: true,
    gameOver: false,
    victory: false,
    coinsCollected: 0,
    totalCoinsInLevel: 0,
    storyStep: 'INTRO',
    activeLore: null
  });

  const [gender, setGender] = useState<Gender>(Gender.BOY);
  const [theme, setTheme] = useState<Theme>(Theme.DARK);
  const [weather, setWeather] = useState<Weather>(Weather.CLEAR);
  const [isDay, setIsDay] = useState(false);
  const [isPowerupActive, setIsPowerupActive] = useState(false);
  const [highScores, setHighScores] = useState<HighScoreEntry[]>([]);

  const gameTimerRef = useRef<any>(null);
  const enemyTimerRef = useRef<any>(null);
  const projTimerRef = useRef<any>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // --- Dynamic Lighting Engine ---
  useEffect(() => {
    if (!viewportRef.current) return;
    const tileWidth = 40; // Approx tile size in px
    const x = (playerPos.x * tileWidth) + (tileWidth / 2);
    const y = (playerPos.y * tileWidth) + (tileWidth / 2);
    viewportRef.current.style.setProperty('--player-x', `${x}px`);
    viewportRef.current.style.setProperty('--player-y', `${y}px`);
    
    let radius = '35%';
    if (theme === Theme.BRIGHT) radius = '1000%';
    if (isPowerupActive) radius = '70%';
    if (isDay) radius = '100%';
    viewportRef.current.style.setProperty('--radius', radius);
  }, [playerPos, theme, isPowerupActive, isDay]);

  const initLevel = useCallback((levelNum: number, currentScore: number) => {
    const newMaze = generateMaze(GRID_SIZE);
    let coins = 0;
    
    // Enrich maze with specialized items
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
    for (let i = 0; i < Math.min(levelNum + 2, 8); i++) {
      const pos = getRandomPathPosition(newMaze, { x: 1, y: 1 });
      newEnemies.push({
        id: Math.random().toString(),
        type: [EnemyType.SNAKE, EnemyType.OWL, EnemyType.BAT][Math.floor(Math.random() * 3)],
        pos
      });
    }

    setMaze(newMaze);
    setPlayerPos({ x: 1, y: 1 });
    setEnemies(newEnemies);
    setProjectiles([]);
    setGameState(prev => ({
      ...prev,
      level: levelNum,
      score: currentScore,
      timeRemaining: INITIAL_TIME + (levelNum * 5),
      isPaused: levelNum === 1,
      gameOver: false,
      victory: false,
      storyStep: levelNum === 1 ? 'INTRO' : 'PLAYING'
    }));
    
    setWeather([Weather.CLEAR, Weather.RAIN, Weather.MIST][Math.floor(Math.random() * 3)]);
    setIsDay(Math.random() > 0.6);
  }, []);

  useEffect(() => {
    initLevel(1, 0);
    const stored = localStorage.getItem('jungle-explorer-scores');
    if (stored) setHighScores(JSON.parse(stored));
  }, [initLevel]);

  // --- Combat ---
  const fireSpirit = useCallback(() => {
    if (gameState.isPaused || gameState.gameOver || gameState.victory) return;
    setProjectiles(prev => [
      ...prev,
      { id: Math.random().toString(), pos: { ...playerPos }, dir: { ...playerFacing } }
    ]);
  }, [playerPos, playerFacing, gameState]);

  // --- Movement ---
  const movePlayer = useCallback((dx: number, dy: number) => {
    if (gameState.gameOver || gameState.victory || gameState.isPaused) return;

    setPlayerFacing({ x: dx, y: dy });
    setPlayerPos(prev => {
      const nx = prev.x + dx;
      const ny = prev.y + dy;

      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return prev;
      if (maze[ny][nx] === TileType.WALL) return prev;

      const newMaze = [...maze];
      let scoreAdd = 0;
      let loreAdd = null;

      if (maze[ny][nx] === TileType.COIN) {
        newMaze[ny][nx] = TileType.PATH;
        scoreAdd = 15;
      } else if (maze[ny][nx] === TileType.SCROLL) {
        newMaze[ny][nx] = TileType.PATH;
        loreAdd = LORE_POOL[Math.floor(Math.random() * LORE_POOL.length)];
        scoreAdd = 50;
      } else if (maze[ny][nx] === TileType.POWERUP) {
        newMaze[ny][nx] = TileType.PATH;
        setIsPowerupActive(true);
        setTimeout(() => setIsPowerupActive(false), POWERUP_DURATION);
      } else if (maze[ny][nx] === TileType.TREASURE) {
        if (gameState.level >= 5) {
           setGameState(s => ({ ...s, storyStep: 'ENDGAME', victory: true }));
        } else {
           setGameState(s => ({ ...s, victory: true }));
        }
      }

      setMaze(newMaze);
      setGameState(s => ({
        ...s,
        score: s.score + scoreAdd,
        activeLore: loreAdd || s.activeLore,
        isPaused: loreAdd ? true : s.isPaused
      }));

      return { x: nx, y: ny };
    });
  }, [maze, gameState]);

  // --- Controls ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState.activeLore) {
        if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
          setGameState(s => ({ ...s, activeLore: null, isPaused: false }));
        }
        return;
      }
      switch (e.key) {
        case 'ArrowUp': case 'w': movePlayer(0, -1); break;
        case 'ArrowDown': case 's': movePlayer(0, 1); break;
        case 'ArrowLeft': case 'a': movePlayer(-1, 0); break;
        case 'ArrowRight': case 'd': movePlayer(1, 0); break;
        case ' ': fireSpirit(); break;
        case 'p': setGameState(s => ({ ...s, isPaused: !s.isPaused })); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [movePlayer, fireSpirit, gameState.activeLore]);

  // --- Game Loop ---
  useEffect(() => {
    if (gameState.isPaused || gameState.gameOver || gameState.victory) {
      clearInterval(gameTimerRef.current);
      clearInterval(enemyTimerRef.current);
      clearInterval(projTimerRef.current);
      return;
    }

    gameTimerRef.current = setInterval(() => {
      setGameState(s => {
        if (s.timeRemaining <= 1) return { ...s, gameOver: true, timeRemaining: 0 };
        return { ...s, timeRemaining: s.timeRemaining - 1 };
      });
    }, 1000);

    enemyTimerRef.current = setInterval(() => {
      setEnemies(prev => prev.map(e => {
        const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        const move = dirs[Math.floor(Math.random()*dirs.length)];
        const nx = e.pos.x + move.x;
        const ny = e.pos.y + move.y;
        if (nx>=0 && nx<GRID_SIZE && ny>=0 && ny<GRID_SIZE && maze[ny][nx] !== TileType.WALL) {
          return { ...e, pos: { x: nx, y: ny } };
        }
        return e;
      }));
    }, 450);

    projTimerRef.current = setInterval(() => {
      setProjectiles(prev => {
        const next = prev.map(p => ({
          ...p,
          pos: { x: p.pos.x + p.dir.x, y: p.pos.y + p.dir.y }
        })).filter(p => 
          p.pos.x>=0 && p.pos.x<GRID_SIZE && p.pos.y>=0 && p.pos.y<GRID_SIZE && 
          maze[p.pos.y][p.pos.x] !== TileType.WALL
        );
        return next;
      });
    }, 100);

    return () => {
      clearInterval(gameTimerRef.current);
      clearInterval(enemyTimerRef.current);
      clearInterval(projTimerRef.current);
    };
  }, [gameState.isPaused, gameState.gameOver, gameState.victory, maze]);

  // --- Collisions ---
  useEffect(() => {
    setEnemies(prev => {
      const survivors = prev.filter(e => 
        !projectiles.some(p => Math.floor(p.pos.x) === e.pos.x && Math.floor(p.pos.y) === e.pos.y)
      );
      if (survivors.length < prev.length) {
        setGameState(s => ({ ...s, score: s.score + 50 }));
      }
      return survivors;
    });
  }, [projectiles]);

  useEffect(() => {
    if (isPowerupActive) return;
    if (enemies.some(e => e.pos.x === playerPos.x && e.pos.y === playerPos.y)) {
      setGameState(s => ({ ...s, gameOver: true }));
    }
  }, [playerPos, enemies, isPowerupActive]);

  const resetGame = () => initLevel(1, 0);
  const nextLevel = () => initLevel(gameState.level + 1, gameState.score);

  return (
    <div className={`fixed inset-0 flex flex-col transition-all duration-700 ${THEMES[theme]}`}>
      {/* Narrative & Overlays */}
      {gameState.storyStep === 'INTRO' && (
        <StoryOverlay type="INTRO" onClose={() => setGameState(s => ({ ...s, isPaused: false, storyStep: 'PLAYING' }))} />
      )}
      {gameState.activeLore && (
        <StoryOverlay type="LORE" text={gameState.activeLore} onClose={() => setGameState(s => ({ ...s, activeLore: null, isPaused: false }))} />
      )}
      {gameState.storyStep === 'ENDGAME' && gameState.victory && (
        <StoryOverlay type="ENDGAME" onClose={resetGame} />
      )}

      {/* Header */}
      <header className="p-4 bg-black/60 backdrop-blur-md flex justify-between items-center border-b border-emerald-900/30 z-50">
        <div className="flex gap-8">
          <div className="text-center">
             <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-widest">Floor</p>
             <p className="text-2xl font-black font-fancy">{gameState.level}</p>
          </div>
          <div className="text-center">
             <p className="text-[10px] text-amber-500 uppercase font-bold tracking-widest">Wealth</p>
             <p className="text-2xl font-black font-fancy text-amber-400">{gameState.score}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
           <button onClick={() => setTheme(t => t === Theme.DARK ? Theme.BRIGHT : Theme.DARK)} className="p-2 bg-white/5 rounded-lg border border-white/10">{theme === Theme.DARK ? '🕯️' : '☀️'}</button>
           <button onClick={() => setGender(g => g === Gender.BOY ? Gender.GIRL : Gender.BOY)} className="p-2 bg-white/5 rounded-lg border border-white/10">{gender === Gender.BOY ? '👦' : '👧'}</button>
           <button onClick={() => setGameState(s => ({ ...s, isPaused: !s.isPaused }))} className="px-4 py-2 bg-emerald-700 rounded-lg font-bold uppercase text-xs">Menu</button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        
        {/* Dynamic Light Viewport */}
        <div 
          ref={viewportRef}
          className="relative rounded-2xl border-4 border-emerald-900 shadow-[0_0_100px_rgba(6,78,59,0.3)] overflow-hidden"
          style={{ width: `${GRID_SIZE * 40}px`, height: `${GRID_SIZE * 40}px` }}
        >
           {/* Environmental Overlays */}
           {!isDay && <div className="absolute inset-0 bg-indigo-950/40 mix-blend-multiply z-10 pointer-events-none" />}
           {weather === Weather.RAIN && (
             <div className="absolute inset-0 z-20 pointer-events-none opacity-20">
                {Array.from({length: 30}).map((_, i) => (
                   <div key={i} className="absolute w-[2px] h-4 bg-blue-400 animate-rain" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()}s` }} />
                ))}
             </div>
           )}

           {/* The Maze */}
           <div className="grid dynamic-light-mask" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
              {maze.map((row, y) => row.map((tile, x) => (
                <div 
                  key={`${x}-${y}`} 
                  className={`w-10 h-10 flex items-center justify-center text-2xl relative
                    ${tile === TileType.WALL ? TILE_COLORS.WALL[theme] : TILE_COLORS.PATH[theme]}`}
                >
                  {tile === TileType.COIN && <span className="animate-float">🟡</span>}
                  {tile === TileType.POWERUP && <span className="animate-pulse-fast">⚡</span>}
                  {tile === TileType.SCROLL && <span className="animate-bounce">📜</span>}
                  {tile === TileType.TREASURE && <span className="drop-shadow-[0_0_10px_gold]">💎</span>}
                  {tile === TileType.WALL && <span className="opacity-40">🌳</span>}
                  
                  {/* Entities */}
                  {playerPos.x === x && playerPos.y === y && (
                    <div className="z-30 text-3xl drop-shadow-lg relative">
                      {gender === Gender.BOY ? '👦' : '👧'}
                      <div className="absolute inset-[-50%] bg-amber-400/20 blur-xl animate-flicker rounded-full -z-10" />
                    </div>
                  )}

                  {enemies.map(e => e.pos.x === x && e.pos.y === y && (
                    <div key={e.id} className="z-20 text-3xl transform scale-x-[-1] animate-bounce">
                      {e.type === EnemyType.SNAKE ? '🐍' : e.type === EnemyType.OWL ? '🦉' : '🦇'}
                    </div>
                  ))}

                  {projectiles.map(p => Math.floor(p.pos.x) === x && Math.floor(p.pos.y) === y && (
                    <div key={p.id} className="z-40 text-2xl drop-shadow-[0_0_15px_red] animate-pulse">🔥</div>
                  ))}
                </div>
              )))}
           </div>
        </div>

        {/* Mobile Controls */}
        <div className="md:hidden mt-8 flex gap-10 items-center">
           <div className="grid grid-cols-3 gap-2">
              <div /> <button onClick={() => movePlayer(0,-1)} className="w-14 h-14 bg-emerald-800 rounded-full font-bold text-xl">W</button> <div />
              <button onClick={() => movePlayer(-1,0)} className="w-14 h-14 bg-emerald-800 rounded-full font-bold text-xl">A</button>
              <button onClick={() => movePlayer(0,1)} className="w-14 h-14 bg-emerald-800 rounded-full font-bold text-xl">S</button>
              <button onClick={() => movePlayer(1,0)} className="w-14 h-14 bg-emerald-800 rounded-full font-bold text-xl">D</button>
           </div>
           <button onClick={fireSpirit} className="w-24 h-24 bg-red-600 rounded-full border-4 border-red-900 shadow-xl flex flex-col items-center justify-center animate-pulse">
              <span className="text-3xl">🔥</span>
              <span className="text-[10px] font-black uppercase">Cast</span>
           </button>
        </div>
      </main>

      {/* UI Modals (Paused/GameOver) */}
      {(gameState.isPaused || gameState.gameOver || gameState.victory) && gameState.storyStep === 'PLAYING' && !gameState.activeLore && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
           {gameState.gameOver ? (
             <div className="space-y-6">
                <h2 className="text-6xl font-black text-red-600 font-fancy tracking-tighter">Fallen Explorer</h2>
                <p className="text-xl text-gray-300">The jungle spirits have claimed your soul at level {gameState.level}.</p>
                <button onClick={resetGame} className="px-10 py-4 bg-red-600 rounded-full font-black uppercase text-xl hover:scale-105 transition-transform">Resurrect</button>
             </div>
           ) : gameState.victory ? (
             <div className="space-y-6">
                <h2 className="text-6xl font-black text-amber-500 font-fancy">Floor Cleared</h2>
                <p className="text-xl text-gray-300">Descending deeper into the Zoltan Dungeon...</p>
                <button onClick={nextLevel} className="px-10 py-4 bg-amber-500 text-black rounded-full font-black uppercase text-xl">Descend ➡️</button>
             </div>
           ) : (
             <div className="space-y-10 w-full max-w-sm">
                <h2 className="text-5xl font-black font-fancy italic">Zoltan Menu</h2>
                <div className="grid gap-4">
                  <button onClick={() => setGameState(s => ({ ...s, isPaused: false }))} className="w-full py-4 bg-emerald-600 rounded-xl font-bold uppercase text-lg">Continue Quest</button>
                  <button onClick={resetGame} className="w-full py-4 bg-red-600/50 hover:bg-red-600 rounded-xl font-bold uppercase text-lg">Restart Adventure</button>
                </div>
                <div className="text-left bg-black/50 p-6 rounded-2xl border border-emerald-900/30">
                  <h3 className="text-amber-500 font-bold mb-4 uppercase text-xs tracking-widest">Master Explorers</h3>
                  {highScores.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-white/5">
                      <span>{s.name}</span> <span className="font-mono text-amber-400">{s.score}</span>
                    </div>
                  ))}
                </div>
             </div>
           )}
        </div>
      )}

      {/* AdSense Placement / Footer */}
      <div className="w-full bg-black/40 border-t border-emerald-900/20 p-2 text-center">
         <div className="h-10 text-[9px] uppercase tracking-[0.5em] text-emerald-900/40 flex items-center justify-center">
           Ad Space: Secure your own golden treasure today at zoltan-bank.com
         </div>
         <footer className="mt-2 flex justify-between px-6 text-[10px] font-bold text-emerald-900/60 uppercase tracking-widest">
            <p>(C) Noam Gold AI 2026</p>
            <a href="mailto:goldnoamai@gmail.com" className="hover:text-emerald-400">goldnoamai@gmail.com</a>
         </footer>
      </div>
    </div>
  );
}
