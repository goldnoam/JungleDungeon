
export type Position = {
  x: number;
  y: number;
};

export enum TileType {
  WALL = 'WALL',
  PATH = 'PATH',
  COIN = 'COIN',
  TREASURE = 'TREASURE',
  POWERUP = 'POWERUP',
  SCROLL = 'SCROLL'
}

export enum EnemyType {
  SNAKE = 'SNAKE',
  OWL = 'OWL',
  BAT = 'BAT'
}

export enum Gender {
  BOY = 'BOY',
  GIRL = 'GIRL'
}

export enum Theme {
  BRIGHT = 'BRIGHT',
  DARK = 'DARK',
  COLORFUL = 'COLORFUL'
}

export enum Weather {
  CLEAR = 'CLEAR',
  RAIN = 'RAIN',
  MIST = 'MIST'
}

export interface Enemy {
  id: string;
  type: EnemyType;
  pos: Position;
  direction: Position;
}

export interface Projectile {
  id: string;
  pos: Position;
  dir: Position;
}

export interface GameState {
  level: number;
  score: number;
  highScore: number;
  timeRemaining: number;
  isPaused: boolean;
  gameOver: boolean;
  victory: boolean;
  coinsCollected: number;
  totalCoinsInLevel: number;
  storyStep: number;
  activeLore: string | null;
}

export interface HighScoreEntry {
  name: string;
  score: number;
  date: string;
}
