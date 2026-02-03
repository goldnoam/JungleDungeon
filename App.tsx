import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Position, TileType, Enemy, EnemyType, Gender, Theme, Weather, GameState, HighScoreEntry, Projectile 
} from './types';
import { GRID_SIZE, INITIAL_TIME, THEMES, TILE_COLORS, POWERUP_DURATION } from './constants';
import { generateMaze, getRandomPathPosition } from './utils/maze';

const LORE_POOL = [
  "The Jungle King once ruled these halls with a golden scepter...",
  "The bat cries signify the maze is shifting its geometry.",
  "Only the pure of heart can see the diamond in the dark.",
  "Ancient spirits left these coins as a test of mortal greed.",
  "The spirit fire is the only weapon that can banish the jungle shadows.",
  "Beware the level of ten, where the treasure is most protected."
];

const StoryOverlay: React.FC<{ 
  type: 'INTRO' | 'ENDGAME' | 'LORE'; 
  text?: string; 
  onClose: () => void;
}> = ({ type, text, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-6 animate-in fade-in zoom-in duration-300">
      <div className="max-w-xl w-full text-center space-y-8 p-10 border-2 border-emerald-900/50 rounded-3xl bg-emerald-950/20 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-30" />
        {type === 'INTRO' && (
          <>
            <h1 className="text-5xl md:text-6xl font-black font-fancy text-emerald-400 tracking-tighter uppercase italic">The Jungle Depths</h1>
            <div className="space-y-4 text-lg md:text-xl text-emerald-100/80 leading-relaxed font-light italic">
              <p>For centuries, the <span className="text-amber-400 font-bold">Zoltan Gold</span> lay dormant beneath the ancient foliage.</p>
              <p>You have been chosen to retrieve the relics. But you are not alone...</p>
              <p className="text-red-400 font-bold mt-4 uppercase tracking-widest text-sm">Beware the Predators. Use your Spirit Fire.</p>
            </div>
            <button onClick={onClose} className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-2xl font-black transition-all hover:scale-105 shadow-lg uppercase">Enter the Abyss</button>
          </>
        )}
        {type === 'ENDGAME' && (
          <>
            <h1 className="text-5xl md:text-6xl font-black font-fancy text-yellow-400 animate-pulse uppercase">Immortal Victory</h1>
            <div className="space-y-4 text-xl text-yellow-100/80 italic">
              <p>The deep jungle falls silent as you emerge with the <span className="text-amber-400 font-bold">Great Relic</span>.</p>
            </div>
            <button onClick={onClose} className="px-12 py-5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full text-2xl font-black transition-all uppercase">New Legend</button>
          </>
        )}
        {type === 'LORE' && (
          <div className="bg-amber-50 text-amber-900 p-8 rounded-xl border-4 border-amber-800 shadow-2xl font-serif">
            <h3 className="text-xl font-bold border-b-2 border-amber-800/20 pb-2 mb-4">Ancient Inscription</h3>
            <p className="text-2xl italic leading-relaxed">"{text}"</p>
            <button onClick={onClose} className="mt-8 px-8 py-3 bg-amber-800 text-white font-bold rounded-lg hover:bg-amber-900 shadow-lg">Close Parchment</button>
          </div>
        )}
      </div>
    </div>
  );
};

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

  const initLevel = useCallback((levelNum: number, currentScore: number) => {
    const newMaze = generateMaze(GRID_SIZE);
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (newMaze[i][j] === TileType.PATH && Math.random() < 0.1) newMaze[i][j] = TileType.COIN;
        if (newMaze[i][j] === TileType.PATH && Math.random() < 0.02) newMaze[i][j] = TileType.POWERUP;
        if (newMaze[i][j] === TileType.PATH && Math.random() < 0.01) newMaze[i][j] = TileType.SCROLL;
      }
    }
    const newEnemies: Enemy[] = [];
    for (let i = 0; i < Math.min(levelNum + 2, 8); i++) {
      const pos = getRandomPathPosition(newMaze, { x: 1, y: 1 });
      newEnemies.push({ id: Math.random().toString(), type: [EnemyType.SNAKE, EnemyType.OWL, EnemyType.BAT][Math.floor(Math.random() * 3)], pos });
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

  useEffect(() => {
    if (!viewportRef.current) return;
    const tileWidth = 40; 
    viewportRef.current.style.setProperty('--player-x', `${(playerPos.x * tileWidth) + (tileWidth / 2)}px`);
    viewportRef.current.style.setProperty('--player-y', `${(playerPos.y * tileWidth) + (tileWidth / 2)}px`);
    let radius = '120px';
    if (theme === Theme.BRIGHT) radius = '3000px';
    else if (isPowerupActive) radius = '250px';
    else if (isDay) radius = '500px';
    viewportRef.current.style.setProperty('--radius', radius);
  }, [playerPos, theme, isPowerupActive, isDay]);

  const fireSpirit = useCallback(() => {
    if (gameState.isPaused || gameState.gameOver || gameState.victory) return;
    setProjectiles(prev => [...prev, { id: Math.random().toString(), pos: { ...playerPos }, dir: { ...playerFacing } }]);
  }, [playerPos, playerFacing, gameState]);

  const movePlayer = useCallback((dx: number, dy: number) => {
    if (gameState.gameOver || gameState.victory || gameState.isPaused) return;
    setPlayerFacing({ x: dx, y: dy });
    setPlayerPos(prev => {
      const nx = prev.x + dx;
      const ny = prev.y + dy;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE || maze[ny][nx] === TileType.WALL) return prev;
      const newMaze = [...maze];
      let scoreAdd = 0;
      let loreAdd = null;
      if (maze[ny][nx] === TileType.COIN) { newMaze[ny][nx] = TileType.PATH; scoreAdd = 15; }
      else if (maze[ny][nx] === TileType.SCROLL) { newMaze[ny][nx] = TileType.PATH; loreAdd = LORE_POOL[Math.floor(Math.random() * LORE_POOL.length)]; scoreAdd = 50; }
      else if (maze[ny][nx] === TileType.POWERUP) { newMaze[ny][nx] = TileType.PATH; setIsPowerupActive(true); setTimeout(() => setIsPowerupActive(false), POWERUP_DURATION); }
      else if (maze[ny][nx] === TileType.TREASURE) { 
        if (gameState.level >= 10) setGameState(s => ({ ...s, storyStep: 'ENDGAME', victory: true }));
        else setGameState(s => ({ ...s, victory: true }));
      }
      setMaze(newMaze);
      setGameState(s => ({ ...s, score: s.score + scoreAdd, activeLore: loreAdd || s.activeLore, isPaused: loreAdd ? true : s.isPaused }));
      return { x: nx, y: ny };
    });
  }, [maze, gameState]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState.activeLore) {
        if (['Enter', 'Escape', ' '].includes(e.key)) setGameState(s => ({ ...s, activeLore: null, isPaused: false }));
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

  useEffect(() => {
    if (gameState.isPaused || gameState.gameOver || gameState.victory) return;
    gameTimerRef.current = setInterval(() => setGameState(s => s.timeRemaining <= 1 ? { ...s, gameOver: true, timeRemaining: 0 } : { ...s, timeRemaining: s.timeRemaining - 1 }), 1000);
    enemyTimerRef.current = setInterval(() => setEnemies(prev => prev.map(e => {
      const move = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}][Math.floor(Math.random()*4)];
      const nx = e.pos.x + move.x, ny = e.pos.y + move.y;
      return (nx>=0 && nx<GRID_SIZE && ny>=0 && ny<GRID_SIZE && maze[ny][nx] !== TileType.WALL) ? { ...e, pos: { x: nx, y: ny } } : e;
    })), 450);
    projTimerRef.current = setInterval(() => setProjectiles(prev => prev.map(p => ({ ...p, pos: { x: p.pos.x + p.dir.x, y: p.pos.y + p.dir.y } })).filter(p => p.pos.x>=0 && p.pos.x<GRID_SIZE && p.pos.y>=0 && p.pos.y<GRID_SIZE && maze[p.pos.y][p.pos.x] !== TileType.WALL)), 100);
    return () => { clearInterval(gameTimerRef.current); clearInterval(enemyTimerRef.current); clearInterval(projTimerRef.current); };
  }, [gameState.isPaused, gameState.gameOver, gameState.victory, maze]);

  useEffect(() => {
    setEnemies(prev => {
      const survivors = prev.filter(e => !projectiles.some(p => Math.floor(p.pos.x) === e.pos.x && Math.floor(p.pos.y) === e.pos.y));
      if (survivors.length < prev.length) setGameState(s => ({ ...s, score: s.score + 50 }));
      return survivors;
    });
  }, [projectiles]);

  useEffect(() => {
    if (!isPowerupActive && enemies.some(e => e.pos.x === playerPos.x && e.pos.y === playerPos.y)) setGameState(s => ({ ...s, gameOver: true }));
  }, [playerPos, enemies, isPowerupActive]);

  const resetGame = () => initLevel(1, 0);
  const nextLevel = () => initLevel(gameState.level + 1, gameState.score);

  return (
    <div className={`fixed inset-0 flex flex-col transition-all duration-700 ${THEMES[theme]}`}>
      {gameState.storyStep === 'INTRO' && <StoryOverlay type="INTRO" onClose={() => setGameState(s => ({ ...s, isPaused: false, storyStep: 'PLAYING' }))} />}
      {gameState.activeLore && <StoryOverlay type="LORE" text={gameState.activeLore} onClose={() => setGameState(s => ({ ...s, activeLore: null, isPaused: false }))} />}
      {gameState.storyStep === 'ENDGAME' && gameState.victory && <StoryOverlay type="ENDGAME" onClose={resetGame} />}

      <header className="p-4 bg-black/60 backdrop-blur-md flex justify-between items-center border-b border-emerald-900/30 z-50">
        <div className="flex gap-4 md:gap-8 text-center">
          <div><p className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase">Floor</p><p className="text-xl font-fancy">{gameState.level}</p></div>
          <div><p className="text-[10px] text-amber-500 font-bold tracking-widest uppercase">Wealth</p><p className="text-xl font-fancy text-amber-400">{gameState.score}</p></div>
          <div><p className="text-[10px] text-blue-500 font-bold tracking-widest uppercase">Time</p><p className={`text-xl font-fancy ${gameState.timeRemaining < 10 ? 'text-red-500 animate-pulse' : ''}`}>{gameState.timeRemaining}s</p></div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setTheme(t => t === Theme.DARK ? Theme.BRIGHT : Theme.DARK)} className="p-2 bg-white/5 rounded-lg border border-white/10">{theme === Theme.DARK ? '🕯️' : '☀️'}</button>
           <button onClick={() => setGender(g => g === Gender.BOY ? Gender.GIRL : Gender.BOY)} className="p-2 bg-white/5 rounded-lg border border-white/10">{gender === Gender.BOY ? '👦' : '👧'}</button>
           <button onClick={() => setGameState(s => ({ ...s, isPaused: !s.isPaused }))} className="px-4 py-2 bg-emerald-700 rounded-lg font-bold uppercase text-xs">Menu</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div ref={viewportRef} className="relative rounded-2xl border-4 border-emerald-900 bg-black overflow-hidden" style={{ width: `${GRID_SIZE * 40}px`, height: `${GRID_SIZE * 40}px` }}>
           {!isDay && <div className="absolute inset-0 bg-indigo-950/40 mix-blend-multiply z-10 pointer-events-none" />}
           {weather === Weather.RAIN && <div className="absolute inset-0 z-20 pointer-events-none opacity-20">{Array.from({length: 30}).map((_, i) => (<div key={i} className="absolute w-[2px] h-4 bg-blue-400 animate-rain" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()}s` }} />))}</div>}
           <div className="grid dynamic-light-mask" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
              {maze.map((row, y) => row.map((tile, x) => (
                <div key={`${x}-${y}`} className={`w-10 h-10 flex items-center justify-center text-2xl relative ${tile === TileType.WALL ? TILE_COLORS.WALL[theme] : TILE_COLORS.PATH[theme]}`}>
                  {tile === TileType.COIN && <span className="animate-float">🟡</span>}
                  {tile === TileType.POWERUP && <span className="animate-pulse-fast">⚡</span>}
                  {tile === TileType.SCROLL && <span className="animate-bounce">📜</span>}
                  {tile === TileType.TREASURE && <span className="drop-shadow-[0_0_10px_gold]">💎</span>}
                  {tile === TileType.WALL && <span className="opacity-40 grayscale">🌳</span>}
                  {playerPos.x === x && playerPos.y === y && <div className="z-30 text-3xl drop-shadow-lg relative">{gender === Gender.BOY ? '👦' : '👧'}<div className="absolute inset-[-50%] bg-amber-400/20 blur-xl animate-flicker rounded-full -z-10" /></div>}
                  {enemies.map(e => e.pos.x === x && e.pos.y === y && <div key={e.id} className="z-20 text-3xl transform scale-x-[-1] animate-bounce">{e.type === EnemyType.SNAKE ? '🐍' : e.type === EnemyType.OWL ? '🦉' : '🦇'}</div>)}
                  {projectiles.map(p => Math.floor(p.pos.x) === x && Math.floor(p.pos.y) === y && <div key={p.id} className="z-40 text-2xl animate-pulse">🔥</div>)}
                </div>
              )))}
           </div>
        </div>
        <div className="md:hidden mt-8 flex gap-10 items-center">
           <div className="grid grid-cols-3 gap-2">
              <div /><button onTouchStart={() => movePlayer(0,-1)} className="w-14 h-14 bg-emerald-800 rounded-full font-black text-white text-xl">W</button><div />
              <button onTouchStart={() => movePlayer(-1,0)} className="w-14 h-14 bg-emerald-800 rounded-full font-black text-white text-xl">A</button>
              <button onTouchStart={() => movePlayer(0,1)} className="w-14 h-14 bg-emerald-800 rounded-full font-black text-white text-xl">S</button>
              <button onTouchStart={() => movePlayer(1,0)} className="w-14 h-14 bg-emerald-800 rounded-full font-black text-white text-xl">D</button>
           </div>
           <button onTouchStart={fireSpirit} className="w-24 h-24 bg-red-600 rounded-full border-4 border-red-900 shadow-xl flex flex-col items-center justify-center animate-pulse"><span className="text-3xl">🔥</span><span className="text-[10px] font-black uppercase text-white">Cast</span></button>
        </div>
      </main>

      <div className="fixed bottom-32 right-6 md:right-12 flex flex-col gap-3 z-40 opacity-70">
         <button onClick={() => setGameState(s => ({ ...s, isPaused: !s.isPaused }))} className="p-4 bg-black/80 rounded-full border border-emerald-500/50">{gameState.isPaused ? '▶️' : '⏸️'}</button>
         <button onClick={resetGame} className="p-4 bg-black/80 rounded-full border border-red-500/50">🔄</button>
      </div>

      {(gameState.isPaused || gameState.gameOver || gameState.victory) && gameState.storyStep === 'PLAYING' && !gameState.activeLore && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
           {gameState.gameOver ? (
             <div className="space-y-6">
                <h2 className="text-6xl font-black text-red-600 font-fancy uppercase">Fallen</h2>
                <button onClick={resetGame} className="px-10 py-4 bg-red-600 rounded-full font-black uppercase text-xl">Resurrect</button>
             </div>
           ) : gameState.victory ? (
             <div className="space-y-6">
                <h2 className="text-6xl font-black text-amber-500 font-fancy uppercase">Floor Cleared</h2>
                <button onClick={nextLevel} className="px-10 py-4 bg-amber-500 text-black rounded-full font-black uppercase text-xl">Descend ➡️</button>
             </div>
           ) : (
             <div className="space-y-10 w-full max-w-sm">
                <h2 className="text-5xl font-black font-fancy uppercase text-emerald-400">Zoltan Menu</h2>
                <div className="grid gap-4">
                  <button onClick={() => setGameState(s => ({ ...s, isPaused: false }))} className="w-full py-4 bg-emerald-600 rounded-xl font-bold uppercase">Continue</button>
                  <button onClick={resetGame} className="w-full py-4 bg-red-600/50 rounded-xl font-bold uppercase">Restart</button>
                </div>
             </div>
           )}
        </div>
      )}

      <div className="w-full bg-black/90 border-t border-emerald-900/40 p-2 text-center mt-auto">
         <footer className="flex flex-col sm:flex-row justify-between px-6 py-2 text-[10px] font-bold text-emerald-900/40 uppercase tracking-widest">
            <p>(C) NOAM GOLD AI 2026</p>
            <div className="flex gap-4 items-center">
              <a href="mailto:goldnoamai@gmail.com" className="hover:text-emerald-400 transition-colors">goldnoamai@gmail.com</a>
              <span>|</span>
              <button className="hover:text-emerald-400">Send Feedback</button>
            </div>
         </footer>
      </div>
    </div>
  );
}