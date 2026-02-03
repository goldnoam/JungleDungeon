export const GRID_SIZE = 17; // Should be odd for maze generation
export const INITIAL_TIME = 60;
export const POWERUP_DURATION = 5000;
export const TICK_RATE = 200; // ms per game tick
export const ENEMY_TICK_RATE = 400;

export const THEMES = {
  BRIGHT: 'bg-green-50 text-emerald-950',
  DARK: 'bg-slate-950 text-white',
  COLORFUL: 'bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 text-white'
};

export const TILE_COLORS = {
  WALL: {
    BRIGHT: 'bg-emerald-800 border-emerald-900 shadow-sm',
    DARK: 'bg-emerald-950 border-emerald-900/30',
    COLORFUL: 'bg-purple-900/80 border-pink-500/30 shadow-[0_0_15px_rgba(219,39,119,0.2)]'
  },
  PATH: {
    BRIGHT: 'bg-amber-50',
    DARK: 'bg-slate-900',
    COLORFUL: 'bg-indigo-900/20'
  }
};