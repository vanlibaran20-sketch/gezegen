/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  ShoppingBag, 
  Shield, 
  Zap, 
  Heart, 
  Award, 
  Coins, 
  Trophy, 
  Gauge, 
  Sparkles, 
  ChevronRight, 
  Info, 
  Volume1,
  Gamepad2,
  Moon,
  BarChart3,
  Maximize2,
  Minimize2,
  Target,
  Smartphone,
  Laptop,
  Wifi,
  Battery,
  Terminal,
  Activity
} from 'lucide-react';
import { soundEngine } from './components/SoundEngine';
import { MatrixBackground } from './components/MatrixBackground';
import { 
  Star, 
  Bullet, 
  Enemy, 
  PowerUp, 
  Particle, 
  UpgradeItem, 
  GameStats 
} from './types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Game state representation
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'LEVEL_COMPLETED' | 'UPGRADES' | 'GAMEOVER' | 'VICTORY'>('START');
  
  // Rewarded Ad Simulation States
  const [rewardedAdActive, setRewardedAdActive] = useState(false);
  const [rewardedAdCount, setRewardedAdCount] = useState(5);
  const [rewardedAdStatus, setRewardedAdStatus] = useState<'LOADING' | 'PLAYING' | 'REWARDED'>('LOADING');
  
  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const savedStatsItem = localStorage.getItem('space_shooter_saved_stats');
      if (savedStatsItem) {
        const saved = JSON.parse(savedStatsItem);
        return {
          score: saved.score ?? 0,
          coins: saved.coins ?? 0,
          level: saved.level ?? 1,
          enemiesKilled: saved.enemiesKilled ?? 0,
          bossesKilled: saved.bossesKilled ?? 0,
          highScore: parseInt(localStorage.getItem('space_high_score') || '1000', 10),
        };
      }
    } catch (e) {}
    return {
      score: 0,
      coins: 0,
      level: 1,
      enemiesKilled: 0,
      bossesKilled: 0,
      highScore: parseInt(localStorage.getItem('space_high_score') || '1000', 10),
    };
  });

  const [, startTransition] = useTransition();

  // Settings & Upgrades
  const [isMuted, setIsMuted] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(0.6);
  const [musicVolume, setMusicVolume] = useState(0.2);
  const [selectedShipColor, setSelectedShipColor] = useState(() => {
    try {
      return localStorage.getItem('space_shooter_saved_color') || '#d946ef';
    } catch(e) {
      return '#d946ef';
    }
  }); // Default rich magenta/pink
  
  const [activeWeapon, setActiveWeapon] = useState<'standard' | 'triple' | 'lightning'>(() => {
    try {
      return (localStorage.getItem('space_shooter_saved_weapon') as any) || 'standard';
    } catch(e) {
      return 'standard';
    }
  });
  const [autoFire, setAutoFire] = useState(true);
  const [isImmersive, setIsImmersive] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Mobil Uygulama Simulasyon State'leri
  const [isMobileMode, setIsMobileMode] = useState(true); // default to true to deliver physical phone app experience
  const [mobileTab, setMobileTab] = useState<'play' | 'shop' | 'stats'>('play');
  const [phoneTime, setPhoneTime] = useState('13:42');
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickVec, setJoystickVec] = useState({ x: 0, y: 0 });

  // Shop Upgrades
  const [upgrades, setUpgrades] = useState<UpgradeItem[]>(() => {
    const defaultUpgrades: UpgradeItem[] = [
      { id: 'hp_max', name: 'Zırh Güçlendirmesi', description: 'Maksimum can değerini arttırır (+1 can)', cost: 120, unlocked: false, type: 'ship', value: '4' },
      { id: 'rate_of_fire', name: 'Lazer Hızı', description: 'Atış sıklığını arttırır', cost: 180, unlocked: false, type: 'weapon', value: '250' }, // fire interval ms
      { id: 'weapon_triple', name: 'Üçlü Plazma Lazer', description: 'Yana doğru 3 farklı plazma mermisi ateşler', cost: 350, unlocked: false, type: 'weapon', value: 'triple' },
      { id: 'weapon_lightning', name: 'Yıldırım Aşım Modu', description: 'Yüklü güçlü yıldırım ışını fırlatır', cost: 650, unlocked: false, type: 'weapon', value: 'lightning' },
      { id: 'ship_vanguard', name: 'Vanguard Zırhı', description: 'Ultra dayanıklı neon yeşili kaplama ve manyetizma', cost: 250, unlocked: false, type: 'color', value: '#10b981' },
      { id: 'ship_phoenix', name: 'Phoenix Zırhı', description: 'Güneş patlaması rengi ve ekstra hız', cost: 400, unlocked: false, type: 'color', value: '#f97316' },
    ];
    try {
      const savedUpgradesItem = localStorage.getItem('space_shooter_saved_upgrades');
      if (savedUpgradesItem) {
        return JSON.parse(savedUpgradesItem);
      }
    } catch(e) {}
    return defaultUpgrades;
  });

  // Active state references for the game loop (avoiding React re-render lag)
  const stateRef = useRef({
    player: {
      x: 200,
      y: 500,
      width: 48,
      height: 48,
      speed: 6,
      health: 3,
      maxHealth: 3,
      shield: 0, // seconds active
      color: '#d946ef',
      shootCooldown: 0,
      shootInterval: 350, // ms
      tilt: 0,
    },
    keys: {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
      ArrowDown: false,
      KeyA: false,
      KeyD: false,
      KeyW: false,
      KeyS: false,
      Space: false,
    },
    touch: {
      isDragging: false,
      lastX: 0,
      lastY: 0,
    },
    joystick: {
      active: false,
      startX: 0,
      startY: 0,
      curX: 0,
      curY: 0,
      vx: 0,
      vy: 0,
    },
    stars: [] as Star[],
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    powerUps: [] as PowerUp[],
    particles: [] as Particle[],
    gameTime: 0,
    score: 0,
    coins: 0,
    level: 1,
    lastEvoLevel: 1,
    evoSplashTimer: 0,
    bossAlertTimer: 0,
    levelUpAlertTimer: 0,
    spawnTimer: 0,
    bossSpawned: false,
    regularSpawned: false,
    lightningActive: false,
    lightningTimer: 0, // weapon duration
    tripleActive: false,
    tripleTimer: 0,
  });

  // Sound Sync Effect
  useEffect(() => {
    soundEngine.setSfxVolume(sfxVolume);
    soundEngine.setMusicVolume(musicVolume);
  }, [sfxVolume, musicVolume]);

  const toggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  // Listen for Escape key to exit modes
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsImmersive(false);
        setShowStatsModal(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Update virtual phone clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setPhoneTime(`${hrs}:${mins}`);
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 10000);
    return () => clearInterval(clockInterval);
  }, []);

  // Virtual touch joystick mouse and touch responders
  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    stateRef.current.joystick.active = true;
    stateRef.current.joystick.startX = cx;
    stateRef.current.joystick.startY = cy;
    stateRef.current.joystick.curX = touch.clientX;
    stateRef.current.joystick.curY = touch.clientY;
    setJoystickActive(true);
    
    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 38;
    
    let vx = dx;
    let vy = dy;
    if (dist > maxRadius) {
      vx = (dx / dist) * maxRadius;
      vy = (dy / dist) * maxRadius;
    }
    stateRef.current.joystick.vx = vx / maxRadius;
    stateRef.current.joystick.vy = vy / maxRadius;
    setJoystickVec({ x: vx, y: vy });
  };

  const handleJoystickTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!stateRef.current.joystick.active) return;
    const touch = e.touches[0];
    const js = stateRef.current.joystick;
    js.curX = touch.clientX;
    js.curY = touch.clientY;
    
    const dx = touch.clientX - js.startX;
    const dy = touch.clientY - js.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 38;
    
    let vx = dx;
    let vy = dy;
    if (dist > maxRadius) {
      vx = (dx / dist) * maxRadius;
      vy = (dy / dist) * maxRadius;
    }
    
    js.vx = vx / maxRadius;
    js.vy = vy / maxRadius;
    setJoystickVec({ x: vx, y: vy });
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const joystick = stateRef.current.joystick;
    joystick.active = false;
    joystick.vx = 0;
    joystick.vy = 0;
    setJoystickActive(false);
    setJoystickVec({ x: 0, y: 0 });
  };

  const handleJoystickMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    stateRef.current.joystick.active = true;
    stateRef.current.joystick.startX = cx;
    stateRef.current.joystick.startY = cy;
    stateRef.current.joystick.curX = e.clientX;
    stateRef.current.joystick.curY = e.clientY;
    setJoystickActive(true);

    const onMouseMove = (moveEv: MouseEvent) => {
      if (!stateRef.current.joystick.active) return;
      const js = stateRef.current.joystick;
      js.curX = moveEv.clientX;
      js.curY = moveEv.clientY;
      const dx = moveEv.clientX - js.startX;
      const dy = moveEv.clientY - js.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxRadius = 38;
      
      let vx = dx;
      let vy = dy;
      if (dist > maxRadius) {
        vx = (dx / dist) * maxRadius;
        vy = (dy / dist) * maxRadius;
      }
      js.vx = vx / maxRadius;
      js.vy = vy / maxRadius;
      setJoystickVec({ x: vx, y: vy });
    };

    const onMouseUp = () => {
      const joystick = stateRef.current.joystick;
      joystick.active = false;
      joystick.vx = 0;
      joystick.vy = 0;
      setJoystickActive(false);
      setJoystickVec({ x: 0, y: 0 });
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Pre-generate starfield
  useEffect(() => {
    const stars: Star[] = [];
    const colors = ['#a7f3d0', '#34d399', '#22c55e', '#10b981', '#15803d', '#166534'];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * 500,
        y: Math.random() * 800,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 2 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    stateRef.current.stars = stars;
  }, []);

  // Sync upgrade states with the game loop parameters
  const applyUpgradesToPlayer = () => {
    const levelMaxUp = upgrades.find(u => u.id === 'hp_max')?.unlocked;
    const rateOfFireUp = upgrades.find(u => u.id === 'rate_of_fire')?.unlocked;
    
    const p = stateRef.current.player;
    p.maxHealth = levelMaxUp ? 4 : 3;
    p.shootInterval = rateOfFireUp ? 180 : 350;
    p.color = selectedShipColor;
    
    // Weapon checks
    const hasTriple = upgrades.find(u => u.id === 'weapon_triple')?.unlocked;
    const hasLightning = upgrades.find(u => u.id === 'weapon_lightning')?.unlocked;
    
    if (activeWeapon === 'triple' && !hasTriple) {
      setActiveWeapon('standard');
    }
    if (activeWeapon === 'lightning' && !hasLightning) {
      setActiveWeapon('standard');
    }
  };

  // Save game state progress to localStorage
  const saveGameProgress = (currentStats: GameStats, currentUpgrades: UpgradeItem[], activeCol?: string, activeWep?: string) => {
    try {
      localStorage.setItem('space_shooter_saved_stats', JSON.stringify(currentStats));
      localStorage.setItem('space_shooter_saved_upgrades', JSON.stringify(currentUpgrades));
      if (activeCol) localStorage.setItem('space_shooter_saved_color', activeCol);
      if (activeWep) localStorage.setItem('space_shooter_saved_weapon', activeWep);
    } catch (e) {
      console.error(e);
    }
  };

  // Start the actual game loop
  const startGame = (fromScratch: boolean = false) => {
    soundEngine.resume();
    soundEngine.startMusic();

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set initial position
    stateRef.current.player.x = canvas.width / 2;
    stateRef.current.player.y = canvas.height - 100;
    
    // Clear dynamic states
    stateRef.current.bullets = [];
    stateRef.current.enemies = [];
    stateRef.current.powerUps = [];
    stateRef.current.particles = [];
    stateRef.current.bossAlertTimer = 0;
    stateRef.current.levelUpAlertTimer = 0;
    stateRef.current.gameTime = 0;
    stateRef.current.spawnTimer = 0;
    stateRef.current.bossSpawned = false;
    stateRef.current.regularSpawned = false;
    stateRef.current.lightningActive = false;
    stateRef.current.tripleActive = false;

    if (fromScratch) {
      try {
        localStorage.removeItem('space_shooter_saved_stats');
        localStorage.removeItem('space_shooter_saved_upgrades');
        localStorage.removeItem('space_shooter_saved_color');
        localStorage.removeItem('space_shooter_saved_weapon');
      } catch (e) {}

      stateRef.current.score = 0;
      stateRef.current.coins = 0;
      stateRef.current.level = 1;
      stateRef.current.lastEvoLevel = 1;
      stateRef.current.evoSplashTimer = 150; // flashy splash for starting Lvl 1!

      const freshStats = {
        score: 0,
        coins: 0,
        level: 1,
        enemiesKilled: 0,
        bossesKilled: 0,
        highScore: parseInt(localStorage.getItem('space_high_score') || '1000', 10),
      };

      const defaultUpgrades: UpgradeItem[] = [
        { id: 'hp_max', name: 'Zırh Güçlendirmesi', description: 'Maksimum can değerini arttırır (+1 can)', cost: 120, unlocked: false, type: 'ship', value: '4' },
        { id: 'rate_of_fire', name: 'Lazer Hızı', description: 'Atış sıklığını arttırır', cost: 180, unlocked: false, type: 'weapon', value: '250' }, 
        { id: 'weapon_triple', name: 'Üçlü Plazma Lazer', description: 'Yana doğru 3 farklı plazma mermisi ateşler', cost: 350, unlocked: false, type: 'weapon', value: 'triple' },
        { id: 'weapon_lightning', name: 'Yıldırım Aşım Modu', description: 'Yüklü güçlü yıldırım ışını fırlatır', cost: 650, unlocked: false, type: 'weapon', value: 'lightning' },
        { id: 'ship_vanguard', name: 'Vanguard Zırhı', description: 'Ultra dayanıklı neon yeşili kaplama ve manyetizma', cost: 250, unlocked: false, type: 'color', value: '#10b981' },
        { id: 'ship_phoenix', name: 'Phoenix Zırhı', description: 'Güneş patlaması rengi ve ekstra hız', cost: 400, unlocked: false, type: 'color', value: '#f97316' },
      ];

      setStats(freshStats);
      setUpgrades(defaultUpgrades);
      setSelectedShipColor('#d946ef');
      setActiveWeapon('standard');
      saveGameProgress(freshStats, defaultUpgrades, '#d946ef', 'standard');
    } else {
      // Load saved values into stateRef
      stateRef.current.score = stats.score;
      stateRef.current.coins = stats.coins;
      stateRef.current.level = stats.level;
      stateRef.current.lastEvoLevel = Math.min(6, stats.level);
      stateRef.current.evoSplashTimer = 150; // splash with loaded level ship evolution name!
    }

    applyUpgradesToPlayer();
    stateRef.current.player.health = stateRef.current.player.maxHealth;
    stateRef.current.player.shield = 4; // Start with protective shield!

    setGameState('PLAYING');
  };

  // Shop interactions
  const purchaseUpgrade = (id: string, cost: number) => {
    if (stats.coins < cost) {
      soundEngine.playPlayerHit(); // high buzz error sound
      return;
    }

    const nextUpgrades = upgrades.map(u => {
      if (u.id === id) {
        return { ...u, unlocked: true };
      }
      return u;
    });
    setUpgrades(nextUpgrades);

    setStats(prev => {
      const nextCoins = prev.coins - cost;
      const nextStats = { ...prev, coins: nextCoins };
      saveGameProgress(nextStats, nextUpgrades, selectedShipColor, activeWeapon);
      return nextStats;
    });

    stateRef.current.coins -= cost;
    soundEngine.playPowerUp();
  };

  const selectColor = (color: string) => {
    setSelectedShipColor(color);
    soundEngine.playLaser(600);
  };

  const startNextLevel = () => {
    soundEngine.resume();
    soundEngine.startMusic();
    
    const state = stateRef.current;
    
    // Advance the state's level
    state.level += 1;
    state.bossSpawned = false;
    state.regularSpawned = false;
    
    // Update stats state and auto-save
    setStats(prev => {
      const updated = {
        ...prev,
        level: state.level,
      };
      saveGameProgress(updated, upgrades, selectedShipColor, activeWeapon);
      return updated;
    });

    // Heal player and grant force field protection
    state.player.health = state.player.maxHealth;
    state.player.shield = 4; // 4 seconds of armor protection
    state.bullets = [];
    state.enemies = []; // empty array triggers new wave spawning
    state.gameTime = 0;
    state.spawnTimer = 0;

    applyUpgradesToPlayer();
    
    setGameState('PLAYING');
  };

  const quitToMenu = () => {
    soundEngine.stopMusic();
    setGameState('START');
  };

  // Revive game function (keeps active score and levels but heals player and gives protective barrier force shield)
  const reviveGame = () => {
    soundEngine.resume();
    soundEngine.startMusic();
    applyUpgradesToPlayer();

    // Set player health to maximum state and give temporary glowing force field
    stateRef.current.player.health = stateRef.current.player.maxHealth;
    stateRef.current.player.shield = 5; // 5 seconds duration
    
    // Clear bullets on screen and push enemies up so they don't spawn-trap the player
    stateRef.current.bullets = [];
    stateRef.current.enemies = stateRef.current.enemies.map(enemy => {
      if (enemy.y > 550) {
        enemy.y -= 250;
      }
      return enemy;
    });

    setStats(prev => ({ ...prev })); // sync react UI state
    setGameState('PLAYING');
  };

  // Simulated AdMob Rewarded Ad Tick Countdown Helper
  useEffect(() => {
    if (!rewardedAdActive) return;

    let countdownId: any;
    let loadingId: any;

    if (rewardedAdStatus === 'LOADING') {
      loadingId = setTimeout(() => {
        setRewardedAdStatus('PLAYING');
        setRewardedAdCount(5);
        soundEngine.playPowerUp();
      }, 1200);
    } else if (rewardedAdStatus === 'PLAYING') {
      countdownId = setInterval(() => {
        setRewardedAdCount(prev => {
          if (prev <= 1) {
            clearInterval(countdownId);
            setRewardedAdStatus('REWARDED');
            soundEngine.playLaser(1400); // clear high ding sound
            
            // Auto finish and resume game after reward is acquired!
            setTimeout(() => {
              setRewardedAdActive(false);
              reviveGame();
            }, 1800);
            return 0;
          }
          try {
            soundEngine.playLaser(200 + prev * 150);
          } catch (e) {}
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearTimeout(loadingId);
      clearInterval(countdownId);
    };
  }, [rewardedAdActive, rewardedAdStatus]);

  // Core Game Loop & Interactions in Canvas
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isTouchActive = false;

    // Screen Dimensions Match Container Aspect Ratio 5:8
    const resizeCanvas = () => {
      const parent = containerRef.current;
      if (!parent) return;
      canvas.width = 480; 
      canvas.height = 760;
    };
    resizeCanvas();

    // Controls listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code in stateRef.current.keys) {
        stateRef.current.keys[e.code as keyof typeof stateRef.current.keys] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code in stateRef.current.keys) {
        stateRef.current.keys[e.code as keyof typeof stateRef.current.keys] = false;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const tx = ((touch.clientX - rect.left) / rect.width) * canvas.width;
      const ty = ((touch.clientY - rect.top) / rect.height) * canvas.height;
      
      const state = stateRef.current;
      state.touch.isDragging = true;
      state.touch.lastX = tx;
      state.touch.lastY = ty;
      isTouchActive = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const tx = ((touch.clientX - rect.left) / rect.width) * canvas.width;
      const ty = ((touch.clientY - rect.top) / rect.height) * canvas.height;

      const state = stateRef.current;
      if (state.touch.isDragging) {
        const dx = tx - state.touch.lastX;
        const dy = ty - state.touch.lastY;
        
        // Boost steering multiplier for snappy response
        state.player.x += dx * 1.35;
        state.player.y += dy * 1.4;

        // Bounding Player inside canvas
        state.player.x = Math.max(20, Math.min(canvas.width - 20, state.player.x));
        state.player.y = Math.max(80, Math.min(canvas.height - 40, state.player.y));

        state.touch.lastX = tx;
        state.touch.lastY = ty;
      }
    };

    const handleTouchEnd = () => {
      const state = stateRef.current;
      state.touch.isDragging = false;
      isTouchActive = false;
    };

    // Support same smooth relative drag for mouse controls on desktop
    let isMouseDown = false;
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const tx = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const ty = ((e.clientY - rect.top) / rect.height) * canvas.height;
      isMouseDown = true;

      const state = stateRef.current;
      state.touch.isDragging = true;
      state.touch.lastX = tx;
      state.touch.lastY = ty;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const rect = canvas.getBoundingClientRect();
      const tx = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const ty = ((e.clientY - rect.top) / rect.height) * canvas.height;

      const state = stateRef.current;
      if (state.touch.isDragging) {
        const dx = tx - state.touch.lastX;
        const dy = ty - state.touch.lastY;
        
        state.player.x += dx * 1.35;
        state.player.y += dy * 1.4;

        state.player.x = Math.max(20, Math.min(canvas.width - 20, state.player.x));
        state.player.y = Math.max(80, Math.min(canvas.height - 40, state.player.y));

        state.touch.lastX = tx;
        state.touch.lastY = ty;
      }
    };

    const handleMouseUp = () => {
      isMouseDown = false;
      const state = stateRef.current;
      state.touch.isDragging = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    // Dynamic wave progression
    const spawnEnemyWave = (time: number) => {
      const waveState = stateRef.current;
      if (waveState.enemies.length > 0) return;

      const level = waveState.level;

      // PHASE 3: If Level Boss is defeated (enemies.length === 0 with bossSpawned), we transition to the Level Up completion screen!
      if (waveState.bossSpawned) {
        waveState.bossSpawned = false;
        waveState.regularSpawned = false;
        
        soundEngine.playPowerUp();

        // Calculate and add reward coins
        const levelBonusCoins = 50 + waveState.level * 20;

        // Sync and save react states
        setStats(prev => {
          const nextCoins = prev.coins + levelBonusCoins;
          const nextLevel = waveState.level; // the completed level
          const nextStats = {
            ...prev,
            coins: nextCoins,
            bossesKilled: prev.bossesKilled + 1
          };
          saveGameProgress(nextStats, upgrades, selectedShipColor, activeWeapon);
          return nextStats;
        });

        // Halt simulation and display completion panel overlay!
        setGameState('LEVEL_COMPLETED');
        return;
      }

      // PHASE 2: If the regular insect wave has been fully swarmed and cleared, but the level boss hasn't spawned yet, spawn the boss!
      if (waveState.regularSpawned && !waveState.bossSpawned) {
        soundEngine.playBossAlarm();
        waveState.bossSpawned = true;

        // "büyük boss en son gelsin" -> level is multiple of 5 (e.g., lvl 5, 10, 15...) is a BÜYÜK BOSS (Megaport Mothership), else is a KÜÇÜK BOSS
        const isBigBoss = (level % 5 === 0);

        let bossName = '';
        let color = '';
        let maxHealth = isBigBoss ? (250 + level * 90) : (80 + level * 40); // boss health rises according to level!
        let speedX = isBigBoss ? (1.5 + Math.min(1.2, level * 0.10)) : (2.0 + Math.min(1.5, level * 0.12));
        let speedY = isBigBoss ? (0.8 + Math.min(0.8, level * 0.05)) : (1.1 + Math.min(1.0, level * 0.07));
        let sizeMultiplier = isBigBoss ? (2.4 + Math.min(1.0, level * 0.05)) : (1.5 + Math.min(0.5, level * 0.04));
        let points = isBigBoss ? (1500 + level * 400) : (500 + level * 100);
        let coins = isBigBoss ? (150 + level * 30) : (50 + level * 10);
        
        // Decide Boss Identity
        if (isBigBoss) {
          const bigBossSelector = Math.floor((level / 5) - 1) % 3;
          if (bigBossSelector === 0) {
            bossName = `Süper Amiral Uçak Gemisi (Büyük Boss - Seviye ${level})`;
            color = '#ec4899'; // Flashing Magenta
          } else if (bigBossSelector === 1) {
            bossName = `Sonsuz Kıyamet Yıldızı (Büyük Boss - Seviye ${level})`;
            color = '#f43f5e'; // Crimson Red
          } else {
            bossName = `Kutsal Nebula Sancak Gemisi (Büyük Boss - Seviye ${level})`;
            color = '#38bdf8'; // Sky Cyan Aura
          }
        } else {
          const smallBossSelector = (level - 1) % 4;
          if (smallBossSelector === 0) {
            bossName = `Kızıl Muhrip (Küçük Boss - Seviye ${level})`;
            color = '#ef4444';
          } else if (smallBossSelector === 1) {
            bossName = `Boşluk Devriyesi (Küçük Boss - Seviye ${level})`;
            color = '#a855f7';
          } else if (smallBossSelector === 2) {
            bossName = `Güneş Fırtınası Hücum Botu (Küçük Boss - Seviye ${level})`;
            color = '#fbbf24';
          } else {
            bossName = `Kozmik Akıncı Refakatçısı (Küçük Boss - Seviye ${level})`;
            color = '#22d3ee';
          }
        }

        const width = isBigBoss ? Math.min(260, 160 + level * 8) : Math.min(150, 95 + level * 4);
        const height = isBigBoss ? Math.min(150, 95 + level * 5) : Math.min(95, 65 + level * 3);

        waveState.enemies.push({
          id: 'boss-' + time,
          x: canvas.width / 2,
          y: -120, // slides from top
          width,
          height,
          type: 'boss',
          health: maxHealth,
          maxHealth: maxHealth,
          speedX,
          speedY,
          shootCooldown: 35, // fast starting shoot cooldown
          color,
          points,
          coins,
          sizeMultiplier,
        });

        // Trigger floating alarm notifications
        stateRef.current.bossAlertTimer = 180;
        return;
      }

      // PHASE 1: Spawn standard insect fliers and Orange Mini Bosses
      waveState.regularSpawned = true;

      // "bostlar da değişsin ilerledikçe" -> Spawn normal swarms with "küçük bosslar" (mini squadron leaders) inside standard flight starting Lvl 2!
      const rows = 2 + Math.min(4, Math.floor(level / 3));
      const cols = 5 + Math.min(4, Math.floor(level / 4));

      // Populate Standard Bug grids
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let enemyType: 'meteor' | 'scout' | 'destroyer' | 'wasp' | 'mantis' | 'kamikaze' = 
            r === 0 ? 'destroyer' : r === 1 ? 'scout' : 'meteor';
          
          // Transform standard bug grids into dangerous elite insects as level progresses
          if (level >= 3 && enemyType === 'scout' && (c % 2 === 0)) {
            enemyType = 'wasp';
          } else if (level >= 4 && enemyType === 'destroyer' && (c % 3 === 0)) {
            enemyType = 'mantis';
          } else if (level >= 2 && enemyType === 'meteor' && (c % 2 === 1)) {
            enemyType = 'kamikaze';
          }
          
          let health = 1;
          let color = '#38bdf8';
          let coins = 1;
          let points = 50;

          if (enemyType === 'wasp') {
            health = 3 + Math.floor(level * 0.65);
            color = '#fbbf24'; // warning gold
            coins = 3 + Math.floor(level * 0.15);
            points = 200 + level * 15;
          } else if (enemyType === 'mantis') {
            health = 6 + Math.floor(level * 0.95);
            color = '#10b981'; // toxic emerald green
            coins = 4 + Math.floor(level * 0.20);
            points = 300 + level * 25;
          } else if (enemyType === 'kamikaze') {
            health = 2 + Math.floor(level * 0.40);
            color = '#f43f5e'; // aggressive crimson red
            coins = 2;
            points = 130 + level * 10;
          } else if (enemyType === 'destroyer') {
            health = 3 + Math.floor(level * 0.85); // health escalade
            color = '#a855f7'; // violet bug
            coins = 3 + Math.floor(level * 0.2);
            points = 150 + level * 20;
          } else if (enemyType === 'scout') {
            health = 2 + Math.floor(level * 0.5);
            color = '#ef4444'; // orange/red bug
            coins = 2 + Math.floor(level * 0.1);
            points = 100 + level * 10;
          } else {
            health = 1 + Math.floor(level * 0.25);
            color = '#38bdf8'; // blue bug meteor
            coins = 1;
            points = 50 + level * 5;
          }

          // Spread horizontally centered
          const spacingX = Math.min(65, 45 + (canvas.width / (cols + 2)));
          const spacingY = r === 0 ? 55 : 44;
          const startX = (canvas.width - (cols - 1) * spacingX) / 2;
          const startY = 85;

          waveState.enemies.push({
            id: `enemy-${r}-${c}-${time}`,
            x: startX + c * spacingX,
            y: startY + r * spacingY - 400, // Come descending from screen top
            width: 36,
            height: 32,
            type: enemyType,
            health,
            maxHealth: health,
            speedX: 1.4 + (level * 0.12),
            speedY: 0.9 + (level * 0.08),
            shootCooldown: Math.random() * (190 - Math.min(100, level * 10)) + (90 - Math.min(50, level * 5)),
            color,
            points,
            coins
          });
        }
      }

      // "küçük bosslar vurdukça puan geliyor" -> Spawning 1 or 2 special Mini Boss squadron commanders starting from Level 2!
      if (level >= 2) {
        const miniBossCount = level >= 4 ? 2 : 1;
        for (let m = 0; m < miniBossCount; m++) {
          const mX = (canvas.width / (miniBossCount + 1)) * (m + 1);
          waveState.enemies.push({
            id: `miniboss-${m}-${time}`,
            x: mX,
            y: 50 - m * 80 - 400, // Come descending with other enemies
            width: 46,
            height: 40,
            type: 'mini_boss',
            health: 12 + level * 6, // high robust health requiring multiple shots!
            maxHealth: 12 + level * 6,
            speedX: 2.2 + (level * 0.14),
            speedY: 0.8 + (level * 0.06),
            shootCooldown: Math.random() * 120 + 80,
            color: '#f97316', // neon orange
            points: 400 + level * 50, // massive score points when destroyed to trigger weapon shape evolution!
            coins: 15 + level * 2
          });
        }
      }
    };

    // Particles factory
    const createExplosion = (x: number, y: number, color: string, numParticles = 15) => {
      for (let i = 0; i < numParticles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        stateRef.current.particles.push({
          x,
          y,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          radius: Math.random() * 4 + 1,
          color,
          life: 0,
          maxLife: Math.random() * 30 + 15
        });
      }
    };

    // Main Engine Processing Core
    const loop = (timestamp: number) => {
      const state = stateRef.current;
      state.gameTime++;

      // --- PLAYER SHAPE EVOLUTION ALGORITHM ---
      // We map the physical ship shape evolution level directly to the game's current campaign level!
      // As requested ("oyun seviyesi arttıkça uçağın şekli değişsin"), this ensures that the player ship scales with each completed level.
      let evoLevel = Math.min(6, state.level);

      const prevEvo = state.lastEvoLevel || 1;
      if (evoLevel > prevEvo) {
        state.lastEvoLevel = evoLevel;
        state.evoSplashTimer = 160; // Show flashy title overlay!
        soundEngine.playPowerUp();
        // Give player a short shield bonus upon evolution!
        state.player.shield = Math.max(state.player.shield, 4);
      }

      // Tick down on-screen alerts
      if (state.evoSplashTimer > 0) state.evoSplashTimer--;
      if (state.bossAlertTimer > 0) state.bossAlertTimer--;
      if (state.levelUpAlertTimer > 0) state.levelUpAlertTimer--;

      // Fill rich space background with slight fading trail for gorgeous retro motion blur
      ctx.fillStyle = 'rgba(2, 6, 12, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield parallax animation
      state.stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw ambient code rain on game board behind objects
      const stateObj = state as any;
      if (!stateObj.matrixRain) {
        stateObj.matrixRain = Array(16).fill(0).map((_, i) => ({
          x: i * 30 + 15,
          y: Math.random() * -600,
          speed: 1.2 + Math.random() * 1.8,
          chars: Array(10).fill(0).map(() => String.fromCharCode(33 + Math.floor(Math.random() * 93))),
        }));
      }
      ctx.fillStyle = 'rgba(34, 197, 94, 0.16)'; // Faint, matrix green stardust characters
      ctx.font = 'bold 9px monospace';
      stateObj.matrixRain.forEach((col: any) => {
        col.y += col.speed;
        if (col.y > canvas.height) {
          col.y = -150 - Math.random() * 300;
          col.x = Math.random() * canvas.width;
        }
        for (let j = 0; j < 8; j++) {
          const char = col.chars[(Math.floor(state.gameTime / 12) + j) % col.chars.length];
          ctx.fillText(char, col.x, col.y + j * 12);
        }
      });

      // Planet rendering in bottom-right (Sleek red giant planet mimicking user photo)
      const pX = canvas.width - 40;
      const pY = canvas.height - 40;
      const pRadius = 140;

      // Outer glow
      const planetGlow = ctx.createRadialGradient(pX, pY, pRadius * 0.8, pX, pY, pRadius * 1.4);
      planetGlow.addColorStop(0, 'rgba(185, 28, 28, 0.4)');
      planetGlow.addColorStop(0.5, 'rgba(146, 64, 14, 0.15)');
      planetGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = planetGlow;
      ctx.beginPath();
      ctx.arc(pX, pY, pRadius * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Planet body gradient
      const planetGrad = ctx.createLinearGradient(pX - pRadius, pY - pRadius, pX + pRadius, pY + pRadius);
      planetGrad.addColorStop(0, '#991b1b'); // Dark red
      planetGrad.addColorStop(0.3, '#7f1d1d');
      planetGrad.addColorStop(0.7, '#451a03'); // Brownish shadow
      planetGrad.addColorStop(1, '#0c0a09');
      
      ctx.fillStyle = planetGrad;
      ctx.beginPath();
      ctx.arc(pX, pY, pRadius, 0, Math.PI * 2);
      ctx.fill();

      // Planet atmospheres stripes
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.1)';
      ctx.lineWidth = 4;
      for (let offset = -100; offset < 100; offset += 30) {
        ctx.beginPath();
        ctx.arc(pX, pY, pRadius - 10, Math.PI * 0.9, Math.PI * 1.6);
        ctx.stroke();
      }

      // Check for level transitions & waves
      spawnEnemyWave(state.gameTime);

      // --- PLAYER ACTIONS & PHYSICS ---
      const player = state.player;
      const prevX = player.x;

      // Handle Keyboard / Joystick Movements
      let dx = 0;
      let dy = 0;
      if (state.keys.ArrowLeft || state.keys.KeyA) dx -= player.speed;
      if (state.keys.ArrowRight || state.keys.KeyD) dx += player.speed;
      if (state.keys.ArrowUp || state.keys.KeyW) dy -= player.speed;
      if (state.keys.ArrowDown || state.keys.KeyS) dy += player.speed;

      if (state.joystick.active) {
        dx += state.joystick.vx * player.speed;
        dy += state.joystick.vy * player.speed;
      }

      player.x += dx;
      player.y += dy;

      // Keep inside bounds (80 pixels from top, 40 pixels from bottom, 25 from sides)
      player.x = Math.max(25, Math.min(canvas.width - 25, player.x));
      player.y = Math.max(80, Math.min(canvas.height - 40, player.y));

      // Tilt ship left or right dynamically based on actual coordinate displacement (dx or touch move)
      const displacementX = player.x - prevX;
      let targetTilt = 0;
      if (displacementX < -0.5) {
        targetTilt = -0.32;
      } else if (displacementX > 0.5) {
        targetTilt = 0.32;
      }

      if (player.tilt === undefined) {
        player.tilt = 0;
      }
      player.tilt = player.tilt + (targetTilt - player.tilt) * 0.15;

      // Shield timers
      if (player.shield > 0) {
        player.shield -= 1 / 60; // 60 FPS
      }

      // Powerups duration mechanics
      if (state.lightningActive) {
        state.lightningTimer -= 1 / 60;
        if (state.lightningTimer <= 0) {
          state.lightningActive = false;
        }
      }
      if (state.tripleActive) {
        state.tripleTimer -= 1 / 60;
        if (state.tripleTimer <= 0) {
          state.tripleActive = false;
        }
      }

      // Handle Shooting Cooldowns & Firing
      if (player.shootCooldown > 0) {
        player.shootCooldown -= 16.67; // approx ms per frame
      }

      // Automatically fire if option turned on, or user is holding space
      if (player.shootCooldown <= 0 && (autoFire || state.keys.Space || isTouchActive)) {
        player.shootCooldown = player.shootInterval;

        const currentWeaponType = state.lightningActive ? 'lightning' : (state.tripleActive ? 'triple' : activeWeapon);

        if (currentWeaponType === 'lightning') {
          soundEngine.playLaser(1200);
          // Strong lightning weapon fanning
          state.bullets.push({ x: player.x, y: player.y - 20, dx: 0, dy: -14, radius: 4.5, color: '#38bdf8', damage: 3, isPlayer: true });
        } else if (currentWeaponType === 'triple') {
          soundEngine.playLaser(950);
          state.bullets.push({ x: player.x, y: player.y - 20, dx: 0, dy: -12, radius: 4, color: '#f472b6', damage: 2, isPlayer: true });
          state.bullets.push({ x: player.x - 12, y: player.y - 12, dx: -3, dy: -11, radius: 3, color: '#f472b6', damage: 2, isPlayer: true });
          state.bullets.push({ x: player.x + 12, y: player.y - 12, dx: 3, dy: -11, radius: 3, color: '#f472b6', damage: 2, isPlayer: true });
        } else {
          // LEVEL-BASED WEAPON EVOLUTION SYSTEM - Action packed lasers & shocks!
          const evo = state.lastEvoLevel || 1;
          
          if (evo === 1) {
            // Level 1: Sirius Single Needle (Sleek light fuchsia point)
            soundEngine.playLaser(850);
            state.bullets.push({ x: player.x, y: player.y - 20, dx: 0, dy: -12, radius: 4, color: '#d946ef', damage: 1.5, isPlayer: true });
          } else if (evo === 2) {
            // Level 2: Dual Plasma Nebulas (Dual neon blue streams)
            soundEngine.playLaser(900);
            state.bullets.push({ x: player.x - 8, y: player.y - 20, dx: 0, dy: -13, radius: 4.5, color: '#22d3ee', damage: 2.2, isPlayer: true });
            state.bullets.push({ x: player.x + 8, y: player.y - 20, dx: 0, dy: -13, radius: 4.5, color: '#22d3ee', damage: 2.2, isPlayer: true });
          } else if (evo === 3) {
            // Level 3: Cosmic Triple Void Wave (Expanding nested fuchsia orbs)
            soundEngine.playLaser(1000);
            state.bullets.push({ x: player.x, y: player.y - 22, dx: 0, dy: -14, radius: 5.0, color: '#ec4899', damage: 3.2, isPlayer: true });
            state.bullets.push({ x: player.x - 12, y: player.y - 16, dx: -1.8, dy: -13, radius: 4.5, color: '#ec4899', damage: 3.0, isPlayer: true });
            state.bullets.push({ x: player.x + 12, y: player.y - 16, dx: 1.8, dy: -13, radius: 4.5, color: '#ec4899', damage: 3.0, isPlayer: true });
          } else if (evo === 4) {
            // Level 4: APEX Spark Starbeam Array (Golden splitting quad beams)
            soundEngine.playLaser(1150);
            state.bullets.push({ x: player.x - 16, y: player.y - 14, dx: -2.8, dy: -14.5, radius: 5.0, color: '#fbbf24', damage: 4.5, isPlayer: true });
            state.bullets.push({ x: player.x - 6, y: player.y - 24, dx: -0.6, dy: -15.0, radius: 5.5, color: '#fbbf24', damage: 5.0, isPlayer: true });
            state.bullets.push({ x: player.x + 6, y: player.y - 24, dx: 0.6, dy: -15.0, radius: 5.5, color: '#fbbf24', damage: 5.0, isPlayer: true });
            state.bullets.push({ x: player.x + 16, y: player.y - 14, dx: 2.8, dy: -14.5, radius: 5.0, color: '#fbbf24', damage: 4.5, isPlayer: true });
          } else if (evo === 5) {
            // Level 5: EMERALD LIGHTNING SHOCK WAVE (High power emerald plasma plus side charges)
            soundEngine.playLaser(1250);
            state.bullets.push({ x: player.x, y: player.y - 25, dx: 0, dy: -16.5, radius: 6.5, color: '#10b981', damage: 6.8, isPlayer: true });
            state.bullets.push({ x: player.x - 14, y: player.y - 18, dx: -1.5, dy: -14.5, radius: 5.0, color: '#2dd4bf', damage: 4.8, isPlayer: true });
            state.bullets.push({ x: player.x + 14, y: player.y - 18, dx: 1.5, dy: -14.5, radius: 5.0, color: '#2dd4bf', damage: 4.8, isPlayer: true });
          } else {
            // Level 6: GALAXY OMEGA SOLAR ECLIPSE ARRAY (5 heavy screen-clearing plasma solar flare bursts)
            soundEngine.playLaser(1350);
            state.bullets.push({ x: player.x, y: player.y - 28, dx: 0, dy: -17.5, radius: 8.0, color: '#f43f5e', damage: 9.0, isPlayer: true });
            state.bullets.push({ x: player.x - 14, y: player.y - 24, dx: -1.8, dy: -16.5, radius: 6.5, color: '#f472b6', damage: 6.8, isPlayer: true });
            state.bullets.push({ x: player.x + 14, y: player.y - 24, dx: 1.8, dy: -16.5, radius: 6.5, color: '#f472b6', damage: 6.8, isPlayer: true });
            state.bullets.push({ x: player.x - 28, y: player.y - 18, dx: -3.8, dy: -15.0, radius: 5.5, color: '#fb7185', damage: 5.5, isPlayer: true });
            state.bullets.push({ x: player.x + 28, y: player.y - 18, dx: 3.8, dy: -15.0, radius: 5.5, color: '#fb7185', damage: 5.5, isPlayer: true });
          }
        }
      }

      // Render Player Ship (Polished Magenta/Purple Wings from image)
      ctx.save();

      // Calculate dynamic procedural swaying (idle hovering so ship is never static)
      const floatX = Math.sin(state.gameTime * 0.04) * 1.5;
      const floatY = Math.cos(state.gameTime * 0.05) * 2.5;

      ctx.translate(player.x + floatX, player.y + floatY);
      ctx.rotate(player.tilt || 0);

      const evo = state.lastEvoLevel || 1;

      // Engine Flame Fire - Scales and multiplies with Evolution Level!
      const engineFlicker = Math.sin(state.gameTime * 0.5) * 8 + 15;
      
      if (evo >= 6) {
        // Evo 6 has 5 massive divine cosmic engine thrusters!
        [-20, -10, 0, 10, 20].forEach((offsetX) => {
          const isCenter = offsetX === 0;
          const isMid = Math.abs(offsetX) === 10;
          const fireSize = engineFlicker * (isCenter ? 1.65 : isMid ? 1.25 : 0.85);
          const fireGrad = ctx.createLinearGradient(offsetX, 14, offsetX, 14 + fireSize);
          fireGrad.addColorStop(0, '#f43f5e'); // Rose base
          fireGrad.addColorStop(0.4, '#ec4899'); // Fuchsia body
          fireGrad.addColorStop(0.8, '#fbbf24'); // Golden tip
          fireGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = fireGrad;
          ctx.beginPath();
          ctx.moveTo(offsetX - (isCenter ? 6 : isMid ? 5 : 4), 14);
          ctx.lineTo(offsetX, 14 + fireSize);
          ctx.lineTo(offsetX + (isCenter ? 6 : isMid ? 5 : 4), 14);
          ctx.closePath();
          ctx.fill();
        });
      } else if (evo === 5) {
        // Evo 5 has 4 dynamic emerald warp jets!
        [-15, -5, 5, 15].forEach((offsetX) => {
          const fireSize = engineFlicker * (Math.abs(offsetX) === 5 ? 1.4 : 1.0);
          const fireGrad = ctx.createLinearGradient(offsetX, 13, offsetX, 13 + fireSize);
          fireGrad.addColorStop(0, '#10b981'); // Emerald base
          fireGrad.addColorStop(0.5, '#2dd4bf'); // Turquoise body
          fireGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = fireGrad;
          ctx.beginPath();
          ctx.moveTo(offsetX - 5, 13);
          ctx.lineTo(offsetX, 13 + fireSize);
          ctx.lineTo(offsetX + 5, 13);
          ctx.closePath();
          ctx.fill();
        });
      } else if (evo === 4) {
        // Evo 4 has 3 massive rocket engines!
        [-14, 0, 14].forEach((offsetX) => {
          const fireSize = engineFlicker * (offsetX === 0 ? 1.45 : 1.0);
          const fireGrad = ctx.createLinearGradient(offsetX, 10, offsetX, 10 + fireSize);
          fireGrad.addColorStop(0, '#38bdf8'); // Blue/cyan fire
          fireGrad.addColorStop(0.5, '#ec4899'); // Fuchsia center
          fireGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = fireGrad;
          ctx.beginPath();
          ctx.moveTo(offsetX - 6, 15);
          ctx.lineTo(offsetX, 15 + fireSize);
          ctx.lineTo(offsetX + 6, 15);
          ctx.closePath();
          ctx.fill();
        });
      } else if (evo === 3) {
        // Evo 3 has dual high-tech power thrusters!
        [-8, 8].forEach((offsetX) => {
          const fireSize = engineFlicker * 1.25;
          const fireGrad = ctx.createLinearGradient(offsetX, 12, offsetX, 12 + fireSize);
          fireGrad.addColorStop(0, '#ec4899');
          fireGrad.addColorStop(0.6, '#f97316');
          fireGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = fireGrad;
          ctx.beginPath();
          ctx.moveTo(offsetX - 7, 14);
          ctx.lineTo(offsetX, 14 + fireSize);
          ctx.lineTo(offsetX + 7, 14);
          ctx.closePath();
          ctx.fill();
        });
      } else {
        // Evo 1-2: Standard single central thrust
        const fireGrad = ctx.createLinearGradient(0, 10, 0, 10 + engineFlicker);
        fireGrad.addColorStop(0, '#f43f5e'); // Rose
        fireGrad.addColorStop(0.5, '#f97316'); // Orange
        fireGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.moveTo(-8, 15);
        ctx.lineTo(0, 15 + engineFlicker);
        ctx.lineTo(8, 15);
        ctx.closePath();
        ctx.fill();
      }

      // Wing booster lights
      ctx.fillStyle = evo >= 3 ? '#2dd4bf' : '#60a5fa';
      ctx.beginPath();
      ctx.arc(-16, 8, 3, 0, Math.PI*2);
      ctx.arc(16, 8, 3, 0, Math.PI*2);
      if (evo >= 2) {
        // Extra side light bulbs
        ctx.arc(-26, 12, 3.5, 0, Math.PI*2);
        ctx.arc(26, 12, 3.5, 0, Math.PI*2);
      }
      ctx.fill();

      // Draw Main Space Ship Hull (Authentic custom insectoid-like armor styling based on user's reference photo)
      ctx.shadowBlur = evo >= 3 ? 18 : 12;
      ctx.shadowColor = player.color;

      // Core cockpit pod (Grows and modifies armor with evolution!)
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.moveTo(0, evo >= 3 ? -32 : -24); // sharper nose point for advanced levels
      ctx.lineTo(12, 10);
      ctx.lineTo(0, 18);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.fill();

      // Futuristic wing armors left & right
      ctx.lineWidth = evo >= 5 ? 4.5 : evo >= 3 ? 3.5 : 2.5;
      ctx.strokeStyle = evo >= 6 ? '#f43f5e' : evo >= 5 ? '#10b981' : evo >= 4 ? '#fbbf24' : '#ffffff'; // unique borders for elite forms
      
      // Wing dimensions scale up per evo level!
      const wingLength = 
        evo === 1 ? 28 : 
        evo === 2 ? 34 : 
        evo === 3 ? 42 : 
        evo === 4 ? 48 : 
        evo === 5 ? 54 : 60;
      const wingBackY = 
        evo === 1 ? 12 : 
        evo === 2 ? 14 : 
        evo === 3 ? 16 : 
        evo === 4 ? 18 : 
        evo === 5 ? 20 : 22;
      const wingDropY = 
        evo === 1 ? 22 : 
        evo === 2 ? 26 : 
        evo === 3 ? 30 : 
        evo === 4 ? 34 : 
        evo === 5 ? 38 : 42;

      // Left Wing segment
      ctx.fillStyle = evo >= 3 ? '#2e1065' : 'rgba(74, 4, 78, 0.85)'; // glowing deep violet
      ctx.beginPath();
      ctx.moveTo(-10, -2);
      ctx.lineTo(-wingLength, wingBackY);
      ctx.lineTo(-(wingLength - 4), wingDropY);
      ctx.lineTo(-4, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Wing segment
      ctx.beginPath();
      ctx.moveTo(10, -2);
      ctx.lineTo(wingLength, wingBackY);
      ctx.lineTo((wingLength - 4), wingDropY);
      ctx.lineTo(4, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Neon details on the wings matching image (Vary dynamic color depending on evo level)
      const detailColor = 
        evo === 1 ? '#2dd4bf' : 
        evo === 2 ? '#3b82f6' : 
        evo === 3 ? '#ec4899' : 
        evo === 4 ? '#fbbf24' : 
        evo === 5 ? '#10b981' : '#f43f5e';
      ctx.strokeStyle = detailColor;
      ctx.lineWidth = evo >= 3 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(-wingLength/1.5, 15);
      ctx.lineTo(-wingLength/1.5, 25 + evo*2);
      ctx.moveTo(wingLength/1.5, 15);
      ctx.lineTo(wingLength/1.5, 25 + evo*2);
      ctx.stroke();

      // EXTRA ATTACHMENTS FOR SPECIFIC FORM EVOLUTIONS:
      if (evo >= 2) {
        // Lateral stabilizer blade fins
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = detailColor;
        ctx.beginPath();
        ctx.moveTo(-wingLength, wingBackY);
        ctx.lineTo(-wingLength - 8, wingBackY + 14);
        ctx.lineTo(-wingLength, wingDropY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(wingLength, wingBackY);
        ctx.lineTo(wingLength + 8, wingBackY + 14);
        ctx.lineTo(wingLength, wingDropY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (evo >= 3) {
        // Heavy armor protective front shoulders
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-8, -14);
        ctx.lineTo(-18, -4);
        ctx.lineTo(-12, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(8, -14);
        ctx.lineTo(18, -4);
        ctx.lineTo(12, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (evo >= 4) {
        // Epic spinning sub-energy rings around the central cabin reactor!
        ctx.strokeStyle = 'rgba(244, 114, 182, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const glowRadius = 26 + Math.sin(state.gameTime * 0.1) * 3;
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 2 floating energy particles orbitting the ship fuselage
        const orbitAngle1 = state.gameTime * 0.08;
        const orbitAngle2 = state.gameTime * 0.08 + Math.PI;
        ctx.fillStyle = '#faff33';
        ctx.beginPath();
        ctx.arc(Math.cos(orbitAngle1) * glowRadius, Math.sin(orbitAngle1) * glowRadius, 3.5, 0, Math.PI * 2);
        ctx.arc(Math.cos(orbitAngle2) * glowRadius, Math.sin(orbitAngle2) * glowRadius, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glowing Cockpit Glass
      ctx.fillStyle = evo >= 6 ? '#f43f5e' : evo >= 5 ? '#10b981' : evo >= 4 ? '#ffffff' : evo >= 3 ? '#fb7185' : '#a5f3fc';
      ctx.beginPath();
      ctx.ellipse(0, -5, 5, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Restoring canvas shadows
      ctx.restore();

      // Ship Shield visual effect
      if (player.shield > 0) {
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 2.5 + Math.sin(state.gameTime * 0.2) * 1.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#06b6d4';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // --- LIGHTNING OVERDRIVE LASER ATTACK (Epic pink thunder-beam matching central screenshot ray!) ---
      const hasLightningActive = state.lightningActive || (activeWeapon === 'lightning' && (autoFire || state.keys.Space || isTouchActive));
      if (hasLightningActive && player.health > 0) {
        // Crackle lightning upwards from cockpit to y=0
        const beamX = player.x;
        const beamY = player.y - 25;

        // Visual outer glow container
        ctx.save();
        ctx.shadowBlur = 24;
        ctx.shadowColor = '#ec4899'; // Vibrant pink/magenta energy
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)'; // High voltage transparent violet beam width
        ctx.lineWidth = 14 + Math.sin(state.gameTime * 0.4) * 6;
        
        ctx.beginPath();
        ctx.moveTo(beamX, beamY);
        ctx.lineTo(beamX, 0);
        ctx.stroke();

        // White core blinding high energy ray
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4 + Math.sin(state.gameTime * 0.1) * 2;
        ctx.shadowColor = '#f472b6';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(beamX, beamY);
        
        // Procedurally draw dynamic lightning zigzag curves matching user photo!
        let currentY = beamY;
        while (currentY > 0) {
          const step = 25;
          currentY -= step;
          const randomX = beamX + (Math.random() * 18 - 9);
          ctx.lineTo(randomX, Math.max(0, currentY));
        }
        ctx.stroke();
        ctx.restore();

        // Perform spatial damage check (any bug falling inside lightning range takes massive dynamic damage)
        state.enemies.forEach(enemy => {
          const overlapWidth = enemy.width + 15;
          if (Math.abs(enemy.x - beamX) < overlapWidth && enemy.y > 0 && enemy.y < beamY) {
            enemy.health -= 0.6; // damage per tick
            
            // Spawn sparks on contact
            if (Math.random() < 0.4) {
              state.particles.push({
                x: enemy.x + (Math.random() * 20 - 10),
                y: enemy.y + (Math.random() * 10 - 5),
                dx: Math.random() * 6 - 3,
                dy: Math.random() * -4 - 1,
                radius: Math.random() * 2 + 1,
                color: '#f472b6',
                life: 0,
                maxLife: 15
              });
            }
          }
        });
      }

      // --- BULLETS LOGIC (Plasmids, enemies and players) ---
      state.bullets = state.bullets.filter(bullet => {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        // Render laser bullets with custom arcade physical shapes matching weapon levels
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = bullet.color;
        ctx.fillStyle = bullet.color;
        
        if (bullet.isPlayer) {
          if (bullet.color === '#d946ef') {
            // Level 1: Sleek fuchsia energy rod
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(bullet.x, bullet.y - 10);
            ctx.lineTo(bullet.x, bullet.y + 10);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (bullet.color === '#22d3ee') {
            // Level 2: High-density twin cyan plasma orbs with cold white hot nuclear core
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius * 0.45, 0, Math.PI * 2);
            ctx.fill();
          } else if (bullet.color === '#ec4899') {
            // Level 3: Dual-nested expanding pink energy rings
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
          } else if (bullet.color === '#fbbf24') {
            // Level 4: Apex Diamond Gilded Star with particle crosshairs
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(bullet.x, bullet.y - 11);
            ctx.lineTo(bullet.x + 3, bullet.y - 3);
            ctx.lineTo(bullet.x + 11, bullet.y);
            ctx.lineTo(bullet.x + 3, bullet.y + 3);
            ctx.lineTo(bullet.x, bullet.y + 11);
            ctx.lineTo(bullet.x - 3, bullet.y + 3);
            ctx.lineTo(bullet.x - 11, bullet.y);
            ctx.lineTo(bullet.x - 3, bullet.y - 3);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (bullet.color === '#10b981' || bullet.color === '#2dd4bf') {
            // Level 5: Emerald Electric lightning bolt vector
            ctx.strokeStyle = '#6ee7b7';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(bullet.x, bullet.y - 13);
            ctx.lineTo(bullet.x - 4.5, bullet.y - 1);
            ctx.lineTo(bullet.x + 4.5, bullet.y + 5);
            ctx.lineTo(bullet.x, bullet.y + 13);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (bullet.color === '#f43f5e' || bullet.color === '#f472b6' || bullet.color === '#fb7185') {
            // Level 6: Omega Nova Sphere (Expanding solar flares and halo rings)
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius * 0.45, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#fda4af';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            // Powerup/Standard Fallback
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Dangerous alien threat projectiles (Red plasma bubbles with central highlights)
          ctx.beginPath();
          ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bullet.x, bullet.y, bullet.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Bullet screen exit bounds check
        if (bullet.y < -10 || bullet.y > canvas.height + 10) return false;

        // Collision logic
        if (bullet.isPlayer) {
          // Check bullet hits enemy
          for (let i = 0; i < state.enemies.length; i++) {
            const enemy = state.enemies[i];
            const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
            const hitTolerance = Math.max(enemy.width / 2, 20);

            if (dist < hitTolerance && enemy.y > 0) {
              enemy.health -= bullet.damage;

              // Hitting a mini boss or boss rewards points as requested
              if (enemy.type === 'mini_boss' || enemy.type === 'boss') {
                const hitPoints = enemy.type === 'mini_boss' ? 10 : 15;
                state.score += hitPoints;
                setStats(prev => {
                  const nextScore = prev.score + hitPoints;
                  const currentHigh = Math.max(prev.highScore, nextScore);
                  localStorage.setItem('space_high_score', currentHigh.toString());
                  return {
                    ...prev,
                    score: nextScore,
                    highScore: currentHigh
                  };
                });
              }

              createExplosion(bullet.x, bullet.y, bullet.color, 4);
              soundEngine.playLaser(1400); // short tick bounce back sound
              return false; // destroy bullet
            }
          }
        } else {
          // Check enemy bullet hits player
          const dist = Math.hypot(bullet.x - player.x, bullet.y - player.y);
          if (dist < 26 && player.health > 0) {
            if (player.shield <= 0) {
              player.health -= 1;
              player.shield = 1.5; // temporary invincibility frames
              soundEngine.playPlayerHit();
              createExplosion(player.x, player.y, '#f43f5e', 20);
            }
            return false; // destroy bullet
          }
        }

        return true;
      });

       // --- ENEMIES SYSTEM (Alien Bug AI and Custom procedurally drawn wing sprites!) ---
      state.enemies = state.enemies.filter(enemy => {
        // Move code
        if (enemy.type === 'boss') {
          // Boss slides left/right sweeping the canopy
          enemy.y += (40 - enemy.y) * 0.03; // smooth slide to top section
          enemy.x += enemy.speedX;
          if (enemy.x > canvas.width - 80 || enemy.x < 80) {
            enemy.speedX *= -1;
          }

          // Sweep high deadly spread shot bursts
          enemy.shootCooldown -= 1;
          if (enemy.shootCooldown <= 0) {
            enemy.shootCooldown = Math.max(120, 240 - state.level * 15);
            soundEngine.playLaserEnemy();
            // Shoot downward burst of red balls
            for (let i = -2; i <= 2; i++) {
              state.bullets.push({
                x: enemy.x + i * 20,
                y: enemy.y + 35,
                dx: i * 2,
                dy: 4.5,
                radius: 4.5,
                color: '#ef4444',
                damage: 1,
                isPlayer: false
              });
            }
          }
        } else if (enemy.type === 'mini_boss') {
          // MINI BOSS AI - aggressive zig-zag and target seeking
          enemy.y += (110 - enemy.y) * 0.02 + Math.sin(state.gameTime * 0.04) * 0.5;
          enemy.x += enemy.speedX * Math.sin(state.gameTime * 0.05) * 1.5;

          // Side bouncing bounds
          if (enemy.x < 40) {
            enemy.x = 40;
            enemy.speedX = Math.abs(enemy.speedX);
          } else if (enemy.x > canvas.width - 40) {
            enemy.x = canvas.width - 40;
            enemy.speedX = -Math.abs(enemy.speedX);
          }

          // Shoots twin spreading red/orange bolts
          enemy.shootCooldown -= 1;
          if (enemy.shootCooldown <= 0 && enemy.y > 0 && enemy.y < player.y) {
            enemy.shootCooldown = Math.max(80, 160 - state.level * 10);
            soundEngine.playLaserEnemy();
            state.bullets.push({
              x: enemy.x - 12,
              y: enemy.y + 16,
              dx: -1.2,
              dy: 5.2,
              radius: 4.0,
              color: '#f97316',
              damage: 1,
              isPlayer: false
            });
            state.bullets.push({
              x: enemy.x + 12,
              y: enemy.y + 16,
              dx: 1.2,
              dy: 5.2,
              radius: 4.0,
              color: '#f97316',
              damage: 1,
              isPlayer: false
            });
          }
        } else if (enemy.type === 'wasp') {
          // --- WASP AI (Sarı Eşek Arısı) ---
          // Aggressive twitchy lateral oscillation, descends moderately fast
          const phase = Math.sin(state.gameTime * 0.12 + (enemy.y * 0.04));
          enemy.x += enemy.speedX * phase * 1.5;
          enemy.y += enemy.speedY * 0.55;

          // Side borders bouncy behavior
          if (enemy.x < 30) {
            enemy.x = 30;
            enemy.speedX = Math.abs(enemy.speedX);
          } else if (enemy.x > canvas.width - 30) {
            enemy.x = canvas.width - 30;
            enemy.speedX = -Math.abs(enemy.speedX);
          }

          // Fires highly accurate yellow venom needles direct to player
          enemy.shootCooldown -= 1;
          if (enemy.shootCooldown <= 0 && enemy.y > 0 && enemy.y < player.y) {
            enemy.shootCooldown = Math.random() * (160 - Math.min(80, state.level * 8)) + (80 - Math.min(40, state.level * 4));
            soundEngine.playLaserEnemy();
            
            const dx = player.x - enemy.x;
            const dy = player.y - (enemy.y + 12);
            const dist = Math.hypot(dx, dy);
            const bulletSpeed = 7.0 + Math.min(3.0, state.level * 0.15); // very fast needle

            state.bullets.push({
              x: enemy.x,
              y: enemy.y + 12,
              dx: dist > 0 ? (dx / dist) * bulletSpeed : 0,
              dy: dist > 0 ? (dy / dist) * bulletSpeed : 6,
              radius: 2.2, // thin stinger
              color: '#fbbf24', // golden venom needle
              damage: 1,
              isPlayer: false
            });
          }
        } else if (enemy.type === 'mantis') {
          // --- MANTIS AI (Asitli Peygamber Devesi) ---
          // Elite tank mantis: moves very slowly, high defense, releases destructive sprays
          const phase = Math.cos(state.gameTime * 0.04 + (enemy.y * 0.02));
          enemy.x += enemy.speedX * phase * 0.6;
          enemy.y += enemy.speedY * 0.32;

          // Side borders bouncy behavior
          if (enemy.x < 40) {
            enemy.x = 40;
            enemy.speedX = Math.abs(enemy.speedX);
          } else if (enemy.x > canvas.width - 40) {
            enemy.x = canvas.width - 40;
            enemy.speedX = -Math.abs(enemy.speedX);
          }

          // Shoots dangerous triple neon green acid spray
          enemy.shootCooldown -= 1;
          if (enemy.shootCooldown <= 0 && enemy.y > 0 && enemy.y < player.y) {
            enemy.shootCooldown = Math.random() * (220 - Math.min(100, state.level * 10)) + (110 - Math.min(50, state.level * 5));
            soundEngine.playLaserEnemy();

            // 3-Way green spore spread
            for (let angle = -0.35; angle <= 0.35; angle += 0.35) {
              state.bullets.push({
                x: enemy.x,
                y: enemy.y + 15,
                dx: Math.sin(angle) * 4.6,
                dy: Math.cos(angle) * 4.8,
                radius: 4.5, // larger acid balls
                color: '#10b981', // emerald toxic green
                damage: 1,
                isPlayer: false
              });
            }
          }
        } else if (enemy.type === 'kamikaze') {
          // --- KAMIKAZE AI (Kan Çekirgesi) ---
          // Standard flight, but turns extremely hostile & starts rocket dive once damaged!
          const isPanic = enemy.health < enemy.maxHealth;

          if (isPanic) {
            // Panic charge: accelerated fall homing on player X coordinates
            enemy.y += 7.5 + Math.min(3.0, state.level * 0.15);
            enemy.x += (player.x - enemy.x) * 0.045; // aggressive slide lock

            // Thruster fire sparks
            if (Math.random() < 0.45) {
              state.particles.push({
                x: enemy.x + (Math.random() * 8 - 4),
                y: enemy.y - 12,
                dx: Math.random() * 3 - 1.5,
                dy: -Math.random() * 3 - 2,
                radius: Math.random() * 2 + 1,
                color: '#f43f5e', // engine flame red
                life: 0,
                maxLife: 15
              });
            }
          } else {
            // Healthy glide flight
            const phase = Math.sin(state.gameTime * 0.06);
            enemy.y += enemy.speedY * 0.48;
            enemy.x += enemy.speedX * phase * 1.1;

            if (enemy.x < 30) {
              enemy.x = 30;
              enemy.speedX = Math.abs(enemy.speedX);
            } else if (enemy.x > canvas.width - 30) {
              enemy.x = canvas.width - 30;
              enemy.speedX = -Math.abs(enemy.speedX);
            }

            // Casual stinger shots
            enemy.shootCooldown -= 1;
            if (enemy.shootCooldown <= 0 && enemy.y > 0 && enemy.y < player.y) {
              enemy.shootCooldown = Math.random() * 300 + 250 - (state.level * 10);
              soundEngine.playLaserEnemy();
              state.bullets.push({
                x: enemy.x,
                y: enemy.y + 10,
                dx: (player.x - enemy.x) * 0.003,
                dy: 5.2,
                radius: 3.2,
                color: '#ef4444',
                damage: 1,
                isPlayer: false
              });
            }
          }
        } else {
          // Normal insect bugs movement matching vintage Space Invader formations
          const phase = Math.sin(state.gameTime * 0.03 + (enemy.y * 0.01));
          
          // Gradually creep downwards based on wave timers
          enemy.y += enemy.speedY * 0.45;
          enemy.x += enemy.speedX * phase * 0.8;

          // Side borders bouncy behavior
          if (enemy.x < 30) {
            enemy.x = 30;
            enemy.speedX = Math.abs(enemy.speedX);
          } else if (enemy.x > canvas.width - 30) {
            enemy.x = canvas.width - 30;
            enemy.speedX = -Math.abs(enemy.speedX);
          }

          // Random insect swoop attacks down at the player!
          if (Math.random() < 0.0015 && enemy.y > 50 && enemy.y < canvas.height - 300) {
            enemy.speedY = 6; // dive acceleration
            enemy.speedX = (player.x - enemy.x) * 0.015; // home into player
          }

          // AI firing triggers
          enemy.shootCooldown -= 1;
          if (enemy.shootCooldown <= 0 && enemy.y > 0 && enemy.y < player.y) {
            // Shoots down
            enemy.shootCooldown = Math.random() * 400 + 350 - (state.level * 15);
            soundEngine.playLaserEnemy();
            state.bullets.push({
              x: enemy.x,
              y: enemy.y + 10,
              dx: (player.x - enemy.x) * 0.005, // slightly seek the player down
              dy: 5.5,
              radius: 3.5,
              color: '#fb7185',
              damage: 1,
              isPlayer: false
            });
          }
        }

        // --- CHECK INVENTIVE PROCEDURAL ALIEN INSECT SPRITES (Matching user image!) ---
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        // Flapping wings sine speed computation
        const flap = Math.sin(state.gameTime * 0.15 + (enemy.x * 0.05));
        ctx.shadowBlur = 8;
        ctx.shadowColor = enemy.color;

        if (enemy.type === 'boss') {
          // EPIC ALIEN AIRCRAFT CARRIER / MOTHERSHIP (UÇAK GEMİSİ)
          const width = enemy.width;
          const height = enemy.height;
          
          // Draw the background jet engines producing heavy glowing energy rings
          [-width * 0.3, width * 0.3].forEach(offsetX => {
            const engineGlick = 12 + Math.sin(state.gameTime * 0.2) * 5;
            const engineGrad = ctx.createLinearGradient(offsetX, height * 0.4, offsetX, height * 0.4 + engineGlick);
            engineGrad.addColorStop(0, enemy.color);
            engineGrad.addColorStop(0.7, '#fbbf24');
            engineGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = engineGrad;
            ctx.beginPath();
            ctx.moveTo(offsetX - 10, height * 0.4);
            ctx.lineTo(offsetX, height * 0.4 + engineGlick);
            ctx.lineTo(offsetX + 10, height * 0.4);
            ctx.closePath();
            ctx.fill();
          });

          // Draw the massive Flight Deck / Main platform (Futuristic carrier wings with landing lanes)
          ctx.fillStyle = '#0f172a'; // Deep heavy matte metal armor
          ctx.strokeStyle = enemy.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          // Front nose of the carrier (facing down)
          ctx.moveTo(0, height * 0.5);
          // Left side wing
          ctx.lineTo(-width * 0.5, height * 0.2);
          ctx.lineTo(-width * 0.4, -height * 0.4);
          // Rear stern
          ctx.lineTo(-width * 0.25, -height * 0.5);
          ctx.lineTo(width * 0.25, -height * 0.5);
          // Right side wing
          ctx.lineTo(width * 0.4, -height * 0.4);
          ctx.lineTo(width * 0.5, height * 0.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Draw neon runway deck guidelines (The visual trademark of an aircraft carrier!)
          ctx.strokeStyle = '#2dd4bf'; // Neon turquoise runway indicators
          ctx.lineWidth = 1.6;
          ctx.setLineDash([5, 5]); // Dash runway lines!
          ctx.beginPath();
          ctx.moveTo(-width * 0.2, -height * 0.35);
          ctx.lineTo(-width * 0.12, height * 0.22);
          ctx.moveTo(width * 0.2, -height * 0.35);
          ctx.lineTo(width * 0.12, height * 0.22);
          ctx.stroke();
          ctx.setLineDash([]); // Reset line dashes

          // Draw Command Bridge Tower (Holographic glowing structure)
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#22d3ee'; // cyan glow tower
          ctx.beginPath();
          ctx.rect(-16, -height * 0.3, 32, 22);
          ctx.fill();
          ctx.stroke();

          // Command bridge glowing windows
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(-11, -height * 0.24, 7, 3);
          ctx.fillRect(4, -height * 0.24, 7, 3);

          // Draw 2 Rotatable Weapon Battery Turrets on the deck
          const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
          [-width * 0.28, width * 0.28].forEach(offsetX => {
            // Draw turret circle pivot
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(offsetX, -height * 0.1, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw swivelling turret barrel pointing at the player
            ctx.save();
            ctx.translate(offsetX, -height * 0.1);
            ctx.rotate(angleToPlayer - Math.PI / 2); // align with player direction
            ctx.strokeStyle = enemy.color;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 16); // pointing down/forward
            ctx.stroke();
            ctx.restore();
          });

          // Draw Central Shield Energy Generator Core
          const generatorActiveGlow = 14 + Math.sin(state.gameTime * 0.12) * 4;
          const coreGrad = ctx.createRadialGradient(0, 5, 2, 0, 5, generatorActiveGlow);
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.5, enemy.color);
          coreGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = coreGrad;
          ctx.beginPath();
          ctx.arc(0, 5, generatorActiveGlow, 0, Math.PI * 2);
          ctx.fill();

          // Health bar overlays drawn directly over boss
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(-70, -height * 0.65, 140, 7);
          ctx.fillStyle = enemy.color;
          ctx.fillRect(-70, -height * 0.65, 140 * (enemy.health / enemy.maxHealth), 7);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-70, -height * 0.65, 140, 7);

        } else if (enemy.type === 'mini_boss') {
          // MINI-BOSS RENDER (High-tech Orange insectoid fighter block)
          // Front glowing pincers/mandibles
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-10, -18);
          ctx.quadraticCurveTo(-18, -30, -12, -36);
          ctx.moveTo(10, -18);
          ctx.quadraticCurveTo(18, -30, 12, -36);
          ctx.stroke();

          // Double glowing wings
          ctx.fillStyle = 'rgba(249, 115, 22, 0.45)'; // Amber/Orange energy glare
          ctx.beginPath();
          ctx.ellipse(-18, -2, 18, 11 + flap * 4, Math.PI / 5, 0, Math.PI * 2);
          ctx.ellipse(18, -2, 18, 11 + flap * 4, -Math.PI / 5, 0, Math.PI * 2);
          ctx.fill();

          // Stinger / Thruster flame tail
          const flameSize = 8 + Math.sin(state.gameTime * 0.35) * 4;
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(-5, 10);
          ctx.lineTo(0, 10 + flameSize);
          ctx.lineTo(5, 10);
          ctx.closePath();
          ctx.fill();

          // Main armor shell
          ctx.fillStyle = '#ea580c'; // Dark pumpkin amber
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.fill();

          // Bright neon green eyes for menacing look
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(-5, -6, 3.2, 0, Math.PI * 2);
          ctx.arc(5, -6, 3.2, 0, Math.PI * 2);
          ctx.fill();

          // Segment lines
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-10, 3);
          ctx.lineTo(10, 3);
          ctx.stroke();

          // Compact mini-lifebar above mini_boss
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(-22, -26, 44, 4.5);
          ctx.fillStyle = '#f97316';
          ctx.fillRect(-22, -26, 44 * (enemy.health / enemy.maxHealth), 4.5);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(-22, -26, 44, 4.5);

        } else if (enemy.type === 'destroyer') {
          // PURPLE BUG - (Beetle styled with violet mandibles and back shell)
          // Antenna curves
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-6, -15);
          ctx.quadraticCurveTo(-15, -30, -8, -35);
          ctx.moveTo(6, -15);
          ctx.quadraticCurveTo(15, -30, 8, -35);
          ctx.stroke();

          // Flapping side wing fibers
          ctx.fillStyle = 'rgba(168, 85, 247, 0.45)'; // semi transparent purple energy wings
          ctx.beginPath();
          ctx.ellipse(-14, 0, 12 + flap * 4, 18, Math.PI/4, 0, Math.PI*2);
          ctx.ellipse(14, 0, 12 + flap * 4, 18, -Math.PI/4, 0, Math.PI*2);
          ctx.fill();

          // Shell
          ctx.fillStyle = '#581c87'; // rich indigo
          ctx.beginPath();
          ctx.arc(0, 2, 11, 0, Math.PI*2);
          ctx.fill();

          // Crown insectoid eyes
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(-5, -6, 2.5, 0, Math.PI*2);
          ctx.arc(5, -6, 2.5, 0, Math.PI*2);
          ctx.fill();

        } else if (enemy.type === 'scout') {
          // RED/ORANGE ALIEN SPECTER BUG (Middle orange/red row in screen)
          // Delicate wide antennas
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-5, -12);
          ctx.lineTo(-20, -22);
          ctx.moveTo(5, -12);
          ctx.lineTo(20, -22);
          ctx.stroke();

          // Flapping fire butterfly wings
          ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
          ctx.beginPath();
          ctx.ellipse(-15, -4, 14, 8 + flap * 3, Math.PI/6, 0, Math.PI*2);
          ctx.ellipse(15, -4, 14, 8 + flap * 3, -Math.PI/6, 0, Math.PI*2);
          ctx.fill();

          // Body plate
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.lineTo(8, 6);
          ctx.lineTo(0, 12);
          ctx.lineTo(-8, 6);
          ctx.closePath();
          ctx.fill();

          // Core reactor dot
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(0, -3, 3, 0, Math.PI*2);
          ctx.fill();

        } else if (enemy.type === 'wasp') {
          // --- WASP (Sarı Eşek Arısı) ---
          // Agile warning-striped insect with long stinger needle
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-4, -12);
          ctx.lineTo(-14, -22);
          ctx.moveTo(4, -12);
          ctx.lineTo(14, -22);
          ctx.stroke();

          // Translucent warning yellow wings
          ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
          ctx.beginPath();
          ctx.ellipse(-14, -4, 12, 16 + flap * 5, Math.PI / 4, 0, Math.PI * 2);
          ctx.ellipse(14, -4, 12, 16 + flap * 5, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          // Abdomen (Black chitin stripes)
          ctx.fillStyle = '#0f172a'; // Deep heavy black scales
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.lineTo(10, 2);
          ctx.lineTo(6, 12);
          ctx.lineTo(-6, 12);
          ctx.lineTo(-10, 2);
          ctx.closePath();
          ctx.fill();

          // Yellow bright warning hazard bands
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(-8, -4, 16, 3.2);
          ctx.fillRect(-6, 3.8, 12, 3.2);

          // Bulby golden eyes
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(0, -10, 5.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.arc(-2.5, -11, 1.8, 0, Math.PI * 2);
          ctx.arc(2.5, -11, 1.8, 0, Math.PI * 2);
          ctx.fill();

          // Aggressive stinger sword
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, 12);
          ctx.lineTo(0, 24);
          ctx.stroke();

        } else if (enemy.type === 'mantis') {
          // --- MANTIS (Asitli Peygamber Devesi) ---
          // Giant green bio-engineered fortress bug with glowing compound armor
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-3, -15);
          ctx.quadraticCurveTo(-12, -24, -16, -20);
          ctx.moveTo(3, -15);
          ctx.quadraticCurveTo(12, -24, 16, -20);
          ctx.stroke();

          // Lime neon membrane wings
          ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.beginPath();
          ctx.ellipse(-16, 0, 10, 20 + flap * 3, Math.PI / 6, 0, Math.PI * 2);
          ctx.ellipse(16, 0, 10, 20 + flap * 3, -Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();

          // Threatening front scythe claws
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-10, -5);
          ctx.lineTo(-18, -14);
          ctx.lineTo(-12, -22);
          ctx.moveTo(10, -5);
          ctx.lineTo(18, -14);
          ctx.lineTo(12, -22);
          ctx.stroke();

          // Main heavy forest green biome-shell
          ctx.fillStyle = '#064e3b';
          ctx.beginPath();
          ctx.ellipse(0, 2, 11, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Double glowing electronic wide eyes
          ctx.fillStyle = '#a7f3d0';
          ctx.beginPath();
          ctx.arc(-7, -10, 4.5, 0, Math.PI * 2);
          ctx.arc(7, -10, 4.5, 0, Math.PI * 2);
          ctx.fill();

          // Active acid gland nuclear core
          const innerAcidSize = 3.5 + Math.sin(state.gameTime * 0.15) * 1.5;
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(0, 2, innerAcidSize, 0, Math.PI * 2);
          ctx.fill();

        } else if (enemy.type === 'kamikaze') {
          // --- KAMIKAZE (Kan Çekirgesi) ---
          // Burning crimson jet-locust
          const isPanic = enemy.health < enemy.maxHealth;

          ctx.shadowBlur = isPanic ? 25 : 12;
          ctx.shadowColor = '#f43f5e';

          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(-4, -12);
          ctx.lineTo(-16, -26);
          ctx.moveTo(4, -12);
          ctx.lineTo(16, -26);
          ctx.stroke();

          // Double high-sweep wing structures
          ctx.fillStyle = isPanic ? 'rgba(244, 63, 94, 0.75)' : 'rgba(244, 63, 94, 0.45)';
          ctx.beginPath();
          ctx.ellipse(-15, -4, 11, 15 + flap * 4, Math.PI / 3, 0, Math.PI * 2);
          ctx.ellipse(15, -4, 11, 15 + flap * 4, -Math.PI / 3, 0, Math.PI * 2);
          ctx.fill();

          // Massive engine fire tail
          const exhaustDistance = (isPanic ? 24 : 10) + Math.sin(state.gameTime * 0.4) * 6;
          const flameGrad = ctx.createLinearGradient(0, 8, 0, 8 + exhaustDistance);
          flameGrad.addColorStop(0, '#f43f5e');
          flameGrad.addColorStop(0.5, '#fbbf24');
          flameGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.moveTo(-6, 8);
          ctx.lineTo(0, 8 + exhaustDistance);
          ctx.lineTo(6, 8);
          ctx.closePath();
          ctx.fill();

          // Aerodynamic locust body capsule
          ctx.fillStyle = isPanic ? '#e11d48' : '#9f1239';
          ctx.beginPath();
          ctx.moveTo(0, -14);
          ctx.lineTo(9, 0);
          ctx.lineTo(5, 10);
          ctx.lineTo(-5, 10);
          ctx.lineTo(-9, 0);
          ctx.closePath();
          ctx.fill();

          // White incandescent visor slit
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-6, -7, 12, 2.2);

        } else {
          // CYAN SCOUT METEOR (Compact pest/scout spaceship bug)
          // Simple flapping wings
          ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.beginPath();
          ctx.ellipse(-11, 2, 8 + flap * 3, 11, Math.PI/3, 0, Math.PI*2);
          ctx.ellipse(11, 2, 8 + flap * 3, 11, -Math.PI/3, 0, Math.PI*2);
          ctx.fill();

          // Round pod
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI*2);
          ctx.fill();

          // Head node
          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.arc(0, -5, 3.5, 0, Math.PI*2);
          ctx.fill();
        }

        ctx.restore();

        // Check if bug crashed or bypassed player boundary
        if (enemy.y > canvas.height + 30) {
          // Loop back up or reduce core health
          if (player.health > 0) {
            player.health -= 0.5; // slow damage penalty for letting alien bypass defense
            soundEngine.playPlayerHit();
          }
          return false;
        }

        // Space Collisions (Bug body crashes into player ship)
        const distToPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        const contactRadius = enemy.type === 'boss' ? 70 : 30;
        
        if (distToPlayer < contactRadius && player.health > 0) {
          if (player.shield <= 0) {
            player.health -= 1;
            player.shield = 2; // grant shield recovery frames
            enemy.health -= 10; // massive impact damage to the alien too representing kamikaze collision
            createExplosion(enemy.x, enemy.y, enemy.color, 18);
            soundEngine.playPlayerHit();
          }
          if (enemy.health <= 0) {
            return false;
          }
        }

        // CRITICAL CHECK - IF BUG ELIMINATED!
        if (enemy.health <= 0) {
          soundEngine.playExplosion(enemy.type === 'boss' ? 2.5 : 0.82);
          createExplosion(enemy.x, enemy.y, enemy.color, enemy.type === 'boss' ? 40 : 15);
          
          // Reward points & credit coins
          state.score += enemy.points;
          state.coins += enemy.coins;

          // Drop glowing retro Powerups occasionally
          if (Math.random() < 0.28 || enemy.type === 'boss') {
            const types: ('shield' | 'triple' | 'health' | 'bomb')[] = ['shield', 'triple', 'health', 'bomb'];
            const type = types[Math.floor(Math.random() * types.length)];
            let powerColor = '#38bdf8'; // shield blue
            if (type === 'triple') powerColor = '#fd79a8'; // triple pink
            if (type === 'health') powerColor = '#2ed573'; // health green
            if (type === 'bomb') powerColor = '#fb5b5a'; // fire bomb orange/red

            state.powerUps.push({
              x: enemy.x,
              y: enemy.y,
              type,
              radius: 12,
              speedY: 2.22,
              color: powerColor,
              pulse: 0
            });
          }

          // Trigger state counters to sync highscores and coin bars
          setStats(prev => {
            const nextScore = prev.score + enemy.points;
            const nextCoins = prev.coins + enemy.coins;
            const finalHigh = Math.max(prev.highScore, nextScore);
            
            if (finalHigh > prev.highScore) {
              localStorage.setItem('space_high_score', finalHigh.toString());
            }

            return {
              ...prev,
              score: nextScore,
              coins: nextCoins,
              highScore: finalHigh,
              enemiesKilled: prev.enemiesKilled + 1,
              bossesKilled: enemy.type === 'boss' ? prev.bossesKilled + 1 : prev.bossesKilled
            };
          });

          return false;
        }

        return true;
      });

      // --- POWER-UPS & DROP SHARDS SYSTEM ---
      state.powerUps = state.powerUps.filter(power => {
        power.y += power.speedY;
        power.pulse += 0.08;

        // Render rotating star coins or geometric capsules
        ctx.save();
        ctx.shadowBlur = 10 + Math.sin(power.pulse) * 4;
        ctx.shadowColor = power.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.fillStyle = power.color;

        ctx.beginPath();
        ctx.arc(power.x, power.y, power.radius + Math.sin(power.pulse) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Render inner letter or symbols representing items
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let keyChar = 'S';
        if (power.type === 'triple') keyChar = 'W';
        if (power.type === 'health') keyChar = 'H';
        if (power.type === 'bomb') keyChar = 'B';
        ctx.fillText(keyChar, power.x, power.y);
        ctx.restore();

        // Screen boundary
        if (power.y > canvas.height + 25) return false;

        // Magnet attraction code (if player is nearby, drift/pull towards spaceship!)
        const pullDist = Math.hypot(power.x - player.x, power.y - player.y);
        if (pullDist < 120) {
          power.x += (player.x - power.x) * 0.12;
          power.y += (player.y - power.y) * 0.12;
        }

        // Contact picking code
        if (pullDist < 26) {
          soundEngine.playPowerUp();
          
          if (power.type === 'shield') {
            player.shield = 6; // grants 6s total dynamic shield barrier
          } else if (power.type === 'triple') {
            state.tripleActive = true;
            state.tripleTimer = 8; // holds triple weapon for 8s
          } else if (power.type === 'health') {
            player.health = Math.min(player.maxHealth, player.health + 1);
          } else if (power.type === 'bomb') {
            // Trigger mega tactical stellar shock bomb clear
            state.enemies.forEach(enemy => {
              enemy.health -= 12; // massive shockwave damage across screen
              createExplosion(enemy.x, enemy.y, '#f59e0b', 12);
            });
            // Bomb sparkle waves across background
            for (let i = 0; i < 30; i++) {
              state.particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                dx: Math.cos(i) * 12,
                dy: Math.sin(i) * 12,
                radius: Math.random() * 5 + 2,
                color: '#ea580c',
                life: 0,
                maxLife: 40
              });
            }
          }
          return false; // destroy power
        }

        return true;
      });

      // --- EXPLOSIONS & STARS PARTICLES ENGINE ---
      state.particles = state.particles.filter(p => {
        p.x += p.dx;
        p.y += p.dy;
        p.life += 1;

        // Decelerating force simulating friction
        p.dx *= 0.96;
        p.dy *= 0.96;

        const opacity = 1 - (p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = opacity;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1.0; // Reset canvas values

        return p.life < p.maxLife;
      });

      // --- HUD RENDERING (Live score, coin indicators inside game overlay) ---
      // Displaying lives using heart shapes
      ctx.fillStyle = '#ef4444';
      for (let i = 0; i < player.maxHealth; i++) {
        const hX = 25 + i * 24;
        const hY = 28;
        if (i < Math.floor(player.health)) {
          // Full Heart
          ctx.beginPath();
          ctx.arc(hX - 5, hY, 5, 0, Math.PI, true);
          ctx.arc(hX + 5, hY, 5, 0, Math.PI, true);
          ctx.lineTo(hX, hY + 10);
          ctx.closePath();
          ctx.fill();
        } else if (i < player.health) {
          // Half Heart
          ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
          ctx.beginPath();
          ctx.arc(hX - 5, hY, 5, 0, Math.PI, true);
          ctx.arc(hX + 5, hY, 5, 0, Math.PI, true);
          ctx.lineTo(hX, hY + 10);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ef4444';
        } else {
          // Empty Heart Slot
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(hX - 5, hY, 5, 0, Math.PI, true);
          ctx.arc(hX + 5, hY, 5, 0, Math.PI, true);
          ctx.lineTo(hX, hY + 10);
          ctx.closePath();
          ctx.stroke();
        }
      }

      // On-Screen Live Canvas HUD (Right Aligned)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`SKOR: ${state.score.toLocaleString()}`, canvas.width - 20, 24);
      ctx.fillStyle = '#60a5fa';
      ctx.fillText(`SEVİYE: ${state.level}`, canvas.width - 20, 39);
      
      const textEvoColor = 
        evo === 1 ? '#a855f7' : 
        evo === 2 ? '#3b82f6' : 
        evo === 3 ? '#ec4899' : 
        evo === 4 ? '#fbbf24' : 
        evo === 5 ? '#10b981' : '#f43f5e';
      ctx.fillStyle = textEvoColor;
      const evoTitleStr = 
        evo === 1 ? 'DEFENDER PRIME 🚀' : 
        evo === 2 ? 'COBALT RACER 🛸' : 
        evo === 3 ? 'NOVA FIGHTER ⚡' : 
        evo === 4 ? 'APEX DESTROYER 🔥' : 
        evo === 5 ? 'EMERALD VALKYRIE 🛡️' : 'OMEGA ARCHANGEL 👑';
      ctx.fillText(`GEMİ FORMU: Lvl ${evo} (${evoTitleStr})`, canvas.width - 20, 54);

      // --- ACTIVE BOSS HUD GAUGE DISPLAY ---
      const activeBoss = state.enemies.find(enemy => enemy.type === 'boss');
      if (activeBoss) {
        const isBig = (state.level % 5 === 0);
        const bossRatio = Math.max(0, activeBoss.health / activeBoss.maxHealth);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isBig) {
          // BÜYÜK BOSS: Segmented 4-core Shield Indicator!
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ec4899';
          ctx.fillText(`⚡ BÜYÜK BOSS ENERJİ KORDU (4 KADEMELİ JENERATÖR): ${Math.ceil(bossRatio * 100)}% ⚡`, canvas.width / 2, 22);

          const coreWidth = 50;
          const coreHeight = 8;
          const spacing = 6;
          const totalWidth = 4 * coreWidth + 3 * spacing;
          const startX = (canvas.width - totalWidth) / 2;
          const startY = 32;

          for (let s = 0; s < 4; s++) {
            const minRatio = s * 0.25;
            const maxRatio = (s + 1) * 0.25;

            // Draw core slot border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(startX + s * (coreWidth + spacing), startY, coreWidth, coreHeight);

            // Draw core fill based on ratio
            if (bossRatio > minRatio) {
              const coreFillPercent = Math.min(1.0, (bossRatio - minRatio) / 0.25);
              ctx.fillStyle = coreFillPercent === 1.0 ? '#ec4899' : '#f43f5e'; // glowing red if taking damage in active segment
              ctx.shadowColor = ctx.fillStyle;
              ctx.shadowBlur = 8;
              ctx.fillRect(startX + s * (coreWidth + spacing) + 1.5, startY + 1.5, (coreWidth - 3) * coreFillPercent, coreHeight - 3);
            }
          }
        } else {
          // KÜÇÜK BOSS: Continuous Sleek Golden Amber Energy Core
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 10px monospace';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#fbbf24';
          ctx.fillText(`👾 SAVAŞ MUHRİBİ (KÜÇÜK BOSS): ${Math.ceil(bossRatio * 100)}% 👾`, canvas.width / 2, 22);

          const barWidth = 190;
          const barHeight = 6;
          const startX = (canvas.width - barWidth) / 2;
          const startY = 32;

          ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(startX, startY, barWidth, barHeight);

          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(startX + 1, startY + 1, (barWidth - 2) * bossRatio, barHeight - 2);
        }
        ctx.restore();
      }

      // Display LEVEL UP floating notifications
      if (state.levelUpAlertTimer > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.95)'; // Elegant emerald transparent box
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.6;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#10b981';
        ctx.beginPath();
        ctx.roundRect(canvas.width/2 - 140, canvas.height/2 - 75, 280, 50, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`SEVİYE TAMAMLANDI: SEVİYE ${state.level - 1} 🏆`, canvas.width / 2, canvas.height / 2 - 62);
        ctx.font = '9px monospace';
        ctx.fillStyle = '#a7f3d0';
        ctx.fillText("DAHA ZORLU BİR DALGAYA GEÇİLİYOR...", canvas.width / 2, canvas.height / 2 - 44);
        ctx.restore();
      }

      // Display BOSS ALARM warnings (UÇAK GEMİSİ)
      if (state.bossAlertTimer > 0) {
        const pulseFactor = Math.abs(Math.sin(state.gameTime * 0.1));
        ctx.save();
        ctx.fillStyle = `rgba(185, 28, 28, ${0.75 + pulseFactor * 0.2})`;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12 + pulseFactor * 8;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.roundRect(canvas.width/2 - 150, canvas.height/2 - 110, 300, 60, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚠️ BOSS TEHLİKESİ ⚠️`, canvas.width / 2, canvas.height / 2 - 93);
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#fbbf24';
        
        let customBossName = `Savaş Uçak Gemisi (Lvl ${state.level})`;
        const bossSelector = (state.level - 1) % 5;
        if (bossSelector === 0) customBossName = `Kızıl Savaş Uçak Gemisi (Lvl ${state.level})`;
        else if (bossSelector === 1) customBossName = `Kozmik Boşluk Sancak Gemisi (Lvl ${state.level})`;
        else if (bossSelector === 2) customBossName = `Güneş Fırtınası Destroyerı (Lvl ${state.level})`;
        else if (bossSelector === 3) customBossName = `Kutsal Nebula Muhafız Gemisi (Lvl ${state.level})`;
        else customBossName = `Sonsuzluk Kıyamet Amiral Gemisi (Lvl ${state.level})`;

        ctx.fillText(customBossName, canvas.width / 2, canvas.height / 2 - 76);
        ctx.font = '9px monospace';
        ctx.fillStyle = '#fca5a5';
        ctx.fillText("DÜŞMAN ANA SAVAŞ GEMİSİ YAKLAŞIYOR!", canvas.width / 2, canvas.height / 2 - 62);
        ctx.restore();
      }

      // Display SHIP EVOLUTION announcements
      if (state.evoSplashTimer > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = textEvoColor;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 20;
        ctx.shadowColor = textEvoColor;
        ctx.beginPath();
        ctx.roundRect(canvas.width/2 - 165, 85, 330, 70, 18);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("⚡ GEMİ SİLAHLARI EVRİMLEŞTİ! ⚡", canvas.width / 2, 112);
        
        ctx.fillStyle = textEvoColor;
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(evoTitleStr, canvas.width / 2, 133);
        
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '9px monospace';
        ctx.fillText("Düşmanları Yok Ettikçe Yeni Formlar Kazan!", canvas.width / 2, 147);
        ctx.restore();
      }

      // Display level up announcement banner
      if (state.enemies.length === 0 && !state.bossSpawned) {
        ctx.fillStyle = '#faff33';
        ctx.font = 'bold 20px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText("İSTİLA TEMİZLENDİ!", canvas.width / 2, canvas.height / 2 - 40);
        ctx.fillText("YENİ DALGA GELİYOR...", canvas.width / 2, canvas.height / 2 + 10);
      }

      // Display lightning indicator timer if active
      if (state.lightningActive) {
        ctx.fillStyle = '#ec4899';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`⚡ YILDIRIM GÜCÜ: ${state.lightningTimer.toFixed(1)}sn`, 20, 60);
      }

      if (state.tripleActive) {
        ctx.fillStyle = '#f472b6';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`🚀 ÜÇLÜ LAZER GÜCÜ: ${state.tripleTimer.toFixed(1)}sn`, 20, 75);
      }



      // Sync and trigger end condition if player health drops to zero
      if (player.health <= 0) {
        soundEngine.stopMusic();
        soundEngine.playExplosion(2);
        
        // Trigger explosion debris fireworks across entire screen
        createExplosion(player.x, player.y, '#f43f5e', 50);

        setTimeout(() => {
          setGameState('GAMEOVER');
        }, 1200);
        return;
      }

      // Progress animation frame safely
      animId = requestAnimationFrame(loop);
    };

    // Run core loops
    animId = requestAnimationFrame(loop);

    // Teardown listening loops
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [gameState, activeWeapon, autoFire, selectedShipColor]);

  return (
    <div id="game-suite-root" className="min-h-screen bg-slate-950 flex flex-col justify-between items-center text-white relative font-sans overflow-x-hidden p-2 sm:p-4 md:p-6 select-none bg-gradient-to-b from-indigo-950/20 via-slate-950 to-slate-950">
      
      {/* Dynamic atmospheric ambient stardust overlays */}
      <div id="ambient-fog-left" className="absolute top-0 left-0 w-96 h-96 bg-fuchsia-900/10 rounded-full blur-3xl pointer-events-none" />
      <div id="ambient-fog-right" className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Modern High-End Top Header Bezel */}
      <header id="game-header" className="w-full max-w-5xl flex items-center justify-between py-3 px-4 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-800/80 shadow-2xl z-20 mb-3">
        <div id="brand-indicator" className="flex items-center gap-3">
          <div id="brand-avatar" className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-600 shadow-lg shadow-emerald-600/20 animate-pulse">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm md:text-md font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400">
              MATRİX GEZEGENİ
            </h1>
            <p className="text-[10px] text-emerald-500 tracking-wider font-mono font-bold">MATRİX SİMÜLATÖRÜ</p>
          </div>
        </div>

        {/* Dynamic score ticker inside headbar */}
        <div id="quick-bezel-stats" className="hidden md:flex items-center gap-6 text-sm">
          <div id="bezel-score" className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">En Yüksek Skor:</span>
            <span className="font-mono text-amber-400 font-extrabold">{stats.highScore.toLocaleString()}</span>
          </div>
          <div id="bezel-coins" className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span className="text-slate-400">Altınlar:</span>
            <span className="font-mono text-emerald-400 font-extrabold">{stats.coins}</span>
          </div>
        </div>

        {/* Tactical Sound & Feature Action Buttons */}
        <div id="quick-action-toggles" className="flex items-center gap-2.5">
          {/* Cihaz Modu Seçici */}
          <button
            id="device-toggle-btn"
            onClick={() => { setIsMobileMode(!isMobileMode); soundEngine.playPowerUp(); }}
            className={`p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 border flex items-center gap-1.5 ${
              isMobileMode
                ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-400 shadow-md shadow-emerald-950/20'
                : 'bg-indigo-950/40 border-indigo-500/55 text-indigo-300 hover:bg-slate-800'
            }`}
            title="Mobil / Masaüstü GörünümDeğiştir"
          >
            {isMobileMode ? <Smartphone className="w-4 h-4 text-emerald-400 animate-pulse" /> : <Laptop className="w-4 h-4 text-indigo-400" />}
            <span className="hidden sm:inline text-xs font-black">
              {isMobileMode ? 'Masaüstü Modu' : 'Cihaz: Mobil'}
            </span>
          </button>

          <button
            id="stats-button"
            onClick={() => { setShowStatsModal(true); soundEngine.playLaser(740); }}
            className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-emerald-400 hover:bg-emerald-950/40 hover:border-emerald-500/50 transition-all duration-300 transform active:scale-95 flex items-center gap-1.5"
            title="Savaş İstatistikleri"
          >
            <BarChart3 className="w-4.5 h-4.5 text-emerald-400" />
            <span className="hidden sm:inline text-xs font-black text-slate-300">İstatistikler</span>
          </button>

          <button
            id="immersive-button"
            onClick={() => { setIsImmersive(!isImmersive); soundEngine.playPowerUp(); }}
            className={`p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 border ${
              isImmersive 
                ? 'bg-emerald-950/50 border-emerald-500 text-emerald-400 hover:bg-emerald-900' 
                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
            }`}
            title="Tam Ekran Modu"
          >
            <Maximize2 className="w-4.5 h-4.5" />
          </button>

          <button
            id="mute-button"
            onClick={toggleMute}
            className={`p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 border ${
              isMuted 
                ? 'bg-rose-950/50 border-rose-800/65 text-rose-400 hover:bg-rose-900' 
                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
            }`}
            title="Sesi kapat/aç"
          >
            {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
          </button>
        </div>
      </header>

      {/* Main viewport Container (Bezel Arcade cabinet style aspect) */}
      <main id="game-main-cabinet" className="relative flex-1 w-full max-w-5xl flex flex-col lg:flex-row justify-center items-center gap-4 sm:gap-6 px-0 sm:px-2 md:px-4 z-10 py-2">
        
        {/* Left Side Menu Panel - Ship hangar & configuration specs (visible on desk) */}
        <section id="hangar-left-spec" className={`${isMobileMode ? 'hidden' : 'hidden lg:flex'} w-72 flex-col gap-4 self-stretch justify-between bg-slate-900/65 backdrop-blur-md rounded-3xl p-5 border border-slate-800/85`}>
          <div id="hangar-intro">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 font-extrabold flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-fuchsia-400 animate-spin" /> Uzay Teknolojisi
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Uzay istasyonu uzaktan mühendislik terminali. Geminizin zırh kaplamasını, plazma atış hızını ve silah entegrasyonlarını optimize edin.
            </p>
          </div>

          <div id="weapons-customizer" className="flex flex-col gap-3 my-4">
            <h3 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-1">
              Aktif Plazma Seçimi
            </h3>
            
            <button
              id="weapon-select-std"
              onClick={() => { setActiveWeapon('standard'); soundEngine.playLaser(850); }}
              className={`p-3 rounded-xl flex items-center justify-between text-left transition-all border ${
                activeWeapon === 'standard' 
                  ? 'bg-fuchsia-950/40 border-fuchsia-500/80 text-fuchsia-300 shadow-md shadow-fuchsia-950/20' 
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div>
                <span className="text-xs font-black block">Plazma Atıcı</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Sanal odaklı tekli patlama mermileri</span>
              </div>
              <Zap className="w-4 h-4 text-fuchsia-400" />
            </button>

            <button
              id="weapon-select-triple"
              onClick={() => {
                if (upgrades.find(u => u.id === 'weapon_triple')?.unlocked) {
                  setActiveWeapon('triple');
                  soundEngine.playLaser(950);
                } else {
                  soundEngine.playPlayerHit();
                }
              }}
              className={`p-3 rounded-xl flex items-center justify-between text-left transition-all border ${
                activeWeapon === 'triple'
                  ? 'bg-fuchsia-950/40 border-fuchsia-500/80 text-fuchsia-300'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              } ${!upgrades.find(u => u.id === 'weapon_triple')?.unlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div>
                <span className="text-xs font-black block">Üçlü Enerji Lazeri</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Geniş alana yayılan plazma akımı</span>
              </div>
              <Shield className="w-4 h-4 text-fuchsia-400" />
            </button>

            <button
              id="weapon-select-lightning"
              onClick={() => {
                if (upgrades.find(u => u.id === 'weapon_lightning')?.unlocked) {
                  setActiveWeapon('lightning');
                  soundEngine.playLaser(1200);
                } else {
                  soundEngine.playPlayerHit();
                }
              }}
              className={`p-3 rounded-xl flex items-center justify-between text-left transition-all border ${
                activeWeapon === 'lightning'
                  ? 'bg-fuchsia-950/40 border-fuchsia-500/80 text-fuchsia-300'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              } ${!upgrades.find(u => u.id === 'weapon_lightning')?.unlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div>
                <span className="text-xs font-black block">Yıldırım Aşım Enerjisi</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Ölümcül önleyici lazer yıldırımı</span>
              </div>
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            </button>
          </div>

          <div id="gameplay-toggles" className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Otomatik Ateşleme</span>
            <button
              id="auto-fire-toggle"
              onClick={() => { setAutoFire(!autoFire); soundEngine.playLaser(700); }}
              className={`w-12 h-6.5 rounded-full p-1 transition-all ${
                autoFire ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <div className={`w-4.5 h-4.5 rounded-full bg-white transition-all transform ${
                autoFire ? 'translate-x-[20px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </section>

        {/* Center Cabinet Bezel Container (Toggles between Mobile simulator skin or classic Arcade console depending on isMobileMode) */}
        <div 
          id="cabinet-bezel-shadowbox" 
          ref={containerRef}
          className={
            isMobileMode 
              ? "relative w-full max-w-[400px] h-[91vh] max-h-[810px] bg-slate-950 rounded-[48px] border-[12px] border-slate-900 shadow-[0_0_80px_rgba(16,185,129,0.25)] flex flex-col justify-between overflow-hidden select-none my-2"
              : isImmersive 
                ? "relative h-[95vh] max-h-[880px] aspect-[5/8] bg-slate-950 rounded-[32px] border-[12px] border-slate-900 shadow-[0_0_120px_rgba(34,197,94,0.45)] overflow-hidden flex flex-col justify-center items-center"
                : "relative w-full max-w-[440px] aspect-[5/8] bg-slate-950 rounded-2xl sm:rounded-[32px] border-4 sm:border-[10px] border-slate-900 shadow-[0_0_80px_rgba(34,197,94,0.3)] overflow-hidden flex flex-col justify-center items-center"
          }
        >
          {isMobileMode && (
            <>
              {/* Phone Speaker & Notch Camera Island */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-900 rounded-full z-[100] flex items-center justify-center border border-slate-800/40 shadow-inner pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-slate-950 border border-slate-800/45 mr-auto ml-3" />
                <div className="w-11 h-1 bg-slate-950 rounded-full mr-4 opacity-50" />
              </div>

              {/* Realtime Notifier bar */}
              <div className="absolute top-0 left-0 w-full h-10 pt-3 px-6 flex justify-between items-center bg-slate-950/80 text-[10px] font-mono text-slate-300 font-bold z-50 select-none border-b border-slate-900/40 pointer-events-none">
                <div>
                  <span>{phoneTime}</span>
                  <span className="text-[7.5px] tracking-tighter text-emerald-500 font-black ml-1 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/10">LTE</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px]">
                  <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                  <span className="text-[9px] text-slate-400">MATRIX-NET</span>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <div className="flex items-center gap-0.5 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                    <span className="text-[7.5px]">96%</span>
                    <Battery className="w-3.5 h-3 text-emerald-400" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Glowing neon borders mimicking user visual image screen edges */}
          <div id="glass-glare" className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-10" />
          
          {/* Live Arcade Canvas Screen */}
          <canvas
            id="retro-game-screen"
            ref={canvasRef}
            className={`w-full h-full block cursor-crosshair bg-slate-950 ${gameState !== 'PLAYING' ? 'opacity-[0.13]' : 'opacity-100 transition-opacity duration-700'} ${isMobileMode ? 'pt-10 pb-44' : ''}`}
          />

          {/* SCREEN OVERLAYS (START SCREEN) */}
          {gameState === 'START' && (
            <div id="screen-overlay-start" className="absolute inset-0 z-20 flex flex-col justify-between items-center bg-slate-950/90 text-center p-6 select-none animate-fade-in">
              <div id="start-hero-header" className="my-auto flex flex-col items-center">
                {/* Visual alien bug glowing background element to match photo theme */}
                <div id="insectoid-brand-ring" className="w-24 h-24 rounded-full bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center mb-6 animate-pulse">
                  <Gamepad2 className="w-12 h-12 text-emerald-400" />
                </div>
                
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-1 text-transparent bg-clip-text bg-gradient-to-b from-white via-emerald-200 to-emerald-500 font-sans">
                  MATRIX GEZEGENİ
                </h1>
                <p className="text-xs tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400 font-black mb-10">
                  DEZENFEKSİYON SİMÜLASYONU
                </p>

                {/* Score panel box */}
                <div id="score-bracket-badge" className="flex items-center gap-2 bg-indigo-950/50 border border-indigo-500/20 px-4 py-2 rounded-2xl mb-8">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-300 text-xs text-bold">REKOR:</span>
                  <span className="font-mono text-amber-400 font-extrabold text-xs tracking-widest">{stats.highScore.toLocaleString()}</span>
                </div>

                {/* Conditionally reveal Continue and Fresh Start buttons to support persistence state */}
                {stats.level > 1 || stats.score > 0 ? (
                  <div id="continue-options-block" className="flex flex-col sm:flex-row gap-3.5 items-center justify-center w-full max-w-sm">
                    <button
                      id="action-btn-continue"
                      onClick={() => startGame(false)}
                      className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transform hover:-translate-y-0.5 transition duration-200 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-white text-white" /> KALDIĞIN YERDEN DEVAM ET (Seviye {stats.level})
                    </button>
                    
                    <button
                      id="action-btn-reset-fresh"
                      onClick={() => {
                        if (window.confirm("Sıfırdan başlamak istediğinize emin misiniz? Kaydedilmiş seviyeniz ve tüm kazandığınız altınlar sıfırlanacaktır!")) {
                          startGame(true);
                        }
                      }}
                      className="w-full px-5 py-3 border border-slate-700 hover:border-rose-500 bg-slate-900/60 text-slate-400 hover:text-rose-400 rounded-xl font-bold text-xs uppercase tracking-wider transition duration-200 active:scale-95 text-center"
                    >
                      🗑 SIFIRDAN BAŞLA (YENİ OYUN)
                    </button>
                  </div>
                ) : (
                  <button
                    id="action-btn-start"
                    onClick={() => startGame(false)}
                    className="px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-fuchsia-600/30 hover:shadow-fuchsia-600/50 transform hover:-translate-y-1 transition duration-300 active:scale-95 flex items-center gap-3"
                  >
                    <Play className="w-5 h-5 fill-white text-white" /> SAVAŞA BAŞLA
                  </button>
                )}
              </div>

              {/* Ship Hangar selection box */}
              <div id="hangar-selection-bar" className="w-full bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl mb-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2.5 text-left">GELİŞMİŞ GEMİ KAPLAMASI SEÇİN</p>
                <div id="color-selectors" className="flex items-center gap-3.5">
                  <button
                    id="color-pink"
                    onClick={() => selectColor('#d946ef')}
                    className={`w-10 h-10 rounded-xl transition-all border-2 ${
                      selectedShipColor === '#d946ef' ? 'border-white scale-110 shadow-lg shadow-fuchsia-500/20' : 'border-slate-800'
                    }`}
                    style={{ backgroundColor: '#d946ef' }}
                    title="Neon Magenta"
                  />
                  
                  {upgrades.find(u => u.id === 'ship_vanguard')?.unlocked ? (
                    <button
                      id="color-emerald"
                      onClick={() => selectColor('#10b981')}
                      className={`w-10 h-10 rounded-xl transition-all border-2 ${
                        selectedShipColor === '#10b981' ? 'border-white scale-110 shadow-lg shadow-emerald-500/20' : 'border-slate-800'
                      }`}
                      style={{ backgroundColor: '#10b981' }}
                      title="Emerald Vanguard"
                    />
                  ) : (
                    <div id="locked-emerald" className="w-10 h-10 rounded-xl bg-slate-800/40 border border-dashed border-slate-700 flex items-center justify-center text-slate-600" title="Kilitli">
                      🔒
                    </div>
                  )}

                  {upgrades.find(u => u.id === 'ship_phoenix')?.unlocked ? (
                    <button
                      id="color-orange"
                      onClick={() => selectColor('#f97316')}
                      className={`w-10 h-10 rounded-xl transition-all border-2 ${
                        selectedShipColor === '#f97316' ? 'border-white scale-110 shadow-lg shadow-orange-500/20' : 'border-slate-805'
                      }`}
                      style={{ backgroundColor: '#f97316' }}
                      title="Phoenix Ember"
                    />
                  ) : (
                    <div id="locked-orange" className="w-10 h-10 rounded-xl bg-slate-800/40 border border-dashed border-slate-700 flex items-center justify-center text-slate-600" title="Kilitli">
                      🔒
                    </div>
                  )}

                  <div id="hangar-spec-brief" className="ml-auto text-right text-xs">
                    <span className="text-slate-400 block text-[10px]">Aktif Gemi Model:</span>
                    <span className="text-slate-300 font-bold block">
                      {selectedShipColor === '#d946ef' ? 'Stellar Wing X-1' : selectedShipColor === '#10b981' ? 'Green Vanguard' : 'Phoenix Fighter'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN OVERLAYS (GAME OVER SCREEN) */}
          {gameState === 'GAMEOVER' && (
            <div id="screen-overlay-gameover" className="absolute inset-0 z-20 flex flex-col justify-between items-center bg-rose-950/95 text-center p-6 select-none animate-fade-in">
              <div id="gameover-body" className="my-auto flex flex-col items-center">
                <div id="fire-shield-ring" className="w-20 h-20 rounded-full border-2 border-dashed border-rose-500 flex items-center justify-center text-rose-400 mb-6 animate-spin">
                  💀
                </div>
                
                <h1 className="text-4xl text-rose-500 font-extrabold tracking-tight mb-2">
                  ZIRH KOPTI!
                </h1>
                <p className="text-xs text-rose-300 tracking-wider mb-8">UÇUŞ KONTROLÜ KAYBEDİLDİ</p>

                <div id="gameover-stats" className="w-64 bg-rose-950/40 border border-rose-900/50 p-4 rounded-2xl mb-8 flex flex-col gap-2.5 text-sm text-left font-mono">
                  <div id="results-score" className="flex justify-between">
                    <span className="text-slate-400">Skor:</span>
                    <span className="text-white font-bold">{stats.score.toLocaleString()}</span>
                  </div>
                  <div id="results-kills" className="flex justify-between">
                    <span className="text-slate-400">Yok Edilen Böcek:</span>
                    <span className="text-slate-200 font-bold">{stats.enemiesKilled}</span>
                  </div>
                  <div id="results-coins" className="flex justify-between">
                    <span className="text-slate-400">Altın Kazancı:</span>
                    <span className="text-emerald-400 font-bold">+{stats.coins}</span>
                  </div>
                </div>

                <div id="gameover-buttons" className="flex flex-col gap-3 w-full">
                  <button
                    id="rewarded-ad-gameover"
                    onClick={() => {
                      setRewardedAdActive(true);
                      setRewardedAdStatus('LOADING');
                      setRewardedAdCount(5);
                      soundEngine.playPowerUp();
                    }}
                    className="px-6 py-4 bg-gradient-to-r from-pink-650 via-purple-650 to-indigo-650 border border-pink-500/30 rounded-2xl text-xs uppercase font-extrabold tracking-wider text-white hover:opacity-90 shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 transition active:scale-95 flex flex-col items-center justify-center gap-1.5 animate-pulse"
                  >
                    <div className="flex items-center gap-1.5 justify-center">
                      <span>🎬 REKLAM İZLE & CANLAN</span>
                    </div>
                    <span className="text-[8px] opacity-75 lowercase tracking-normal font-mono text-pink-200">
                      ca-app-pub-7308912210268297/8707189242
                    </span>
                  </button>

                  <button
                    id="restart-gameover"
                    onClick={() => startTransition(() => {
                      startGame();
                    })}
                    className="px-6 py-3.5 bg-rose-600 rounded-xl text-xs uppercase font-bold tracking-widest text-white hover:bg-rose-500 shadow-md shadow-rose-900/35 transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> SIFIRDAN BAŞLA (YENİ SAVAŞ)
                  </button>
                  <button
                    id="upgrade-gameover"
                    onClick={() => { setGameState('UPGRADES'); soundEngine.playLaser(1000); }}
                    className="px-6 py-3.5 bg-slate-850 border border-slate-700 rounded-xl text-xs uppercase font-bold tracking-widest text-slate-300 hover:bg-slate-800 transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4 text-emerald-400" /> SİLAH GELİŞTİR (UPGRADES)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN OVERLAYS (LEVEL COMPLETED SCREEN) */}
          {gameState === 'LEVEL_COMPLETED' && (
            <div id="screen-overlay-level-completed" className="absolute inset-0 z-20 flex flex-col justify-between items-center bg-slate-950/95 text-center p-5 select-none animate-fade-in font-sans overflow-y-auto">
              <div id="level-completed-body" className="my-auto flex flex-col items-center max-w-sm w-full py-2">
                {/* Beautiful glowing orb indicating progress */}
                <div id="glowing-success-orb" className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-500 flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-emerald-500/30 animate-pulse border border-white/20">
                  ★
                </div>
                
                <h1 className="text-2xl font-black tracking-tight mb-1 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
                  SEVİYE TAMAMLANDI!
                </h1>
                <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mb-3.5">Seviye {stats.level} Başarıyla Arındırıldı</p>

                {/* Ship display based on new active level shape */}
                <div className="w-full bg-indigo-950/30 border border-indigo-500/20 px-3.5 py-3 rounded-xl mb-3.5 text-left">
                  <div className="text-center pb-1.5 border-b border-indigo-500/10 mb-2 flex items-center justify-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-mono">YENİ GEMİ EVRİMİ:</span>
                    <span className="font-mono text-emerald-400 font-bold text-[9px] uppercase px-2 py-0.5 bg-emerald-950/60 rounded-full border border-emerald-500/20">
                      Lvl {Math.min(6, stats.level + 1)}
                    </span>
                  </div>
                  <div className="text-center font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-indigo-300 text-xs tracking-wide">
                    {Math.min(6, stats.level + 1) === 1 ? 'DEFENDER PRIME 🚀' : 
                     Math.min(6, stats.level + 1) === 2 ? 'COBALT RACER 🛸' : 
                     Math.min(6, stats.level + 1) === 3 ? 'NOVA FIGHTER ⚡' : 
                     Math.min(6, stats.level + 1) === 4 ? 'APEX DESTROYER 🔥' : 
                     Math.min(6, stats.level + 1) === 5 ? 'EMERALD VALKYRIE 🛡️' : 
                     'OMEGA ARCHANGEL 👑'}
                  </div>
                  <p className="text-[9px] text-indigo-200/60 text-center mt-1 italic">
                    (Uçağın şekli evrimleşti, silah gücü ve mermi sistemi güçlendirildi!)
                  </p>
                </div>

                {/* Stat gains block */}
                <div id="completed-rewards" className="w-full bg-slate-900/60 border border-slate-800/80 px-3.5 py-3 rounded-xl mb-4.5 flex flex-col gap-1.5 text-[11px] text-left font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Bonus Seviye Altını:</span>
                    <span className="text-amber-400 font-bold">+{50 + stats.level * 20} 🪙</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-500">
                    <span className="italic">İlerleme Durumu:</span>
                    <span className="text-emerald-400 font-bold">OTOMATİK KAYDEDİLDİ ✔</span>
                  </div>
                </div>

                {/* Main Option buttons */}
                <div id="level-completed-buttons" className="flex flex-col gap-2 w-full">
                  <button
                    id="btn-next-level"
                    onClick={startNextLevel}
                    className="w-full px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-xl text-xs uppercase font-black tracking-widest text-white shadow-md shadow-indigo-600/30 hover:opacity-90 transform hover:-translate-y-0.5 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    🚀 SONRAKİ SEVİYEYE GEÇ (Level {stats.level + 1})
                  </button>

                  <button
                    id="btn-level-completed-hangar"
                    onClick={() => { setGameState('UPGRADES'); soundEngine.playLaser(1000); }}
                    className="w-full px-5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] uppercase font-bold tracking-widest text-slate-300 hover:bg-slate-800 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    🔧 GEREÇLERİ YÜKSELT & MARKETE GİR
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SIMULATED ADMOB REWARDED AD OVERLAY */}
          {rewardedAdActive && (
            <div id="rewarded-ad-sim-modal" className="absolute inset-0 z-50 flex flex-col justify-center items-center bg-slate-950/95 p-6 text-center animate-fade-in font-sans">
              {/* Premium sci-fi styled holographic border box */}
              <div className="w-full max-w-sm rounded-3xl border border-indigo-500/30 bg-slate-900/90 p-6 shadow-2xl shadow-indigo-500/10 flex flex-col items-center">
                {/* Header info */}
                <div className="flex items-center gap-1.5 bg-indigo-950/80 px-3 py-1.5 rounded-full border border-indigo-500/20 text-indigo-300 text-[10px] font-mono tracking-wider mb-6">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  ADMOB REWARD REKTÖRLÜĞÜ • AKTİF
                </div>
                
                {rewardedAdStatus === 'LOADING' ? (
                  <div className="flex flex-col items-center py-8">
                    {/* Retro loading spinner */}
                    <div className="w-12 h-12 rounded-full border-4 border-t-indigo-500 border-r-indigo-500 border-b-slate-800 border-l-slate-800 animate-spin mb-4" />
                    <h2 className="text-md font-bold text-slate-200 mb-1">REKLAM YÜKLENİYOR...</h2>
                    <p className="text-[10px] text-slate-400 font-mono scale-90">ID: ca-app-pub-7308912210268297/8707189242</p>
                  </div>
                ) : rewardedAdStatus === 'PLAYING' ? (
                  <div className="flex flex-col items-center w-full py-2">
                    {/* Simulated galactic mini-ad frame */}
                    <div className="w-full h-32 rounded-2xl bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 border border-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden mb-6">
                      <div className="absolute top-2 left-2 text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-md font-mono scale-90 border border-slate-800">Sponsorlu</div>
                      
                      {/* Space star aesthetic particles background */}
                      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#d946ef_1px,transparent_1px)] [background-size:16px_16px]" />
                      
                      <div className="z-10 text-center flex flex-col items-center">
                        <span className="text-2xl mb-1 animate-bounce">🛡️</span>
                        <h3 className="text-xs font-black text-rose-300 tracking-wider">UZAY SAVUNUCUNU GELİŞTİR</h3>
                        <p className="text-[9px] text-indigo-200 mt-1 max-w-[200px]">En yüksek skorları kırmak için plazma silahlarını yükseltmeyi sakın unutma!</p>
                      </div>

                      {/* Moving neon glowing loading bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-1000" style={{ width: `${(5 - rewardedAdCount) * 20}%` }} />
                      </div>
                    </div>

                    {/* Circular countdown dial */}
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 flex items-center justify-center text-xl font-black font-mono text-emerald-400 mb-4 animate-pulse">
                      {rewardedAdCount}
                    </div>

                    <h2 className="text-xs font-bold text-slate-100 mb-0.5 font-sans">
                      Ödül Kilidi Açılıyor...
                    </h2>
                    <p className="text-[9px] text-slate-400 font-mono tracking-tight max-w-[220px]">
                      Canlanma ödülü kazanmak için reklamı kapatmayın.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 animate-fade-in">
                    {/* Big achievement icon with glowing pulse */}
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 text-2xl mb-4 animate-bounce">
                      🚀
                    </div>
                    
                    <h2 className="text-md font-extrabold text-emerald-400 mb-1">
                      ÖDÜL KAZANILDI!
                    </h2>
                    <p className="text-xs text-slate-200 max-w-[250px] leading-relaxed mb-4">
                      Tüm canlar yenilendi ve 5 saniyelik <b>KORUYUCU KALKAN</b> aktif ediliyor!
                    </p>
                    
                    <span className="text-[10px] font-mono text-emerald-500 animate-pulse bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      SAVAŞA GERİ DÖNÜLÜYOR...
                    </span>
                  </div>
                )}
                
                {/* Ad unit reference footer */}
                <div className="w-full mt-2 pt-4 border-t border-slate-800/60 text-left">
                  <span className="text-[8px] text-slate-500 font-mono block leading-none">REKLAM BİRİMİ ID:</span>
                  <span className="text-[9px] text-slate-400 font-mono block mt-1 truncate select-all" title="Google AdMob ID">
                    ca-app-pub-7308912210268297/8707189242
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN OVERLAYS (UPGRADE SHOP MODAL) */}
          {gameState === 'UPGRADES' && (
            <div id="screen-overlay-shop" className="absolute inset-0 z-20 flex flex-col justify-between bg-slate-900 text-center p-5 select-none animate-fade-in overflow-y-auto">
              <div id="shop-header" className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div id="shop-title" className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-400" />
                  <h1 className="text-md font-black tracking-wider text-left text-slate-200">
                    UZAY MARKTI
                  </h1>
                </div>
                <div id="shop-wallet" className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-emerald-400 text-xs font-black">{stats.coins}</span>
                </div>
              </div>

              {/* List of Upgrades */}
              <div id="upgrades-list-container" className="flex-1 my-4 flex flex-col gap-2 overflow-y-auto pr-1">
                {upgrades.map((upgrade) => {
                  const isPowerAffordable = stats.coins >= upgrade.cost;
                  return (
                    <div
                      id={`upgrade-row-${upgrade.id}`}
                      key={upgrade.id}
                      className={`p-3 rounded-2xl flex items-center justify-between border text-left transition ${
                        upgrade.unlocked 
                          ? 'bg-indigo-950/20 border-indigo-500/30 opacity-70' 
                          : 'bg-slate-950 border-slate-800 hover:border-slate-705'
                      }`}
                    >
                      <div id={`powerup-meta-${upgrade.id}`} className="flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">{upgrade.name}</span>
                          {upgrade.unlocked && <span className="text-[9px] bg-indigo-500/25 text-indigo-300 px-1.5 py-0.5 rounded-full uppercase font-black">Açık</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{upgrade.description}</p>
                      </div>

                      {upgrade.unlocked ? (
                        <div id={`powerup-success-${upgrade.id}`} className="text-emerald-400 text-xs font-black px-2 py-1">✓ AKTİF</div>
                      ) : (
                        <button
                          id={`purchase-btn-${upgrade.id}`}
                          onClick={() => purchaseUpgrade(upgrade.id, upgrade.cost)}
                          disabled={!isPowerAffordable}
                          className={`px-3 py-2 rounded-xl font-mono text-xs font-black tracking-tighter transition ${
                            isPowerAffordable 
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95' 
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          💸 {upgrade.cost} G
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div id="shop-footer" className="flex items-center gap-3 border-t border-slate-850 pt-3">
                <button
                  id="shop-back-start"
                  onClick={quitToMenu}
                  className="flex-1 px-4 py-3 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-750 transition active:scale-95"
                >
                  ANA MENÜYE DÖN
                </button>
                <button
                  id="shop-back-play"
                  onClick={startGame}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-fuchsia-600 to-indigo-600 rounded-xl text-xs font-black text-white hover:opacity-90 transition active:scale-95"
                >
                  SAVAŞA BAŞLA
                </button>
              </div>
            </div>
          )}
          {/* End of overlays inside cabinet shadowbox */}

              {/* TAB 2: MOBİL SİLAH MARKETİ */}
              {mobileTab === 'shop' && (
                <div className="flex-1 bg-slate-950 flex flex-col justify-between overflow-hidden p-4 text-left relative z-20">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2">
                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">MÜHİMMAT & SİLAH MARKETİ</span>
                    <button className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl text-[10px] text-emerald-400 font-bold active:scale-95 transition">
                      <Coins className="w-3 h-3 text-emerald-450 animate-pulse" />
                      {stats.coins} G
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                    <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/60 text-[10px]">
                      <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mb-1.5">Aktif Silah Seçimi</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => { setActiveWeapon('standard'); soundEngine.playLaser(850); }}
                          className={`p-1.5 rounded-lg text-[9px] text-center font-bold tracking-tight transition border ${activeWeapon === 'standard' ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300' : 'bg-slate-950 border border-slate-905 text-slate-400 hover:text-white'}`}
                        >
                          PEŞE-PLAZMA
                        </button>
                        <button
                          onClick={() => {
                            if (upgrades.find(u => u.id === 'weapon_triple')?.unlocked) {
                              setActiveWeapon('triple');
                              soundEngine.playLaser(950);
                            } else {
                              soundEngine.playPlayerHit();
                            }
                          }}
                          className={`p-1.5 rounded-lg text-[9px] text-center font-bold tracking-tight transition border ${activeWeapon === 'triple' ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300' : 'bg-slate-950 border-slate-905 text-slate-400'} ${!upgrades.find(u => u.id === 'weapon_triple')?.unlocked ? 'opacity-40' : ''}`}
                        >
                          ÜÇLÜ {!upgrades.find(u => u.id === 'weapon_triple')?.unlocked && '🔒'}
                        </button>
                        <button
                          onClick={() => {
                            if (upgrades.find(u => u.id === 'weapon_lightning')?.unlocked) {
                              setActiveWeapon('lightning');
                              soundEngine.playLaser(1200);
                            } else {
                              soundEngine.playPlayerHit();
                            }
                          }}
                          className={`p-1.5 rounded-lg text-[9px] text-center font-bold tracking-tight transition border ${activeWeapon === 'lightning' ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300' : 'bg-slate-950 border-slate-905 text-slate-400'} ${!upgrades.find(u => u.id === 'weapon_lightning')?.unlocked ? 'opacity-40' : ''}`}
                        >
                          YILDIRIM {!upgrades.find(u => u.id === 'weapon_lightning')?.unlocked && '🔒'}
                        </button>
                      </div>
                    </div>

                    {upgrades.map((upgrade) => {
                      const isPowerAffordable = stats.coins >= upgrade.cost;
                      return (
                        <div key={upgrade.id} className="p-2.5 rounded-xl border border-slate-900 bg-slate-900/40 flex items-center justify-between gap-1 text-xs">
                          <div className="flex-1 text-left min-w-0">
                            <span className="text-[10.5px] font-black text-slate-200 block truncate">{upgrade.name}</span>
                            <span className="text-[8.5px] text-slate-500 block truncate mt-0.5">{upgrade.description}</span>
                          </div>
                          {upgrade.unlocked ? (
                            <span className="text-[8.5px] bg-indigo-950/30 border border-indigo-500/30 px-2 py-1 text-indigo-300 rounded-md font-extrabold uppercase shrink-0">Açık</span>
                          ) : (
                            <button
                              onClick={() => purchaseUpgrade(upgrade.id, upgrade.cost)}
                              disabled={!isPowerAffordable}
                              className={`px-3 py-1.5 rounded-xl text-center font-mono font-black text-[9px] tracking-tight shrink-0 transition active:scale-95 ${isPowerAffordable ? 'bg-emerald-600 text-black hover:bg-emerald-500' : 'bg-slate-800 text-slate-500'}`}
                            >
                              🪙 {upgrade.cost}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setMobileTab('play')}
                    className="w-full mt-3 py-3 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-extrabold uppercase text-[10px] rounded-xl tracking-widest shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
                  >
                    GÖREVE GERİ DÖN 🚀
                  </button>
                </div>
              )}

              {/* TAB 3: TELEMETRİ GÜNLÜĞÜ */}
              {mobileTab === 'stats' && (
                <div className="flex-1 bg-slate-950 p-4 flex flex-col justify-between overflow-hidden text-left animate-fade-in font-mono text-[10px] relative z-20">
                  <div className="border-b border-slate-900 pb-2 mb-2 flex items-center justify-between">
                    <span className="font-bold text-slate-300 text-[11px]">MATRIX SİSTEM ANALİZİ</span>
                    <span className="text-[7.5px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-black animate-pulse">AKTİF VERİ</span>
                  </div>

                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-2 text-center text-[9px]">
                      <div className="p-2 border border-slate-800 bg-slate-900/50 rounded-lg">
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">BÖCEK DEZENFEKTE</span>
                        <span className="font-bold text-white block mt-1">{stats.enemiesKilled} ADET</span>
                      </div>
                      <div className="p-2 border border-slate-800 bg-slate-900/50 rounded-lg">
                        <span className="text-[8px] text-slate-400 block uppercase font-bold font-sans">EN YÜKSEK SKOR</span>
                        <span className="font-bold text-amber-400 block mt-1">{stats.highScore.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-900 text-slate-400 text-[8.5px] rounded-xl leading-relaxed max-h-[140px] overflow-y-auto">
                      <p className="text-emerald-400 font-bold uppercase mb-1 border-b border-slate-900 pb-0.5">☣️ TEHDİT ANALİZ GÜNLÜĞÜ</p>
                      <p>&gt; BAĞLANTI: GÜVENLİ SİMÜLATÖR</p>
                      <p>&gt; BOSS KATLİAMI: {stats.bossesKilled} ADET</p>
                      <p>&gt; CİHAZ KODU: ca-app-pub-730.../870</p>
                      <p className="text-indigo-400">&gt; KAPLAMA: {selectedShipColor === '#d946ef' ? 'Stellar Wing X-1' : 'Green Vanguard'}</p>
                      <p className="text-indigo-400">&gt; SAVAŞ BÖLGESİ: MATRİX GEZEGENİ</p>
                    </div>

                    <div className="bg-slate-900 p-2 text-center rounded-xl border border-slate-850">
                      <span className="text-[7.5px] text-slate-500 uppercase block font-bold leading-none mb-1">ADMOB AD-MOBİL REKLAM</span>
                      <span className="text-[8px] text-slate-400 font-mono block">pub-7308912210268297/8707189242</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setMobileTab('play')}
                    className="w-full mt-3 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 font-bold uppercase text-[10px] rounded-xl text-center active:scale-95 transition hover:bg-slate-800"
                  >
                    KONSOLA GERİ DÖN 🛸
                  </button>
                </div>
              )}

              {/* IOS-STYLE TAB NAVIGATION FOOTER */}
              <div className="h-12 bg-slate-950 border-t border-slate-900/60 grid grid-cols-3 relative z-30 select-none shrink-0">
                <button
                  onClick={() => { setMobileTab('play'); soundEngine.playLaser(600); }}
                  className={`flex flex-col items-center justify-center transition ${mobileTab === 'play' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span className="text-[8px] uppercase tracking-wider font-extrabold mt-1">🛸 SAVAŞ</span>
                </button>
                <button
                  onClick={() => { setMobileTab('shop'); soundEngine.playLaser(600); }}
                  className={`flex flex-col items-center justify-center transition ${mobileTab === 'shop' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-[8px] uppercase tracking-wider font-extrabold mt-1">🔧 MARKET</span>
                </button>
                <button
                  onClick={() => { setMobileTab('stats'); soundEngine.playLaser(600); }}
                  className={`flex flex-col items-center justify-center transition ${mobileTab === 'stats' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Terminal className="w-4 h-4" />
                  <span className="text-[8px] uppercase tracking-wider font-extrabold mt-1">📊 ANALİZ</span>
                </button>
              </div>

              {/* iOS style swipe bottom line */}
              <div className="h-2 bg-slate-950 flex items-center justify-center pb-1 shrink-0">
                <div className="w-16 h-0.5 bg-slate-800 rounded-full" />
              </div>

          {isMobileMode && mobileTab === 'play' && (
            /* Float overlays inside the lower part of the screen */
            <div className="absolute bottom-12 left-0 w-full h-[145px] pb-3 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent flex items-end justify-between px-6 z-30 select-none pointer-events-none">
              
              {/* Left side: Touch-responsive Joystick Area */}
              <div className="flex flex-col items-center pointer-events-auto">
                <div 
                  onTouchStart={handleJoystickTouchStart}
                  onTouchMove={handleJoystickTouchMove}
                  onTouchEnd={handleJoystickTouchEnd}
                  onMouseDown={handleJoystickMouseDown}
                  className="relative w-20 h-20 rounded-full bg-slate-950/75 border border-emerald-500/35 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[inset_0_0_12px_rgba(16,185,129,0.2)] backdrop-blur-sm touched-highlight-none hidden"
                >
                  <div 
                    style={{
                      transform: `translate(${joystickVec.x}px, ${joystickVec.y}px)`,
                      transition: joystickActive ? 'none' : 'transform 0.15s ease-out'
                    }}
                    className={`w-9 h-9 rounded-full border flex items-center justify-center shadow-md transition-transform ${
                      joystickActive 
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-emerald-400 scale-95 shadow-emerald-500/20' 
                        : 'bg-slate-800/80 border-slate-600'
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full bg-slate-950/40" />
                  </div>
                </div>
                <span className="text-[7.2px] font-mono font-bold uppercase text-slate-400/80 mt-1 hidden">Yönlendir</span>
              </div>

              {/* Center: Autofire Toggle */}
              <div className="flex flex-col items-center gap-1 pointer-events-auto mb-1">
                <button
                  onClick={() => { setAutoFire(!autoFire); soundEngine.playLaser(700); }}
                  className={`w-9 h-5.5 rounded-full p-0.5 transition-all text-[8px] flex items-center ${autoFire ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'}`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
                <span className="text-[6.8px] font-mono font-bold uppercase text-slate-400/80">OTO ATES</span>
              </div>

              {/* Right side: Giant Action Laser trigger */}
              <div className="flex flex-col items-center pointer-events-auto">
                <button
                  onMouseDown={() => { stateRef.current.keys.Space = true; soundEngine.playLaser(850); }}
                  onMouseUp={() => { stateRef.current.keys.Space = false; }}
                  onTouchStart={(e) => { e.preventDefault(); stateRef.current.keys.Space = true; soundEngine.playLaser(850); }}
                  onTouchEnd={(e) => { e.preventDefault(); stateRef.current.keys.Space = false; }}
                  className="w-18 h-18 rounded-full bg-gradient-to-tr from-rose-650 to-red-650 border border-rose-500 flex items-center justify-center text-white shadow-lg active:scale-95 active:brightness-95 transition focus:outline-none touched-highlight-none hidden"
                >
                  <Zap className="w-5 h-5 text-white" />
                </button>
                <span className="text-[7.2px] font-mono font-bold uppercase text-slate-400/80 mt-1 hidden">SİLİNDİR ATEŞ</span>
              </div>

            </div>
          )}

        </div> {/* Close unified cabinet-bezel-shadowbox */}

        {/* Right Side Info Box - Upgrades and manual control panel */}
        <section id="right-hangar-deck" className={`${isMobileMode ? 'hidden' : 'w-full lg:w-72 flex'} flex-col justify-between gap-4 self-stretch bg-slate-900/65 backdrop-blur-md rounded-3xl p-5 border border-slate-800/85`}>
          <div id="stats-dashboard">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 font-extrabold flex items-center gap-2 mb-3 border-b border-slate-800/60 pb-2">
              <Award className="w-4 h-4 text-emerald-400" /> Savaş İstatistikleri
            </h2>
            <div id="stats-bento" className="grid grid-cols-2 gap-2.5 text-xs">
              <div id="metric-killed" className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/50">
                <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Böcek İmha</span>
                <span className="font-mono text-white text-md font-bold mt-1 block">{stats.enemiesKilled} adet</span>
              </div>
              <div id="metric-boss" className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/50">
                <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Boss Fetih</span>
                <span className="font-mono text-white text-md font-bold mt-1 block">{stats.bossesKilled}</span>
              </div>
              <div id="metric-balance" className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/50 col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Altın Cüzdan</span>
                  <span className="font-mono text-emerald-400 text-sm font-black block mt-0.5">{stats.coins} G</span>
                </div>
                <button
                  id="interact-open-shop"
                  onClick={() => { setGameState('UPGRADES'); soundEngine.playLaser(1000); }}
                  className="px-2.5 py-1.5 bg-emerald-950/40 border border-emerald-800 text-emerald-400 rounded-lg text-[10px] font-black hover:bg-emerald-900 transition flex items-center gap-1 active:scale-95"
                >
                  MARKET <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Weapon Customizer ONLY shown on Mobile & Tablets (hidden on Desktop because we have Hangar Left spec) */}
          <div id="weapons-customizer-mobile" className="flex lg:hidden flex-col gap-2.5 my-1 border-t border-b border-slate-800/60 py-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
                Aktif Plazma Seçimi
              </h3>
              <div id="mobile-autofire-toggle" className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold">Oto-Ateş</span>
                <button
                  id="auto-fire-toggle-mobile"
                  onClick={() => { setAutoFire(!autoFire); soundEngine.playLaser(700); }}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-all ${
                    autoFire ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white transition-all transform ${
                    autoFire ? 'translate-x-[18px]' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                id="weapon-select-std-mobile"
                onClick={() => { setActiveWeapon('standard'); soundEngine.playLaser(850); }}
                className={`p-2.5 rounded-xl flex items-center justify-between text-left transition-all border ${
                  activeWeapon === 'standard' 
                    ? 'bg-fuchsia-950/40 border-fuchsia-500/80 text-fuchsia-300 shadow-md shadow-fuchsia-950/20' 
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div>
                  <span className="text-xs font-black block">Plazma Atıcı</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Tekli mermiler</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
              </button>

              <button
                id="weapon-select-triple-mobile"
                onClick={() => {
                  if (upgrades.find(u => u.id === 'weapon_triple')?.unlocked) {
                    setActiveWeapon('triple');
                    soundEngine.playLaser(950);
                  } else {
                    soundEngine.playPlayerHit();
                  }
                }}
                className={`p-2.5 rounded-xl flex items-center justify-between text-left transition-all border ${
                  activeWeapon === 'triple'
                    ? 'bg-fuchsia-950/40 border-fuchsia-500/80 text-fuchsia-300'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                } ${!upgrades.find(u => u.id === 'weapon_triple')?.unlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div>
                  <span className="text-xs font-black block">Üçlü Lazer</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Geniş enerji</span>
                </div>
                <Shield className="w-3.5 h-3.5 text-fuchsia-400" />
              </button>

              <button
                id="weapon-select-lightning-mobile"
                onClick={() => {
                  if (upgrades.find(u => u.id === 'weapon_lightning')?.unlocked) {
                    setActiveWeapon('lightning');
                    soundEngine.playLaser(1200);
                  } else {
                    soundEngine.playPlayerHit();
                  }
                }}
                className={`p-2.5 rounded-xl flex items-center justify-between text-left transition-all border ${
                  activeWeapon === 'lightning'
                    ? 'bg-fuchsia-950/40 border-fuchsia-500/80 text-fuchsia-300'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                } ${!upgrades.find(u => u.id === 'weapon_lightning')?.unlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div>
                  <span className="text-xs font-black block">Yıldırım Aşım</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Yüksek voltaj</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              </button>
            </div>
          </div>

          <div id="hardware-diagnostics" className="my-2 p-3 bg-slate-950/80 rounded-2xl border border-slate-800/60 flex flex-col gap-1.5 text-[11px] leading-snug">
            <span className="text-[10px] text-slate-400 font-bold block mb-1">KONTROLLER</span>
            <div className="flex items-center gap-2 justify-between">
              <span className="text-slate-400">Yönlendirme (Klavye):</span>
              <span className="text-slate-300 font-mono font-bold">W, A, S, D veya YÖN TUŞLARI</span>
            </div>
            <div className="flex items-center gap-2 justify-between">
              <span className="text-slate-400">Yönlendirme (Dokunmatik/Mouse):</span>
              <span className="text-emerald-400 font-mono font-bold">Ekranda Parmağını Sürükle (Sağ/Sol/İleri/Geri) 🛸</span>
            </div>
            <div className="flex items-center gap-2 justify-between">
              <span className="text-slate-400">Plazma Ateş:</span>
              <span className="text-slate-300 font-mono font-bold">OTOMATİK (veya Space/Ekrana Dokun)</span>
            </div>
          </div>

          {/* Core Footer Deck with Info */}
          <footer id="deck-signature" className="border-t border-slate-800/60 pt-3 flex items-center justify-between text-[10px] text-slate-500 leading-snug">
            <span className="flex items-center gap-1"><Info className="w-3.5 h-3.5" /> HTML5 Stereo Synth</span>
            <span>v2.4.0</span>
          </footer>
        </section>
      </main>

      {/* Dynamic Savaş İstatistikleri Modal */}
      {showStatsModal && (
        <div id="stats-modal-overlay" className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none animate-fade-in">
          <div id="stats-modal-container" className="relative w-full max-w-lg bg-slate-950 border border-emerald-500/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.35)] font-sans">
            
            {/* CRT Screen scanline effect overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/10 via-transparent to-transparent pointer-events-none rounded-3xl" />
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-500/50 text-emerald-400">
                  <BarChart3 className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-left">
                  <h2 className="text-md sm:text-lg font-black tracking-widest text-emerald-400 font-mono">MATRİX ANALİZ SİSTEMİ</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Savaş Verileri & Tehdit Analizi</p>
                </div>
              </div>
              <button
                onClick={() => { setShowStatsModal(false); soundEngine.playLaser(600); }}
                className="text-slate-400 hover:text-emerald-400 p-1 px-2 bg-slate-900 border border-slate-800 rounded-lg hover:border-emerald-500/40 transition cursor-pointer text-sm font-mono"
              >
                ✕
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-900/60 border border-emerald-500/20 p-4 rounded-xl font-mono text-left">
                <span className="text-[9px] text-slate-400 font-bold tracking-wider block mb-1 uppercase">EN YÜKSEK REKOR</span>
                <span className="text-md sm:text-lg font-black text-amber-400 block tracking-widest">{stats.highScore.toLocaleString()} pts</span>
              </div>
              <div className="bg-slate-900/60 border border-emerald-500/20 p-4 rounded-xl font-mono text-left">
                <span className="text-[9px] text-slate-400 font-bold tracking-wider block mb-1 uppercase">SİMÜLATÖR ALTINI</span>
                <span className="text-md sm:text-lg font-black text-emerald-400 flex items-center gap-1.5 leading-none">
                  <Coins className="w-4 h-4 text-emerald-400 animate-pulse" />
                  {stats.coins}
                </span>
              </div>
              <div className="bg-slate-900/60 border border-emerald-500/20 p-4 rounded-xl font-mono text-left">
                <span className="text-[9px] text-slate-400 font-bold tracking-wider block mb-1 uppercase">YOK EDİLEN BÖCEK</span>
                <span className="text-md sm:text-lg font-black text-slate-200 block">{stats.enemiesKilled} birim</span>
              </div>
              <div className="bg-slate-900/60 border border-emerald-500/20 p-4 rounded-xl font-mono text-left">
                <span className="text-[9px] text-slate-400 font-bold tracking-wider block mb-1 uppercase">YOK EDİLEN BOSS</span>
                <span className="text-md sm:text-lg font-black text-emerald-400 block">{stats.bossesKilled} adet</span>
              </div>
            </div>

            {/* Diagnostic system log */}
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl mb-6 font-mono text-[11px] leading-relaxed text-slate-400 text-left">
              <div className="text-emerald-500 font-bold uppercase tracking-wide mb-2 text-[11px] flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400 animate-spin" /> SİMÜLATÖR TEPKİ PARAMETRELERİ
              </div>
              <p>🌱 Bağlantı Durumu: <span className="text-emerald-400 font-bold">GÜVENLİ (ŞİFRELİ)</span></p>
              <p>☣️ Aktif Virüs: <span className="text-rose-400 font-medium">Asitli Mantis, Sarı Eşek Arısı, Phoenix</span></p>
              <p>🛡️ Zırh Seviyesi: <span className="text-indigo-400 font-bold">Vanguard Plazma Çeliği</span></p>
              <p>🌌 Lokasyon: <span className="text-emerald-500 font-medium">Planet-Matrix (Region-88)</span></p>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => { setShowStatsModal(false); soundEngine.playLaser(600); }}
              className="w-full py-3 bg-emerald-600 border border-emerald-500/30 rounded-2xl text-xs uppercase tracking-widest font-mono font-black text-black hover:bg-emerald-500 shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
            >
              TERMINALI KAPAT
            </button>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer id="deck-outer-copyright" className="text-center text-[10px] text-slate-500 py-3 mt-4">
        TÜM HAKLARI SAKLIDIR © 2026 NEON INFINITY ARCADE. KEYFİNİ ÇIKAR!
      </footer>
    </div>
  );
}
