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
    this.physicsEngine = new PhysicsEngine();
    this.fruitManager = new FruitManager(this.physicsEngine);
    this.effectSystem = effectSystem;
    this.gameUI = new GameUI(this.canvas);
    // 设置物理容器为画布尺寸，确保左右隐形墙与草地边界生效
    if (this.physicsEngine && typeof this.physicsEngine.setContainer === 'function') {
      this.physicsEngine.setContainer({ width: this.canvas.width, height: this.canvas.height });
    }
    // 初始化危险线：统一以投放线为准，确保与“投放水果边界”一致
    const dropLineY = (GAME_CONFIG?.DROP_LINE_Y ?? GAME_CONFIG?.DROP_AREA?.y ?? Math.floor(this.canvas.height * 0.18));
    if (this.physicsEngine && typeof this.physicsEngine.setDangerLine === 'function') {
      this.physicsEngine.setDangerLine(dropLineY);
    }
    // 同步回全局配置（供 UI 正确渲染红线）
    try {
      if (typeof GAME_CONFIG === 'object') {
        if (typeof GAME_CONFIG.DANGER_LINE === 'object') {
          GAME_CONFIG.DANGER_LINE.y = dropLineY;
        } else {
          GAME_CONFIG.DANGER_LINE = { ...(GAME_CONFIG.DANGER_LINE || {}), y: dropLineY };
        }
      }
    } catch (_) { /* ignored */ }

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
    // 初始同步最高分到UI，确保开局即显示历史最高
    if (this.gameUI && typeof this.gameUI.setHighScore === 'function') {
      this.gameUI.setHighScore(this.highScore);
    }
    // 记录本局是否产生新纪录（用于结算界面正确显示）
    this.startingHighScore = this.highScore;
    this.newRecordAchievedThisRun = false;
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
    // 当前正在下落的水果（用于投放锁定）
    this.currentDroppingFruit = null;
    
    // 危险检测
    this.dangerTimer = 0;
    this.isDangerous = false;
    
    // 特效队列
  this.effects = [];

  // 投放引导与完美投放提示
  this.previewX = null;
  this.previewActive = false;
  this.perfectNoteTimer = 0;
  this.perfectNotePos = { x: 0, y: 0 };

  // 重开/结束界面控制辅助变量
  this.restartButton = null;
  this._gameOverTimeoutId = null;

    // 事件绑定
    this.setupEventListeners();
    this.setupFruitEvents();

    // 注册物理冲击事件：生成碰撞/落地特效、挤压动画与音效（带兜底）
    if (this.physicsEngine && typeof this.physicsEngine.onImpact === 'function') {
      this.physicsEngine.onImpact(({ position, strength, bodyA, bodyB, normal }) => {
        const colorA = FRUIT_CONFIG[bodyA?.fruitType]?.color || '#FFFFFF';
        const stableSec = GAME_CONFIG?.PHYSICS?.stableContactSec ?? 0.6;
        const aStable = !!(bodyA && bodyA.bottomContact && (bodyA.bottomContactDuration || 0) >= stableSec);
        const bStable = !!(bodyB && bodyB.bottomContact && (bodyB.bottomContactDuration || 0) >= stableSec);
        const aLocked = !!(bodyA && bodyA.isStackLocked);
        const bLocked = !!(bodyB && bodyB.isStackLocked);

        // 水果间已稳定/栈锁的低强度碰撞：不触发屏幕震动与视觉效果，避免持续震动
        const isFruitFruit = !!bodyB;
        const suppressEffects = isFruitFruit && ((aLocked && bLocked) || (aStable && bStable));

        if (!suppressEffects && this.effectSystem && typeof this.effectSystem.createImpactEffect === 'function') {
          const noShake = isFruitFruit; // 水果间碰撞不触发屏幕震动，仅底部落地触发
          this.effectSystem.createImpactEffect(position.x, position.y, { strength, color: colorA, noShake });
        }
        // 动画挤压仅在非抑制时触发
        if (!suppressEffects) {
          if (bodyA && typeof bodyA.triggerImpact === 'function') bodyA.triggerImpact(strength);
          if (bodyB && typeof bodyB.triggerImpact === 'function') bodyB.triggerImpact(strength);
          audioManager.playSound('HIT');
        }

        // 完美投放判定：仅在底部落地发生，且接近投放中心线
        const dropLineY = GAME_CONFIG?.DROP_LINE_Y ?? GAME_CONFIG?.DROP_AREA?.y ?? Math.floor(this.canvas.height * 0.18);
        const centerX = GAME_CONFIG?.GAME_AREA?.centerX ?? Math.floor(this.canvas.width / 2);
        const nearCenter = Math.abs(position.x - centerX) <= 8;
        const isGroundImpact = !bodyB && normal?.y === -1 && position.y >= (dropLineY + 20);
        if (isGroundImpact && nearCenter) {
          // 文本提示与加分
          this.perfectNoteTimer = 0.75;
          this.perfectNotePos = { x: centerX, y: dropLineY + 10 };
          this.addScore(20);
          this.perfectDropStreak = (this.perfectDropStreak || 0) + 1;
          // 环形特效（金色）
          if (this.effectSystem && typeof this.effectSystem.createRingEffect === 'function') {
            this.effectSystem.createRingEffect(centerX, dropLineY + 6, {
              startRadius: 12,
              endRadius: 42,
              life: 0.45,
              color: '#FFD700',
              lineWidth: 2.5
            });
          }
        }

        // 接触标记：一旦当前下落水果与地面或其他水果发生接触，标记为已接触
        // 该标记用于“完成判定”以支持非贴地（如落在其他水果上）的稳定检测
        try {
          // currentDroppingFruit 已是 RigidBody；不要再取 .body
          const currentBody = this.currentDroppingFruit || null;
          const activeBody = this.physicsEngine?.activeBody || null;
          const involvesCurrent = !!(currentBody && (bodyA === currentBody || bodyB === currentBody));
          const involvesActive = !!(activeBody && (bodyA === activeBody || bodyB === activeBody));
          if (involvesCurrent || involvesActive || isGroundImpact) {
            if (this.currentDroppingFruit) {
              this.currentDroppingFruit.hasContact = true;
            }
            // 记录稳定接触持续时长（仅作为诊断），读取物理引擎 bottomContactDuration
            const stableA = bodyA?.bottomContactDuration || 0;
            const stableB = bodyB?.bottomContactDuration || 0;
            console.log('[ContactFlag] hasContact = true, stableA=', stableA.toFixed?.(2), 'stableB=', stableB.toFixed?.(2));
          }
        } catch (_) { /* ignore contact flag errors */ }

        // 投放锁定：移除碰撞时立即解锁的逻辑，改为在update中检查水果是否完全稳定
        // 这里不再立即解锁，而是让update方法中的isDroppingFruitFinished来判断
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
    const { x, y } = this.normalizeToCanvasCoords(clientX, clientY);
    // 游戏结束时，优先判断是否点击了重开按钮（兼容抖音 tt.onTouchStart 转发）
    if (this.gameState === GAME_STATES.GAME_OVER && this.restartButton) {
      const b = this.restartButton;
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
        this.restart();
        audioManager.playSound('CLICK');
        return;
      }
    }
    // 开启投放幽灵预览
    {
      const centerX = GAME_CONFIG?.GAME_AREA?.centerX ?? Math.floor(this.canvas.width / 2);
      const width = GAME_CONFIG?.DROP_AREA?.width ?? Math.floor(this.canvas.width * 0.6);
      const dropLeft = centerX - width / 2;
      const dropRight = centerX + width / 2;
      this.previewX = Math.max(dropLeft, Math.min(dropRight, x));
      this.previewActive = true;
    }
    const result = this.gameUI.onTouchStart(x, y);
    if (result) {
      this.handleUIEvent(result);
    }
  }

  handleTouchMove(clientX, clientY) {
    const { x, y } = this.normalizeToCanvasCoords(clientX, clientY);
    // 更新投放幽灵预览位置
    {
      const centerX = GAME_CONFIG?.GAME_AREA?.centerX ?? Math.floor(this.canvas.width / 2);
      const width = GAME_CONFIG?.DROP_AREA?.width ?? Math.floor(this.canvas.width * 0.6);
      const dropLeft = centerX - width / 2;
      const dropRight = centerX + width / 2;
      this.previewX = Math.max(dropLeft, Math.min(dropRight, x));
      this.previewActive = true;
    }

    // 处理UI事件，确保正确处理按钮点击
    const result = this.gameUI.onTouchMove(x, y);
    if (result) {
      console.log(`[TouchMove] Processing UI event: ${result.type}`);
      if (result.type === 'button') {
        this.handleUIEvent(result);
      }
    }
  }

  handleTouchEnd(clientX, clientY) {
    console.log(`[TouchEnd] Processing touch end at (${clientX}, ${clientY})`);
    
    // 游戏结束状态处理
    if (this.gameState === GAME_STATES.GAME_OVER) {
      const { x, y } = this.normalizeToCanvasCoords(clientX, clientY);

      if (
        this.restartButton &&
        x >= this.restartButton.x &&
        x <= this.restartButton.x + this.restartButton.width &&
        y >= this.restartButton.y &&
        y <= this.restartButton.y + this.restartButton.height
      ) {
        this.restart();
        return;
      }
      // 游戏结束时不处理投放
      return;
    }

    const { x, y } = this.normalizeToCanvasCoords(clientX, clientY);
    console.log(`[TouchEnd] Normalized coords: (${x.toFixed(1)}, ${y.toFixed(1)})`);
    
    // 关闭投放幽灵预览
    this.previewActive = false;
    this.previewX = null;

    // 全面的游戏状态检查
    if (this.gameState !== GAME_STATES.PLAYING) {
      console.warn('[TouchEnd] Game not in playing state:', this.gameState);
      return;
    }

    // 检查物理引擎状态
    if (!this.physicsEngine) {
      console.warn('[TouchEnd] Physics engine not available');
      return;
    }

    // 检查水果管理器状态
    if (!this.fruitManager) {
      console.warn('[TouchEnd] Fruit manager not available');
      return;
    }

    // 检查UI状态
    if (!this.gameUI) {
      console.warn('[TouchEnd] Game UI not available');
      return;
    }

    // 检查场景中的水果数量限制
    const maxFruits = GAME_CONFIG?.LIMITS?.maxFruits || 50;
    const currentFruitCount = this.physicsEngine.bodies?.length || 0;
    if (currentFruitCount >= maxFruits) {
      console.warn(`[TouchEnd] Too many fruits: ${currentFruitCount}/${maxFruits}`);
      return;
    }

    console.log(`[TouchEnd] Current drop state: canDrop=${this.canDrop}, currentFruit=${!!this.currentDroppingFruit}, cooldown=${this.dropCooldown}`);

    // 抖音环境下简化投放状态检查 - 直接强制解锁任何可能的锁定状态
    if (typeof tt !== 'undefined') {
      if (!this.canDrop || this.currentDroppingFruit) {
        console.warn('[TouchEnd/Douyin] Force unlocking for douyin environment');
        this.unlockDrop();
      }
    }

    // 投放冷却检查
    if (this.dropCooldown > 0) {
      console.warn(`[TouchEnd] Still in cooldown: ${this.dropCooldown.toFixed(2)}s`);
      return;
    }

    // 处理UI事件
    const result = this.gameUI.onTouchEnd(x, y);
    console.log(`[TouchEnd] UI result:`, result);
    
    if (result) {
      if (result.type === 'button') {
        console.log(`[TouchEnd] Processing button click: ${result.name}`);
        this.handleUIEvent(result);
      } else if (result.type === 'drop') {
        console.log(`[TouchEnd] Processing drop request at (${result.x.toFixed(1)}, ${result.y.toFixed(1)})`);
        this.dropFruit(result.x, result.y);
      }
    } else {
      console.warn('[TouchEnd] No UI result returned, attempting direct drop');
      // 如果UI没有返回结果，尝试直接投放
      this.dropFruit(x, y);
    }
  }

  restartGame() {
    // 统一走优化后的重开流程
    this.restart();
  }

  // 生成下一个水果类型并更新UI
  prepareNextFruit() {
    this.nextFruitType = this.getRandomStarterFruit();
    if (this.gameUI && typeof this.gameUI.setNextFruitType === 'function') {
      this.gameUI.setNextFruitType(this.nextFruitType);
    }
  }

  // 设置事件监听（简化版本）
  setupEventListeners() {
    // 注意：主要的触摸事件处理已经由 handleTouchStart/Move/End 方法提供
    // 这里只添加开发环境的鼠标事件作为辅助

    // 鼠标事件（开发调试用）- 只在非抖音环境下启用
    if (typeof tt === 'undefined' && this.canvas && typeof this.canvas.addEventListener === 'function') {
      this.canvas.addEventListener('mousedown', (e) => {
        const { x, y } = this.normalizeToCanvasCoords(e.clientX ?? 0, e.clientY ?? 0);
        // 调用统一的触摸开始处理
        this.handleTouchStart(x, y);
      });

      this.canvas.addEventListener('mousemove', (e) => {
        const { x, y } = this.normalizeToCanvasCoords(e.clientX ?? 0, e.clientY ?? 0);
        this.handleTouchMove(x, y);
      });

      this.canvas.addEventListener('mouseup', (e) => {
        const { x, y } = this.normalizeToCanvasCoords(e.clientX ?? 0, e.clientY ?? 0);
        this.handleTouchEnd(x, y);
      });

      console.log('[EventListeners] Mouse events added for development');
    }
  }

  // 坐标归一：统一将页面坐标映射到画布像素坐标，考虑CSS缩放与DPR
  normalizeToCanvasCoords(clientX, clientY) {
    // 抖音小游戏 Canvas 不在 DOM 中，可能没有有效的 getBoundingClientRect
    // 此时 tt 触摸事件坐标已为画布像素坐标，直接返回
    if (typeof tt !== 'undefined') {
      const hasGBCR = (typeof this.canvas.getBoundingClientRect === 'function');
      const rect = hasGBCR ? this.canvas.getBoundingClientRect() : null;
      if (!hasGBCR || !rect || !rect.width || !rect.height) {
        return { x: clientX, y: clientY };
      }
      // 若存在有效 rect，仍按常规映射，兼容部分宿主实现
      const scaleX = this.canvas.width / (rect.width || this.canvas.width);
      const scaleY = this.canvas.height / (rect.height || this.canvas.height);
      const localX = (clientX - rect.left) * scaleX;
      const localY = (clientY - rect.top) * scaleY;
      return { x: localX, y: localY };
    }
    // 浏览器/开发环境：按 DOM 尺寸与 DPR 缩放映射
    const rect = (typeof this.canvas.getBoundingClientRect === 'function')
      ? this.canvas.getBoundingClientRect()
      : { left: 0, top: 0, width: this.canvas.width, height: this.canvas.height };
    const scaleX = this.canvas.width / (rect.width || this.canvas.width);
    const scaleY = this.canvas.height / (rect.height || this.canvas.height);
    const localX = (clientX - rect.left) * scaleX;
    const localY = (clientY - rect.top) * scaleY;
    return { x: localX, y: localY };
  }
  
  // 设置水果事件
  setupFruitEvents() {
    this.fruitManager.onMerge((mergeData) => {
      this.handleFruitMerge(mergeData);
    });
  }
  
  // 解锁再次投放（增强版本）
  unlockDrop() {
    const isDouyinEnv = typeof tt !== 'undefined';
    const timestamp = Date.now();
    console.log(`[${timestamp}] [UnlockDrop] Starting unlock process. canDrop was: ${this.canDrop}, hasCurrentFruit: ${!!this.currentDroppingFruit}`);

    try {
      // 强制重置所有投放相关状态
      this.canDrop = true;
      this.dropCooldown = 0;

      // 清理当前下落水果引用
      const finished = this.currentDroppingFruit;
      this.currentDroppingFruit = null;

      // 清理物理引擎的活动刚体引用
      if (this.physicsEngine) {
        if (this.physicsEngine.activeBody === finished) {
          this.physicsEngine.activeBody = null;
          console.log(`[${timestamp}] [UnlockDrop] Cleared activeBody from physics engine`);
        }
        // 额外安全检查：如果活动刚体已被标记移除，也要清理
        if (this.physicsEngine.activeBody && this.physicsEngine.activeBody.isMarkedForRemoval) {
          this.physicsEngine.activeBody = null;
          console.log(`[${timestamp}] [UnlockDrop] Cleared marked activeBody from physics engine`);
        }
      }

      // 确保UI状态同步
      if (this.gameUI && this.gameUI.touchState) {
        this.gameUI.touchState.isDown = false;
      }

      // 抖音环境额外处理
      if (isDouyinEnv) {
        console.log(`[${timestamp}] [DouyinEnv] Unlock completed with enhanced safety checks`);
      }

      console.log(`[${timestamp}] [UnlockDrop] Drop unlocked successfully - ready for next fruit`);
      console.log(`[${timestamp}] [UnlockDrop] Final state: canDrop=${this.canDrop}, cooldown=${this.dropCooldown}, nextFruit=${this.nextFruitType}`);

    } catch (error) {
      console.error(`[${timestamp}] [UnlockDrop] Error during unlock:`, error);
      // 强制恢复基本状态
      this.canDrop = true;
      this.dropCooldown = 0;
      this.currentDroppingFruit = null;

      if (this.physicsEngine) {
        this.physicsEngine.activeBody = null;
      }
    }
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
  
  // 投放水果（重构版）
  dropFruit(x, y) {
    // 检查游戏状态和投放许可
    if (this.gameState !== GAME_STATES.PLAYING || !this.canDrop) {
      console.warn(`[DropFruit] Blocked: gameState=${this.gameState}, canDrop=${this.canDrop}`);
      return;
    }

    // 锁定投放
    this.canDrop = false;

    // 投放范围检查
    const dropLeft = 50;
    const dropRight = this.canvas.width - 50;
    const dropY = GAME_CONFIG.DROP_LINE_Y || 200;
    x = Math.max(dropLeft, Math.min(dropRight, x));

    // 创建水果
    const fruit = this.fruitManager.createFruit(this.nextFruitType, x, dropY);
    if (fruit) {
      // 为新生成的水果注入初始下落速度（修复抖音环境下第二次投放“几乎不动”的问题）
      try {
        const rb = fruit.body;
        const initialVy = (GAME_CONFIG?.DROP?.initialVelocityY ?? 420);
        const dt0 = (this.physicsEngine?.lastDt && isFinite(this.physicsEngine.lastDt) && this.physicsEngine.lastDt > 0)
          ? this.physicsEngine.lastDt
          : (1 / 60);
        // 通过调整 prevPosition 来赋予初速度，使下一步更新时速度为 initialVy
        rb.prevPosition.y = rb.position.y - initialVy * dt0;
      } catch (_) { /* ignore initial velocity injection errors */ }

      console.log(`[DropFruit] SUCCESS: Dropped fruit type=${this.nextFruitType} at (${x.toFixed(1)}, ${dropY})`);

      // 设置当前下落的水果，并记录投放时间
      this.currentDroppingFruit = fruit.body;
      this.currentDroppingFruit.dropTime = Date.now();
      // 将当前下落水果标记为物理引擎的活动刚体，避免全局稳定判定误伤
      if (this.physicsEngine) {
        this.physicsEngine.activeBody = this.currentDroppingFruit;
      }

      // 播放音效
      audioManager.playSound('DROP');

      // 准备下一个水果
      this.prepareNextFruit();
      
      // 重置连击
      this.combo = 0;
    } else {
      console.error('[DropFruit] Failed to create fruit, unlocking drop.');
      // 如果创建失败，必须解锁
      this.unlockDrop();
    }
  }

  // 添加调试方法，用于测试投放状态
  debugDropState() {
    const isDouyinEnv = typeof tt !== 'undefined';
    const timestamp = Date.now();

    console.log(`[${timestamp}] === Drop State Debug ===`);
    console.log(`[${timestamp}] Environment: ${isDouyinEnv ? 'Douyin' : 'Browser'}`);
    console.log(`[${timestamp}] canDrop: ${this.canDrop}`);
    console.log(`[${timestamp}] gameState: ${this.gameState}`);
    console.log(`[${timestamp}] currentDroppingFruit: ${!!this.currentDroppingFruit}`);
    console.log(`[${timestamp}] dropCooldown: ${this.dropCooldown.toFixed(2)}`);
    console.log(`[${timestamp}] nextFruitType: ${this.nextFruitType}`);
    console.log(`[${timestamp}] deltaTime: ${this.deltaTime?.toFixed(3) || 'N/A'}`);
    console.log(`[${timestamp}] gameTime: ${(this.gameTime || 0).toFixed(2)}s`);

    if (this.currentDroppingFruit) {
      const dropTime = this.currentDroppingFruit.dropTime || 0;
      const timeSinceDrop = (Date.now() - dropTime) / 1000;
      console.log(`[${timestamp}] fruit drop time: ${timeSinceDrop.toFixed(2)}s`);
      console.log(`[${timestamp}] fruit marked for removal: ${this.currentDroppingFruit.isMarkedForRemoval}`);
      console.log(`[${timestamp}] fruit hasContact: ${this.currentDroppingFruit.hasContact}`);
      console.log(`[${timestamp}] fruit bottomContact: ${this.currentDroppingFruit.bottomContact}`);
      console.log(`[${timestamp}] fruit bottomContactDuration: ${(this.currentDroppingFruit.bottomContactDuration || 0).toFixed(2)}s`);

      if (this.currentDroppingFruit.position) {
        console.log(`[${timestamp}] fruit position: (${this.currentDroppingFruit.position.x.toFixed(1)}, ${this.currentDroppingFruit.position.y.toFixed(1)})`);
      }
    }

    console.log(`[${timestamp}] physics world settled: ${this.physicsEngine?.isWorldSettled?.() || 'N/A'}`);
    console.log(`[${timestamp}] physics activeBody: ${!!this.physicsEngine?.activeBody}`);
    console.log(`[${timestamp}] total bodies: ${this.physicsEngine?.bodies?.length || 0}`);

    // UI状态检查
    if (this.gameUI) {
      console.log(`[${timestamp}] UI touchState.isDown: ${this.gameUI.touchState?.isDown || 'N/A'}`);
      console.log(`[${timestamp}] UI touchState.currentX: ${this.gameUI.touchState?.currentX || 'N/A'}`);
      console.log(`[${timestamp}] UI touchState.currentY: ${this.gameUI.touchState?.currentY || 'N/A'}`);
    }

    console.log(`[${timestamp}] ==============================`);
  }
  
  // 处理水果合成
  handleFruitMerge(mergeData) {
    // 移除立即解锁逻辑，所有情况都应等待水果完全稳定后才解锁
    // 解锁逻辑统一由 update 方法中的 isDroppingFruitFinished 检查处理
    // 兼容两种模式：升级合成（newType存在）/ 同类消除（action === 'eliminate'）
    const isEliminate = mergeData.action === 'eliminate';
    const position = mergeData.position || { x: this.canvas.width / 2, y: this.canvas.height / 2 };
    // 消除事件来自物理/水果管理器，可能只提供 type；升级事件提供 newType
    const fruitType = isEliminate
      ? (mergeData.oldType || mergeData.type)
      : (mergeData.newType || mergeData.type);

    console.log(`handleFruitMerge called - isEliminate: ${isEliminate}, fruitType: ${fruitType}, position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);

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

    console.log(`Score calculation - baseScore: ${baseScore}, finalScore: ${finalScore}, isEliminate: ${isEliminate}`);

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
      console.log(`Creating eliminate effect for ${fruitType} with score ${finalScore}`);
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
      this.newRecordAchievedThisRun = true;
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
  
  // 检查游戏结束：融合主动体宽限与速度阈值，避免误判
  checkGameOver() {
    const bootGraceSec = GAME_CONFIG?.GAMEPLAY?.BOOT_GRACE_SEC ?? 1.5;
    if ((this.gameTime || 0) < bootGraceSec) return;

    // 使用物理引擎的稳定性检查：若存在当前下落的活动水果，世界未稳定时不累计危险计时
    const worldSettled = this.physicsEngine ? this.physicsEngine.isWorldSettled() : true;
    if (!worldSettled) {
      const active = this.currentDroppingFruit || this.physicsEngine?.activeBody || null;
      const stableSec = GAME_CONFIG?.PHYSICS?.stableContactSec ?? 0.6;
      const activeAgeSec = active ? (((Date.now() - (active.dropTime || 0)) / 1000) || 0) : 0;
      const activeUnstable = !!(active && (!active.bottomContact || (active.bottomContactDuration || 0) < stableSec));
      // 平滑降低危险计时
      this.dangerTimer = Math.max(0, (this.dangerTimer || 0) - this.deltaTime * 0.5);
      // 若有活动水果且仍未稳定，则直接返回，避免在下落过程中触发结束
      if (activeUnstable || activeAgeSec < 0.8) {
        if (this.gameUI && typeof this.gameUI.setDangerLineFlash === 'function') {
          this.gameUI.setDangerLineFlash(false);
        }
        return;
      }
      // 若没有活动水果，仅因轻微抖动导致未稳定，则继续执行高度判定（保留之前的结算修复）
    }

    const dropLineY = this.physicsEngine?.dangerLineY ?? (GAME_CONFIG?.DROP_LINE_Y ?? 200);
    const stackTopY = this.physicsEngine.getStackTopY();

    const tolerancePx = GAME_CONFIG?.DANGER?.marginPx ?? 4;
    const sustainSec = GAME_CONFIG?.DANGER_TIMEOUT ?? 0.5;

    if (stackTopY <= dropLineY + tolerancePx) {
        this.dangerTimer = (this.dangerTimer || 0) + this.deltaTime;
    } else {
        this.dangerTimer = 0;
    }

    if (this.gameUI && typeof this.gameUI.setDangerLineFlash === 'function') {
        this.gameUI.setDangerLineFlash(this.dangerTimer > 0);
    }

    if (this.dangerTimer >= sustainSec && this.gameState !== GAME_STATES.GAME_OVER) {
        this.gameOver();
    }
  }

  // 关卡/世界参数调节：草地高度、左右墙宽等
  applyWorldSettings(overrides = {}) {
    if (!this.physicsEngine) return;
    if (typeof this.physicsEngine.setWorld === 'function') {
      this.physicsEngine.setWorld(overrides);
    }
    // 统一“危险线”到物理引擎与 UI 的同一条线（**不**修改投放线）
    const computedDangerY = (
      overrides.dangerLineY != null
        ? overrides.dangerLineY
        : (this.physicsEngine?.dangerLineY ?? (GAME_CONFIG?.DANGER_LINE?.y ?? (GAME_CONFIG?.DROP_LINE_Y ?? Math.floor(this.canvas.height * 0.18))))
    );
    if (typeof this.physicsEngine.setDangerLine === 'function') {
      this.physicsEngine.setDangerLine(computedDangerY);
    }
    // 同步到全局配置中的 DANGER_LINE.y，供 UI 渲染使用
    try {
      if (typeof GAME_CONFIG === 'object') {
        if (typeof GAME_CONFIG.DANGER_LINE === 'object') {
          GAME_CONFIG.DANGER_LINE.y = computedDangerY;
        } else {
          GAME_CONFIG.DANGER_LINE = { ...(GAME_CONFIG.DANGER_LINE || {}), y: computedDangerY };
        }
      }
    } catch (_) {/* ignored */}
  }
  
  // 游戏结束（增强版）
  gameOver() {
    console.log('gameOver() called - setting game state and UI');
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
    console.log(`gameOver() - showGameOverScreen set to: ${this.showGameOverScreen}, gameState: ${this.gameState}`);
    
    // 延迟显示游戏结束界面，让特效播放完毕（记录定时器以便重开时清理）
    if (this._gameOverTimeoutId) {
      try { clearTimeout(this._gameOverTimeoutId); } catch {}
      this._gameOverTimeoutId = null;
    }
    this._gameOverTimeoutId = setTimeout(() => {
      // 保持界面显示状态，不重复赋值，避免闪烁
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
    this.comboTimer = 0;
    this.gameTime = 0;
    this.lastTime = 0;
    this.deltaTime = 0;
    this.dangerTimer = 0;
    this.isDangerous = false;
    this.canDrop = true;
    this.dropCooldown = 0;
    this.showGameOverScreen = false;
    this.restartButton = null;
    // 清理可能遗留的“游戏结束”延迟定时器，避免重开后又显示覆盖层
    if (this._gameOverTimeoutId) {
      try { clearTimeout(this._gameOverTimeoutId); } catch {}
      this._gameOverTimeoutId = null;
    }
    // 清空当前投放状态与预览
    this.currentDroppingFruit = null;
    this.previewActive = false;
    this.previewX = null;
    
    // 重置新增的评分系统变量
    this.rapidDropCount = 0;
    this.lastDropTime = 0;
    this.perfectDropStreak = 0;
    this.timeBonus = 0;

    // 重置本局新纪录标志
    this.startingHighScore = this.highScore;
    this.newRecordAchievedThisRun = false;
    
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
    // 与水果管理器保持一致，以避免显示与实际不同步
    if (this.fruitManager) {
      this.fruitManager.nextFruitType = this.nextFruitType;
    }
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
  
  // 更新游戏逻辑（重构版）
  update(deltaTime) {
    // 某些宿主环境可能返回0或负的delta时间，使用安全的最小值
    if (deltaTime <= 0) {
      deltaTime = 1 / 60;
    }
    this.deltaTime = deltaTime;
    this.multiMergeCount = 0;
    // 驱动UI更新（分数动画与危险线闪烁）
    if (this.gameUI && typeof this.gameUI.update === 'function') {
      this.gameUI.update(deltaTime);
    }

    if (this.gameState === GAME_STATES.PLAYING) {
      this.gameTime = (this.gameTime || 0) + deltaTime;

      this.physicsEngine.step(deltaTime);
      this.fruitManager.update(deltaTime);

      // 核心解锁逻辑（放宽判定，避免第二个水果迟迟无法投放）
      if (this.currentDroppingFruit) {
        const fruit = this.currentDroppingFruit;
        
        // Manually calculate fresh velocity as it's not updated in the physics engine step
        const freshVelocity = fruit.position.subtract(fruit.prevPosition).multiply(1 / this.deltaTime);
        const speed = freshVelocity.magnitude();
        const timeSinceDrop = (Date.now() - fruit.dropTime) / 1000;

        // 条件1: 水果速度低于阈值且已下落超过最短时间
        const settled = speed < (GAME_CONFIG?.PHYSICS?.sleepVelThreshold ?? 6);
        const minDropTime = 0.12; // 放宽最短下落时间，提升解锁响应

        // 条件1b: 触地接触（放宽：不再要求较长的持续时长）
        const stableSec = GAME_CONFIG?.PHYSICS?.stableContactSec ?? 0.2;
        const settledByContact = !!(fruit.bottomContact && (fruit.bottomContactDuration || 0) >= stableSec);

        // 条件2: 超时强制解锁（更短）
        const timeout = 0.6; // 0.6秒后强制解锁，避免“第二个水果不能投放”体验

        // 条件3: 水果已被标记移除（例如同类消除后），无需继续等待
        const removed = !!fruit.isMarkedForRemoval;

        if ((settled && timeSinceDrop > minDropTime) || settledByContact || timeSinceDrop > timeout || removed) {
          if (timeSinceDrop > timeout) {
            console.warn(`[UpdateUnlock] Unlocking fruit due to timeout (${timeSinceDrop.toFixed(2)}s)`);
          } else {
            console.log(`[UpdateUnlock] Unlocking fruit because it has settled (speed: ${speed.toFixed(2)}).`);
          }
          this.unlockDrop();
        }
      } else if (!this.canDrop) {
        // 兜底：如果没有任何下落中的水果，但投放仍被锁定，则强制解锁。
        console.warn('[UpdateUnlock] Forcing unlock because no fruit is dropping but drop is disabled.');
        this.unlockDrop();
      }

      if (this.comboTimer > 0) {
        this.comboTimer -= deltaTime;
        if (this.comboTimer <= 0) {
          this.combo = 0;
        }
      }

      this.checkGameOver();
    }
  }
  
  // 渲染游戏（简化版本）
  render() {
    // 渲染UI背景
    this.gameUI.render();

    // 渲染水果
    this.fruitManager.render(this.ctx);

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
    if (!this.showGameOverScreen) {
      console.log(`renderGameOverOverlay skipped - showGameOverScreen: ${this.showGameOverScreen}, gameState: ${this.gameState}`);
      return;
    }
    
    console.log(`renderGameOverOverlay rendering - showGameOverScreen: ${this.showGameOverScreen}, gameState: ${this.gameState}, score: ${this.score}`);
    
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
    
    // 高分显示（使用本局标志，避免与已更新的最高分比较导致误判）
    const isNewRecord = !!this.newRecordAchievedThisRun;
    if (isNewRecord) {
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = 'bold 20px Arial, sans-serif';
      this.ctx.fillText('🎉 新纪录! 🎉', centerX, scoreY + 30);
      this.ctx.fillText(`最高得分: ${this.highScore.toLocaleString()}`, centerX, scoreY + 60);
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
    // 兼容不支持 roundRect 的环境
    if (typeof this.ctx.roundRect === 'function') {
      this.ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    } else {
      const r = 10;
      this.ctx.moveTo(buttonX + r, buttonY);
      this.ctx.arcTo(buttonX + buttonWidth, buttonY, buttonX + buttonWidth, buttonY + buttonHeight, r);
      this.ctx.arcTo(buttonX + buttonWidth, buttonY + buttonHeight, buttonX, buttonY + buttonHeight, r);
      this.ctx.arcTo(buttonX, buttonY + buttonHeight, buttonX, buttonY, r);
      this.ctx.arcTo(buttonX, buttonY, buttonX + buttonWidth, buttonY, r);
      this.ctx.closePath();
    }
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
    // 需求变更：移除排行榜与分享按钮（不绘制，不设置点击区域）
    this.rankButton = null;
    this.shareButton = null;
  }

  // 保存最高分
  setHighScore(score) {
    if (score > this.highScore) {
      this.highScore = score;
      this.gameUI.setHighScore(this.highScore);
      this.saveHighScore();
    }
  }
  
  // 检查存储环境
  _getStorageMethod() {
    // 抖音环境优先使用tt.setStorageSync
    if (typeof tt !== 'undefined' && tt.setStorageSync) {
      return {
        setItem: (key, value) => tt.setStorageSync(key, value),
        getItem: (key) => tt.getStorageSync(key) || null
      };
    }
    // 浏览器环境使用localStorage
    if (typeof localStorage !== 'undefined') {
      return {
        setItem: (key, value) => localStorage.setItem(key, value),
        getItem: (key) => localStorage.getItem(key)
      };
    }
    // 降级到内存存储
    return {
      setItem: () => {},
      getItem: () => null
    };
  }

  // 保存最高分
  saveHighScore() {
    try {
      const storage = this._getStorageMethod();
      storage.setItem('fruitMergeZ_highScore', this.highScore.toString());
    } catch (e) {
      console.warn('Failed to save high score:', e);
    }
  }
  
  // 加载最高分
  loadHighScore() {
    try {
      const storage = this._getStorageMethod();
      const saved = storage.getItem('fruitMergeZ_highScore');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      console.warn('Failed to load high score:', e);
      return 0;
    }
  }
  
  // 保存游戏数据
  saveGameData() {
    try {
      const storage = this._getStorageMethod();
      const gameData = {
        highScore: this.highScore,
        maxCombo: this.maxCombo,
        totalGames: (this.loadGameData().totalGames || 0) + 1,
        lastScore: this.score
      };
      storage.setItem('fruitMergeZ_gameData', JSON.stringify(gameData));
    } catch (e) {
      console.warn('Failed to save game data:', e);
    }
  }
  
  // 加载游戏数据
  loadGameData() {
    try {
      const storage = this._getStorageMethod();
      const saved = storage.getItem('fruitMergeZ_gameData');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Failed to load game data:', e);
      return {};
    }
  }
  
  // 游戏主循环
  gameLoop(currentTime) {
    // 若外层未驱动（仅用于测试场景），使用正确的Δt而不是毫秒时间戳
    const prev = this._lastLocalLoopTime ?? currentTime;
    const dt = Math.min((currentTime - prev) / 1000, 1 / 30);
    this._lastLocalLoopTime = currentTime;
    this.update(dt);
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

  // 启动游戏（修复版本）
  start() {
    // 世界参数同步
    try { this.applyWorldSettings(); } catch (e) { /* ignore */ }

    // 重置游戏时间
    this.gameTime = 0;
    this.lastTime = 0;
    this.dangerTimer = 0;

    // 完全重置投放状态
    this.canDrop = true;
    this.dropCooldown = 0;
    this.currentDroppingFruit = null;

    // 清理物理引擎的活动刚体引用
    if (this.physicsEngine) {
      this.physicsEngine.activeBody = null;
    }

    // 重置UI触摸状态
    if (this.gameUI && this.gameUI.touchState) {
      this.gameUI.touchState.isDown = false;
      this.gameUI.touchState.startX = 0;
      this.gameUI.touchState.startY = 0;
      this.gameUI.touchState.currentX = 0;
      this.gameUI.touchState.currentY = 0;
    }

    // 确保游戏状态为进行中
    this.gameState = GAME_STATES.PLAYING;

    // 准备下一个水果
    this.nextFruitType = this.getRandomStarterFruit();
    if (this.fruitManager) {
      this.fruitManager.nextFruitType = this.nextFruitType;
    }
    if (this.gameUI && typeof this.gameUI.setNextFruitType === 'function') {
      this.gameUI.setNextFruitType(this.nextFruitType);
    }

    console.log('Game started successfully - all drop states reset');
  }
}