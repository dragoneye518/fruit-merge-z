import { GAME_CONFIG, FRUIT_CONFIG, GAME_STATES } from '../config/constants.js';
import { audioManager } from '../managers/audioManager.js';
import { imageLoader } from '../utils/imageLoader.js';
import { FruitRenderer } from '../render/fruitRenderer.js';

// 俄罗斯方块式水果堆叠与消行
export class TetrisGame {
  constructor(canvas, effectSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.effectSystem = effectSystem;
    this.renderer = new FruitRenderer();

    const T = GAME_CONFIG.TETRIS;
    this.cols = T.cols;
    this.rows = T.rows;
    this.cellSize = T.cellSize;
    this.boardTop = T.boardTop;
    this.boardWidth = this.cols * this.cellSize;
    this.boardHeight = this.rows * this.cellSize;
    this.boardLeft = (GAME_CONFIG.CANVAS.width - this.boardWidth) / 2;

    this.grid = this.createEmptyGrid();
    this.score = 0;
    this.level = 1;
    this.totalCleared = 0;
    this.gameState = GAME_STATES.PLAYING;
    this.dropTimer = 0;
    this.baseGravity = T.gravityCellsPerSec;
    this.gravityInc = T.gravityIncPerLevel || 0.3;
    this.maxGravity = T.maxGravity || (this.baseGravity * 3);
    this.gravity = this.baseGravity;
    this.lockDelay = T.lockDelaySec;
    this.lockTimer = 0;
    this.isFastDropping = false;
    this.linesPerLevel = T.linesPerLevel || 10;
    this.lastTime = 0;
    this.restartButton = null;

    // 当前与下一个块
    this.currentPiece = null;
    this.nextType = this.randomType();
    this.spawnPiece();

    // 输入状态
    this.touchDown = false;
    this.hoverCol = null;
  }

  createEmptyGrid() {
    return Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
  }
  randomType() {
    const types = GAME_CONFIG.GAMEPLAY.MATCH3.types; // 复用十种水果列表
    return types[Math.floor(Math.random() * types.length)];
  }

  getPieceShape(type) {
    const raw = GAME_CONFIG.TETRIS.pieceMap[type] || [[1]];
    // 规范化为矩阵
    return raw.map(row => row.slice());
  }

  spawnPiece() {
    const type = this.nextType;
    const shape = this.getPieceShape(type);
    const w = shape[0].length;
    const h = shape.length;
    const x = Math.floor((this.cols - w) / 2);
    const y = -h; // 从棋盘上方进入
    this.currentPiece = { type, shape, x, y };
    this.nextType = this.randomType();
    this.dropTimer = 0;
    this.lockTimer = 0;
  }

  // 碰撞检测
  collides(px, py, shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const gx = px + c;
        const gy = py + r;
        if (gy >= this.rows) return true; // 触底
        if (gx < 0 || gx >= this.cols) return true; // 越界
        if (gy >= 0 && this.grid[gy][gx]) return true; // 触碰占用
      }
    }
    return false;
  }

  // 锁定当前块到网格
  lockPiece() {
    const { type, shape, x, y } = this.currentPiece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const gy = y + r;
        const gx = x + c;
        if (gy >= 0) this.grid[gy][gx] = { type };
      }
    }
    audioManager.playSound('DROP');
    this.clearLines();
    this.spawnPiece();
    // 失败判定：新块一生成就碰撞
    if (this.collides(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
      this.gameState = GAME_STATES.GAME_OVER;
      audioManager.playSound('GAME_OVER');
    }
  }

  // 消行：满行清除并加分
  clearLines() {
    let cleared = 0;
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.grid[r].every(cell => !!cell)) {
        // 删除该行并在顶部插入空行
        this.grid.splice(r, 1);
        this.grid.unshift(Array(this.cols).fill(null));
        cleared++;
        r++; // 继续检查当前索引（已是新行）
      }
    }
    if (cleared > 0) {
      const base = 100;
      const bonus = [0, 100, 300, 600, 1000][cleared] || (cleared * 300);
      this.score += base + bonus;
      // 等级与速度提升
      this.totalCleared += cleared;
      const newLevel = Math.floor(this.totalCleared / this.linesPerLevel) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        this.gravity = Math.min(this.baseGravity + (this.level - 1) * this.gravityInc, this.maxGravity);
      }
      if (this.effectSystem?.triggerScreenShake) this.effectSystem.triggerScreenShake(4 + cleared * 2, 0.15);
      audioManager.playSound('MERGE');
    }
  }

  // 输入（移动到列）
  handleTouchStart(x, y) {
    this.touchDown = true;
    const col = this.columnFromX(x);
    if (col !== null) this.movePieceToColumn(col);
  }
  handleTouchMove(x, y) {
    const col = this.columnFromX(x);
    if (col !== null) this.movePieceToColumn(col);
  }
  handleTouchEnd(x, y) {
    this.touchDown = false;
    // 游戏结束时，检测是否点击了重开按钮
    if (this.gameState === GAME_STATES.GAME_OVER && this.restartButton) {
      const b = this.restartButton;
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
        this.restart();
        audioManager.playSound('BUTTON_CLICK');
        return;
      }
    }
    // 轻触结束触发快速下落
    this.isFastDropping = true;
  }
  columnFromX(x) {
    const col = Math.floor((x - this.boardLeft) / this.cellSize);
    if (col < 0 || col >= this.cols) return null;
    return col;
  }
  movePieceToColumn(col) {
    const { shape } = this.currentPiece;
    const w = shape[0].length;
    const targetX = Math.max(0, Math.min(this.cols - w, col));
    // 只改变x，不允许越界
    this.currentPiece.x = targetX;
  }

  // 更新（与入口时间戳兼容）
  update(currentTime) {
    if (this.gameState !== GAME_STATES.PLAYING) return;
    if (this.lastTime === 0) this.lastTime = currentTime;
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    this.dropTimer += dt;
    const step = 1 / this.gravity;
    while (this.dropTimer >= step) {
      this.dropTimer -= step;
      // 尝试下移一格（若快速下落则连续推进直到落地）
      if (this.isFastDropping) {
        const ny = this.currentPiece.y + 1;
        if (!this.collides(this.currentPiece.x, ny, this.currentPiece.shape)) {
          this.currentPiece.y = ny;
        } else {
          this.lockPiece();
          this.isFastDropping = false;
          break;
        }
      } else {
        const ny = this.currentPiece.y + 1;
        if (!this.collides(this.currentPiece.x, ny, this.currentPiece.shape)) {
          this.currentPiece.y = ny;
          this.lockTimer = 0;
        } else {
          // 叠在地面上，开始锁定计时
          this.lockTimer += step;
          if (this.lockTimer >= this.lockDelay) {
            this.lockPiece();
          }
        }
      }
    }
  }

  // 渲染
  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#FFF5D6';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 棋盘背景
    ctx.fillStyle = '#FDE6A8';
    ctx.fillRect(this.boardLeft, this.boardTop, this.boardWidth, this.boardHeight);

    // 网格
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    for (let r = 0; r <= this.rows; r++) {
      const y = this.boardTop + r * this.cellSize;
      ctx.beginPath(); ctx.moveTo(this.boardLeft, y); ctx.lineTo(this.boardLeft + this.boardWidth, y); ctx.stroke();
    }
    for (let c = 0; c <= this.cols; c++) {
      const x = this.boardLeft + c * this.cellSize;
      ctx.beginPath(); ctx.moveTo(x, this.boardTop); ctx.lineTo(x, this.boardTop + this.boardHeight); ctx.stroke();
    }

    // 画已锁定的水果
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (!cell) continue;
        const type = cell.type;
        const cx = this.boardLeft + c * this.cellSize + this.cellSize / 2;
        const cy = this.boardTop + r * this.cellSize + this.cellSize / 2;
        const imgSrc = FRUIT_CONFIG[type]?.texture;
        const img = imgSrc && imageLoader.getImage(imgSrc);
        this.renderer.renderFruit(ctx, type, cx, cy, this.cellSize, img);
      }
    }

    // 画正在下落的水果块
    if (this.currentPiece) {
      const { type, shape, x, y } = this.currentPiece;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const gx = x + c;
          const gy = y + r;
          const cx = this.boardLeft + gx * this.cellSize + this.cellSize / 2;
          const cy = this.boardTop + gy * this.cellSize + this.cellSize / 2;
          const imgSrc = FRUIT_CONFIG[type]?.texture;
          const img = imgSrc && imageLoader.getImage(imgSrc);
          this.renderer.renderFruit(ctx, type, cx, cy, this.cellSize, img);
        }
      }
    }

    // HUD：分数与下一个
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText(`分数 ${this.score}  等级 ${this.level}`, 12, 24);
    ctx.textAlign = 'right';
    ctx.fillText('下一个', this.canvas.width - 16, 24);
    // 右上角预览下一个块（简化只画一个水果）
    const nx = this.canvas.width - 40;
    const ny = 50;
    const imgSrc = FRUIT_CONFIG[this.nextType]?.texture;
    const img = imgSrc && imageLoader.getImage(imgSrc);
    this.renderer.renderFruit(ctx, this.nextType, nx, ny, this.cellSize, img);

    // 游戏结束覆盖与重开按钮
    if (this.gameState === GAME_STATES.GAME_OVER) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 40);
      const bw = 180, bh = 48;
      const bx = (this.canvas.width - bw) / 2;
      const by = this.canvas.height / 2;
      ctx.fillStyle = '#FF6B53';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('点击重开', this.canvas.width / 2, by + bh / 2 + 6);
      this.restartButton = { x: bx, y: by, width: bw, height: bh };
      ctx.restore();
    } else {
      this.restartButton = null;
    }

    ctx.restore();
  }
  // 启动（与入口保持一致，避免缺少start方法）
  start() {
    this.lastTime = performance.now();
  }

  // 重新开始
  restart() {
    this.grid = this.createEmptyGrid();
    this.score = 0;
    this.level = 1;
    this.totalCleared = 0;
    this.gravity = this.baseGravity;
    this.lockTimer = 0;
    this.dropTimer = 0;
    this.gameState = GAME_STATES.PLAYING;
    this.nextType = this.randomType();
    this.spawnPiece();
  }
}

export default TetrisGame;