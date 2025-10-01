import { GameLogic } from './src/game/gameLogic.js';
import { Match3Logic } from './src/game/match3.js';
import { TetrisGame } from './src/game/tetris.js';
import { EffectSystem } from './src/effects/effectSystem.js';
import { douyinAPI } from './src/douyin/api.js';
import { GAME_CONFIG } from './src/config/constants.js';

class FruitMergeZGame {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.gameLogic = null;
    this.effectSystem = null;
    this.isRunning = false;
    this.lastTime = 0;
    
    // 性能监控
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTimer = 0;
    
    // 游戏状态
    this.isPaused = false;
    this.isInitialized = false;
  }
  
  // 初始化游戏
  async init() {
    try {
      console.log('Initializing Fruit Merge Z...');
      
      // 初始化画布
      this.initCanvas();
      
      // 初始化抖音API
      await this.initDouyinAPI();
      
      // 预加载图片资源
      await this.preloadImages();
      
      // 初始化游戏系统
      this.initGameSystems();
      
      // 设置事件监听
      this.setupEventListeners();
      
      // 加载游戏数据
      await this.loadGameData();
      
      this.isInitialized = true;
      console.log('Game initialized successfully');
      
      // 显示启动画面
      this.showStartScreen();
      
    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.showErrorScreen(error);
    }
  }
  
  // 初始化画布
  initCanvas() {
    try {
      // 检查抖音小程序环境
      if (typeof tt !== 'undefined') {
        // 获取系统信息
        const systemInfo = tt.getSystemInfoSync();
        
        // 创建画布
        this.canvas = tt.createCanvas();
        this.ctx = this.canvas.getContext('2d');
        
        // 设置画布尺寸
        this.canvas.width = GAME_CONFIG.CANVAS.width;
        this.canvas.height = GAME_CONFIG.CANVAS.height;
        
        console.log('Canvas initialized:', this.canvas.width, 'x', this.canvas.height);
        console.log('System info:', systemInfo);
      } else {
        // 开发环境或浏览器环境：使用真实 DOM Canvas
        console.warn('Running in development mode - using DOM canvas');
        const el = (typeof document !== 'undefined') ? document.getElementById('gameCanvas') : null;
        if (!el) {
          throw new Error('DOM canvas #gameCanvas not found');
        }
        this.canvas = el;
        this.canvas.width = GAME_CONFIG.CANVAS.width;
        this.canvas.height = GAME_CONFIG.CANVAS.height;
        this.ctx = this.canvas.getContext('2d');
      }
    } catch (error) {
      console.error('Failed to initialize canvas:', error);
      throw error;
    }
  }
  
  // 初始化抖音API
  async initDouyinAPI() {
    try {
      // 直接使用douyinAPI，它会自动初始化
      console.log('Douyin API ready');
      
      // 设置小程序生命周期监听
      douyinAPI.onShow(() => {
        console.log('Game show');
        this.onGameShow();
      });
      
      douyinAPI.onHide(() => {
        console.log('Game hide');
        this.onGameHide();
      });
      
    } catch (error) {
      console.warn('Douyin API initialization failed:', error);
    }
  }
  
  // 初始化游戏系统
  initGameSystems() {
    this.effectSystem = new EffectSystem(this.ctx);
    // 根据玩法模式实例化不同的游戏逻辑
    const mode = GAME_CONFIG?.GAMEPLAY?.MODE;
    if (mode === 'tetris') {
      this.gameLogic = new TetrisGame(this.canvas, this.effectSystem);
    } else if (mode === 'match3') {
      this.gameLogic = new Match3Logic(this.canvas, this.effectSystem);
    } else {
      this.gameLogic = new GameLogic(this.canvas, this.effectSystem);
    }
  }
  
  // 设置事件监听
  setupEventListeners() {
    // 抖音小游戏环境优先绑定全局触摸事件
    if (typeof tt !== 'undefined' && typeof tt.onTouchStart === 'function') {
      tt.onTouchStart((e) => {
        if (this.gameLogic) {
          const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
          if (touch) this.gameLogic.handleTouchStart(touch.clientX, touch.clientY);
        }
      });
      tt.onTouchMove((e) => {
        if (this.gameLogic) {
          const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
          if (touch) this.gameLogic.handleTouchMove(touch.clientX, touch.clientY);
        }
      });
      tt.onTouchEnd((e) => {
        if (this.gameLogic) {
          const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
          if (touch) this.gameLogic.handleTouchEnd(touch.clientX, touch.clientY);
        }
      });
    } else if (this.canvas && typeof this.canvas.addEventListener === 'function') {
      // 浏览器/开发环境绑定到canvas
      this.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.gameLogic) {
          const touch = e.touches[0];
          this.gameLogic.handleTouchStart(touch.clientX, touch.clientY);
        }
      });
      
      this.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (this.gameLogic) {
          const touch = e.touches[0];
          this.gameLogic.handleTouchMove(touch.clientX, touch.clientY);
        }
      });
      
      this.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (this.gameLogic) {
          const touch = e.changedTouches[0];
          this.gameLogic.handleTouchEnd(touch.clientX, touch.clientY);
        }
      });
    } else {
      console.warn('No touch event binding available in current environment');
    }
    
    console.log('Event listeners set up');
  }
  
  // 加载游戏数据
  async loadGameData() {
    try {
      // 简化数据加载，避免阻塞
      if (douyinAPI.isInitialized) {
        const savedData = await douyinAPI.loadGameData();
        if (savedData && this.gameLogic) {
          this.gameLogic.setHighScore(savedData.highScore || 0);
        }
      }
    } catch (error) {
      console.warn('Failed to load game data:', error);
    }
  }

  // 预加载图片资源
  async preloadImages() {
    try {
      console.log('Preloading images...');
      
      // 导入图片加载器
      const { imageLoader } = await import('./src/utils/imageLoader.js');
      const { FRUIT_CONFIG } = await import('./src/config/constants.js');
      
      // 收集所有水果图片路径
      const imagePaths = Object.values(FRUIT_CONFIG)
        .map(fruit => fruit.texture)
        .filter(path => path);
      
      // 预加载图片
      await imageLoader.preloadImages(imagePaths);
      
      console.log(`Preloaded ${imagePaths.length} fruit images`);
      
    } catch (error) {
      console.warn('Failed to preload images:', error);
      // 图片预加载失败不影响游戏运行
    }
  }
  
  // 保存游戏数据
  async saveGameData() {
    try {
      if (!this.gameLogic) return;
      
      const gameData = {
        highScore: this.gameLogic.highScore,
        totalGames: this.gameLogic.totalGames || 0,
        totalPlayTime: this.gameLogic.totalPlayTime || 0,
        maxCombo: this.gameLogic.maxCombo || 0,
        achievements: this.gameLogic.achievements || []
      };
      
      await douyinAPI.saveGameData(gameData);
      console.log('Game data saved');
    } catch (error) {
      console.warn('Failed to save game data:', error);
    }
  }
  
  // 显示启动画面
  showStartScreen() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制背景渐变
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#FFE082');
    gradient.addColorStop(0.5, '#FFCC02');
    gradient.addColorStop(1, '#FF8F00');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制游戏标题
    this.ctx.save();
    this.ctx.font = 'bold 48px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#FF6B35';
    this.ctx.lineWidth = 4;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.ctx.strokeText('合成水果', centerX, centerY - 50);
    this.ctx.fillText('合成水果', centerX, centerY - 50);
    
    // 绘制开始提示
    this.ctx.font = '24px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText('点击屏幕开始游戏', centerX, centerY + 50);
    
    // 绘制版本信息
    this.ctx.font = '14px Arial, sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fillText('v1.0.0', centerX, this.canvas.height - 30);
    
    this.ctx.restore();
    
    // 添加点击事件监听（兼容抖音全局触摸事件）
    const startGame = () => {
      try {
        if (typeof tt !== 'undefined' && typeof tt.offTouchStart === 'function') {
          tt.offTouchStart(startGame);
        } else if (this.canvas && typeof this.canvas.removeEventListener === 'function') {
          this.canvas.removeEventListener('touchstart', startGame);
        }
      } catch (e) {
        // 安全兜底：忽略移除失败
      }
      this.start();
    };

    if (typeof tt !== 'undefined' && typeof tt.onTouchStart === 'function') {
      tt.onTouchStart(() => startGame());
    } else if (this.canvas && typeof this.canvas.addEventListener === 'function') {
      this.canvas.addEventListener('touchstart', startGame);
    } else {
      console.warn('No touch binding available for start screen');
    }
  }
  
  // 显示错误画面
  showErrorScreen(error) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制错误背景
    this.ctx.fillStyle = '#FF5252';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制错误信息
    this.ctx.save();
    this.ctx.font = 'bold 32px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.ctx.fillText('游戏初始化失败', centerX, centerY - 30);
    
    this.ctx.font = '16px Arial, sans-serif';
    this.ctx.fillText('请重新启动游戏', centerX, centerY + 20);
    
    if (error.message) {
      this.ctx.font = '12px Arial, sans-serif';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.fillText(error.message, centerX, centerY + 50);
    }
    
    this.ctx.restore();
  }
  
  // 启动游戏
  start() {
    if (!this.isInitialized || this.isRunning) {
      return;
    }
    
    console.log('Starting game...');
    this.isRunning = true;
    this.lastTime = performance.now();
    
    // 启动游戏循环
    this.gameLoop();
    
    // 启动游戏逻辑
    if (this.gameLogic) {
      this.gameLogic.start();
    }
    
    // 上报游戏开始事件
    douyinAPI.reportGameData({
      event: 'game_start',
      timestamp: Date.now()
    });
  }
  
  // 游戏主循环
  gameLoop() {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    // 更新FPS计算
    this.updateFPS(deltaTime);
    
    // 更新游戏逻辑
    if (this.gameLogic && !this.isPaused) {
      this.gameLogic.update(currentTime);
    }
    
    // 更新特效系统
    if (this.effectSystem && !this.isPaused) {
      this.effectSystem.update(deltaTime);
    }
    
    // 渲染游戏
    this.render();
    
    // 继续循环
    requestAnimationFrame(() => this.gameLoop());
  }
  
  // 更新FPS计算
  updateFPS(deltaTime) {
    this.frameCount++;
    this.fpsTimer += deltaTime;
    
    if (this.fpsTimer >= 1.0) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
  }
  
  // 渲染游戏
  render() {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 渲染游戏逻辑
    if (this.gameLogic) {
      this.gameLogic.render();
    }
    
    // 渲染特效
    if (this.effectSystem) {
      this.effectSystem.render(this.ctx);
    }
    
    // 渲染调试信息（开发模式）
    if (this.isDebugMode()) {
      this.renderDebugInfo();
    }
  }
  
  // 渲染调试信息
  renderDebugInfo() {
    this.ctx.save();
    this.ctx.font = '12px monospace';
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    
    const debugInfo = [
      `FPS: ${this.fps}`,
      `Effects: ${this.effectSystem ? this.effectSystem.getEffectCount().total : 0}`,
      `Canvas: ${this.canvas.width}x${this.canvas.height}`,
      `Douyin: ${douyinAPI.isInDouyinEnv() ? 'Yes' : 'No'}`
    ];
    
    debugInfo.forEach((info, index) => {
      this.ctx.fillText(info, 10, 10 + index * 15);
    });
    
    this.ctx.restore();
  }
  
  // 检查是否为调试模式
  isDebugMode() {
    return !douyinAPI.isInDouyinEnv();
  }
  
  // 分享游戏
  async shareGame() {
    try {
      const gameState = this.getGameState();
      const shareOptions = {
        title: '我在玩合成水果！',
        desc: `我的最高分是${gameState.highScore}分，当前分数${gameState.score}分，快来挑战吧！`,
        score: gameState.score,
        highScore: gameState.highScore,
        level: gameState.level,
        combo: gameState.combo
      };

      await douyinAPI.shareGame(shareOptions);
      
      // 分享成功奖励
      if (this.gameLogic && this.gameLogic.gameState === 'PLAYING') {
        this.gameLogic.addScore(100); // 分享奖励100分
        if (this.effectSystem) {
          this.effectSystem.createFlyingScore(
            this.canvas.width / 2, 
            this.canvas.height / 2, 
            '分享奖励 +100'
          );
        }
      }
      
      douyinAPI.showToast('分享成功！获得100分奖励');
    } catch (error) {
      console.error('Share failed:', error);
      douyinAPI.showToast(error.message || '分享失败');
    }
  }
  
  // 游戏显示时的处理
  onGameShow() {
    console.log('Game resumed');
    this.isPaused = false;
    
    if (this.gameLogic) {
      this.gameLogic.gameState = 'PLAYING';
    }
  }
  
  // 游戏隐藏时的处理
  onGameHide() {
    console.log('Game paused');
    this.isPaused = true;
    
    if (this.gameLogic) {
      this.gameLogic.gameState = 'PAUSED';
    }
    
    // 保存游戏数据
    this.saveGameData();
  }
  
  // 停止游戏
  stop() {
    this.isRunning = false;
    this.saveGameData();
    console.log('Game stopped');
  }
  
  // 重新开始游戏
  restart() {
    if (this.gameLogic) {
      this.gameLogic.restart();
    }
    
    if (this.effectSystem) {
      this.effectSystem.clear();
    }
    
    console.log('Game restarted');
  }
  
  // 获取游戏状态
  getGameState() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      isInitialized: this.isInitialized,
      fps: this.fps,
      score: this.gameLogic ? this.gameLogic.score : 0,
      highScore: this.gameLogic ? this.gameLogic.highScore : 0
    };
  }
}

// 创建全局游戏实例
const game = new FruitMergeZGame();

// 初始化游戏
game.init();

// 导出游戏实例（用于调试）
if (typeof window !== 'undefined') {
  window.game = game;
}

export default game;
