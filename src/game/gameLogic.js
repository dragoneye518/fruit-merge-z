import { GAME_CONFIG, FRUIT_CONFIG, GAME_STATES } from '../config/constants.js';
import { PhysicsEngine } from '../engine/physics.js';
import { FruitManager } from './fruit.js';
import { GameUI } from '../ui/gameUI.js';
import RendererAdapter from '../render/rendererAdapter.js';
import { audioManager } from '../managers/audioManager.js';

// 游戏逻辑主类
export class GameLogic {
  constructor(canvas, effectSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // 游戏系统初始化
    this.physicsEngine = new PhysicsEngine(GAME_CONFIG.PHYSICS);
    this.fruitManager = new FruitManager(this.physicsEngine);
    this.effectSystem = effectSystem;
    this.gameUI = new GameUI(this.canvas);

    // 统一渲染适配层（自动在2D/3D间切换）
    this.renderAdapter = new RendererAdapter(canvas.width, canvas.height);
    // 纹理映射
    this.texturesByType = {};
    for (const [key, cfg] of Object.entries(FRUIT_CONFIG)) {
      if (cfg?.texture) this.texturesByType[key] = cfg.texture;
    }
    
    // 游戏状态
    this.gameState = GAME_STATES.PLAYING;
    this.score = 0;
    this.highScore = this.loadHighScore();
    this.level = 1;
    this.combo = 0;
    this.maxCombo = 0;
    this.multiMergeCount = 0;
    this.comboTimer = 0;
    
    // 新增积分系统变量
    this.rapidDropCount = 0;
    this.lastDropTime = 0;
    this.perfectDropStreak = 0;
    this.timeBonus = 0;
    
    // 游戏结束界面控制
    this.showGameOverScreen = false;

    // 时间管理
    this.lastTime = 0;
    this.deltaTime = 0;
    this.gameTime = 0;
    
    // 投放控制
    this.canDrop = true;
    this.dropCooldown = 0;
    this.nextFruitType = this.getRandomStarterFruit();
    
    // 危险检测
    this.dangerTimer = 0;
    this.isDangerous = false;
    
    // 特效队列
    this.effects = [];
    
    // 事件绑定
    this.setupEventListeners();
    this.setupFruitEvents();

    // 注册物理冲击事件：生成碰撞/落地特效、挤压动画与音效（带兜底）
    if (this.physicsEngine && typeof this.physicsEngine.onImpact === 'function') {
      this.physicsEngine.onImpact(({ position, strength, bodyA, bodyB, normal }) => {
        const colorA = FRUIT_CONFIG[bodyA?.type]?.color || '#FFFFFF';
        const noShake = !!bodyB; // 水果间碰撞不触发屏幕震动，仅底部落地触发
        if (this.effectSystem && typeof this.effectSystem.createImpactEffect === 'function') {
          this.effectSystem.createImpactEffect(position.x, position.y, { strength, color: colorA, noShake });
        }
        if (bodyA && typeof bodyA.triggerImpact === 'function') bodyA.triggerImpact(strength);
        if (bodyB && typeof bodyB.triggerImpact === 'function') bodyB.triggerImpact(strength);
        audioManager.playSound('HIT');
      });
    } else {
      console.warn('PhysicsEngine.onImpact not available; skipping impact registration');
    }
    
    // 初始化UI
    this.gameUI.setScore(this.score);
    this.gameUI.setHighScore(this.highScore);
    this.gameUI.setNextFruitType(this.nextFruitType);
  }

  // 抖音/全局触摸事件桥接（供 game.js 调用）
  handleTouchStart(clientX, clientY) {
    const rect = (typeof this.canvas.getBoundingClientRect === 'function')
      ? this.canvas.getBoundingClientRect()
      : { left: 0, top: 0 };
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const result = this.gameUI.onTouchStart(x, y);
    if (result) {
      this.handleUIEvent(result);
    }
  }

  handleTouchMove(clientX, clientY) {
    const rect = (typeof this.canvas.getBoundingClientRect === 'function')
      ? this.canvas.getBoundingClientRect()
      : { left: 0, top: 0 };
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    this.gameUI.onTouchMove(x, y);
  }

  handleTouchEnd(clientX, clientY) {
    if (this.gameState === GAME_STATES.GAME_OVER) {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (
        this.restartButton &&
        x >= this.restartButton.x &&
        x <= this.restartButton.x + this.restartButton.width &&
        y >= this.restartButton.y &&
        y <= this.restartButton.y + this.restartButton.height
      ) {
        this.restartGame();
        return;
      }

      // 检查排行榜按钮
      if (
        this.rankButton &&
        x >= this.rankButton.x &&
        x <= this.rankButton.x + this.rankButton.width &&
        y >= this.rankButton.y &&
        y <= this.rankButton.y + this.rankButton.height
      ) {
        this.showRankings();
        return;
      }

      // 检查分享按钮
      if (
        this.shareButton &&
        x >= this.shareButton.x &&
        x <= this.shareButton.x + this.shareButton.width &&
        y >= this.shareButton.y &&
        y <= this.shareButton.y + this.shareButton.height
      ) {
        this.shareScore();
        return;
      }
    }

    const rect = (typeof this.canvas.getBoundingClientRect === 'function')
      ? this.canvas.getBoundingClientRect()
      : { left: 0, top: 0 };
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const result = this.gameUI.onTouchEnd(x, y);
    if (result && result.type === 'drop') {
      this.dropFruit(result.x, result.y);
    }
  }

  restartGame() {
    this.score = 0;
    this.combo = 0;
    this.multiMergeCount = 0;
    this.gameState = GAME_STATES.PLAYING;
    this.fruitManager.clear();
    this.physicsEngine.clear();
    if (this.effectSystem && typeof this.effectSystem.clear === 'function') {
      this.effectSystem.clear();
    }
    this.gameUI.reset();
    this.gameUI.setScore(this.score);
    this.prepareNextFruit();
  }

  // 生成下一个水果类型并更新UI
  prepareNextFruit() {
    this.nextFruitType = this.getRandomStarterFruit();
    if (this.gameUI && typeof this.gameUI.setNextFruitType === 'function') {
      this.gameUI.setNextFruitType(this.nextFruitType);
    }
  }

  // 设置事件监听
  setupEventListeners() {
    // 触摸事件
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      // 游戏结束时，优先判断是否点击了重开按钮
      if (this.gameState === GAME_STATES.GAME_OVER && this.restartButton) {
        const b = this.restartButton;
        if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
          this.restartGame();
          audioManager.playSound('CLICK');
          return;
        }

        // 检查排行榜按钮
        if (this.rankButton && x >= this.rankButton.x && x <= this.rankButton.x + this.rankButton.width && y >= this.rankButton.y && y <= this.rankButton.y + this.rankButton.height) {
          this.showRankings();
          audioManager.playSound('CLICK');
          return;
        }

        // 检查分享按钮
        if (this.shareButton && x >= this.shareButton.x && x <= this.shareButton.x + this.shareButton.width && y >= this.shareButton.y && y <= this.shareButton.y + this.shareButton.height) {
          this.shareScore();
          audioManager.playSound('CLICK');
          return;
        }
      }
      
      const result = this.gameUI.onTouchStart(x, y);
      if (result) {
        this.handleUIEvent(result);
      }
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      this.gameUI.onTouchMove(x, y);
    });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      const result = this.gameUI.onTouchEnd(x, y);
      if (result && result.type === 'drop') {
        this.dropFruit(result.x, result.y);
      }
    });
    
    // 鼠标事件（开发调试用）
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const result = this.gameUI.onTouchStart(x, y);
      if (result) {
        this.handleUIEvent(result);
      }
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      this.gameUI.onTouchMove(x, y);
    });
    
    this.canvas.addEventListener('mouseup', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 游戏结束时，优先判断是否点击了重开按钮
      if (this.gameState === GAME_STATES.GAME_OVER && this.restartButton) {
        const b = this.restartButton;
        if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
          this.restartGame();
          audioManager.playSound('CLICK');
          return;
        }

        // 检查排行榜按钮
        if (this.rankButton && x >= this.rankButton.x && x <= this.rankButton.x + this.rankButton.width && y >= this.rankButton.y && y <= this.rankButton.y + this.rankButton.height) {
          this.showRankings();
          audioManager.playSound('CLICK');
          return;
        }

        // 检查分享按钮
        if (this.shareButton && x >= this.shareButton.x && x <= this.shareButton.x + this.shareButton.width && y >= this.shareButton.y && y <= this.shareButton.y + this.shareButton.height) {
          this.shareScore();
          audioManager.playSound('CLICK');
          return;
        }
      }
      
      const result = this.gameUI.onTouchEnd(x, y);
      if (result && result.type === 'drop') {
        this.dropFruit(result.x, result.y);
      }
    });
  }
  
  // 设置水果事件
  setupFruitEvents() {
    this.fruitManager.onMerge((mergeData) => {
      this.handleFruitMerge(mergeData);
    });
  }
  
  // 处理UI事件
  handleUIEvent(event) {
    if (event.type === 'button') {
      switch (event.name) {
        case 'pause':
          this.togglePause();
          audioManager.playSound('CLICK');
          break;
        case 'sound':
          this.toggleSound();
          audioManager.playSound('CLICK');
          break;
      }
    }
  }
  
  // 投放水果（整合功能：越界修正、掉落特效、音效与冷却）
  dropFruit(x, y) {
    if (!this.canDrop || this.gameState !== GAME_STATES.PLAYING) {
      return;
    }

    // 修复：仅校验横向投放范围，并将Y强制到投放线
    const { centerX } = GAME_CONFIG.GAME_AREA;
    const { width } = GAME_CONFIG.DROP_AREA;
    const dropLeft = centerX - width / 2;
    const dropRight = centerX + width / 2;

    // 将X限制在投放区域内
    if (x < dropLeft) x = dropLeft;
    if (x > dropRight) x = dropRight;

    // 始终在投放线处生成（由UI传入的Y可能不稳定）
    y = GAME_CONFIG.DROP_LINE_Y;

    // 创建水果
    const fruit = this.fruitManager.createFruit(this.nextFruitType, x, y);
    if (fruit) {
      // 设置投放冷却
      this.canDrop = false;
      this.dropCooldown = GAME_CONFIG.LIMITS.DROP_COOLDOWN;

      // 播放掉落音效（资源缺失时由AudioManager静音降级）
      audioManager.playSound('DROP');

      // 精准投放奖励（靠近容器中心）
      const centerDistance = Math.abs(x - centerX);
      if (centerDistance <= GAME_CONFIG.PRECISION.centerTolerancePx) {
        const bonus = GAME_CONFIG.PRECISION.bonusScore;
        this.addScore(bonus);
        if (this.effectSystem) {
          this.effectSystem.createRingEffect(x, y + 4, {
            startRadius: 6,
            endRadius: 28,
            life: 0.45,
            color: '#FFD700',
            lineWidth: 2
          });
          this.effectSystem.createFlyingScore(x, y - 10, `精准 +${bonus}`);
          this.effectSystem.createStarBurst(x, y, { starCount: 3, size: 6, life: 0.35, color: '#FFD700' });
        }
      }

      // 完美投放奖励（正中心）
      if (centerDistance <= 5) {
        const perfectBonus = 50;
        this.addScore(perfectBonus);
        if (this.effectSystem) {
          this.effectSystem.createRingEffect(x, y, {
            startRadius: 5,
            endRadius: 45,
            life: 0.7,
            color: '#FF6B35',
            lineWidth: 3
          });
          this.effectSystem.createEnhancedFlyingScore(x, y - 20, perfectBonus, '#FF6B35');
          this.effectSystem.triggerScreenShake(1.5, 0.08);
        }
      }

      // 快速投放奖励（连续快速投放）
      const currentTime = Date.now();
      if (this.lastDropTime && (currentTime - this.lastDropTime) < 800) {
        this.rapidDropCount++;
        if (this.rapidDropCount >= 3) {
          const rapidBonus = 30 * this.rapidDropCount;
          this.addScore(rapidBonus);
          if (this.effectSystem) {
            this.effectSystem.createFlyingScore(x, y - 30, `快速 +${rapidBonus}`);
          }
        }
      } else {
        this.rapidDropCount = 0;
      }
      this.lastDropTime = currentTime;

      // 生成下一个水果类型
      this.nextFruitType = this.getRandomStarterFruit();
      this.gameUI.setNextFruitType(this.nextFruitType);

      // 重置连击计时
      this.combo = 0;
      this.comboTimer = 0;
    }
  }
  
  // 处理水果合成
  handleFruitMerge(mergeData) {
    // 兼容两种模式：升级合成（newType存在）/ 同类消除（action === 'eliminate'）
    const isEliminate = mergeData.action === 'eliminate';
    const position = mergeData.position || { x: this.canvas.width / 2, y: this.canvas.height / 2 };
    // 消除事件来自物理/水果管理器，可能只提供 type；升级事件提供 newType
    const fruitType = isEliminate
      ? (mergeData.oldType || mergeData.type)
      : (mergeData.newType || mergeData.type);

    this.multiMergeCount++;

    // 增强的积分计算系统
    const safeCfg = FRUIT_CONFIG[fruitType] || { score: 1, id: 0 };
    const baseScore = isEliminate 
      ? (mergeData.score ?? safeCfg.score) 
      : safeCfg.score;
    
    // 连击倍数：递增式奖励，最高5倍
    const comboMultiplier = Math.min(1 + (this.combo * 0.15), 5.0);
    
    // 等级倍数：每级增加8%奖励
    const levelMultiplier = 1 + (this.level - 1) * 0.08;
    
    // 多重合成奖励：同时发生的合成越多，奖励越高
    const multiMergeBonus = this.multiMergeCount > 1 ? 
      Math.floor(baseScore * 0.3 * this.multiMergeCount) : 0;
    
    // 水果等级奖励：高级水果额外奖励
    const fruitLevelBonus = safeCfg.id >= 7 ? 
      Math.floor(baseScore * 0.2) : 0;
    
    // 连击里程碑奖励
    const comboMilestoneBonus = this.getComboMilestoneBonus(this.combo + 1);
    
    // 计算最终分数
    const finalScore = Math.floor(
      (baseScore * comboMultiplier * levelMultiplier) + 
      multiMergeBonus + 
      fruitLevelBonus + 
      comboMilestoneBonus
    );

    this.addScore(finalScore);

    // 增加连击（可由配置控制）
    if (isEliminate ? GAME_CONFIG.GAMEPLAY.COMBO_ON_ELIMINATE : true) {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.comboTimer = GAME_CONFIG.COMBO_DURATION; // 重置连击计时器
      
      // 连击里程碑特效
      if (this.combo === 5 || this.combo === 10 || this.combo === 20 || this.combo % 25 === 0) {
        this.createComboMilestoneEffect(position, this.combo);
      }
    }
  
    // 创建特效
    if (isEliminate) {
      if (this.effectSystem && typeof this.effectSystem.createEliminateEffect === 'function') {
        this.effectSystem.createEliminateEffect(position.x, position.y, fruitType, { score: finalScore });
      }
    } else {
      this.createMergeEffect(position, fruitType, finalScore);
      // 同步触发3D闪光/粒子特效
      if (this.renderAdapter) {
        const color = safeCfg?.color || '#FFFFFF';
        this.renderAdapter.triggerMergeEffect(position.x, position.y, fruitType, color);
      }
    }

    // 展示连击特效
    if (this.effectSystem && typeof this.effectSystem.createComboEffect === 'function') {
      this.effectSystem.createComboEffect(position.x, position.y - 10, this.combo);
    }
    
    // 检查等级提升（仅升级模式）
    if (!isEliminate) {
      this.checkLevelUp();
    }
    
    // 播放音效
    this.playMergeSound(fruitType);
  }

  // 获取连击里程碑奖励
  getComboMilestoneBonus(combo) {
    if (combo === 5) return 100;      // 5连击奖励
    if (combo === 10) return 300;     // 10连击奖励
    if (combo === 20) return 800;     // 20连击奖励
    if (combo >= 25 && combo % 25 === 0) {
      return 1000 + (combo - 25) * 200; // 25连击及以上，每25连击递增奖励
    }
    return 0;
  }

  // 创建连击里程碑特效
  createComboMilestoneEffect(position, combo) {
    if (!this.effectSystem) return;
    
    // 强烈的视觉反馈
    this.effectSystem.triggerScreenShake(8, 0.3);
    
    // 彩虹光环效果
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.effectSystem.createRingEffect(position.x, position.y, {
          startRadius: 20 + i * 15,
          endRadius: 80 + i * 30,
          life: 1.2,
          color: ['#FFD700', '#FF6B35', '#4ECDC4'][i % 3],
          lineWidth: 6 - i
        });
      }, i * 150);
    }
    
    // 里程碑文字特效
    this.effectSystem.effects.push({
      type: 'milestone',
      position: { x: position.x, y: position.y - 50 },
      text: `${combo}连击！`,
      life: 3.0,
      maxLife: 3.0,
      scale: 0.3,
      targetScale: 2.0,
      alpha: 1.0,
      color: combo >= 20 ? '#FF6B35' : '#FFD700',
      pulseSpeed: 3.0
    });
    
    // 庆祝粒子爆炸
    this.effectSystem.createExplosion(position.x, position.y, {
      particleCount: 40 + combo,
      colors: ['#FFD700', '#FF6B35', '#4ECDC4', '#9F7AEA'],
      speed: 200 + combo * 5,
      life: 2.0
    });
  }
  
  // 添加分数
  addScore(points) {
    this.score += points;
    this.gameUI.setScore(this.score);
    
    // 更新最高分
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.gameUI.setHighScore(this.highScore);
      this.saveHighScore();
    }
  }
  
  // 检查等级提升
  checkLevelUp() {
    const newLevel = Math.floor(this.score / 1000) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.createLevelUpEffect();
    }
  }
  
  // 获取随机初始水果类型
  getRandomStarterFruit() {
    const starterFruits = (GAME_CONFIG?.GAMEPLAY?.STARTER_TYPES) || ['CHERRY', 'STRAWBERRY', 'GRAPE', 'LEMON', 'ORANGE'];
    return starterFruits[Math.floor(Math.random() * starterFruits.length)];
  }
  
  // （移除重复的 dropFruit 实现）
  
  // 处理UI事件
  handleUIEvent(event) {
    if (event.type === 'button') {
      switch (event.name) {
        case 'pause':
          this.togglePause();
          break;
        case 'sound':
          this.toggleSound();
          break;
      }
    }
  }
  
  // 检查游戏结束（优化版）
  checkGameOver() {
    const fruits = this.fruitManager.getAllFruits();
    const dangerY = GAME_CONFIG.DANGER_LINE.y;
    const grace = GAME_CONFIG?.DANGER?.spawnGraceSec || 0;
    const settleSpeed = GAME_CONFIG?.DANGER?.settleSpeedY ?? 28;
    const margin = GAME_CONFIG?.DANGER?.marginPx ?? 6;
    
    let dangerousFruits = 0;
    let maxOverflow = 0; // 记录最大越线距离
    
    for (const fruit of fruits) {
      // 新生成水果顶部短暂经过给予宽限，避免误判危险
      if (grace > 0 && (fruit.isNew || fruit.age < grace)) {
        continue;
      }
      
      const topY = fruit.position.y - fruit.radius;
      const overflow = dangerY - topY;
      
      // 仅在接近停滞（速度较小）且越线较多时判定为危险
      if (overflow > margin && Math.abs(fruit.velocity.y) < settleSpeed) {
        dangerousFruits++;
        maxOverflow = Math.max(maxOverflow, overflow);
      }
    }
    
    if (dangerousFruits > 0) {
      this.dangerTimer += this.deltaTime;
      
      if (!this.isDangerous) {
        this.isDangerous = true;
        this.gameUI.setDangerLineFlash(true);
        
        // 创建危险警告特效
        if (this.effectSystem && typeof this.effectSystem.createDangerEffect === 'function') {
          this.effectSystem.createDangerEffect(
            GAME_CONFIG.GAME_AREA.x, 
            dangerY - 10, 
            GAME_CONFIG.GAME_AREA.width, 
            20
          );
        }
      }
      
      // 根据越线程度调整游戏结束时间
      const timeoutMultiplier = Math.max(0.3, 1 - (maxOverflow / 100));
      const adjustedTimeout = GAME_CONFIG.DANGER_TIMEOUT * timeoutMultiplier;
      
      // 危险状态持续一定时间后游戏结束
      if (this.dangerTimer >= adjustedTimeout) {
        this.gameOver();
      }
    } else {
      this.dangerTimer = 0;
      if (this.isDangerous) {
        this.isDangerous = false;
        this.gameUI.setDangerLineFlash(false);
      }
    }
  }
  
  // 游戏结束（增强版）
  gameOver() {
    this.gameState = GAME_STATES.GAME_OVER;
    
    // 记录最大连击数
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    
    // 保存游戏数据
    this.saveGameData();
    
    // 上报游戏结束数据到抖音
    this.reportGameOverData();
    
    // 创建游戏结束特效
    this.createGameOverEffect();

    // 播放游戏结束音效
    audioManager.playSound('GAME_OVER');
    
    // 立即显示游戏结束界面（堆满后马上可重开）
    this.showGameOverScreen = true;
    
    // 延迟显示游戏结束界面，让特效播放完毕
    setTimeout(() => {
      this.showGameOverScreen = true;
      // 显示激励视频广告（有一定概率）
      this.maybeShowRewardedAd();
    }, 500);
  }

  // 上报游戏结束数据到抖音
  reportGameOverData() {
    try {
      const gameData = {
        event: 'game_over',
        score: this.score,
        level: this.level,
        playTime: Math.floor(this.gameTime),
        combo: this.maxCombo,
        timestamp: Date.now()
      };
      
      // 导入抖音API
      import('../douyin/api.js').then(({ douyinAPI }) => {
        douyinAPI.reportGameData(gameData);
      }).catch(err => {
        console.warn('Failed to import douyinAPI:', err);
      });
    } catch (error) {
      console.warn('Failed to report game over data:', error);
    }
  }

  // 可能显示激励视频广告
  maybeShowRewardedAd() {
    try {
      // 30%概率显示广告，且分数达到一定条件
      if (Math.random() < 0.3 && this.score >= 1000) {
        import('../douyin/api.js').then(({ douyinAPI }) => {
          douyinAPI.showRewardedVideoAd()
            .then((result) => {
              if (result.reward) {
                // 观看广告奖励
                this.addScore(200);
                if (this.effectSystem) {
                  this.effectSystem.createFlyingScore(
                    this.canvas.width / 2, 
                    this.canvas.height / 2, 
                    '广告奖励 +200'
                  );
                }
                douyinAPI.showToast('观看广告获得200分奖励！');
              }
            })
            .catch((error) => {
              console.warn('Rewarded ad failed:', error);
            });
        }).catch(err => {
          console.warn('Failed to import douyinAPI:', err);
        });
      }
    } catch (error) {
      console.warn('Failed to show rewarded ad:', error);
    }
  }

  // 创建游戏结束特效
  createGameOverEffect() {
    if (!this.effectSystem) return;
    const { centerX, centerY } = GAME_CONFIG.GAME_AREA;
    if (typeof this.effectSystem.createGameOverEffect === 'function') {
      this.effectSystem.createGameOverEffect(centerX, centerY, {
        ringCount: 3,
        particleCount: 50,
        shakeIntensity: 12,
        shakeDuration: 0.4
      });
    } else {
      // 回退：至少触发一个光环与爆裂
      if (typeof this.effectSystem.createExplosion === 'function') {
        this.effectSystem.createExplosion(centerX, centerY, { particleCount: 30 });
      }
      if (typeof this.effectSystem.createRingEffect === 'function') {
        this.effectSystem.createRingEffect(centerX, centerY, { startRadius: 20, endRadius: 120, life: 0.8, color: '#FF3B30', lineWidth: 4 });
      }
      if (typeof this.effectSystem.triggerScreenShake === 'function') {
        this.effectSystem.triggerScreenShake(10, 0.3);
      }
    }
  }
  
  // 重新开始游戏（优化版）
  restart() {
    // 重置游戏状态
    this.gameState = GAME_STATES.PLAYING;
    this.score = 0;
    this.level = 1;
    this.combo = 0;
    this.gameTime = 0;
    this.dangerTimer = 0;
    this.isDangerous = false;
    this.canDrop = true;
    this.dropCooldown = 0;
    this.showGameOverScreen = false;
    
    // 重置新增的评分系统变量
    this.rapidDropCount = 0;
    this.lastDropTime = 0;
    this.perfectDropStreak = 0;
    this.timeBonus = 0;
    
    // 清理游戏对象
    this.physicsEngine.clear();
    this.fruitManager.clear();
    this.effects = [];
    
    // 清理特效系统
    if (this.effectSystem && typeof this.effectSystem.clear === 'function') {
      this.effectSystem.clear();
    }
    
    // 重置UI
    this.gameUI.reset();
    this.gameUI.setScore(this.score);
    this.gameUI.setDangerLineFlash(false);
    
    // 准备下一个水果
    this.nextFruitType = this.getRandomStarterFruit();
    this.gameUI.setNextFruitType(this.nextFruitType);
    
    // 播放重新开始音效
    audioManager.playSound('CLICK');
    
    console.log('Game restarted successfully');
  }
  
  // 暂停/继续游戏
  togglePause() {
    if (this.gameState === GAME_STATES.PLAYING) {
      this.gameState = GAME_STATES.PAUSED;
    } else if (this.gameState === GAME_STATES.PAUSED) {
      this.gameState = GAME_STATES.PLAYING;
    }
  }
  
  // 切换音效
  toggleSound() {
    audioManager.toggleMute();
  }
  
  // 创建合成特效
  createMergeEffect(position, fruitType, score) {
    if (this.effectSystem) {
      this.effectSystem.createMergeEffect(position.x, position.y, fruitType, { score });
    }
  }
  
  // 创建等级提升特效
  createLevelUpEffect() {
    if (this.effectSystem) {
      this.effectSystem.createLevelUpEffect(
        this.canvas.width / 2, 
        this.canvas.height / 2, 
        this.level
      );
    }
  }
  
  // 播放合成音效
  playMergeSound(fruitType) {
    audioManager.playSound('MERGE');
    console.log(`Play merge sound for ${fruitType}`);
  }
  
  // 更新游戏逻辑
  update(currentTime) {
    if (this.gameState !== GAME_STATES.PLAYING) return;
    
    this.multiMergeCount = 0;

    // 计算时间差
    if (this.lastTime === 0) {
      this.lastTime = currentTime;
    }
    this.deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // 更新连击计时器
    if (this.comboTimer > 0) {
      this.comboTimer -= this.deltaTime;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    if (this.gameState !== GAME_STATES.PLAYING) {
      return;
    }
    
    // 更新游戏时间
    this.gameTime += this.deltaTime;
    
    // 更新投放冷却
    if (!this.canDrop) {
      this.dropCooldown -= this.deltaTime;
      if (this.dropCooldown <= 0) {
        this.canDrop = true;
        this.dropCooldown = 0;
      }
    }
    
    // 更新物理引擎
    this.physicsEngine.step(this.deltaTime);
    
    // 更新水果管理器
    this.fruitManager.update(this.deltaTime);
    
    // 更新特效系统（防御式调用）
    if (this.effectSystem && typeof this.effectSystem.update === 'function') {
      this.effectSystem.update(this.deltaTime);
    }
    
    // 更新UI（驱动分数动画等）
    if (this.gameUI && typeof this.gameUI.update === 'function') {
      this.gameUI.update(this.deltaTime);
    }

    // 三维动效推进
    if (this.renderAdapter) {
      this.renderAdapter.tick(this.deltaTime * 1000);
    }
    
    // 检查游戏结束
    this.checkGameOver();
  }
  
  // 渲染游戏
  render() {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 应用屏幕震动偏移
    const offset = this.effectSystem && typeof this.effectSystem.getShakeOffset === 'function'
      ? this.effectSystem.getShakeOffset()
      : { x: 0, y: 0 };
    this.ctx.save();
    this.ctx.translate(offset.x, offset.y);

    // 渲染UI背景
    this.gameUI.render();
    
    // 渲染水果（通过适配层自动选择3D或2D）
    const fruits = this.fruitManager.getAllFruits();
    const renderPromise = this.renderAdapter?.renderFruits(this.ctx, fruits, { texturesByType: this.texturesByType });
    if (renderPromise && typeof renderPromise.then === 'function') {
      // 异步three渲染完成后已绘制到ctx
    } else if (!renderPromise) {
      this.fruitManager.render(this.ctx);
    }
    
    // 渲染特效
    this.effectSystem.render();
    
    this.ctx.restore();
    
    // 渲染游戏状态覆盖层
    if (this.gameState === GAME_STATES.PAUSED) {
      this.renderPauseOverlay();
    } else if (this.gameState === GAME_STATES.GAME_OVER) {
      this.renderGameOverOverlay();
    }
  }
  
  // 渲染暂停覆盖层
  renderPauseOverlay() {
    this.ctx.save();
    
    // 半透明背景
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 暂停文字
    this.ctx.font = 'bold 48px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.ctx.strokeText('暂停', centerX, centerY);
    this.ctx.fillText('暂停', centerX, centerY);
    
    this.ctx.restore();
  }
  
  // 渲染游戏结束覆盖层（增强版）
  renderGameOverOverlay() {
    // 如果还没到显示时间，不渲染
    if (!this.showGameOverScreen) return;
    
    this.ctx.save();
    
    // 渐变背景
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // 游戏结束标题（带发光效果）
    this.ctx.shadowColor = '#FF6B35';
    this.ctx.shadowBlur = 20;
    this.ctx.font = 'bold 42px Arial, sans-serif';
    this.ctx.fillStyle = '#FF6B35';
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 3;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.ctx.strokeText('游戏结束', centerX, centerY - 80);
    this.ctx.fillText('游戏结束', centerX, centerY - 80);
    
    // 重置阴影
    this.ctx.shadowBlur = 0;
    
    // 分数信息面板
    const panelWidth = 280;
    const panelHeight = 160;
    const panelX = centerX - panelWidth / 2;
    const panelY = centerY - 40;
    
    // 面板背景
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // 分数信息
    this.ctx.font = '20px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    
    const scoreY = panelY + 30;
    this.ctx.fillText(`最终得分: ${this.score.toLocaleString()}`, centerX, scoreY);
    
    // 高分显示（如果是新纪录则高亮）
    const isNewRecord = this.score > this.highScore;
    if (isNewRecord) {
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = 'bold 20px Arial, sans-serif';
      this.ctx.fillText('🎉 新纪录! 🎉', centerX, scoreY + 30);
      this.ctx.fillText(`最高得分: ${this.score.toLocaleString()}`, centerX, scoreY + 60);
    } else {
      this.ctx.fillStyle = '#CCCCCC';
      this.ctx.fillText(`最高得分: ${this.highScore.toLocaleString()}`, centerX, scoreY + 30);
    }
    
    // 连击信息
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '18px Arial, sans-serif';
    this.ctx.fillText(`最大连击: ${this.maxCombo || 0}`, centerX, scoreY + (isNewRecord ? 90 : 60));
    this.ctx.fillText(`游戏时长: ${Math.floor(this.gameTime / 60)}:${String(Math.floor(this.gameTime % 60)).padStart(2, '0')}`, centerX, scoreY + (isNewRecord ? 110 : 80));

    // 重新开始按钮（增强样式）
    const buttonWidth = 180;
    const buttonHeight = 60;
    const buttonX = centerX - buttonWidth / 2;
    const buttonY = centerY + 140;

    this.restartButton = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

    // 按钮渐变背景
    const buttonGradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
    buttonGradient.addColorStop(0, '#4CAF50');
    buttonGradient.addColorStop(1, '#45a049');
    this.ctx.fillStyle = buttonGradient;
    
    // 按钮圆角
    this.ctx.beginPath();
    this.ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    this.ctx.fill();
    
    // 按钮边框
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // 按钮文字
    this.ctx.font = 'bold 24px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 2;
    this.ctx.fillText('🔄 重新开始', centerX, buttonY + buttonHeight / 2);
    
    // 重置阴影
    this.ctx.shadowBlur = 0;

    this.ctx.restore();
    
    // 添加排行榜和分享按钮
    this.renderGameOverButtons(centerX, centerY);
  }

  // 渲染游戏结束按钮
  renderGameOverButtons(centerX, centerY) {
    const buttonWidth = 120;
    const buttonHeight = 45;
    const buttonSpacing = 20;
    const startY = centerY + 220;

    // 排行榜按钮
    const rankButtonX = centerX - buttonWidth - buttonSpacing / 2;
    this.rankButton = { x: rankButtonX, y: startY, width: buttonWidth, height: buttonHeight };
    
    this.ctx.fillStyle = '#FF6B35';
    this.ctx.beginPath();
    this.ctx.roundRect(rankButtonX, startY, buttonWidth, buttonHeight, 8);
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.font = '16px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText('🏆 排行榜', rankButtonX + buttonWidth / 2, startY + buttonHeight / 2);

    // 分享按钮
    const shareButtonX = centerX + buttonSpacing / 2;
    this.shareButton = { x: shareButtonX, y: startY, width: buttonWidth, height: buttonHeight };
    
    this.ctx.fillStyle = '#1DA1F2';
    this.ctx.beginPath();
    this.ctx.roundRect(shareButtonX, startY, buttonWidth, buttonHeight, 8);
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.font = '16px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText('📤 分享', shareButtonX + buttonWidth / 2, startY + buttonHeight / 2);
  }

  // 保存最高分
  setHighScore(score) {
    if (score > this.highScore) {
      this.highScore = score;
      this.gameUI.setHighScore(this.highScore);
      this.saveHighScore();
    }
  }
  
  // 保存最高分
  saveHighScore() {
    try {
      localStorage.setItem('fruitMergeZ_highScore', this.highScore.toString());
    } catch (e) {
      console.warn('Failed to save high score:', e);
    }
  }
  
  // 加载最高分
  loadHighScore() {
    try {
      const saved = localStorage.getItem('fruitMergeZ_highScore');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      console.warn('Failed to load high score:', e);
      return 0;
    }
  }
  
  // 保存游戏数据
  saveGameData() {
    try {
      const gameData = {
        highScore: this.highScore,
        maxCombo: this.maxCombo,
        totalGames: (this.loadGameData().totalGames || 0) + 1,
        lastScore: this.score
      };
      localStorage.setItem('fruitMergeZ_gameData', JSON.stringify(gameData));
    } catch (e) {
      console.warn('Failed to save game data:', e);
    }
  }
  
  // 加载游戏数据
  loadGameData() {
    try {
      const saved = localStorage.getItem('fruitMergeZ_gameData');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Failed to load game data:', e);
      return {};
    }
  }
  
  // 游戏主循环
  gameLoop(currentTime) {
    // 逻辑更新与渲染由外层 game.js 驱动，避免重复RAF导致卡顿
    this.update(currentTime);
    this.render();
  }
  
  // 显示排行榜
   showRankings() {
     try {
       import('../douyin/api.js').then(({ douyinAPI }) => {
         douyinAPI.showRankList({
           score: this.score,
           level: this.level,
           combo: this.maxCombo
         });
       }).catch(err => {
         console.warn('Failed to import douyinAPI:', err);
         // 降级处理：显示本地排行榜
         this.showLocalRankings();
       });
     } catch (error) {
       console.warn('Failed to show rankings:', error);
       this.showLocalRankings();
     }
   }

  // 显示本地排行榜
  showLocalRankings() {
    const gameData = this.loadGameData();
    const message = `本地最高分: ${this.highScore}\n最大连击: ${this.maxCombo}\n游戏次数: ${gameData.totalGames || 1}`;
    alert(message);
  }

  // 分享分数
  shareScore() {
    try {
      import('../douyin/api.js').then(({ douyinAPI }) => {
        const shareData = {
          title: `我在合成大西瓜中获得了${this.score}分！`,
          desc: `最大连击${this.maxCombo}次，快来挑战我吧！`,
          imageUrl: this.generateShareImage(),
          path: '/pages/game/game'
        };
        douyinAPI.shareToFriends(shareData);
      }).catch(err => {
        console.warn('Failed to import douyinAPI:', err);
        // 降级处理：复制分享文本
        this.copyShareText();
      });
    } catch (error) {
      console.warn('Failed to share score:', error);
      this.copyShareText();
    }
  }

  // 复制分享文本
  copyShareText() {
    const shareText = `我在合成大西瓜中获得了${this.score}分，最大连击${this.maxCombo}次！快来挑战我吧！`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('分享文本已复制到剪贴板！');
      }).catch(() => {
        alert(shareText);
      });
    } else {
      alert(shareText);
    }
  }

  // 生成分享图片
  generateShareImage() {
    try {
      // 创建临时canvas生成分享图片
      const shareCanvas = document.createElement('canvas');
      shareCanvas.width = 400;
      shareCanvas.height = 300;
      const shareCtx = shareCanvas.getContext('2d');
      
      // 绘制背景
      const gradient = shareCtx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, '#FF6B35');
      gradient.addColorStop(1, '#4ECDC4');
      shareCtx.fillStyle = gradient;
      shareCtx.fillRect(0, 0, 400, 300);
      
      // 绘制文字
      shareCtx.fillStyle = '#FFFFFF';
      shareCtx.font = 'bold 32px Arial, sans-serif';
      shareCtx.textAlign = 'center';
      shareCtx.fillText('合成大西瓜', 200, 80);
      
      shareCtx.font = '24px Arial, sans-serif';
      shareCtx.fillText(`得分: ${this.score}`, 200, 140);
      shareCtx.fillText(`连击: ${this.maxCombo}`, 200, 180);
      shareCtx.fillText('快来挑战我吧！', 200, 220);
      
      return shareCanvas.toDataURL('image/png');
    } catch (error) {
      console.warn('Failed to generate share image:', error);
      return '';
    }
  }

  // 启动游戏
  start() {
    // 由 game.js 的主循环驱动；此处只做日志
    console.log('Game starting (external loop)');
  }
}