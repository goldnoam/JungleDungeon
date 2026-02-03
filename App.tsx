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

// --- Sub-components ---

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
            <h1 className="text-5xl md:text-6xl font-black font-fancy text-emerald-400 tracking-tighter uppercase italic drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">The Jungle Depths</h1>
            <div className="space-y-4 text-lg md:text-xl text-emerald-100/80 leading-relaxed font-light italic">
              <p>For centuries, the <span className="text-amber-400 font-bold">Zoltan Gold</span> lay dormant beneath the ancient foliage.</p>
              <p>You have been chosen to retrieve the relics. But you are not alone...</p>
              <p className="text-red-400 font-bold mt-4 uppercase tracking-widest text-sm">Beware the Predators. Use your Spirit Fire.</p>
            </div>
            <button 
              onClick={onClose}
              className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-2xl font-black transition-all hover:scale-105 shadow-[0_0_30px_rgba(5,150,105,0.4)] uppercase"
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
          <div className="bg-amber-50 text-amber-900 p-8 rounded-xl border-4 border-amber-800 shadow-2xl transform -rotate-1 font-serif animate-flicker">
            <h3 className="text-xl font-bold border-b-2 border-amber-800/20 pb-2 mb-4">Ancient Inscription</h3>
            <p className="text-2xl italic leading-relaxed">"{text}"</p>
            <button onClick={onClose} className="mt-8 px-8 py-3 bg-amber-800 text-white font-bold rounded-lg hover:bg-amber-900 transition-colors shadow-lg">Close Parchment</button>
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

  useEffect(() => {
    if (!viewportRef.current) return;
    const tileWidth = 40; 
    const x = (playerPos.x * tileWidth) + (tileWidth / 2);
    const y = (playerPos.y * tileWidth) + (tileWidth / 2);
    viewportRef.current.style.setProperty('--player-x', `${x}px`);
    viewportRef.current.style.setProperty('--player-y', `${y}px`);
    
    let radius = '120px';
    if (theme === Theme.BRIGHT) radius = '3000px';
    if (isPowerupActive) radius = '250px';
    if (isDay) radius = '500px';
    viewportRef.current.style.setProperty('--radius', radius);
  }, [playerPos, theme, isPowerupActive, isDay]);

  const initLevel = useCallback((levelNum: number, currentScore: number) => {
    const newMaze = generateMaze(GRID_SIZE);
    
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (newMaze[i][j] === TileType.PATH && Math.random() < 0.1) {
          newMaze[i][j] = TileType.COIN;
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
    initLevel