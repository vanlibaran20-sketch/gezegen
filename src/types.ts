export interface UpgradeItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlocked: boolean;
  type: 'color' | 'ship' | 'weapon';
  value: string;
}

export interface GameStats {
  score: number;
  coins: number;
  level: number;
  enemiesKilled: number;
  bossesKilled: number;
  highScore: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
}

export interface Bullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  color: string;
  damage: number;
  isPlayer: boolean;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'meteor' | 'scout' | 'destroyer' | 'boss' | 'mini_boss' | 'wasp' | 'mantis' | 'kamikaze';
  health: number;
  maxHealth: number;
  speedX: number;
  speedY: number;
  shootCooldown: number;
  color: string;
  points: number;
  coins: number;
  sizeMultiplier?: number;
}

export interface PowerUp {
  x: number;
  y: number;
  type: 'shield' | 'triple' | 'health' | 'bomb';
  radius: number;
  speedY: number;
  color: string;
  pulse: number;
}

export interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}
