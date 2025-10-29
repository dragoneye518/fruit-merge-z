import { GAME_CONFIG, FRUIT_CONFIG, GAME_STATES } from '../config/constants.js';
import { PhysicsEngine } from '../engine/physics.js';
import { FruitManager } from './fruit.js';
import { GameUI } from '../ui/gameUI.js';
import RendererAdapter from '../render/rendererAdapter.js';
import { audioManager } from '../managers/audioManager.js';
import { imageLoader } from '../utils/imageLoader.js';

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
    // 历史最高连击与一次性道具状态
    this.highCombo = this.loadHighCombo ? this.loadHighCombo() : 0;
    this.powerUsed = false;
    this.bombUsed = false; // 每局只能使用一次炸弹道具

    // 确保新游戏开始时抖音存储中的炸弹状态被重置
    if (typeof tt !== 'undefined' && tt.setStorageSync) {
      try {
        tt.setStorageSync('BOMB_USED', false);
        console.log('[Init] Bomb usage state initialized to false in tt storage');
      } catch (e) {
        console.warn('[Init] Failed to initialize bomb state in tt storage:', e);
      }
    }
    
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
    
    // 预生成水果系统：当前要投放的水果和下一个水果
    this.currentFruitType = this.getRandomStarterFruit(); // 当前要投放的水果
    this.nextFruitType = this.getRandomStarterFruit();    // 下一个水果（预生成）
    this.waitingForUserAction = true; // 等待用户操作投放当前水果
    
    // 当前正在下落的水果（用于投放锁定）
    this.currentDroppingFruit = null;
    
    // 预生成的水果对象
    this.previewFruit = null;
    this.previewFruitX = this.canvas.width / 2; // 预览水果的X位置
    this.previewFruitY = 80; // 预览水果的Y位置（屏幕顶部）
    
    // 拖动系统相关
    this.isDragging = false;
    this.isDragMoving = false; // 防止意外释放的标记
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragBounds = { left: 0, right: 0, top: 0, bottom: 0 };
    
    // 触摸事件相关
    this.touchStartX = undefined; // 记录按下位置
    this.touchStartY = undefined;
    
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
    this.gameUI.setNextFruitType(this.currentFruitType); // 显示当前要投放的水果
    if (typeof this.gameUI.setCombo === 'function') {
      this.gameUI.setCombo(this.combo || 0);
    }
    if (typeof this.gameUI.setHighCombo === 'function') {
      this.gameUI.setHighCombo(this.highCombo || 0);
    }
    if (typeof this.gameUI.setRunMaxCombo === 'function') {
      this.gameUI.setRunMaxCombo(this.maxCombo || 0);
    }
    
    // 创建预生成的水果
    this.createPreviewFruit();
  }

  // 抖音/全局触摸事件桥接（供 game.js 调用）
  handleTouchStart(clientX, clientY) {
    const { x, y } = this.normalizeToCanvasCoords(clientX, clientY);

    // 优先处理确认对话框
    if (this.confirmDialog && this.confirmDialog.visible) {
      this.handleConfirmDialogClick(x, y);
      return;
    }

    // 调试：输出触摸坐标和按钮位置
    const powerBtn = this.gameUI?.buttons?.power;
    const bombBtn = this.gameUI?.bombButton;
    console.log(`[TouchStart] Original: (${clientX}, ${clientY}) -> Normalized: (${x.toFixed(1)}, ${y.toFixed(1)})`);
    if (powerBtn) {
      console.log(`[TouchStart] Power button: x=${powerBtn.x}, y=${powerBtn.y}, w=${powerBtn.width}, h=${powerBtn.height}`);
      console.log(`[TouchStart] Touch in power button area: ${x >= powerBtn.x && x <= powerBtn.x + powerBtn.width && y >= powerBtn.y && y <= powerBtn.y + powerBtn.height}`);
    }
    if (bombBtn) {
      console.log(`[TouchStart] Bomb button: x=${bombBtn.x}, y=${bombBtn.y}, w=${bombBtn.width}, h=${bombBtn.height}`);
      console.log(`[TouchStart] Touch in bomb button area: ${x >= bombBtn.x && x <= bombBtn.x + bombBtn.width && y >= bombBtn.y && y <= bombBtn.y + bombBtn.height}`);
    }

    // 游戏结束时，优先判断是否点击了重开按钮（兼容抖音 tt.onTouchStart 转发）
    if (this.gameState === GAME_STATES.GAME_OVER && this.restartButton) {
      const b = this.restartButton;
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
        this.restart();
        audioManager.playSound('CLICK');
        return;
      }
    }

    // 检查UI事件（包括按钮点击）
    const uiResult = this.gameUI.onTouchStart(x, y);
    if (uiResult) {
      if (uiResult.type === 'button') {
        console.log(`[TouchStart] Button detected: ${uiResult.name} - will handle in touchEnd`);
        // 标记按钮被按下，但不立即处理，等待touchEnd确认
        this.buttonPressed = uiResult.name;
        return; // 按钮检测后直接返回，不进行投放预览
      } else if (uiResult.type === 'bomb') {
        console.log(`[TouchStart] Bomb button detected - will handle in touchEnd`);
        // 标记炸弹按钮被按下
        this.buttonPressed = 'bomb';
        return; // 炸弹按钮检测后直接返回，不进行投放预览
      }
    }

    // 只有在游戏进行中且等待用户操作时才处理水果交互
    if (this.gameState === GAME_STATES.PLAYING && this.waitingForUserAction && this.canDrop) {
      // 检查是否点击在预生成水果上
      if (this.isPointInPreviewFruit(x, y)) {
        // 开始拖动
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
        this.dragOffsetX = x - this.previewFruit.x;
        this.dragOffsetY = y - this.previewFruit.y;
        
        console.log(`[TouchStart] Started dragging fruit at (${x.toFixed(1)}, ${y.toFixed(1)})`);
        return;
      }
      
      // 按住屏幕准备投放 - 不立即设置投放位置，等待touchend确认
      this.previewActive = true;
      this.touchStartX = x; // 记录按下位置
      this.touchStartY = y;
      
      // 初始化拖动检测相关变量
      this.lastPreviewX = x;
      this.isDragMoving = false;
      
      console.log(`[TouchStart] Touch down at (${x.toFixed(1)}, ${y.toFixed(1)}), waiting for release to drop`);
    }
  }

  handleTouchMove(clientX, clientY) {
    const { x, y } = this.normalizeToCanvasCoords(clientX, clientY);

    // 检查UI事件（包括按钮）
    const uiResult = this.gameUI.onTouchMove(x, y);
    if (uiResult) {
      if (uiResult.type === 'button') {
        console.log(`[TouchMove] Button touched: ${uiResult.name}`);
        // 在移动过程中不立即触发按钮，避免误触
        return;
      }
    }

    // 处理拖动
    if (this.isDragging && this.previewFruit) {
      // 计算新位置
      const newX = x - this.dragOffsetX;
      const newY = y - this.dragOffsetY;
      
      // 限制在拖动边界内
      const constrainedX = Math.max(this.dragBounds.left, Math.min(this.dragBounds.right, newX));
      const constrainedY = Math.max(this.dragBounds.top, Math.min(this.dragBounds.bottom, newY));
      
      // 更新预生成水果位置
      this.previewFruit.x = constrainedX;
      this.previewFruit.y = constrainedY;
      
      console.log(`[TouchMove] Dragging fruit to (${constrainedX.toFixed(1)}, ${constrainedY.toFixed(1)})`);
      return;
    }

    // 只有在游戏进行中且等待用户操作时才更新投放预览位置（兼容性）
    if (this.gameState === GAME_STATES.PLAYING && this.waitingForUserAction && this.canDrop && this.previewActive) {
      const centerX = GAME_CONFIG?.GAME_AREA?.centerX ?? Math.floor(this.canvas.width / 2);
      const width = GAME_CONFIG?.DROP_AREA?.width ?? Math.floor(this.canvas.width * 0.6);
      const dropLeft = centerX - width / 2;
      const dropRight = centerX + width / 2;
      this.previewX = Math.max(dropLeft, Math.min(dropRight, x));
      
      // 更新预生成水果的位置
      if (this.previewFruit) {
        this.previewFruit.x = this.previewX;
      }
      
      console.log(`[TouchMove] Preview updated to x=${this.previewX.toFixed(1)}`);
      
      // 只在实际移动距离较大时才设置拖动状态标记
      const moveDistance = Math.abs(x - (this.lastPreviewX || x));
      if (moveDistance > 5) { // 只有移动距离大于5像素才认为是真正的拖动
        this.isDragMoving = true;
        this.lastMoveTime = Date.now();
        console.log(`[TouchMove] Significant movement detected (${moveDistance.toFixed(1)}px), setting drag state`);
      }
      this.lastPreviewX = x;
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

    // 抖音小游戏炸弹功能测试：快速双击屏幕上半部分触发炸弹
    const { x, y } = this.normalizeToCanvasCoords(clientX, clientY);
    if (this.gameState === GAME_STATES.PLAYING && y < 200 && !this.bombUsed) {
      // 简单的双击检测：如果点击位置在上半部分，且有水果存在
      const currentFruitCount = this.physicsEngine?.bodies?.length || 0;
      if (currentFruitCount > 0) {
        console.log('[BombTest] Quick bomb trigger detected via upper screen tap!');
        this.executeBombAction();
        return;
      }
    }

    let { x, y } = this.normalizeToCanvasCoords(clientX, clientY);
    console.log(`[TouchEnd] Normalized coords: (${x.toFixed(1)}, ${y.toFixed(1)})`);

    // 处理拖动结束
    if (this.isDragging) {
      this.isDragging = false;
      
      // 投放水果到当前拖动位置
      if (this.previewFruit) {
        const dropX = this.previewFruit.x;
        const dropY = this.previewFruit.y;
        
        console.log(`[TouchEnd] Dropping dragged fruit at (${dropX.toFixed(1)}, ${dropY.toFixed(1)})`);
        
        // 投放水果
        this.dropFruit(dropX, dropY);
        
        // 清理拖动状态
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
      }
      return;
    }

    // 检查是否刚刚在移动中 - 防止意外释放
    if (this.isDragMoving) {
      const timeSinceMove = Date.now() - (this.lastMoveTime || 0);
      if (timeSinceMove < 50) { // 减少到50ms，只防止非常快速的意外触发
        console.log(`[TouchEnd] User was just moving (isDragMoving=${this.isDragMoving}, timeSinceMove=${timeSinceMove}ms), ignoring touchend`);
        return;
      }
      console.log(`[TouchEnd] Sufficient time since move (${timeSinceMove}ms), processing touchend`);
      this.isDragMoving = false; // 重置标记
    }

    // 检查是否有按钮被按下且在touchEnd时仍在按钮区域内
    if (this.buttonPressed) {
      if (this.buttonPressed === 'bomb') {
        // 炸弹按钮特殊处理
        const bombCheck = this.gameUI.checkButtonClick(x, y);
        if (bombCheck && bombCheck.type === 'bomb') {
          console.log(`[TouchEnd] Bomb button clicked!`);
          this.handleUIEvent({ name: 'bomb', type: 'bomb' });
          this.buttonPressed = null;
          return;
        } else {
          console.log(`[TouchEnd] Bomb button press cancelled`);
          this.buttonPressed = null;
        }
      } else {
        // 普通按钮处理
        const buttonCheck = this.gameUI.checkButtonClick(x, y);
        if (buttonCheck && buttonCheck.type === 'button' && buttonCheck.name === this.buttonPressed) {
          console.log(`[TouchEnd] Button clicked: ${buttonCheck.name}`);
          this.handleUIEvent(buttonCheck);
          this.buttonPressed = null;
          return;
        } else {
          console.log(`[TouchEnd] Button press cancelled: ${this.buttonPressed}`);
          this.buttonPressed = null;
        }
      }
    }

    // 全面的游戏状态检查
    if (this.gameState !== GAME_STATES.PLAYING) {
      console.warn('[TouchEnd] Game not in playing state:', this.gameState);
      return;
    }

    // 检查是否等待用户操作
    if (!this.waitingForUserAction) {
      console.warn('[TouchEnd] Not waiting for user action');
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
      // 达到水果上限时，触发结算，避免卡住无法继续
      try {
        this.gameOver();
      } catch (e) {
        console.warn('[TouchEnd] gameOver failed, applying fallback stop.');
        this.gameState = GAME_STATES.GAME_OVER;
        this.canDrop = false;
        this.showGameOverScreen = true;
      }
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

    // 检查是否有有效的触摸开始位置（确保是按住-释放的操作）
    if (this.previewActive && this.touchStartX !== undefined && this.touchStartY !== undefined) {
      // 计算投放位置 - 使用释放时的位置
      const centerX = GAME_CONFIG?.GAME_AREA?.centerX ?? Math.floor(this.canvas.width / 2);
      const width = GAME_CONFIG?.DROP_AREA?.width ?? Math.floor(this.canvas.width * 0.6);
      const dropLeft = centerX - width / 2;
      const dropRight = centerX + width / 2;
      const dropX = Math.max(dropLeft, Math.min(dropRight, x));
      
      console.log(`[TouchEnd] Processing drop request at (${dropX.toFixed(1)}, ${y.toFixed(1)})`);
      
      // 关闭投放预览
      this.previewActive = false;
      this.touchStartX = undefined;
      this.touchStartY = undefined;
      
      this.waitingForUserAction = false; // 标记不再等待用户操作
      this.dropFruit(dropX, y);
    } else {
      console.log(`[TouchEnd] Touch end processed, no drop triggered (previewActive=${this.previewActive})`);
    }
  }

  restartGame() {
    // 统一走优化后的重开流程
    this.restart();
  }

  // 生成下一个水果类型并更新UI
  prepareNextFruit() {
    // 将下一个水果设为当前要投放的水果
    this.currentFruitType = this.nextFruitType;
    // 生成新的下一个水果
    this.nextFruitType = this.getRandomStarterFruit();
    // 重置等待用户操作状态
    this.waitingForUserAction = true;
    
    if (this.gameUI && typeof this.gameUI.setNextFruitType === 'function') {
      this.gameUI.setNextFruitType(this.currentFruitType); // 显示当前要投放的水果
    }
    
    // 重新创建预生成的水果
    this.createPreviewFruit();
  }

  // 创建预生成的水果对象
  createPreviewFruit() {
    // 清理之前的预生成水果
    if (this.previewFruit) {
      this.previewFruit = null;
    }
    
    // 创建新的预生成水果（不添加到物理世界）
    const fruitConfig = FRUIT_CONFIG[this.currentFruitType];
    if (fruitConfig) {
      this.previewFruit = {
        type: this.currentFruitType,
        x: this.previewFruitX,
        y: this.previewFruitY,
        radius: fruitConfig.radius,
        color: fruitConfig.color,
        texture: fruitConfig.texture
      };
      
      // 设置拖动边界
      this.updateDragBounds();
      
      console.log(`[CreatePreviewFruit] Created preview fruit: ${this.currentFruitType} at (${this.previewFruitX}, ${this.previewFruitY})`);
    }
  }

  // 更新拖动边界
  updateDragBounds() {
    if (!this.previewFruit) return;
    
    const centerX = GAME_CONFIG?.GAME_AREA?.centerX ?? Math.floor(this.canvas.width / 2);
    const width = GAME_CONFIG?.DROP_AREA?.width ?? Math.floor(this.canvas.width * 0.6);
    const radius = this.previewFruit.radius;
    
    this.dragBounds = {
      left: centerX - width / 2 + radius,
      right: centerX + width / 2 - radius,
      top: this.previewFruitY - 20,
      bottom: this.previewFruitY + 20
    };
  }

  // 检查点是否在预生成水果内
  isPointInPreviewFruit(x, y) {
    if (!this.previewFruit) return false;
    
    const dx = x - this.previewFruit.x;
    const dy = y - this.previewFruit.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance <= this.previewFruit.radius;
  }

  // 设置事件监听（简化版本）
  setupEventListeners() {
    // 注意：主要的触摸事件处理已经由 handleTouchStart/Move/End 方法提供
    // 这里只添加开发环境的鼠标事件作为辅助

    // 鼠标事件（开发调试用）- 只在非抖音环境下启用
    if (typeof tt === 'undefined' && this.canvas && typeof this.canvas.addEventListener === 'function') {
      this.canvas.addEventListener('mousedown', (e) => {
        // 传递原始 client 坐标，由内部方法统一归一化
        this.handleTouchStart(e.clientX ?? 0, e.clientY ?? 0);
      });

      this.canvas.addEventListener('mousemove', (e) => {
        this.handleTouchMove(e.clientX ?? 0, e.clientY ?? 0);
      });

      this.canvas.addEventListener('mouseup', (e) => {
        this.handleTouchEnd(e.clientX ?? 0, e.clientY ?? 0);
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

      // 水果落地后准备下一个水果
      this.prepareNextFruit();

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
        case 'power': {
          // 单次使用限制与禁用检查
          if (this.powerUsed || (this.gameUI?.buttons?.power?.disabled)) {
            audioManager.playSound('CLICK');
            return;
          }
          // 仅在游戏进行中可用
          if (this.gameState !== GAME_STATES.PLAYING) {
            return;
          }
          
          // 显示确认对话框，防止误触
          this.showPowerConfirmDialog();
          audioManager.playSound('CLICK');
          break;
        }
      }
    } else if (event.type === 'bomb') {
      // 处理炸弹按钮点击
      if (this.gameState !== GAME_STATES.PLAYING) {
        return;
      }
      
      // 检查炸弹是否已使用
      if (this.bombUsed) {
        audioManager.playSound('CLICK');
        return;
      }
      
      // 显示炸弹道具确认对话框
      this.showBombConfirmDialog();
      audioManager.playSound('CLICK');
    }
  }
  
  // 显示power道具确认对话框
  showPowerConfirmDialog() {
    const dialogWidth = 300;
    const dialogHeight = 200;
    const dialogX = (this.canvas.width - dialogWidth) / 2;
    const dialogY = (this.canvas.height - dialogHeight) / 2;
    
    const buttonWidth = 80;
    const buttonHeight = 40;
    const buttonY = dialogY + dialogHeight - 60;
    
    this.confirmDialog = {
      visible: true,
      title: '使用清除道具',
      message: '确定要清除所有水果吗？\n此道具每局只能使用一次！',
      x: dialogX,
      y: dialogY,
      width: dialogWidth,
      height: dialogHeight,
      confirmBtn: {
        x: dialogX + dialogWidth / 2 - buttonWidth - 10,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
      },
      cancelBtn: {
        x: dialogX + dialogWidth / 2 + 10,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
      },
      confirmText: '确定',
      cancelText: '取消',
      onConfirm: () => {
        this.executePowerAction();
        this.hideConfirmDialog();
      },
      onCancel: () => {
        this.hideConfirmDialog();
      }
    };
  }
  
  // 隐藏确认对话框
  hideConfirmDialog() {
    this.confirmDialog = null;
  }
  
  // 显示炸弹道具确认对话框
  showBombConfirmDialog() {
    const dialogWidth = 300;
    const dialogHeight = 200;
    const dialogX = (this.canvas.width - dialogWidth) / 2;
    const dialogY = (this.canvas.height - dialogHeight) / 2;
    
    const buttonWidth = 80;
    const buttonHeight = 40;
    const buttonY = dialogY + dialogHeight - 60;
    
    this.confirmDialog = {
      visible: true,
      type: 'bomb', // 标识对话框类型
      title: '使用炸弹道具',
      message: '确定要使用炸弹清除水果吗？\n此道具每局只能使用一次！',
      x: dialogX,
      y: dialogY,
      width: dialogWidth,
      height: dialogHeight,
      confirmBtn: {
        x: dialogX + dialogWidth / 2 - buttonWidth - 10,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
      },
      cancelBtn: {
        x: dialogX + dialogWidth / 2 + 10,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
      },
      onConfirm: () => {
        this.executeBombAction();
        this.hideConfirmDialog();
      },
      onCancel: () => {
        this.hideConfirmDialog();
      }
    };
  }
  
  // 执行炸弹道具功能
  executeBombAction() {
    if (this.bombUsed) {
      return; // 防止重复使用
    }

    // 标记炸弹已使用
    this.bombUsed = true;

    // 同步炸弹使用状态到抖音存储（确保UI能正确显示）
    if (typeof tt !== 'undefined' && tt.setStorageSync) {
      try {
        tt.setStorageSync('BOMB_USED', true);
        console.log('[Bomb] Bomb usage state saved to tt storage');
      } catch (e) {
        console.warn('[Bomb] Failed to save bomb state to tt storage:', e);
      }
    }

    // 立即更新UI状态，确保炸弹按钮显示为已使用
    if (this.gameUI && this.gameUI.updateBombButton) {
      try {
        this.gameUI.updateBombButton();
        console.log('[Bomb] UI bomb button updated immediately');
      } catch (e) {
        console.warn('[Bomb] Failed to update bomb button UI:', e);
      }
    }

    try {
      const allBodies = this.physicsEngine.bodies || [];
      const bodiesToRemove = [];

      // 修复炸弹逻辑：使用投放线作为基准，清除所有已经稳定的水果
      const dropLineY = GAME_CONFIG?.DROP_LINE_Y ?? 111;
      const groundTopY = this.physicsEngine.getGroundTopY();

      // 筛选出需要清除的水果：
      // 1. 排除当前正在下落的水果（如果存在且速度较快）
      // 2. 清除所有其他已经掉落的水果（使用更宽松的判断条件）
      for (const body of allBodies) {
        // 检查是否是当前正在快速下落的水果
        const isCurrentDropping = this.currentDroppingFruit &&
                                 this.currentDroppingFruit.id === body.id;
        const isFastFalling = body.velocity && Math.abs(body.velocity.y) > 30;

        // 如果是当前正在快速下落的水果，跳过不清除
        if (isCurrentDropping && isFastFalling) {
          console.log(`[Bomb] Skipping current dropping fruit: ${body.id}, velocity: ${body.velocity.y.toFixed(2)}`);
          continue;
        }

        // 修复清除逻辑：清除所有在投放线以下的水果（已经掉落的所有水果）
        // 这样确保炸弹能清除所有已经投放的水果
        const fruitCenterY = body.position.y;
        const fruitRadius = body.radius || 48; // 获取水果半径，默认48
        const fruitBottom = fruitCenterY + fruitRadius;

        // 只要水果底部超过投放线，就认为是已经掉落的水果，应该被清除
        if (fruitBottom > dropLineY + 10) { // 加10px容差
          bodiesToRemove.push(body);
          console.log(`[Bomb] Marked fruit for removal: id=${body.id}, y=${fruitCenterY.toFixed(1)}, bottom=${fruitBottom.toFixed(1)}, dropLine=${dropLineY}`);
        }
      }
      
      console.log(`[Bomb] Removing ${bodiesToRemove.length} dropped fruits out of ${allBodies.length} total`);
      console.log(`[Bomb] Drop line Y: ${dropLineY}, Ground Y: ${groundTopY}`);
      
      // 移除选中的水果
      for (const body of bodiesToRemove) {
        body.isMarkedForRemoval = true;
      }
      
      // 清理水果管理器中对应的水果对象
      this.fruitManager.fruits = this.fruitManager.fruits.filter(fruit =>
        !fruit.body.isMarkedForRemoval
      );

      // 清理物理引擎中的刚体
      this.physicsEngine.cleanupBodies();

      // 如果当前下落的水果被清除了，重置相关状态
      if (this.currentDroppingFruit && this.currentDroppingFruit.isMarkedForRemoval) {
        this.currentDroppingFruit = null;
        this.physicsEngine.activeBody = null;
      }

      // 强制解锁投放状态，确保炸弹使用后可以立即继续投放
      this.canDrop = true;
      this.dropCooldown = 0;
      this.waitingForUserAction = true;

      console.log('[Bomb] Bomb execution completed - drop state unlocked');
      
      // 安全复位危险状态与连击计时器
      this.dangerTimer = 0;
      this.isDangerous = false;
      this.comboTimer = 0;
      
      // 视觉反馈：增强版炸弹特效
      const centerX = (GAME_CONFIG?.GAME_AREA?.centerX ?? Math.floor(this.canvas.width / 2));
      const centerY = (GAME_CONFIG?.DROP_LINE_Y ?? Math.floor(this.canvas.height * 0.18));
      if (this.effectSystem) {
        // 使用新的增强版炸弹特效
        if (typeof this.effectSystem.createEnhancedBombExplosion === 'function') {
          this.effectSystem.createEnhancedBombExplosion(
            centerX, 
            centerY, 
            this.canvas.width, 
            this.canvas.height, 
            {
              intensity: 'high',
              screenCoverage: true
            }
          );
        } else {
          // 降级到原有特效
          if (typeof this.effectSystem.createExplosion === 'function') {
            this.effectSystem.createExplosion(centerX, centerY, { 
              particleCount: 50, 
              colors: ['#FF6B6B', '#FFD93D', '#FF8E53'], 
              life: 1.5, 
              speed: 300 
            });
          }
          if (typeof this.effectSystem.createRingEffect === 'function') {
            this.effectSystem.createRingEffect(centerX, centerY, { 
              startRadius: 20, 
              endRadius: 120, 
              life: 0.8, 
              color: '#FF6B6B', 
              lineWidth: 4 
            });
          }
          if (typeof this.effectSystem.triggerScreenShake === 'function') {
            this.effectSystem.triggerScreenShake(6, 0.25);
          }
        }
      }
      audioManager.playSound('POWER_USE');
    } catch (e) {
      console.warn('[Bomb] Failed to clear stable fruits:', e);
    }
  }
  
  // 执行power道具功能
  executePowerAction() {
    try {
      // 清除当前所有水果（不影响世界边界），游戏继续
      this.fruitManager.clear();
      if (this.physicsEngine) {
        this.physicsEngine.activeBody = null;
      }
      // 安全复位危险状态与连击计时器
      this.dangerTimer = 0;
      this.isDangerous = false;
      this.comboTimer = 0;
      // 标记道具已使用并禁用按钮
      this.powerUsed = true;
      if (this.gameUI && this.gameUI.buttons && this.gameUI.buttons.power) {
        this.gameUI.buttons.power.disabled = true;
      }
      // 视觉反馈：轻微震屏 + 爆裂与环形特效
      const centerX = (GAME_CONFIG?.GAME_AREA?.centerX ?? Math.floor(this.canvas.width / 2));
      const centerY = (GAME_CONFIG?.DROP_LINE_Y ?? Math.floor(this.canvas.height * 0.18));
      if (this.effectSystem) {
        if (typeof this.effectSystem.createExplosion === 'function') {
          this.effectSystem.createExplosion(centerX, centerY, { particleCount: 36, colors: ['#4ECDC4', '#FFD700', '#9F7AEA'], life: 1.2, speed: 220 });
        }
        if (typeof this.effectSystem.createRingEffect === 'function') {
          this.effectSystem.createRingEffect(centerX, centerY, { startRadius: 12, endRadius: 90, life: 0.5, color: '#4ECDC4', lineWidth: 3 });
        }
        if (typeof this.effectSystem.triggerScreenShake === 'function') {
          this.effectSystem.triggerScreenShake(4, 0.18);
        }
      }
      audioManager.playSound('POWER_USE');
    } catch (e) {
      console.warn('[Power] Failed to clear fruits:', e);
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

    // 使用预生成水果的位置进行投放
    const dropLineY = GAME_CONFIG?.DROP_LINE_Y ?? 111; // 投放线位置
    const targetX = this.previewFruit ? this.previewFruit.x : x; // 使用预生成水果的X位置

    // 创建水果 - 使用当前要投放的水果类型
    const fruit = this.fruitManager.createFruit(this.currentFruitType, targetX, dropLineY);
    if (fruit) {
      // 直接在目标位置投放，不需要移动
      fruit.body.targetX = targetX;
      fruit.body.isMovingToTarget = false;
      fruit.body.shouldDropAfterMove = false;
      
      // 启用重力，让水果立即下落
      fruit.body.gravityDisabled = false;
      
      // 添加水果生成动效
      if (this.effectSystem) {
        // 生成闪光特效
        this.effectSystem.createSparkle(targetX, dropLineY, {
          particleCount: 12,
          colors: ['#FFD700', '#FFA500', '#FF6347', '#FFFFFF'],
          size: 3,
          life: 0.8,
          spread: 30
        });
        
        // 生成下落轨迹特效
        this.effectSystem.createDropTrail(targetX, dropLineY, {
          particleCount: 6,
          colors: ['#87CEEB', '#B0E0E6', '#E0F6FF']
        });
      }

      console.log(`[DropFruit] SUCCESS: Spawned fruit type=${this.currentFruitType} at target (${targetX}, ${dropLineY})`);
      
      // 设置当前下落的水果，并记录投放时间
      this.currentDroppingFruit = fruit.body;
      this.currentDroppingFruit.dropTime = Date.now();
      
      // 将当前下落水果标记为物理引擎的活动刚体，避免全局稳定判定误伤
      if (this.physicsEngine) {
        this.physicsEngine.activeBody = this.currentDroppingFruit;
      }
      
      // 播放投放音效
      audioManager.playSound('DROP');
      
      // 设置投放冷却时间
      this.dropCooldown = 300; // 300ms冷却
      
      // 重置连击计时器
      this.comboTimer = 0;
      
      // 设置等待状态为false，因为水果已经投放
      this.waitingForUserAction = false;
      
      // 清除预览状态
      this.previewActive = false;
      
      console.log(`[DropFruit] Drop completed, waiting for fruit to land`);
    } else {
      // 如果创建失败，重新允许投放
      this.canDrop = true;
      console.error(`[DropFruit] FAILED: Could not create fruit type=${this.currentFruitType}`);
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

      // 刷新历史最高连击记录（如本局已超过）
      if (this.maxCombo > (this.highCombo || 0)) {
        if (typeof this.setHighCombo === 'function') {
          this.setHighCombo(this.maxCombo);
        } else {
          this.highCombo = this.maxCombo;
        }
      }
      
      // 同步UI显示：当前连击、本局最高连击、历史最高连击
      if (this.gameUI) {
        if (typeof this.gameUI.setCombo === 'function') {
          this.gameUI.setCombo(this.combo);
        }
        if (typeof this.gameUI.setRunMaxCombo === 'function') {
          this.gameUI.setRunMaxCombo(this.maxCombo || 0);
        }
        if (typeof this.gameUI.setHighCombo === 'function') {
          this.gameUI.setHighCombo(this.highCombo || 0);
        }
      }
      
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
      // 升级模式：在合成位置生成新水果实体
      try {
        if (this.fruitManager && mergeData?.newType) {
          const newFruit = this.fruitManager.createFruit(mergeData.newType, position.x, position.y);
          if (newFruit?.body && typeof newFruit.body.setMergeCooldown === 'function') {
            newFruit.body.setMergeCooldown(60);
          }
          // 合成后给予新水果轻微初速度，促进更快滑落
          if (newFruit?.body) {
            const jitterX = (Math.random() - 0.5) * 6; // 轻微水平扰动（±3px）
            const impulseY = Math.max(6, Math.min(12, newFruit.body.radius * 0.12)); // 垂直初速度（像素位移）
            newFruit.body.prevPosition.x = newFruit.body.position.x - jitterX;
            newFruit.body.prevPosition.y = newFruit.body.position.y - impulseY;
          }
        }
      } catch (e) {
        console.warn('Failed to create upgraded fruit:', e);
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
    const starterFruits = (GAME_CONFIG?.GAMEPLAY?.STARTER_TYPES) || ['SHANZHU', 'LANMEI', 'PUTAO', 'SANSHENG', 'CHENGZI'];
    return starterFruits[Math.floor(Math.random() * starterFruits.length)];
  }
  
  // （移除重复的 dropFruit 实现）
  
  // 检查游戏结束（简化版本）
  checkGameOver() {
    // 基本安全检查
    if (!this.physicsEngine || this.gameState !== GAME_STATES.PLAYING) {
      return;
    }

    // 检查deltaTime
    if (!this.deltaTime || !isFinite(this.deltaTime) || this.deltaTime <= 0) {
      return;
    }

    // 启动宽限期
    const bootGraceSec = GAME_CONFIG?.GAMEPLAY?.BOOT_GRACE_SEC ?? 1.5;
    if ((this.gameTime || 0) < bootGraceSec) {
      return;
    }

    // 游戏结束判断参数
    const tolerancePx = GAME_CONFIG?.GAMEPLAY?.GAMEOVER_TOLERANCE_PX ?? 8;
    const sustainSec = GAME_CONFIG?.GAMEPLAY?.GAMEOVER_SUSTAIN_SEC ?? 0.8;
    const dangerY = GAME_CONFIG?.DANGER_LINE?.y ?? 200; // 使用配置中的危险线位置
    const groundY = this.canvas.height - (GAME_CONFIG?.GROUND?.height ?? 28); // 计算地面位置

    // 检查是否有水果超过危险线
    let hasDangerousFruit = false;
    let dangerousFruit = null;
    
    try {
      const bodies = this.physicsEngine?.bodies || [];
      for (let i = 0; i < Math.min(bodies.length, 50); i++) {
        const body = bodies[i];
        if (!body || body.isMarkedForRemoval || !body.position || !isFinite(body.position.y) || !isFinite(body.radius)) {
          continue;
        }

        // 检查水果顶部是否达到或超过危险线
        const fruitTop = body.position.y - body.radius;
        const reachesDangerLine = fruitTop <= (dangerY + tolerancePx);
        
        // 如果水果达到危险线，就认为是危险状态
        if (reachesDangerLine) {
          hasDangerousFruit = true;
          dangerousFruit = body;
          break;
        }
      }
    } catch (error) {
      console.warn('[CheckGameOver] Error checking dangerous fruits:', error);
      this.dangerTimer = 0;
      return;
    }

    // 如果没有危险水果，重置计时器
    if (!hasDangerousFruit || !dangerousFruit) {
      this.dangerTimer = 0;
      this.isDangerous = false;
      return;
    }

    // 检查危险水果是否静止
    let isStatic = false;
    try {
      const velocity = dangerousFruit.velocity || { x: 0, y: 0 };
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      const speedThreshold = GAME_CONFIG?.DANGER?.settleSpeedY ?? 50;
      isStatic = speed <= speedThreshold;
    } catch (_) {
      isStatic = false;
    }

    // 新投放水果的宽限期
    let graceActive = false;
    try {
      const dropAgeSec = ((Date.now() - (dangerousFruit.dropTime || 0)) / 1000) || 0;
      const spawnGraceSec = GAME_CONFIG?.DANGER?.spawnGraceSec ?? 0.3;
      const isActiveFruit = !!(this.physicsEngine?.activeBody && dangerousFruit === this.physicsEngine.activeBody);
      graceActive = isActiveFruit && (dropAgeSec < spawnGraceSec);
    } catch (_) {
      graceActive = false;
    }

    // 累计危险时间
    if (hasDangerousFruit && isStatic && !graceActive) {
      this.dangerTimer = (this.dangerTimer || 0) + this.deltaTime;
      this.isDangerous = true;
    } else {
      this.dangerTimer = 0;
      this.isDangerous = false;
    }

    // 调试日志
    try {
      const fruitTop = dangerousFruit.position.y - dangerousFruit.radius;
      const fruitBottom = dangerousFruit.position.y + dangerousFruit.radius;
      const prevTimer = (this.dangerTimer || 0);
      let label = graceActive ? '宽限期中' : (isStatic ? (prevTimer > 0 ? '计时中' : '开始计时') : '未静止');
      console.log(`[CheckGameOver] 状态=${label}, 水果顶部=${fruitTop.toFixed(1)}, 水果底部=${fruitBottom.toFixed(1)}, 危险线=${dangerY}, 地面=${groundY}, 计时=${prevTimer.toFixed(2)}`);
    } catch (_) {
      // 忽略日志错误
    }

    // 检查是否应该结束游戏
    if (this.dangerTimer >= sustainSec && this.gameState === GAME_STATES.PLAYING) {
      console.log(`[CheckGameOver] 游戏结束：水果超过危险线持续${this.dangerTimer.toFixed(2)}秒`);

      try {
        this.gameOver();
      } catch (error) {
        console.error('[CheckGameOver] Error in gameOver:', error);
        // 强制结束游戏
        this.gameState = GAME_STATES.GAME_OVER;
        this.canDrop = false;
        this.showGameOverScreen = true;
      }
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
    // 安全检查：避免重复调用
    if (this.gameState === GAME_STATES.GAME_OVER) {
      console.warn('[GameOver] Game already over, ignoring duplicate call');
      return;
    }

    console.log('gameOver() called - setting game state and UI');

    // 立即设置游戏状态，防止重复调用
    this.gameState = GAME_STATES.GAME_OVER;
    // 结束即刻冻结投放
    this.canDrop = false;

    // 清理当前下落水果
    this.currentDroppingFruit = null;
    if (this.physicsEngine) {
      this.physicsEngine.activeBody = null;
    }

    // 记录最大连击数
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // 最终高分确认：兜底一次，避免某些计分在结算边界遗漏持久化
    try {
      if (this.score > this.highScore) {
        this.setHighScore(this.score);
        this.newRecordAchievedThisRun = true;
      }
      // 连击纪录兜底确认
      if (this.maxCombo > (this.highCombo || 0)) {
        if (typeof this.setHighCombo === 'function') {
          this.setHighCombo(this.maxCombo);
        } else {
          this.highCombo = this.maxCombo;
        }
        this.newComboRecordAchievedThisRun = true;
      } else {
        this.newComboRecordAchievedThisRun = false;
      }
    } catch (_) { /* ignore */ }

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

    // 初始化结束面板动画状态
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    this.gameOverAnim = {
      startTime: now,
      // PRD动画：遮罩渐入300ms；面板缩放260ms（近似值，缓动为ease-out）
      maskDurationMs: 300,
      panelDurationMs: 260,
      initialScale: 0.9,
      finalScale: 1.0,
      targetMaskAlpha: 0.6
    };

    // 清理之前的定时器
    if (this._gameOverTimeoutId) {
      try { clearTimeout(this._gameOverTimeoutId); } catch {}
      this._gameOverTimeoutId = null;
    }

    // 延迟显示游戏结束界面，让特效播放完毕（记录定时器以便重开时清理）
    this._gameOverTimeoutId = setTimeout(() => {
      // 安全检查：确保游戏仍然处于结束状态
      if (this.gameState === GAME_STATES.GAME_OVER) {
        // 显示激励视频广告（有一定概率）
        this.maybeShowRewardedAd();
      }
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
    this.gameOverAnim = null;
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
    // 确保重开后UI立即显示当前最高分
    if (typeof this.gameUI.setHighScore === 'function') {
      this.gameUI.setHighScore(this.highScore);
    }
    // 同步连击显示：当前连击重置为0，最高连击保持
    if (this.gameUI) {
      if (typeof this.gameUI.setCombo === 'function') {
        this.gameUI.setCombo(0);
      }
      if (typeof this.gameUI.setHighCombo === 'function') {
        this.gameUI.setHighCombo(this.highCombo || 0);
      }
    }

    // 重置一次性道具状态
    this.powerUsed = false;
    this.bombUsed = false; // 重置炸弹使用状态

    // 清除抖音存储中的炸弹状态（新游戏重置状态）
    if (typeof tt !== 'undefined' && tt.setStorageSync) {
      try {
        tt.setStorageSync('BOMB_USED', false);
        console.log('[Restart] Bomb usage state cleared from tt storage');
      } catch (e) {
        console.warn('[Restart] Failed to clear bomb state from tt storage:', e);
      }
    }
    if (this.gameUI && this.gameUI.buttons && this.gameUI.buttons.power) {
      this.gameUI.buttons.power.disabled = false;
    }

    // 生成并同步下一颗水果
    this.prepareNextFruit();
    this.gameUI.setDangerLineFlash(false);
    
    // 创建预生成水果，确保重新开始时就显示
    this.createPreviewFruit();
    
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
  
  // 检查水果是否与其他水果发生碰撞
  checkFruitCollision(targetFruit) {
    if (!this.physicsEngine || !this.physicsEngine.bodies) {
      return false;
    }
    
    for (const body of this.physicsEngine.bodies) {
      // 跳过自己和已标记移除的水果
      if (body === targetFruit || body.isMarkedForRemoval) {
        continue;
      }
      
      // 计算距离
      const dx = targetFruit.position.x - body.position.x;
      const dy = targetFruit.position.y - body.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = targetFruit.radius + body.radius;
      
      // 如果距离小于半径之和，说明发生碰撞
      if (distance < minDistance + 2) { // 2px容差
        return true;
      }
    }
    
    return false;
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

      // 安全检查：确保物理引擎可用
      if (this.physicsEngine) {
        this.physicsEngine.step(deltaTime);
      }

      // 安全检查：确保水果管理器可用
      if (this.fruitManager) {
        this.fruitManager.update(deltaTime);
      }

      // 冷却递减：保障第二次投放不会被"忘记递减"的状态锁住
      if (this.dropCooldown > 0) {
        this.dropCooldown = Math.max(0, this.dropCooldown - deltaTime);
      }

      // 核心解锁逻辑（放宽判定，避免第二个水果迟迟无法投放）
      if (this.currentDroppingFruit) {
        const fruit = this.currentDroppingFruit;

        // 安全检查：确保水果对象仍然有效
        if (fruit && fruit.position && fruit.prevPosition) {
          // Manually calculate fresh velocity as it's not updated in the physics engine step
          const freshVelocity = fruit.position.subtract(fruit.prevPosition).multiply(1 / this.deltaTime);
          const speed = freshVelocity.magnitude();
          const timeSinceDrop = (Date.now() - fruit.dropTime) / 1000;

          // 更严格的解锁：必须"速度低 + 持续触地稳定"才视为完成掉落
          const settled = speed < (GAME_CONFIG?.PHYSICS?.sleepVelThreshold ?? 2);
          const stableSec = GAME_CONFIG?.PHYSICS?.stableContactSec ?? 0.05; // 进一步降低接触稳定时间要求
          const settledByContact = !!(fruit.bottomContact && (fruit.bottomContactDuration || 0) >= stableSec);

          // 水果已被标记移除（例如同类消除后），无需继续等待
          const removed = !!fruit.isMarkedForRemoval;

          // 增加速度条件：如果速度足够低，即使接触时间不够也可以解锁
          const speedSettled = speed < (GAME_CONFIG?.PHYSICS?.sleepVelThreshold ?? 2) * 0.8; // 速度低于阈值80%时
          // 添加超时兜底机制：水果掉落超过2秒强制解锁
          const timeSinceDrop = (Date.now() - fruit.dropTime) / 1000;
          const timeThreshold = 2.0; // 2秒超时

          if (removed || settledByContact || speedSettled || timeSinceDrop > timeThreshold) {
            console.log(`[UpdateUnlock] Unlocking: contactStable=${settledByContact}, speedSettled=${speedSettled}, speed=${speed.toFixed(2)}, contactSec=${(fruit.bottomContactDuration||0).toFixed(2)}, timeSinceDrop=${timeSinceDrop.toFixed(2)}`);
            this.unlockDrop();
          }
        } else {
          // 水果对象无效，强制解锁
          console.warn('[UpdateUnlock] Fruit object invalid, forcing unlock');
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
          // 在重置combo前，先更新maxCombo
          if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
            if (this.gameUI && typeof this.gameUI.setRunMaxCombo === 'function') {
              this.gameUI.setRunMaxCombo(this.maxCombo);
            }
          }
          this.combo = 0;
          if (this.gameUI && typeof this.gameUI.setCombo === 'function') {
            this.gameUI.setCombo(0);
          }
        }
      }

      // 安全检查：在游戏结束时调用checkGameOver
      try {
        this.checkGameOver();
      } catch (error) {
        console.error('[Update] Error in checkGameOver:', error);
        // 如果checkGameOver出错，强制结束游戏以避免卡死
        if (this.gameState === GAME_STATES.PLAYING) {
          console.warn('[Update] Forcing game over due to checkGameOver error');
          this.gameState = GAME_STATES.GAME_OVER;
          this.canDrop = false;
          this.showGameOverScreen = true;
        }
      }
    }
  }
  
  // 渲染游戏（简化版本）
  render() {
    // 渲染UI背景（不包括炸弹按钮）
    this.ctx.save();
    this.gameUI.renderBackground();
    this.gameUI.renderGrassWorldBottom();
    this.gameUI.renderHeader();
    this.gameUI.renderDangerLine();
    this.ctx.restore();

    // 渲染水果（应用震屏偏移）
    this.ctx.save();
    const shake = (this.effectSystem && typeof this.effectSystem.getShakeOffset === 'function')
      ? this.effectSystem.getShakeOffset()
      : { x: 0, y: 0 };
    if (shake.x || shake.y) {
      this.ctx.translate(shake.x, shake.y);
    }
    this.fruitManager.render(this.ctx);
    this.ctx.restore();

    // 渲染预生成的水果（在屏幕顶部）
    this.renderPreviewFruit();

    // 渲染游戏状态覆盖层
    if (this.gameState === GAME_STATES.PAUSED) {
      this.renderPauseOverlay();
    } else if (this.gameState === GAME_STATES.GAME_OVER) {
      this.renderGameOverOverlay();
    }

    // 渲染确认对话框
    if (this.confirmDialog && this.confirmDialog.visible) {
      this.renderConfirmDialog();
    }

    // 渲染炸弹按钮（绝对最顶层，确保没有任何元素遮挡）
    this.gameUI.renderBombButton();
  }

  // 渲染预生成的水果（贴图版 + UX增强）
  renderPreviewFruit() {
    if (!this.previewFruit || this.gameState !== GAME_STATES.PLAYING || !this.waitingForUserAction) {
      return;
    }

    const fruit = this.previewFruit;
    const texturePath = fruit.texture || this.texturesByType[fruit.type];
    const img = texturePath ? imageLoader.getImage(texturePath) : null;

    const baseY = fruit.y;
    const bobOffset = this.isDragging ? 0 : Math.sin((this.gameTime || 0) * 2) * 2; // 轻微悬浮动画
    const y = baseY + bobOffset;
    const x = fruit.x;
    const size = fruit.radius * 2 * (this.isDragging ? 1.06 : 1.0); // 拖动时微放大

    this.ctx.save();
    this.ctx.globalAlpha = this.isDragging ? 0.95 : 0.88;

    // 使用圆形裁剪，确保预览边界与物理半径一致
    if (typeof this.ctx.beginPath === 'function' && typeof this.ctx.arc === 'function' && typeof this.ctx.clip === 'function') {
      this.ctx.beginPath();
      this.ctx.arc(x, y, fruit.radius, 0, Math.PI * 2);
      this.ctx.clip();
    }

    if (img && typeof this.ctx.drawImage === 'function') {
      // 优先使用贴图渲染
      try {
        // 若有不透明边界，进行裁剪以去除透明留白
        const bounds = imageLoader.computeOpaqueBounds ? imageLoader.computeOpaqueBounds(img) : null;
        if (bounds && bounds.sw && bounds.sh) {
          this.ctx.drawImage(img, bounds.sx, bounds.sy, bounds.sw, bounds.sh, x - size / 2, y - size / 2, size, size);
        } else {
          this.ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        }
      } catch (e) {
        // 贴图失败时回退到圆形
        this.ctx.fillStyle = fruit.color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, fruit.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    } else {
      // 无贴图或尚未加载：回退到圆形渐变填充
      this.ctx.fillStyle = fruit.color;
      if (typeof this.ctx.createRadialGradient === 'function') {
        const grad = this.ctx.createRadialGradient(x - fruit.radius * 0.3, y - fruit.radius * 0.3, 0, x, y, fruit.radius);
        grad.addColorStop(0, 'rgba(255,255,255,0.35)');
        grad.addColorStop(1, fruit.color);
        this.ctx.fillStyle = grad;
      }
      this.ctx.beginPath();
      this.ctx.arc(x, y, fruit.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 边缘光与边框（拖动时更亮）
    if (typeof this.ctx.stroke === 'function') {
      this.ctx.strokeStyle = this.isDragging ? '#FFD85A' : 'rgba(255,255,255,0.85)';
      this.ctx.lineWidth = this.isDragging ? 3 : 2;
      this.ctx.beginPath();
      this.ctx.arc(x, y, fruit.radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // 拖动阴影与高光
    if (this.isDragging) {
      this.ctx.save();
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      this.ctx.shadowBlur = 12;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 6;
      // 用一个透明填充触发阴影渲染
      this.ctx.beginPath();
      this.ctx.arc(x, y + fruit.radius * 0.6, fruit.radius * 0.85, 0, Math.PI * 2);
      this.ctx.globalAlpha = 0.22;
      this.ctx.fillStyle = '#000';
      this.ctx.fill();
      this.ctx.restore();
    }

    // 对齐参考线（提升定位感）：仅拖动时显示，且方法存在再绘制
    if (this.isDragging && typeof this.ctx.beginPath === 'function' && typeof this.ctx.moveTo === 'function' && typeof this.ctx.lineTo === 'function' && typeof this.ctx.stroke === 'function') {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      if (typeof this.ctx.setLineDash === 'function') {
        this.ctx.setLineDash([5, 6]);
      }
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
      if (typeof this.ctx.setLineDash === 'function') {
        this.ctx.setLineDash([]);
      }
    }

    this.ctx.restore();
  }

  // 渲染确认对话框
  renderConfirmDialog() {
    if (!this.confirmDialog || !this.confirmDialog.visible) return;

    const dialog = this.confirmDialog;
    this.ctx.save();

    // 绘制半透明背景遮罩
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 简约大方的对话框设计
    const cornerRadius = 12;
    
    // 绘制对话框背景（纯白色，简洁）
    this.ctx.fillStyle = '#ffffff';
    this.roundRect(dialog.x, dialog.y, dialog.width, dialog.height, cornerRadius);
    this.ctx.fill();
    
    // 极简边框
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // 标题和图标水平排列
    const titleY = dialog.y + 60;
    const titleText = '使用炸弹道具';
    
    // 测量文字宽度
    this.ctx.font = 'bold 20px Arial, sans-serif';
    const textWidth = this.ctx.measureText(titleText).width;
    const iconSize = 24;
    const spacing = 12;
    const totalWidth = iconSize + spacing + textWidth;
    
    // 计算起始位置（居中）
    const startX = dialog.x + (dialog.width - totalWidth) / 2;
    const iconX = startX + iconSize / 2;
    const textX = startX + iconSize + spacing;
    
    // 绘制炸弹图标（在文字左边）
    this.ctx.fillStyle = '#2c2c2c';
    this.ctx.beginPath();
    this.ctx.arc(iconX, titleY, iconSize/2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 炸弹引线
    this.ctx.strokeStyle = '#8d6e63';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(iconX - 8, titleY - 10);
    this.ctx.lineTo(iconX - 12, titleY - 16);
    this.ctx.stroke();
    
    // 火花
    this.ctx.fillStyle = '#ff9800';
    this.ctx.beginPath();
    this.ctx.arc(iconX - 12, titleY - 16, 2, 0, Math.PI * 2);
    this.ctx.fill();

    // 标题文字（在图标右边）
    this.ctx.fillStyle = '#333333';
    this.ctx.font = 'bold 20px Arial, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(titleText, textX, titleY);

    // 简洁消息文本
    this.ctx.fillStyle = '#666666';
    this.ctx.font = '16px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    const lines = dialog.message.split('\n');
    const lineHeight = 22;
    const startY = dialog.y + 100; // 调整消息文本位置，给标题留出更多空间
    
    lines.forEach((line, index) => {
      if (line.includes('每局只能使用一次')) {
        // 重要提示稍微突出
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.font = '14px Arial, sans-serif';
      } else {
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '16px Arial, sans-serif';
      }
      this.ctx.fillText(line, dialog.x + dialog.width / 2, startY + index * lineHeight);
    });

    // 极简按钮设计
    const confirmBtn = dialog.confirmBtn;
    const cancelBtn = dialog.cancelBtn;
    const btnRadius = 6;
    
    // 确认按钮（简洁实心）
    this.ctx.fillStyle = '#007AFF'; // iOS风格蓝色
    this.roundRect(confirmBtn.x, confirmBtn.y, confirmBtn.width, confirmBtn.height, btnRadius);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('确认', confirmBtn.x + confirmBtn.width / 2, confirmBtn.y + confirmBtn.height / 2);

    // 取消按钮（简洁边框）
    this.ctx.fillStyle = 'transparent';
    this.roundRect(cancelBtn.x, cancelBtn.y, cancelBtn.width, cancelBtn.height, btnRadius);
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#007AFF';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#007AFF';
    this.ctx.font = '16px Arial, sans-serif';
    this.ctx.fillText('取消', cancelBtn.x + cancelBtn.width / 2, cancelBtn.y + cancelBtn.height / 2);

    this.ctx.restore();
  }

  // 辅助方法：绘制圆角矩形
  roundRect(x, y, width, height, radius, topOnly = false, bottomOnly = false) {
    if (typeof this.ctx.beginPath !== 'function') return;
    
    this.ctx.beginPath();
    
    if (topOnly) {
      this.ctx.moveTo(x + radius, y);
      this.ctx.lineTo(x + width - radius, y);
      this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      this.ctx.lineTo(x + width, y + height);
      this.ctx.lineTo(x, y + height);
      this.ctx.lineTo(x, y + radius);
      this.ctx.quadraticCurveTo(x, y, x + radius, y);
    } else if (bottomOnly) {
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + width, y);
      this.ctx.lineTo(x + width, y + height - radius);
      this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      this.ctx.lineTo(x + radius, y + height);
      this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      this.ctx.lineTo(x, y);
    } else {
      this.ctx.moveTo(x + radius, y);
      this.ctx.lineTo(x + width - radius, y);
      this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      this.ctx.lineTo(x + width, y + height - radius);
      this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      this.ctx.lineTo(x + radius, y + height);
      this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      this.ctx.lineTo(x, y + radius);
      this.ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    
    this.ctx.closePath();
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
    // 计算动画进度
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const anim = this.gameOverAnim || {
      startTime: now,
      maskDurationMs: 300,
      panelDurationMs: 260,
      initialScale: 0.9,
      finalScale: 1.0,
      targetMaskAlpha: 0.6
    };
    const easeOutCubic = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
    const maskT = easeOutCubic((now - anim.startTime) / anim.maskDurationMs);
    const panelT = easeOutCubic((now - anim.startTime) / anim.panelDurationMs);
    const maskAlpha = (anim.targetMaskAlpha || 0.6) * maskT;
    const scale = (anim.initialScale || 0.9) + ((anim.finalScale || 1.0) - (anim.initialScale || 0.9)) * panelT;
    
    // 半透明遮罩（PRD：opacity 0.6）
    this.ctx.fillStyle = `rgba(0, 0, 0, ${maskAlpha.toFixed(3)})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // 水位线（在遮罩上方、面板下方）
    this.renderGameOverWaterline();
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // 白色圆角面板（PRD：宽0.8W，高0.4H，圆角20）
    const basePanelWidth = Math.floor(this.canvas.width * 0.8);
    const basePanelHeight = Math.floor(this.canvas.height * 0.4);
    const panelWidth = Math.floor(basePanelWidth * scale);
    const panelHeight = Math.floor(basePanelHeight * scale);
    const panelX = Math.floor(centerX - panelWidth / 2);
    const panelY = Math.floor(centerY - panelHeight / 2);
    const panelRadius = 20;

    // 阴影
    this.ctx.shadowColor = 'rgba(0,0,0,0.25)';
    this.ctx.shadowBlur = 16;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 6;

    // 卡片背景
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    if (typeof this.ctx.roundRect === 'function') {
      this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, panelRadius);
    } else {
      // 使用简单矩形代替圆角矩形
      this.ctx.rect(panelX, panelY, panelWidth, panelHeight);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    // 关闭阴影影响后续文本
    this.ctx.shadowBlur = 0;
    
    // 标题（去除文字阴影）
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#333333';
    this.ctx.font = 'bold 30px Arial, sans-serif';
    this.ctx.shadowColor = 'rgba(0,0,0,0)';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.fillText('游戏结束', centerX, panelY + 40);

    // 本次得分（大号红色数字，无阴影）
    this.ctx.fillStyle = '#E53E3E';
    this.ctx.font = 'bold 48px Arial, sans-serif';
    this.ctx.shadowColor = 'rgba(0,0,0,0)';
    this.ctx.shadowBlur = 0;
    this.ctx.fillText(String(this.score), centerX, panelY + 100);

    // 本局最高连击（次行展示，仅显示本局数据，无阴影）
    const isNewRecord = !!this.newRecordAchievedThisRun;
    const isNewComboRecord = !!this.newComboRecordAchievedThisRun;
    this.ctx.fillStyle = '#4A5568';
    this.ctx.font = '16px Arial, sans-serif';
    this.ctx.shadowColor = 'rgba(0,0,0,0)';
    this.ctx.shadowBlur = 0;
    this.ctx.fillText(`本局最高连击：${this.maxCombo || 0}`, centerX, panelY + 140);

    // 新纪录提示（分数/连击，无阴影）
    if (isNewRecord || isNewComboRecord) {
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = 'bold 18px Arial, sans-serif';
      this.ctx.shadowColor = 'rgba(0,0,0,0)';
      this.ctx.shadowBlur = 0;
      const tips = [
        isNewRecord ? '🎉 分数新纪录！' : null,
        isNewComboRecord ? '💥 连击新纪录！' : null
      ].filter(Boolean).join(' ');
      this.ctx.fillText(tips, centerX, panelY + 165);
    }

    // 重新开始按钮（增强样式）
    const buttonWidth = Math.floor(basePanelWidth * 0.45); // 点击区域按最终尺寸
    const buttonHeight = 52;
    const buttonX = centerX - buttonWidth / 2;
    const buttonY = (centerY + (panelHeight / 2)) - buttonHeight - 24;

    this.restartButton = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

    // 按钮渐变背景
    const buttonGradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
    buttonGradient.addColorStop(0, '#48BB78');
    buttonGradient.addColorStop(1, '#38A169');
    this.ctx.fillStyle = buttonGradient;
    
    // 按钮圆角
    this.ctx.beginPath();
    // 兼容不支持 roundRect 的环境
    if (typeof this.ctx.roundRect === 'function') {
      this.ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    } else {
      // 使用简单矩形代替圆角矩形
      this.ctx.rect(buttonX, buttonY, buttonWidth, buttonHeight);
    }
    this.ctx.closePath();
    this.ctx.fill();
    
    // 按钮边框
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // 按钮文字（去除阴影）
    this.ctx.font = 'bold 20px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    this.ctx.shadowBlur = 0;
    this.ctx.fillText('重新开始', centerX, buttonY + buttonHeight / 2);

    this.ctx.restore();
    
    // （V1.0）不渲染分享与排行榜按钮；保留点击区域逻辑为重启
    this.renderGameOverButtons(centerX, centerY);
  }

  // 渲染游戏结束按钮
  renderGameOverButtons(centerX, centerY) {
    // 需求变更：移除排行榜与分享按钮（不绘制，不设置点击区域）
    this.rankButton = null;
    this.shareButton = null;
  }

  // 在游戏结束界面绘制水位线（位于“下一个”标签底部）
  renderGameOverWaterline() {
    try {
      const labelY = 120 + 25 + 20 + 8; // 与 GameUI 的“下一个”标签对齐
      const leftX = 0;
      const rightX = this.canvas.width;
      const amplitude = 6;
      const wavelength = 60;
      this.ctx.save();
      // 背景水面填充
      const grad = this.ctx.createLinearGradient(0, labelY, 0, this.canvas.height);
      grad.addColorStop(0, 'rgba(64, 164, 223, 0.32)');
      grad.addColorStop(0.5, 'rgba(64, 164, 223, 0.18)');
      grad.addColorStop(1, 'rgba(64, 164, 223, 0.10)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.moveTo(leftX, this.canvas.height);
      this.ctx.lineTo(leftX, labelY);
      for (let x = leftX; x <= rightX; x += 8) {
        const dy = Math.sin(x / wavelength * Math.PI * 2) * amplitude;
        this.ctx.lineTo(x, labelY + dy);
      }
      this.ctx.lineTo(rightX, this.canvas.height);
      this.ctx.closePath();
      this.ctx.fill();
      // 波浪高光
      this.ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      for (let x = leftX; x <= rightX; x += 8) {
        const dy = Math.sin(x / wavelength * Math.PI * 2) * amplitude;
        if (x === leftX) this.ctx.moveTo(x, labelY + dy);
        else this.ctx.lineTo(x, labelY + dy);
      }
      this.ctx.stroke();
      // 次级蓝色波线
      this.ctx.strokeStyle = 'rgba(64,164,223,0.7)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      for (let x = leftX; x <= rightX; x += 8) {
        const dy = Math.sin((x + 12) / wavelength * Math.PI * 2) * amplitude * 0.6;
        if (x === leftX) this.ctx.moveTo(x, labelY + dy - 3);
        else this.ctx.lineTo(x, labelY + dy - 3);
      }
      this.ctx.stroke();
      this.ctx.restore();
    } catch (error) {
      console.warn('renderGameOverWaterline failed:', error);
    }
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
  
  // 新增：保存最高连击
  setHighCombo(combo) {
    if (combo > (this.highCombo || 0)) {
      this.highCombo = combo;
      this.saveHighCombo();
    }
  }

  // 新增：保存/加载最高连击
  saveHighCombo() {
    try {
      const storage = this._getStorageMethod();
      storage.setItem('fruitMergeZ_highCombo', (this.highCombo || 0).toString());
    } catch (e) {
      console.warn('Failed to save high combo:', e);
    }
  }
  
  loadHighCombo() {
    try {
      const storage = this._getStorageMethod();
      const saved = storage.getItem('fruitMergeZ_highCombo');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      console.warn('Failed to load high combo:', e);
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
    const message = `本地最高分: ${this.highScore}\n历史最高连击: ${this.highCombo || 0}\n本局最高连击: ${this.maxCombo || 0}\n游戏次数: ${gameData.totalGames || 1}`;
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

  // 处理确认对话框点击
  handleConfirmDialogClick(x, y) {
    if (!this.confirmDialog || !this.confirmDialog.visible) return;

    const dialog = this.confirmDialog;
    
    // 检查确认按钮
    if (x >= dialog.confirmBtn.x && x <= dialog.confirmBtn.x + dialog.confirmBtn.width &&
        y >= dialog.confirmBtn.y && y <= dialog.confirmBtn.y + dialog.confirmBtn.height) {
      audioManager.playSound('CLICK');
      
      // 根据对话框类型执行不同的操作
      if (dialog.type === 'bomb') {
        this.executeBombAction();
      } else {
        this.executePowerAction();
      }
      
      this.hideConfirmDialog();
      return;
    }
    
    // 检查取消按钮
    if (x >= dialog.cancelBtn.x && x <= dialog.cancelBtn.x + dialog.cancelBtn.width &&
        y >= dialog.cancelBtn.y && y <= dialog.cancelBtn.y + dialog.cancelBtn.height) {
      audioManager.playSound('CLICK');
      this.hideConfirmDialog();
      return;
    }
    
    // 点击对话框外部区域也取消
    if (x < dialog.x || x > dialog.x + dialog.width ||
        y < dialog.y || y > dialog.y + dialog.height) {
      this.hideConfirmDialog();
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

    // 创建预生成水果，确保游戏开始时就显示
    this.createPreviewFruit();

    console.log('Game started successfully - all drop states reset');
  }

  // 临时测试炸弹功能 - 直接调用炸弹功能
  testBombFunction() {
    console.log('[TEST] Triggering bomb function for testing...');
    if (!this.bombUsed) {
      this.executeBombAction();
      console.log('[TEST] Bomb function executed successfully!');
    } else {
      console.log('[TEST] Bomb already used in this session');
    }
  }
}