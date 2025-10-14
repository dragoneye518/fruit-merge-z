import { GameLogic } from './src/game/gameLogic.js';
import { Match3Logic } from './src/game/match3.js';
import { TetrisGame } from './src/game/tetris.js';
import { EffectSystem } from './src/effects/effectSystem.js';
import { douyinAPI } from './src/douyin/api.js';
import { GAME_CONFIG, GAME_STATES } from './src/config/constants.js';

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
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
    this.lastFrameTime = 0;
    
    // 内存管理
    this.memoryUsage = 0;
    this.memoryCheckInterval = 5000; // 5秒检查一次内存
    this.lastMemoryCheck = 0;
    // 动态内存阈值：优先使用环境提供的堆上限，否则按抖音小程序常见限制(64MB)
    const defaultHeapLimit = 64 * 1024 * 1024;
    const heapLimit = (typeof performance !== 'undefined' && performance.memory && performance.memory.jsHeapSizeLimit)
      ? performance.memory.jsHeapSizeLimit
      : defaultHeapLimit;
    // 正常清理阈值设为堆上限的75%，并设置紧急阈值与模式标志
    this.maxMemoryUsage = Math.floor(heapLimit * 0.75);
    this.memoryEmergencyThreshold = Math.floor(heapLimit * 0.9);
    this.memoryEmergencyMode = false;
    
    // 游戏状态
    this.isPaused = false;
    this.isInitialized = false;
    this.isInitializing = false; // 防止重复初始化
    this.douyinAPIAvailable = true; // 抖音API可用性标志
    
    // 加载状态
    this.loadingProgress = 0;
    this.loadingSteps = [
      { name: '初始化画布', weight: 10 },
      { name: '连接抖音API', weight: 15 },
      { name: '加载图片资源', weight: 40 },
      { name: '初始化游戏系统', weight: 20 },
      { name: '加载游戏数据', weight: 15 }
    ];
    this.currentStep = 0;
    // 抖音事件兜底与开始事件包装引用
    this._douyinTapDropTimer = null;
    this._startTouchWrapper = null;
    this._gameEventListenersSet = false;
    this._gameStarted = false;
  }
  
  // 更新加载进度
  updateLoadingProgress(stepIndex, stepProgress = 1) {
    let totalProgress = 0;
    
    // 计算已完成步骤的进度
    for (let i = 0; i < stepIndex; i++) {
      totalProgress += this.loadingSteps[i].weight;
    }
    
    // 添加当前步骤的进度
    if (stepIndex < this.loadingSteps.length) {
      totalProgress += this.loadingSteps[stepIndex].weight * stepProgress;
    }
    
    this.loadingProgress = Math.min(totalProgress, 100);
    this.currentStep = stepIndex;
    
    // 绘制加载界面
    this.drawLoadingScreen();
  }
  
  // 绘制加载界面
  drawLoadingScreen() {
    if (!this.ctx) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制背景渐变
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#4A90E2');
    gradient.addColorStop(0.5, '#357ABD');
    gradient.addColorStop(1, '#1E5F99');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // 绘制游戏标题
    this.ctx.save();
    this.ctx.font = 'bold 36px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('合成水果Z', centerX, centerY - 80);
    
    // 绘制加载进度条背景
    const progressBarWidth = 300;
    const progressBarHeight = 8;
    const progressBarX = centerX - progressBarWidth / 2;
    const progressBarY = centerY + 20;
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
    
    // 绘制加载进度条
    const progressWidth = (progressBarWidth * this.loadingProgress) / 100;
    this.ctx.fillStyle = '#FFE082';
    this.ctx.fillRect(progressBarX, progressBarY, progressWidth, progressBarHeight);
    
    // 绘制进度百分比
    this.ctx.font = '18px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(`${Math.round(this.loadingProgress)}%`, centerX, progressBarY + 35);
    
    // 绘制当前步骤
    if (this.currentStep < this.loadingSteps.length) {
      this.ctx.font = '16px Arial, sans-serif';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.fillText(this.loadingSteps[this.currentStep].name, centerX, progressBarY + 60);
    }
    
    // 绘制加载动画点
    const time = Date.now() / 200;
    const dots = Math.floor(time % 4);
    this.ctx.font = '14px Arial, sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText('加载中' + '.'.repeat(dots + 1), centerX, progressBarY + 85);
    
    this.ctx.restore();
  }
  
  // 初始化游戏
  async init() {
    try {
      console.log('Initializing Fruit Merge Z...');
      
      // 防止重复初始化
      if (this.isInitializing) {
        console.warn('Game is already initializing, skipping duplicate init call');
        return;
      }
      this.isInitializing = true;
      
      // 设置全局错误处理
      this.setupGlobalErrorHandling();
      
      // 步骤1: 初始化画布
      this.updateLoadingProgress(0, 0);
      await this.safeInitCanvas();
      this.updateLoadingProgress(0, 1);
      
      // 步骤2: 初始化抖音API
      this.updateLoadingProgress(1, 0);
      await this.safeInitDouyinAPI();
      this.updateLoadingProgress(1, 1);
      
      // 步骤3: 预加载图片资源
      this.updateLoadingProgress(2, 0);
      await this.safePreloadImages();
      this.updateLoadingProgress(2, 1);
      
      // 步骤4: 初始化游戏系统
      this.updateLoadingProgress(3, 0);
      await this.safeInitGameSystems();
      this.updateLoadingProgress(3, 1);
      
      // 步骤5: 加载游戏数据
      this.updateLoadingProgress(4, 0);
      await this.safeLoadGameData();
      this.updateLoadingProgress(4, 1);
      
      this.isInitialized = true;
      this.isInitializing = false;
      console.log('Game initialized successfully');
      
      // 短暂显示完成状态
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 显示启动画面
      this.showStartScreen();
      
    } catch (error) {
      this.isInitializing = false;
      console.error('Failed to initialize game:', error);
      this.handleGlobalError(error, 'initialization');
    }
  }

  // 安全的Canvas初始化
  async safeInitCanvas() {
    return new Promise((resolve, reject) => {
      try {
        this.initCanvas();
        resolve();
      } catch (error) {
        reject(new Error(`Canvas initialization failed: ${error.message}`));
      }
    });
  }

  // 安全的抖音API初始化
  async safeInitDouyinAPI() {
    try {
      await this.initDouyinAPI();
    } catch (apiError) {
      console.warn('Douyin API initialization failed, continuing in degraded mode:', apiError);
      // 降级模式：设置默认值
      this.douyinAPIAvailable = false;
    }
  }

  // 安全的图片预加载
  async safePreloadImages() {
    const maxRetries = 2;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        await Promise.race([
          this.preloadImagesWithProgress(),
          new Promise((_, reject) => setTimeout(() => {
            reject(new Error('Image preload timeout'));
          }, 5000))
        ]);
        return; // 成功则退出
      } catch (error) {
        retryCount++;
        console.warn(`Image preload attempt ${retryCount} failed:`, error.message);
        
        if (retryCount > maxRetries) {
          console.warn('Image preload failed after retries, continuing without images...');
          return; // 最终失败也继续
        }
        
        // 重试前等待
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // 安全的游戏系统初始化
  async safeInitGameSystems() {
    return new Promise((resolve, reject) => {
      try {
        this.initGameSystems();
        // 抖音环境：延迟设置事件监听器，避免与开始界面冲突
        if (typeof tt !== 'undefined') {
          console.log('Delaying event listeners setup for Douyin environment');
          // 事件监听器将在开始界面移除后设置
        } else {
          this.setupEventListeners();
        }
        resolve();
      } catch (error) {
        reject(new Error(`Game systems initialization failed: ${error.message}`));
      }
    });
  }

  // 安全的游戏数据加载
  async safeLoadGameData() {
    try {
      await this.loadGameData();
    } catch (error) {
      console.warn('Game data loading failed, using defaults:', error.message);
      // 使用默认数据
      this.gameData = {
        highScore: 0,
        totalGames: 0,
        settings: {}
      };
    }
  }
  
  // 设置全局错误处理
  setupGlobalErrorHandling() {
    // 捕获未处理的Promise拒绝
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleGlobalError(event.reason, 'unhandledrejection');
        event.preventDefault();
      });
      
      // 捕获全局JavaScript错误
      window.addEventListener('error', (event) => {
        this.handleGlobalError(event.error || new Error(event.message), 'javascript');
      });
    }
    
    // 抖音环境错误处理
    if (typeof tt !== 'undefined') {
      tt.onError && tt.onError((error) => {
        this.handleGlobalError(new Error(error), 'douyin');
      });
      
      // 网络错误处理
      tt.onNetworkStatusChange && tt.onNetworkStatusChange((res) => {
        if (!res.isConnected) {
          this.handleGlobalError(new Error('Network disconnected'), 'network');
        }
      });
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
          // 容错：自动创建并插入一个画布，避免初始化阶段因DOM未就绪或缺失导致失败
          console.warn('DOM canvas #gameCanvas not found, creating one automatically');
          const created = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
          if (!created) {
            throw new Error('DOM not available to create canvas');
          }
          created.id = 'gameCanvas';
          created.width = GAME_CONFIG.CANVAS.width;
          created.height = GAME_CONFIG.CANVAS.height;
          // 将画布插入页面，可根据实际布局调整容器
          const container = document.getElementById('gameContainer') || document.body;
          container.appendChild(created);
          this.canvas = created;
        } else {
          this.canvas = el;
          // 兼容：如页面已设置尺寸，这里仅在缺省时覆盖
        }
        // 同步设置尺寸与上下文
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
    console.log('Setting up event listeners...');

    // 抖音小游戏环境优先绑定全局触摸事件
    if (typeof tt !== 'undefined' && typeof tt.onTouchStart === 'function') {
      console.log('Setting up Douyin touch events');
      tt.onTouchStart((e) => {
        if (this.gameLogic) {
          const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
          if (touch) {
            const x = (touch.x ?? touch.clientX ?? touch.pageX);
            const y = (touch.y ?? touch.clientY ?? touch.pageY);
            console.log('[DouyinTouch] touchstart', { x, y });
            this.gameLogic.handleTouchStart(x, y);
            // 兜底：某些设备可能不触发 touchend，延时触发一次投放
            if (this._douyinTapDropTimer) { clearTimeout(this._douyinTapDropTimer); }
            this._douyinTapDropTimer = setTimeout(() => {
              try {
                if (!this.gameLogic) return;
                const canFallbackDrop = this.gameLogic.gameState === GAME_STATES.PLAYING &&
                  !this.gameLogic.currentDroppingFruit && this.isRunning;
                if (canFallbackDrop) { this.gameLogic.handleTouchEnd(x, y); }
              } catch (_) {}
            }, 200);
          }
        }
      });
      tt.onTouchMove((e) => {
        if (this.gameLogic) {
          const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
          if (touch) {
            const x = (touch.x ?? touch.clientX ?? touch.pageX);
            const y = (touch.y ?? touch.clientY ?? touch.pageY);
            this.gameLogic.handleTouchMove(x, y);
          }
        }
      });
      tt.onTouchEnd((e) => {
        if (this.gameLogic) {
          if (this._douyinTapDropTimer) { clearTimeout(this._douyinTapDropTimer); this._douyinTapDropTimer = null; }
          const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
          if (touch) {
            const x = (touch.x ?? touch.clientX ?? touch.pageX);
            const y = (touch.y ?? touch.clientY ?? touch.pageY);
            console.log('[DouyinTouch] touchend', { x, y });
            this.gameLogic.handleTouchEnd(x, y);
            // 看门狗：首投后若仍锁定且世界已稳定，强制解锁，保障二次投放
            try {
              setTimeout(() => {
                const gl = this.gameLogic;
                if (!gl) return;
                const stillLocked = (!gl.canDrop) && (!!gl.currentDroppingFruit);
                const stableSec = (gl.currentDroppingFruit?.bottomContactDuration || 0);

                // 抖音环境使用更短的阈值
                const isDouyinEnv = typeof tt !== 'undefined';
                const threshold = isDouyinEnv ? 0.15 : 0.3;
                const timeoutThreshold = isDouyinEnv ? 0.4 : 0.6;

                // 依据稳定触地时长或超时解锁；不再使用“世界已稳定”以避免忽略活动刚体
                if (stillLocked && (stableSec >= threshold)) {
                  console.warn('[Watchdog] Forcing unlock after stable ground contact');
                  gl.unlockDrop();
                }
                // 超时兜底：抖音环境使用更短的超时时间
                const sinceDropSec = gl.currentDroppingFruit?.dropTime ? ((Date.now() - gl.currentDroppingFruit.dropTime) / 1000) : 0;
                if (stillLocked && sinceDropSec >= timeoutThreshold) {
                  console.warn('[Watchdog/timeout] Forcing unlock after timeout');
                  gl.unlockDrop();
                }
              }, 200); // 进一步缩短看门狗延迟时间
            } catch (_) { /* ignore watchdog errors */ }
          }
        }
      });
      // 补齐抖音触摸取消事件：部分设备会触发cancel而非end
      if (typeof tt.onTouchCancel === 'function') {
        tt.onTouchCancel((e) => {
          if (this.gameLogic) {
            if (this._douyinTapDropTimer) {
              try { clearTimeout(this._douyinTapDropTimer); } catch {}
              this._douyinTapDropTimer = null;
            }
            const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]) || {};
            const x = (touch.x ?? touch.clientX ?? touch.pageX ?? 0);
            const y = (touch.y ?? touch.clientY ?? touch.pageY ?? 0);
            console.log('[DouyinTouch] touchcancel', { x, y });
            // 将cancel视为一次触摸结束，保证投放不因事件缺失而卡壳
            this.gameLogic.handleTouchEnd(x, y);
          }
        });
      }
    } else if (this.canvas && typeof this.canvas.addEventListener === 'function') {
      console.log('Setting up browser touch events');
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
          // 看门狗：开发环境同样加入解锁保障，避免事件丢失导致锁定
          try {
            setTimeout(() => {
              const gl = this.gameLogic;
              if (!gl) return;
              const stillLocked = (!gl.canDrop) && (!!gl.currentDroppingFruit);
              const settled = (gl.physicsEngine?.isWorldSettled?.() ?? false);
              const stableSec = (gl.currentDroppingFruit?.bottomContactDuration || 0);
              const threshold = (GAME_CONFIG?.PHYSICS?.stableContactSec ?? 0.6);
              if (stillLocked && (settled || stableSec >= threshold)) {
                console.warn('[Watchdog/browser] Forcing unlock after drop');
                gl.unlockDrop();
              }
              const sinceDropSec = gl.currentDroppingFruit?.dropTime ? ((Date.now() - gl.currentDroppingFruit.dropTime) / 1000) : 0;
              if (stillLocked && sinceDropSec >= 1.0) {
                console.warn('[Watchdog/browser-timeout] Forcing unlock after timeout');
                gl.unlockDrop();
              }
            }, 800);
          } catch (_) { /* ignore watchdog errors */ }
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
  
  // 带进度的图片预加载
  async preloadImagesWithProgress() {
    try {
      console.log('Preloading images with progress...');
      
      // 导入图片加载器
      const { imageLoader } = await import('./src/utils/imageLoader.js');
      const { FRUIT_CONFIG } = await import('./src/config/constants.js');
      
      // 收集所有水果图片路径
      const imagePaths = Object.values(FRUIT_CONFIG)
        .map(fruit => fruit.texture)
        .filter(path => path);
      
      if (imagePaths.length === 0) {
        console.warn('No images to preload');
        return;
      }
      
      // 逐个加载图片并更新进度
      for (let i = 0; i < imagePaths.length; i++) {
        try {
          await imageLoader.loadImage(imagePaths[i]);
          const progress = (i + 1) / imagePaths.length;
          this.updateLoadingProgress(2, progress);
          
          // 给UI更新时间
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          console.warn(`Failed to load image ${imagePaths[i]}:`, error);
          // 继续加载其他图片
        }
      }
      
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
    
    // 统一的启动函数，带防抖
    const startGameHandler = () => {
      // 使用 _gameStarted 标志来防止重复启动
      if (this._gameStarted) {
        console.warn('Start handler called but game has already started.');
        return;
      }
      this._gameStarted = true;
      
      console.log('Start handler triggered. Removing start listeners...');

      // 移除所有启动监听器
      this.removeStartListeners();
      
      // 确保游戏事件监听器已设置
      if (!this._gameEventListenersSet) {
        console.log('Setting up game event listeners before starting...');
        this.setupEventListeners();
        this._gameEventListenersSet = true;
      }
      
      // 启动游戏
      this.start();
    };

    // 绑定开始事件
    const bindStartEvents = () => {
      // 抖音环境
      if (typeof tt !== 'undefined' && typeof tt.onTouchStart === 'function') {
        // 保存包装器以便移除
        this._startTouchWrapper = () => startGameHandler();
        tt.onTouchStart(this._startTouchWrapper);
        console.log('Bound start event to Douyin touch.');
      } 
      // 浏览器环境
      else if (this.canvas && typeof this.canvas.addEventListener === 'function') {
        // 使用 once 选项自动解绑
        this.canvas.addEventListener('pointerdown', startGameHandler, { once: true });
        console.log('Bound start event to browser pointerdown.');
      } else {
        console.warn('No input binding available for start screen.');
      }
    };

    bindStartEvents();
  }

  // 移除开始界面的监听器
  removeStartListeners() {
    console.log('Removing start listeners...');
    
    // 移除抖音触摸监听
    if (this._startTouchWrapper) {
      if (typeof tt !== 'undefined' && typeof tt.offTouchStart === 'function') {
        tt.offTouchStart(this._startTouchWrapper);
      }
      this._startTouchWrapper = null;
    }
    
    // 移除浏览器事件监听
    if (this.canvas && typeof this.canvas.removeEventListener === 'function') {
      // 由于浏览器事件使用了once选项或匿名函数，这里不需要显式移除
      // 如果需要强制移除，可以在这里添加逻辑
    }
    
    // 抖音环境：确保游戏事件监听器已经设置
    if (typeof tt !== 'undefined' && this.gameLogic) {
      // 立即设置游戏事件监听器，避免延迟导致事件丢失
      if (!this._gameEventListenersSet) {
        console.log('Setting up game event listeners immediately');
        this.setupEventListeners();
        this._gameEventListenersSet = true;
      }
    }
  }
  
  // 显示错误画面
  showErrorScreen(error) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制错误背景
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#FF6B6B');
    gradient.addColorStop(0.5, '#FF5252');
    gradient.addColorStop(1, '#E53935');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制错误信息
    this.ctx.save();
    this.ctx.font = 'bold 28px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // 错误图标
    this.ctx.font = '48px Arial, sans-serif';
    this.ctx.fillText('⚠️', centerX, centerY - 80);
    
    // 错误标题
    this.ctx.font = 'bold 24px Arial, sans-serif';
    this.ctx.fillText('游戏初始化失败', centerX, centerY - 20);
    
    // 错误详情
    if (error.message) {
      this.ctx.font = '16px Arial, sans-serif';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      
      // 处理长错误消息
      const maxWidth = this.canvas.width - 40;
      const words = error.message.split(' ');
      let line = '';
      let y = centerY + 20;
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = this.ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
          this.ctx.fillText(line, centerX, y);
          line = words[n] + ' ';
          y += 20;
        } else {
          line = testLine;
        }
      }
      this.ctx.fillText(line, centerX, y);
    }
    
    // 重试按钮
    this.ctx.font = '18px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    
    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonX = centerX - buttonWidth / 2;
    const buttonY = centerY + 80;
    
    this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    this.ctx.fillText('重新加载', centerX, buttonY + buttonHeight / 2);
    
    this.ctx.restore();
    
    // 添加重试事件监听
    const retryGame = (event) => {
      if (event.touches && event.touches.length > 0) {
        const touch = event.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / (rect.width || this.canvas.width);
        const scaleY = this.canvas.height / (rect.height || this.canvas.height);
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;
        
        // 检查是否点击了重试按钮
        if (x >= buttonX && x <= buttonX + buttonWidth && 
            y >= buttonY && y <= buttonY + buttonHeight) {
          this.removeErrorListeners();
          this.restart();
        }
      }
    };
    
    // 保存监听器引用以便后续移除
    this.errorRetryListener = retryGame;
    
    if (typeof tt !== 'undefined' && typeof tt.onTouchStart === 'function') {
      tt.onTouchStart(retryGame);
    } else if (this.canvas && typeof this.canvas.addEventListener === 'function') {
      this.canvas.addEventListener('touchstart', retryGame);
    }
  }
  
  // 移除错误界面的事件监听器
  removeErrorListeners() {
    if (this.errorRetryListener) {
      try {
        if (typeof tt !== 'undefined' && typeof tt.offTouchStart === 'function') {
          tt.offTouchStart(this.errorRetryListener);
        } else if (this.canvas && typeof this.canvas.removeEventListener === 'function') {
          this.canvas.removeEventListener('touchstart', this.errorRetryListener);
        }
      } catch (e) {
        console.warn('Failed to remove error listeners:', e);
      }
      this.errorRetryListener = null;
    }
  }
  
  // 显示网络错误提示
  showNetworkError() {
    if (!this.ctx) return;
    
    // 在游戏界面上方显示网络错误提示
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 87, 34, 0.9)';
    this.ctx.fillRect(0, 0, this.canvas.width, 60);
    
    this.ctx.font = '16px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('网络连接异常，部分功能可能受限', this.canvas.width / 2, 30);
    
    this.ctx.restore();
    
    // 3秒后自动隐藏
    setTimeout(() => {
      if (this.isRunning) {
        this.render(); // 重新渲染以清除错误提示
      }
    }, 3000);
  }
  
  // 全局错误处理
  handleGlobalError(error, source = 'unknown') {
    console.error(`Global error from ${source}:`, error);
    
    // 上报错误到抖音平台
    if (this.douyinAPIAvailable && typeof douyinAPI !== 'undefined') {
      try {
        douyinAPI.reportError({
          error: error.message || error.toString(),
          source: source,
          stack: error.stack,
          timestamp: Date.now(),
          userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : 'unknown',
          gameState: this.getGameState()
        });
      } catch (reportError) {
        console.warn('Failed to report error:', reportError);
      }
    }
    
    // 根据错误类型决定处理方式
    if (source === 'initialization') {
      this.handleInitializationError(error);
    } else if (source === 'network') {
      this.showNetworkError();
    } else if (!this.isInitialized) {
      this.showErrorScreen(error);
    } else {
      // 游戏运行中的错误，尝试恢复
      this.attemptErrorRecovery(error);
    }
  }

  // 处理初始化错误
  handleInitializationError(error) {
    console.error('Initialization error:', error);
    
    // 重置初始化状态
    this.isInitializing = false;
    this.isInitialized = false;
    
    // 显示初始化失败界面
    this.showInitializationErrorScreen(error);
  }

  // 显示初始化失败界面
  showInitializationErrorScreen(error) {
    if (!this.ctx) {
      // 如果连Canvas都没有初始化，尝试基本初始化
      try {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
      } catch (canvasError) {
        console.error('Cannot initialize canvas for error display:', canvasError);
        return;
      }
    }

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('游戏初始化失败', this.canvas.width / 2, this.canvas.height / 2 - 60);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px Arial';
    this.ctx.fillText('请刷新页面重试', this.canvas.width / 2, this.canvas.height / 2 - 20);
    
    // 显示错误详情（调试模式）
    if (this.isDebugMode()) {
      this.ctx.font = '12px monospace';
      this.ctx.fillStyle = '#cccccc';
      const errorText = error.message || error.toString();
      const maxWidth = this.canvas.width - 40;
      const lines = this.wrapText(errorText, maxWidth, this.ctx);
      
      lines.forEach((line, index) => {
        this.ctx.fillText(line, this.canvas.width / 2, this.canvas.height / 2 + 20 + (index * 15));
      });
    }
    
    // 添加重试按钮
    this.addRetryButton();
  }

  // 添加重试按钮
  addRetryButton() {
    const retryButton = document.createElement('button');
    retryButton.textContent = '重试';
    retryButton.style.position = 'absolute';
    retryButton.style.left = '50%';
    retryButton.style.top = '70%';
    retryButton.style.transform = 'translate(-50%, -50%)';
    retryButton.style.padding = '10px 20px';
    retryButton.style.fontSize = '16px';
    retryButton.style.backgroundColor = '#4CAF50';
    retryButton.style.color = 'white';
    retryButton.style.border = 'none';
    retryButton.style.borderRadius = '5px';
    retryButton.style.cursor = 'pointer';
    retryButton.style.zIndex = '1000';
    
    retryButton.onclick = () => {
      document.body.removeChild(retryButton);
      this.restart();
    };
    
    document.body.appendChild(retryButton);
  }

  // 文本换行辅助函数
  wrapText(text, maxWidth, ctx) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }
  
  // 尝试错误恢复
  attemptErrorRecovery(error) {
    console.log('Attempting error recovery...');
    
    try {
      // 暂停游戏
      this.isPaused = true;
      
      // 清理可能有问题的系统
      if (error.message.includes('effect') && this.effectSystem) {
        this.effectSystem.cleanup();
        console.log('Effect system cleaned up');
      }
      
      if (error.message.includes('physics') && this.gameLogic) {
        this.gameLogic.resetPhysics();
        console.log('Physics system reset');
      }
      
      // 恢复游戏
      setTimeout(() => {
        this.isPaused = false;
        console.log('Game resumed after error recovery');
      }, 1000);
      
    } catch (recoveryError) {
      console.error('Error recovery failed:', recoveryError);
      this.showErrorScreen(error);
    }
  }
  
  // 启动游戏
  start() {
    const timestamp = Date.now();
    console.log(`[${timestamp}] Start called - isInitialized: ${this.isInitialized}, isRunning: ${this.isRunning}`);

    // 状态检查
    if (!this.isInitialized || this.isRunning) {
      console.warn(`[${timestamp}] Game not ready to start: {isInitialized: ${this.isInitialized}, isRunning: ${this.isRunning}}`);
      return;
    }

    try {
      console.log(`[${timestamp}] Starting game loop...`);
      this.isRunning = true;
      this.lastTime = performance.now();

      // 先启动游戏逻辑
      if (this.gameLogic) {
        console.log(`[${timestamp}] Starting game logic...`);
        this.gameLogic.start();
      } else {
        console.error(`[${timestamp}] Game logic not available for start`);
        this.isRunning = false;
        return;
      }

      // 启动游戏循环
      this.gameLoop();

      // 上报游戏开始事件
      if (typeof douyinAPI !== 'undefined') {
        douyinAPI.reportGameData({
          event: 'game_start',
          timestamp: timestamp
        });
      }

      console.log(`[${timestamp}] Game started successfully`);
    } catch (error) {
      console.error(`[${timestamp}] Failed to start game:`, error);
      this.isRunning = false;
      this.handleGlobalError(error, 'game_start');
    }
  }
  
  // 游戏主循环
  gameLoop() {
    if (!this.isRunning) return;
    
    try {
      const currentTime = performance.now();
      // 兼容抖音/宿主环境：优先使用全局 rAF；如不可用则尝试 canvas.rAF；最后退化为 setTimeout
      const rAF = (typeof requestAnimationFrame === 'function')
        ? requestAnimationFrame
        : (this.canvas && typeof this.canvas.requestAnimationFrame === 'function')
          ? this.canvas.requestAnimationFrame.bind(this.canvas)
          : null;
      
      // 帧率控制
      if (currentTime - this.lastFrameTime < this.frameInterval) {
        if (rAF) { rAF(() => this.gameLoop()); }
        else { setTimeout(() => this.gameLoop(), Math.max(10, this.frameInterval)); }
        return;
      }
      
      const rawDeltaTime = (currentTime - this.lastTime) / 1000;
      const deltaTime = Math.min(rawDeltaTime, 0.1); // 限制deltaTime最大值为0.1，防止物理引擎崩溃
      this.lastTime = currentTime;
      this.lastFrameTime = currentTime;
      
        // 更新FPS计算
      this.updateFPS(deltaTime);

      // 内存检查
      this.checkMemoryUsage(currentTime);

      // 更新游戏逻辑（带错误保护）
      if (this.gameLogic && !this.isPaused) {
        try {
          this.gameLogic.update(deltaTime);
        } catch (logicError) {
          console.error('Game logic update failed:', logicError);
          this.handleGlobalError(logicError, 'game_logic');
        }
      }

      // 更新特效系统（带错误保护）
      if (this.effectSystem && !this.isPaused) {
        try {
          this.effectSystem.update(deltaTime);
        } catch (effectError) {
          console.error('Effect system update failed:', effectError);
          this.handleGlobalError(effectError, 'effect_system');
        }
      }

      // 渲染游戏（带错误保护）
      try {
        this.render();
      } catch (renderError) {
        console.error('Game render failed:', renderError);
        this.handleGlobalError(renderError, 'rendering');
      }
      
    } catch (loopError) {
      console.error('Game loop fatal error:', loopError);
      this.handleGlobalError(loopError, 'game_loop');
      
      // 尝试恢复游戏循环
      setTimeout(() => {
        if (this.isRunning) {
          console.log('Attempting to restart game loop after error...');
          this.gameLoop();
        }
      }, 100);
      return;
    }
    
    // 继续循环
    const rAF2 = (typeof requestAnimationFrame === 'function')
      ? requestAnimationFrame
      : (this.canvas && typeof this.canvas.requestAnimationFrame === 'function')
        ? this.canvas.requestAnimationFrame.bind(this.canvas)
        : null;
    if (rAF2) { rAF2(() => this.gameLoop()); }
    else { setTimeout(() => this.gameLoop(), Math.max(10, this.frameInterval)); }
  }
  
  // 检查内存使用情况
  checkMemoryUsage(currentTime) {
    if (currentTime - this.lastMemoryCheck < this.memoryCheckInterval) {
      return;
    }
    
    this.lastMemoryCheck = currentTime;
    
    try {
      // 检查内存使用情况（如果支持）
      if (performance.memory) {
        const used = performance.memory.usedJSHeapSize;
        const limit = (performance.memory.jsHeapSizeLimit || (this.maxMemoryUsage / 0.75));
        const ratio = used / limit;
        this.memoryUsage = used;

        // 进入或退出紧急模式（关闭重特效、降低迭代与质量）
        if (ratio > 0.9 && !this.memoryEmergencyMode) {
          this.enterMemoryEmergencyMode();
        } else if (ratio < 0.7 && this.memoryEmergencyMode) {
          this.exitMemoryEmergencyMode();
        }

        // 超过清理阈值，执行清理
        if (this.memoryUsage > this.maxMemoryUsage) {
          console.warn('High memory usage detected:', (this.memoryUsage / 1024 / 1024).toFixed(1), 'MB');
          // 异步执行清理以避免阻塞主循环
          this.performMemoryCleanup();
        }
      }
    } catch (error) {
      console.warn('Memory check failed:', error);
    }
  }
  
  // 执行内存清理（扩展资源释放，异步以减少阻塞）
  async performMemoryCleanup() {
    try {
      // 清理特效系统（转为轻量清理）
      try { this.effectSystem?.clear?.(); } catch {}

      // 清理图片缓存
      try {
        const { imageLoader } = await import('./src/utils/imageLoader.js');
        imageLoader?.clear?.();
      } catch {}

      // 清理音频缓存
      try {
        const { audioManager } = await import('./src/managers/audioManager.js');
        audioManager?.cleanup?.();
      } catch {}

      // 清理物理世界的已标记对象
      try { this.gameLogic?.physicsEngine?.cleanupBodies?.(); } catch {}

      // 强制垃圾回收（如果支持）
      if (typeof window !== 'undefined' && window.gc) {
        window.gc();
      }
      
      console.log('Memory cleanup performed');
    } catch (error) {
      console.warn('Memory cleanup failed:', error);
    }
  }

  // 紧急模式：关闭重特效、降低迭代，尽量避免页面被系统回收
  enterMemoryEmergencyMode() {
    this.memoryEmergencyMode = true;
    try {
      // 关闭震屏，限制特效上限
      if (this.effectSystem && typeof this.effectSystem.setQuality === 'function') {
        this.effectSystem.setQuality('off');
      } else {
        this.effectSystem?.clear?.();
      }
      // 降低物理解算迭代（保守降级，避免影响核心玩法）
      if (this.gameLogic?.physicsEngine) {
        const eng = this.gameLogic.physicsEngine;
        eng.solverIterations = Math.max(1, Math.floor((eng.solverIterations || 2) / 2));
      }
      console.warn('Entered memory emergency mode');
    } catch {}
  }

  // 退出紧急模式：在恢复空间后逐步恢复设置
  exitMemoryEmergencyMode() {
    this.memoryEmergencyMode = false;
    try {
      if (this.effectSystem && typeof this.effectSystem.setQuality === 'function') {
        this.effectSystem.setQuality('low');
      }
      console.log('Exited memory emergency mode');
    } catch {}
  }
  
  // 动态调整性能设置
  adjustPerformanceSettings() {
    if (this.fps < 30) {
      // 降低目标帧率
      this.targetFPS = Math.max(30, this.targetFPS - 5);
      this.frameInterval = 1000 / this.targetFPS;
      
      // 降低特效质量
      if (this.effectSystem) {
        this.effectSystem.setQuality('low');
      }
      
      console.log('Performance adjusted: target FPS =', this.targetFPS);
    } else if (this.fps > 55 && this.targetFPS < 60) {
      // 恢复目标帧率
      this.targetFPS = Math.min(60, this.targetFPS + 5);
      this.frameInterval = 1000 / this.targetFPS;
      
      // 恢复特效质量
      if (this.effectSystem) {
        this.effectSystem.setQuality('high');
      }
      
      console.log('Performance restored: target FPS =', this.targetFPS);
    }
  }
  
  // 更新FPS计算
  updateFPS(deltaTime) {
    this.frameCount++;
    this.fpsTimer += deltaTime;
    
    if (this.fpsTimer >= 1.0) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
      
      // 动态调整性能设置
      this.adjustPerformanceSettings();
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
    
    const memoryMB = this.memoryUsage / 1024 / 1024;
    
    const debugInfo = [
      `FPS: ${this.fps} (Target: ${this.targetFPS})`,
      `Memory: ${memoryMB.toFixed(1)}MB`,
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
      if (this.gameLogic && this.gameLogic.gameState === GAME_STATES.PLAYING) {
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
      this.gameLogic.gameState = GAME_STATES.PLAYING;
    }
  }
  
  // 游戏隐藏时的处理
  onGameHide() {
    console.log('Game paused');
    this.isPaused = true;
    
    if (this.gameLogic) {
      this.gameLogic.gameState = GAME_STATES.PAUSED;
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
  // 添加全局调试方法
  window.debugDropState = () => {
    if (game.gameLogic) {
      game.gameLogic.debugDropState();
    } else {
      console.error('Game logic not available for debugging');
    }
  };
  // 添加强制解锁方法
  window.forceUnlock = () => {
    if (game.gameLogic) {
      console.log('Forcing unlock via global method');
      game.gameLogic.unlockDrop();
    } else {
      console.error('Game logic not available for force unlock');
    }
  };
  // 添加环境检查方法
  window.checkEnvironment = () => {
    console.log('=== Environment Check ===');
    console.log('Douyin Environment:', typeof tt !== 'undefined');
    console.log('Canvas Available:', !!game.canvas);
    console.log('Game Logic Available:', !!game.gameLogic);
    console.log('Physics Engine Available:', !!(game.gameLogic && game.gameLogic.physicsEngine));
    console.log('Effect System Available:', !!(game.effectSystem));
    console.log('======================');
  };
}

export default game;
