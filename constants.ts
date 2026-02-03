
export const GRID_SIZE = 17; // Should be odd for maze generation
export const INITIAL_TIME = 60;
export const POWERUP_DURATION = 5000;
export const TICK_RATE = 200; // ms per game tick
export const ENEMY_TICK_RATE = 400;

export const THEMES = {
  BRIGHT: 'bg-green-50',
  DARK: 'bg-slate-950',
  COLORFUL: 'bg-emerald-900'
};

export const TILE_COLORS = {
  WALL: {
    BRIGHT: 'bg-emerald-800',
    DARK: 'bg-emerald-950',
    COLORFUL: 'bg-purple-900'
  },
  PATH: {
    BRIGHT: 'bg-amber-100',
    DARK: 'bg-slate-900',
    COLORFUL: 'bg-teal-900'
  }
};
