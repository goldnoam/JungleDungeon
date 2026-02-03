import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Position, TileType, Enemy, EnemyType, Gender, CharacterClass, Theme, Weather, GameState, HighScoreEntry, Projectile 
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

const getPlayerEmoji = (charClass: CharacterClass, gender: Gender) => {
  if (charClass === CharacterClass.KNIGHT) return gender === Gender.BOY ? '🤺' : '🤺'; // Or 💂 / 💂‍♀️
  if (charClass === CharacterClass.ROGUE) return '🥷';
  if (charClass === CharacterClass.WIZARD) return gender === Gender.BOY ? '🧙‍♂️' : '🧙‍♀️';
  return '👦';
};

const StoryOverlay: React.FC<{ 
  type: 'INTRO' | 'ENDGAME' | 'LORE'; 
  text?: string; 
  onClose: (data?: { gender: Gender; charClass: CharacterClass }) => void;
  currentGender?: Gender;
  currentClass?: CharacterClass;
}> = ({ type, text, onClose, currentGender, currentClass }) => {
  const [selectedGender, setSelectedGender] = useState<Gender>(currentGender || Gender.BOY);
  const [selectedClass, setSelectedClass] = useState<CharacterClass>(currentClass || CharacterClass.KNIGHT);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-6 animate-in fade-in zoom-in duration-300">
      <div className="max-w-xl w-full text-center space-y-8 p-10 border-2 border-emerald-900/50 rounded-3xl bg-emerald-950/20 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-30" />
        {type === 'INTRO' && (
          <>
            <h1 className="text-5xl md:text-6xl font-black font-fancy text-emerald-400 tracking-tighter uppercase italic">The Jungle Depths</h1>
            
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">Choose Your Avatar</p>
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => setSelectedGender(Gender.BOY)} 
                    className={`px-6 py-3 rounded-xl border-2 transition-all ${selectedGender === Gender.BOY ? 'bg-emerald-600 border-emerald-400 scale-110 shadow-lg' : 'bg-black/40 border-emerald-900/30'}`}
                  >
                    👦 Boy
                  </button>
                  <button 
                    onClick={() => setSelectedGender(Gender.GIRL)} 
                    className={`px-6 py-3 rounded-xl border-2 transition-all ${selectedGender === Gender.GIRL ? 'bg-emerald-600 border-emerald-400 scale-110 shadow-lg' : 'bg-black/40 border-emerald-900/30'}`}
                  >
                    👧 Girl
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">Choose Your Class</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: CharacterClass.KNIGHT, label: 'Knight', icon: '🤺' },
                    { id: CharacterClass.ROGUE, label: 'Rogue', icon: '🥷' },
                    { id: CharacterClass.WIZARD, label: 'Wizard', icon: '🧙' },
                  ].map((cls) => (
                    <button 
                      key={cls.id}
                      onClick={() => setSelectedClass(cls.id)} 
                      className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${selectedClass === cls.id ? 'bg-emerald-600 border-emerald-400 scale-105 shadow-xl' : 'bg-black/40 border-emerald-900/30 hover:bg-black/60'}`}
                    >
                      <span className="text-3xl mb-1">{cls.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-tighter">{cls.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => onClose({ gender: selectedGender, charClass: selectedClass })} 
              className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-2xl font-black transition-all hover:scale-105 shadow-lg uppercase"
            >
              Enter the Abyss
            </button>
          </>
        )}
        {type === 'ENDGAME' && (
          <>
            <h1 className="text-5xl md:text-6xl font-black font-fancy text-yellow-400 animate-pulse uppercase">Immortal Victory</h1>
            <div className="space-y-4 text-xl text-yellow-100/80 italic">
              <p>The deep jungle falls silent as you emerge with the <span className="text-amber-400 font-bold">Great Relic</span>.</p>
            </div>
            <button onClick={() => onClose()} className="px-12 py-5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full text-2xl font-black transition-all uppercase">New Legend</button>
          </>
        )}
        {type === 'LORE' && (
          <div className="bg-amber-50 text-amber-900 p-8 rounded-xl border-4 border-amber-800 shadow-2xl font-serif">
            <h3 className="text-xl font-bold border-b-2 border-amber-800/20 pb-2 mb-4">Ancient Inscription</h3>
            <p className="text-2xl italic leading-relaxed">"{text}"</p>
            <button onClick={() => onClose()} className="mt-8 px-8 py-3 bg-amber-800 text-white font-bold rounded-lg hover:bg-amber-900 shadow-lg transition-transform active:scale-95">Close Parchment</button>
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
  const [charClass, setCharClass] = useState<CharacterClass>(CharacterClass.KNIGHT);
  const [theme, setTheme] = useState<Theme>(Theme.DARK);
  const [weather, setWeather] = useState<Weather>(Weather.CLEAR);
  const [isDay, setIsDay] = useState(false);
  const [isPowerupActive, setIsPowerupActive] = useState(false);
  const [highScores, setHighScores] = useState<HighScoreEntry[]>([]);

  const gameTimerRef = useRef<any>(null);
  const enemyTimerRef = useRef<any>(null);
  const projTimerRef = useRef<any>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasSavedScoreRef = useRef(false);

  const initLevel = useCallback((levelNum: number, currentScore: number) => {
    const newMaze = generateMaze(GRID_SIZE);
    hasSavedScoreRef.current = false;
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (newMaze[i][j] === TileType.PATH && Math.random() < 0.12) newMaze[i][j] = TileType.COIN;
        if (newMaze[i][j] === TileType.PATH && Math.random() < 0.03) newMaze[i][j] = TileType.POWERUP;
        if (newMaze[i][j] === TileType.PATH && Math.random() < 0.015) newMaze[i][j] = TileType.SCROLL;
      }
    }
    const newEnemies: Enemy[] = [];
    const enemyCount = Math.min(levelNum + 2, 15);
    for (let i = 0; i < enemyCount; i++) {
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
      timeRemaining: INITIAL_TIME + (levelNum * 4),
      isPaused: levelNum === 1,
      gameOver: false,
      victory: false,
      storyStep: levelNum === 1 ? 'INTRO' : 'PLAYING'
    }));
    setWeather([Weather.CLEAR, Weather.RAIN, Weather.MIST][Math.floor(Math.random() * 3)]);
    setIsDay(Math.random() > 0.7);
  }, []);

  useEffect(() => {
    initLevel(1, 0);
    const stored = localStorage.getItem('jungle-explorer-scores');
    if (stored) setHighScores(JSON.parse(stored));
  }, [initLevel]);

  useEffect(() => {
    if ((gameState.gameOver || (gameState.victory && gameState.storyStep === 'ENDGAME')) && !hasSavedScoreRef.current) {
      hasSavedScoreRef.current = true;
      const entry: HighScoreEntry = {
        name: `Explorer ${Math.floor(Math.random() * 999)}`,
        score: gameState.score,
        date: new Date().toLocaleDateString()
      };
      setHighScores(prev => {
        const next = [...prev, entry].sort((a, b) => b.score - a.score).slice(0, 5);
        localStorage.setItem('jungle-explorer-scores', JSON.stringify(next));
        return next;
      });
    }
  }, [gameState.gameOver, gameState.victory, gameState.storyStep, gameState.score]);

  useEffect(() => {
    if (!viewportRef.current) return;
    const tileWidth = 40; 
    viewportRef.current.style.setProperty('--player-x', `${(playerPos.x * tileWidth) + (tileWidth / 2)}px`);
    viewportRef.current.style.setProperty('--player-y', `${(playerPos.y * tileWidth) + (tileWidth / 2)}px`);
    let radius = '120px';
    if (theme === Theme.BRIGHT) radius = '3000px';
    else if (isPowerupActive) radius = '250px';
    else if (isDay) radius = '450px';
    viewportRef.current.style.setProperty('--radius', radius);
  }, [playerPos, theme, isPowerupActive, isDay]);

  const fireSpirit = useCallback(() => {
    if (gameState.isPaused || gameState.gameOver || gameState.victory) return;
    setProjectiles(prev => [...prev, { id: Math.random().toString(), pos: { ...playerPos }, dir: { ...playerFacing } }]);
  }, [playerPos, playerFacing, gameState.isPaused, gameState.gameOver, gameState.victory]);

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
      if (maze[ny][nx] === TileType.COIN) { newMaze[ny][nx] = TileType.PATH; scoreAdd = 20; }
      else if (maze[ny][nx] === TileType.SCROLL) { newMaze[ny][nx] = TileType.PATH; loreAdd = LORE_POOL[Math.floor(Math.random() * LORE_POOL.length)]; scoreAdd = 75; }
      else if (maze[ny][nx] === TileType.POWERUP) { newMaze[ny][nx] = TileType.PATH; setIsPowerupActive(true); setTimeout(() => setIsPowerupActive(false), POWERUP_DURATION); }
      else if (maze[ny][nx] === TileType.TREASURE) { 
        if (gameState.level >= 10) setGameState(s => ({ ...s, storyStep: 'ENDGAME', victory: true }));
        else setGameState(s => ({ ...s, victory: true }));
      }
      setMaze(newMaze);
      setGameState(s => ({ ...s, score: s.score + scoreAdd, activeLore: loreAdd || s.activeLore, isPaused: loreAdd ? true : s.isPaused }));
      return { x: nx, y: ny };
    });
  }, [maze, gameState.gameOver, gameState.victory, gameState.isPaused, gameState.level]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState.activeLore) {
        if (['Enter', 'Escape', ' '].includes(e.key)) setGameState(s => ({ ...s, activeLore: null, isPaused: false }));
        return;
      }
      switch (e.key.toLowerCase()) {
        case 'arrowup': case 'w': movePlayer(0, -1); break;
        case 'arrowdown': case 's': movePlayer(0, 1); break;
        case 'arrowleft': case 'a': movePlayer(-1, 0); break;
        case 'arrowright': case 'd': movePlayer(1, 0); break;
        case ' ': fireSpirit(); break;
        case 'p': setGameState(s => ({ ...s, isPaused: !s.isPaused })); break;
        case 'r': resetGame(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [movePlayer, fireSpirit, gameState.activeLore, gameState.isPaused]);

  useEffect(() => {
    if (gameState.isPaused || gameState.gameOver || gameState.victory) return;
    gameTimerRef.current = setInterval(() => setGameState(s => s.timeRemaining <= 1 ? { ...s, gameOver: true, timeRemaining: 0 } : { ...s, timeRemaining: s.timeRemaining - 1 }), 1000);
    enemyTimerRef.current = setInterval(() => setEnemies(prev => prev.map(e => {
      const move = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}][Math.floor(Math.random()*4)];
      const nx = e.pos.x + move.x, ny = e.pos.y + move.y;
      return (nx>=0 && nx<GRID_SIZE && ny>=0 && ny<GRID_SIZE && maze[ny][nx] !== TileType.WALL) ? { ...e, pos: { x: nx, y: ny } } : e;
    })), 450);
    projTimerRef.current = setInterval(() => setProjectiles(prev => prev.map(p => ({ ...p, pos: { x: p.pos.x + p.dir.x, y: p.pos.y + p.dir.y } })).filter(p => {
      const ix = Math.floor(p.pos.x);
      const iy = Math.floor(p.pos.y);
      return ix>=0 && ix<GRID_SIZE && iy>=0 && iy<GRID_SIZE && maze[iy][ix] !== TileType.WALL;
    })), 80);
    return () => { clearInterval(gameTimerRef.current); clearInterval(enemyTimerRef.current); clearInterval(projTimerRef.current); };
  }, [gameState.isPaused, gameState.gameOver, gameState.victory, maze]);

  useEffect(() => {
    setEnemies(prev => {
      const survivors = prev.filter(e => !projectiles.some(p => Math.floor(p.pos.x) === e.pos.x && Math.floor(p.pos.y) === e.pos.y));
      if (survivors.length < prev.length) setGameState(s => ({ ...s, score: s.score + 100 }));
      return survivors;
    });
  }, [projectiles]);

  useEffect(() => {
    if (!isPowerupActive && enemies.some(e => e.pos.x === playerPos.x && e.pos.y === playerPos.y)) setGameState(s => ({ ...s, gameOver: true }));
  }, [playerPos, enemies, isPowerupActive]);

  const resetGame = () => initLevel(1, 0);
  const nextLevel = () => initLevel(gameState.level + 1, gameState.score);

  return (
    <div className={`fixed inset-0 flex flex-col transition-all duration-700 select-none ${THEMES[theme]}`}>
      {gameState.storyStep === 'INTRO' && (
        <StoryOverlay 
          type="INTRO" 
          currentGender={gender}
          currentClass={charClass}
          onClose={(data) => {
            if (data) {
              setGender(data.gender);
              setCharClass(data.charClass);
            }
            setGameState(s => ({ ...s, isPaused: false, storyStep: 'PLAYING' }));
          }} 
        />
      )}
      {gameState.activeLore && <StoryOverlay type="LORE" text={gameState.activeLore} onClose={() => setGameState(s => ({ ...s, activeLore: null, isPaused: false }))} />}
      {gameState.storyStep === 'ENDGAME' && gameState.victory && <StoryOverlay type="ENDGAME" onClose={resetGame} />}

      <header className="p-4 bg-black/70 backdrop-blur-lg flex justify-between items-center border-b border-white/5 z-50 shadow-2xl">
        <div className="flex gap-4 md:gap-10 text-center">
          <div className="group transition-transform hover:scale-110">
            <p className="text-[10px] text-emerald-400 font-bold tracking-[0.2em] uppercase mb-0.5">Floor</p>
            <p className="text-xl font-fancy text-white drop-shadow-md">{gameState.level}</p>
          </div>
          <div className="group transition-transform hover:scale-110">
            <p className="text-[10px] text-amber-500 font-bold tracking-[0.2em] uppercase mb-0.5">Wealth</p>
            <p className="text-xl font-fancy text-amber-400 drop-shadow-md">{gameState.score}</p>
          </div>
          <div className="group transition-transform hover:scale-110">
            <p className="text-[10px] text-blue-400 font-bold tracking-[0.2em] uppercase mb-0.5">Time</p>
            <p className={`text-xl font-fancy drop-shadow-md ${gameState.timeRemaining < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{gameState.timeRemaining}s</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setTheme(t => t === Theme.DARK ? Theme.BRIGHT : t === Theme.BRIGHT ? Theme.COLORFUL : Theme.DARK)} 
             className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full border border-white/10 hover:bg-white/20 transition-all active:scale-90" 
             title="Change Theme"
           >
             {theme === Theme.DARK ? '🕯️' : theme === Theme.BRIGHT ? '☀️' : '🌈'}
           </button>
           <button 
             onClick={() => setGameState(s => ({ ...s, isPaused: !s.isPaused }))} 
             className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95"
           >
             {gameState.isPaused ? 'Resume' : 'Menu'}
           </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="max-w-full max-h-full flex items-center justify-center">
          <div ref={viewportRef} className={`relative rounded-3xl border-4 border-emerald-900/50 bg-black overflow-hidden flex-shrink-0 transition-transform duration-500 shadow-[0_0_60px_rgba(0,0,0,0.8)]`} style={{ width: `${GRID_SIZE * 40}px`, height: `${GRID_SIZE * 40}px`, transform: `scale(${window.innerWidth < 640 ? window.innerWidth / (GRID_SIZE * 46) : 1})` }}>
             {!isDay && <div className="absolute inset-0 bg-indigo-950/50 mix-blend-multiply z-10 pointer-events-none" />}
             
             {/* Weather Overlays */}
             {weather === Weather.RAIN && (
               <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden opacity-30">
                 {Array.from({length: 40}).map((_, i) => (
                   <div key={i} className="absolute w-[1.5px] h-6 bg-blue-300 animate-rain" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDuration: `${0.3 + Math.random() * 0.4}s`, animationDelay: `${Math.random()}s` }} />
                 ))}
               </div>
             )}
             {weather === Weather.MIST && <div className="absolute inset-0 z-20 pointer-events-none bg-white/5 blur-[80px] opacity-40 animate-pulse" />}
             
             <div className="grid dynamic-light-mask" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                {maze.map((row, y) => row.map((tile, x) => (
                  <div key={`${x}-${y}`} className={`w-10 h-10 flex items-center justify-center text-2xl relative border-[0.2px] border-white/5 ${tile === TileType.WALL ? TILE_COLORS.WALL[theme] : TILE_COLORS.PATH[theme]}`}>
                    {tile === TileType.COIN && <span className="animate-float drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">🟡</span>}
                    {tile === TileType.POWERUP && <span className="animate-pulse-fast drop-shadow-[0_0_8px_#fbbf24]">⚡</span>}
                    {tile === TileType.SCROLL && <span className="animate-bounce drop-shadow-md">📜</span>}
                    {tile === TileType.TREASURE && <span className="drop-shadow-[0_0_15px_gold] animate-pulse">💎</span>}
                    {tile === TileType.WALL && <span className="opacity-30 grayscale blur-[0.5px]">🌳</span>}
                    
                    {playerPos.x === x && playerPos.y === y && (
                      <div className="z-30 text-3xl drop-shadow-2xl relative flex items-center justify-center">
                        {getPlayerEmoji(charClass, gender)}
                        <div className={`absolute inset-[-60%] ${isPowerupActive ? 'bg-amber-400' : 'bg-emerald-400/30'} blur-2xl animate-flicker rounded-full -z-10`} />
                        {isPowerupActive && <div className="absolute -top-6 text-sm animate-bounce font-black text-amber-400">POWER</div>}
                      </div>
                    )}
                    
                    {enemies.map(e => e.pos.x === x && e.pos.y === y && (
                      <div key={e.id} className="z-20 text-3xl transform scale-x-[-1] animate-bounce drop-shadow-xl">
                        {e.type === EnemyType.SNAKE ? '🐍' : e.type === EnemyType.OWL ? '🦉' : '🦇'}
                      </div>
                    ))}
                    
                    {projectiles.map(p => Math.floor(p.pos.x) === x && Math.floor(p.pos.y) === y && (
                      <div key={p.id} className="z-40 text-2xl animate-pulse filter drop-shadow-[0_0_10px_red]">🔥</div>
                    ))}
                  </div>
                )))}
             </div>
          </div>
        </div>
        
        {/* Mobile WASD Controls */}
        <div className="md:hidden mt-8 flex gap-12 items-center select-none p-4 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10">
           <div className="grid grid-cols-3 gap-3">
              <div />
              <button 
                onTouchStart={(e) => { e.preventDefault(); movePlayer(0,-1); }} 
                className="w-16 h-16 bg-emerald-800/60 active:bg-emerald-500 rounded-2xl font-black text-white text-2xl flex items-center justify-center shadow-xl border-b-4 border-emerald-950 transition-all active:translate-y-1"
              >W</button>
              <div />
              <button 
                onTouchStart={(e) => { e.preventDefault(); movePlayer(-1,0); }} 
                className="w-16 h-16 bg-emerald-800/60 active:bg-emerald-500 rounded-2xl font-black text-white text-2xl flex items-center justify-center shadow-xl border-b-4 border-emerald-950 transition-all active:translate-y-1"
              >A</button>
              <button 
                onTouchStart={(e) => { e.preventDefault(); movePlayer(0,1); }} 
                className="w-16 h-16 bg-emerald-800/60 active:bg-emerald-500 rounded-2xl font-black text-white text-2xl flex items-center justify-center shadow-xl border-b-4 border-emerald-950 transition-all active:translate-y-1"
              >S</button>
              <button 
                onTouchStart={(e) => { e.preventDefault(); movePlayer(1,0); }} 
                className="w-16 h-16 bg-emerald-800/60 active:bg-emerald-500 rounded-2xl font-black text-white text-2xl flex items-center justify-center shadow-xl border-b-4 border-emerald-950 transition-all active:translate-y-1"
              >D</button>
           </div>
           <button 
             onTouchStart={(e) => { e.preventDefault(); fireSpirit(); }} 
             className="w-24 h-24 bg-gradient-to-br from-red-600 to-orange-600 active:from-red-500 active:to-orange-500 rounded-full border-4 border-red-900 shadow-[0_0_30px_rgba(220,38,38,0.4)] flex flex-col items-center justify-center animate-pulse transition-transform active:scale-90"
           >
             <span className="text-4xl">🔥</span>
             <span className="text-[10px] font-black uppercase text-white mt-1 tracking-tighter">Banish</span>
           </button>
        </div>
      </main>

      <div className="fixed bottom-32 right-6 md:right-12 flex flex-col gap-4 z-40">
         <button onClick={() => setGameState(s => ({ ...s, isPaused: !s.isPaused }))} className="p-4 bg-black/60 hover:bg-black/90 rounded-full border border-emerald-500/30 shadow-2xl text-xl backdrop-blur-xl transition-all active:scale-90 flex items-center justify-center" title="Pause Game">{gameState.isPaused ? '▶️' : '⏸️'}</button>
         <button onClick={resetGame} className="p-4 bg-black/60 hover:bg-black/90 rounded-full border border-red-500/30 shadow-2xl text-xl backdrop-blur-xl transition-all active:scale-90 flex items-center justify-center" title="Reset Current Floor">🔄</button>
      </div>

      {(gameState.isPaused || gameState.gameOver || gameState.victory) && gameState.storyStep === 'PLAYING' && !gameState.activeLore && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
           {gameState.gameOver ? (
             <div className="space-y-8 animate-in slide-in-from-bottom-10">
                <h2 className="text-7xl font-black text-red-600 font-fancy uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(220,38,38,0.6)]">Fallen</h2>
                <div className="text-xl text-emerald-100/60 italic max-w-xs">The spirits of Zoltan reclaim another treasure hunter...</div>
                <button onClick={resetGame} className="px-14 py-6 bg-red-600 hover:bg-red-500 text-white rounded-full font-black uppercase text-2xl shadow-[0_10px_40px_rgba(220,38,38,0.5)] transition-all hover:scale-110 active:scale-95">Resurrect</button>
             </div>
           ) : gameState.victory ? (
             <div className="space-y-8 animate-in zoom-in-50">
                <h2 className="text-7xl font-black text-amber-500 font-fancy uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]">Glorious</h2>
                <div className="text-xl text-emerald-100/60 italic max-w-xs">You conquered Floor {gameState.level}. The deep jungle awaits.</div>
                <button onClick={nextLevel} className="px-14 py-6 bg-amber-500 hover:bg-amber-400 text-black rounded-full font-black uppercase text-2xl shadow-[0_10px_40px_rgba(245,158,11,0.5)] transition-all hover:scale-110 active:scale-95">Descend ➡️</button>
             </div>
           ) : (
             <div className="space-y-8 w-full max-w-md bg-emerald-950/10 p-10 rounded-[40px] border border-white/5 shadow-3xl backdrop-blur-2xl">
                <h2 className="text-5xl font-black font-fancy uppercase text-emerald-400 tracking-tight">Abyssal Menu</h2>
                <div className="grid gap-4">
                  <button onClick={() => setGameState(s => ({ ...s, isPaused: false }))} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95">Continue Hunt</button>
                  <button 
                    onClick={() => setGameState(s => ({ ...s, storyStep: 'INTRO', isPaused: true }))} 
                    className="w-full py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest transition-all border border-white/10 active:scale-95"
                  >
                    Change Character
                  </button>
                  <button onClick={resetGame} className="w-full py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest transition-all border border-white/10 active:scale-95">New Expedition</button>
                </div>
                
                {highScores.length > 0 && (
                  <div className="bg-black/50 p-6 rounded-3xl border border-white/5 text-left mt-10">
                    <h3 className="text-amber-500 text-xs uppercase tracking-[0.3em] font-black mb-6 flex items-center justify-between">
                       Hall of Legends
                       <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
                    </h3>
                    <div className="space-y-3">
                      {highScores.map((h, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="text-white/20 font-mono italic">#{i+1}</span>
                            <span className="text-emerald-100/80 font-bold">{h.name}</span>
                          </div>
                          <span className="text-amber-400 font-mono font-black">{h.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>
           )}
        </div>
      )}

      <footer className="w-full bg-black/95 border-t border-white/5 p-4 z-50">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-black text-white/20 uppercase tracking-[0.4em]">
            <p className="hover:text-emerald-500 transition-colors duration-500">(C) NOAM GOLD AI 2026</p>
            <div className="flex gap-8 items-center">
              <span className="hover:text-emerald-400 transition-colors duration-300">Send Feedback</span>
              <a href="mailto:goldnoamai@gmail.com" className="hover:text-emerald-400 transition-colors duration-300 normal-case tracking-normal">goldnoamai@gmail.com</a>
            </div>
         </div>
      </footer>
    </div>
  );
}