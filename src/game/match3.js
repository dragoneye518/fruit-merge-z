import { GAME_CONFIG, FRUIT_CONFIG, GAME_STATES } from '../config/constants.js';
import { audioManager } from '../managers/audioManager.js';
import { imageLoader } from '../utils/imageLoader.js';
import { FruitRenderer } from '../render/fruitRenderer.js';
import { ThreeFruit3DRenderer } from '../render/threeFruit3DRenderer.js';

// 网格三消主逻辑（抖音小游戏适配）
export class Match3Logic {
  constructor(canvas, effectSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.effectSystem = effectSystem;
    this.renderer = new FruitRenderer();
    // 可选三维渲染器（离屏WebGL -> 2D合成）
    this.threeRenderer = (typeof window !== 'undefined' && window.THREE)
      ? new ThreeFruit3DRenderer(canvas.width, canvas.height)
      : null;
    this.useThree = !!this.threeRenderer && ((GAME_CONFIG.RENDERER || 'canvas') === 'three');
    // 纹理映射缓存
    this.texturesByType = {};
    for (const [key, cfg] of Object.entries(FRUIT_CONFIG)) {
      if (cfg?.texture) this.texturesByType[key] = cfg.texture;
    }

    // 棋盘参数
    const M = GAME_CONFIG.GAMEPLAY.MATCH3;
    this.cols = M.cols;
    this.rows = M.rows;
    this.cellSize = M.cellSize;
    this.boardTop = M.boardTop;
    this.boardWidth = this.cols * this.cellSize;
    this.boardHeight = this.rows * this.cellSize;
    this.boardLeft = (GAME_CONFIG.CANVAS.width - this.boardWidth) / 2;

    // 数据结构
    this.grid = this.createEmptyGrid();
    // 初始填充棋盘，保证可玩性与视觉完整
    this.refillBoard();
    this.score = 0;
    this.highScore = this.loadHighScore();
    this.combo = 0;
    this.maxCombo = 0;
    this.gameState = GAME_STATES.PLAYING;
    this.comboTimer = 0;

    // 投放控制
    this.nextType = this.randomType();
    this.canDrop = true;
    this.dropCooldown = 0;

    // 交互与预览
    this.hoverCol = null;
    // 高亮缓动状态
    this.highlightAlpha = 0;     // 当前透明度
    this.highlightTargetAlpha = 0; // 目标透明度
    this.highlightEase = 0.15;   // 缓动速度（ease-in-out 近似）
    // 预览位置缓动
    this.previewX = null;        // 当前预览X
    this.previewTargetX = null;  // 目标预览X
    this.previewEase = 0.18;

    // 输入状态
    this.touchDown = false;

    // 模式
    this.mode = (GAME_CONFIG?.GAMEPLAY?.MODES?.default) || 'timed';
    this.timeLeft = (this.mode === 'timed') ? (GAME_CONFIG?.GAMEPLAY?.MODES?.timed?.durationSec || 120) : null;
  }

  // 基本数据管理
  setHighScore(val) { 
    this.highScore = val; 
  }

  // 获取最高分
  getHighScore() {
    try {
      // 抖音环境优先使用tt.getStorageSync
      if (typeof tt !== 'undefined' && tt.getStorageSync) {
        return Number(tt.getStorageSync('fruitMergeZ_highScore')) || 0;
      }
      // 浏览器环境使用localStorage
      if (typeof localStorage !== 'undefined') {
        return Number(localStorage.getItem('fruitMergeZ_highScore')) || 0;
      }
      return 0;
    } catch { 
      return 0; 
    }
  }

  // 保存最高分
  saveHighScore() {
    try {
      // 抖音环境优先使用tt.setStorageSync
      if (typeof tt !== 'undefined' && tt.setStorageSync) {
        tt.setStorageSync('fruitMergeZ_highScore', String(this.highScore));
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fruitMergeZ_highScore', String(this.highScore));
      }
    } catch {}
  }

  // 网格与生成
  createEmptyGrid() {
    return Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
  }
  randomType() {
    const types = GAME_CONFIG.GAMEPLAY.MATCH3.types;
    const P = GAME_CONFIG.GAMEPLAY.POWER_UPS || {};
    // 随机生成特殊道具（小概率）
    if (Math.random() < (P.bombChance || 0)) return 'BOMB';
    if (Math.random() < (P.rainbowChance || 0)) return 'RAINBOW';
    return types[Math.floor(Math.random() * types.length)];
  }

  // 事件绑定（由入口转发）
  handleTouchStart(x, y) {
    this.touchDown = true;
    this.hoverCol = this.columnFromX(x);
    // 进入高亮：设置目标透明度并更新目标X
    if (this.hoverCol !== null) {
      this.highlightTargetAlpha = 0.18;
      this.previewTargetX = this.boardLeft + this.hoverCol * this.cellSize + this.cellSize/2;
      if (this.previewX === null) this.previewX = this.previewTargetX;
    }
    const col = this.screenToColumn(x, y);
    if (col !== null) this.dropAtColumn(col);
  }
  handleTouchMove(x, y) {
    this.hoverCol = this.columnFromX(x);
    if (this.hoverCol !== null) {
      this.highlightTargetAlpha = 0.18;
      this.previewTargetX = this.boardLeft + this.hoverCol * this.cellSize + this.cellSize/2;
      if (this.previewX === null) this.previewX = this.previewTargetX;
    }
  }
  handleTouchEnd(x, y) {
    this.touchDown = false;
    const col = this.hoverCol ?? this.screenToColumn(x, y);
    if (col !== null) this.dropAtColumn(col);
    this.hoverCol = null;
    // 离开高亮：淡出
    this.highlightTargetAlpha = 0;
    // 保留最后的 previewX，稍后淡出；不强制重置位置
  }

  screenToColumn(x, y) {
    if (y < this.boardTop || y > this.boardTop + this.boardHeight) return null;
    const col = Math.floor((x - this.boardLeft) / this.cellSize);
    if (col < 0 || col >= this.cols) return null;
    return col;
  }

  columnFromX(x) {
    const col = Math.floor((x - this.boardLeft) / this.cellSize);
    if (col < 0 || col >= this.cols) return null;
    return col;
  }

  // 落子到列底
  dropAtColumn(col) {
    if (!this.canDrop) return;
    const row = this.findDropRow(col);
    if (row === -1) return; // 列满

    const type = this.nextType;
    // 新增：带下落动画的单元格
    const targetCy = this.boardTop + row * this.cellSize + this.cellSize / 2;
    const visualStartY = this.boardTop - 36; // 顶部起始
    this.grid[row][col] = { type, visualY: visualStartY, settleY: targetCy, settled: false };
    audioManager.playSound('DROP');
    this.nextType = this.randomType();

    // 特殊：炸弹立即爆炸清除周围
    if (type === 'BOMB') {
      const cleared = this.explodeAt(row, col, 1);
      if (cleared > 0) {
        audioManager.playSound('MERGE');
        this.applyGravity();
        this.refillBoard();
      }
    }

    // 投放冷却
    this.canDrop = false;
    this.dropCooldown = GAME_CONFIG.LIMITS.DROP_COOLDOWN;

    // 投放落地动效（简化的下落轨迹）
    const cx = this.boardLeft + col * this.cellSize + this.cellSize / 2;
    const dropCy = targetCy;
    if (this.effectSystem?.createDropTrail) {
      this.effectSystem.createDropTrail(cx, this.boardTop - 24, { });
    }

    // 放置后检测消除
    const eliminated = this.detectAndEliminate();
    if (eliminated > 0) {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.comboTimer = GAME_CONFIG.COMBO_DURATION;
      // 里程碑连击反馈
      if ([3,5,8].includes(this.combo) && this.effectSystem?.createComboEffect) {
        this.effectSystem.createComboEffect(this.boardLeft + this.boardWidth/2, this.boardTop - 32, this.combo, {});
      }
    } else {
      // 没有消除则重置连击计时
      this.comboTimer = 0;
      this.combo = 0;
    }
  }

  findDropRow(col) {
    for (let r = this.rows - 1; r >= 0; r--) {
      if (!this.grid[r][col]) return r;
    }
    return -1;
  }

  // 匹配与消除（四方向连通）
  detectAndEliminate() {
    const minMatch = GAME_CONFIG.GAMEPLAY.MATCH3.minMatch;
    const visited = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    let totalEliminated = 0;

    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const clusters = [];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (!cell || visited[r][c]) continue;
        // 彩虹不作为起点，避免选择基准类型的歧义
        if (cell.type === 'RAINBOW') continue;
        visited[r][c] = true;
        const type = cell.type;
        const queue = [[r,c]];
        const cluster = [[r,c]];
        while (queue.length) {
          const [cr, cc] = queue.shift();
          for (const [dr, dc] of dirs) {
            const nr = cr + dr, nc = cc + dc;
            if (nr>=0 && nr<this.rows && nc>=0 && nc<this.cols && !visited[nr][nc]) {
              const ncell = this.grid[nr][nc];
              if (ncell && (ncell.type === type || ncell.type === 'RAINBOW')) {
                visited[nr][nc] = true;
                queue.push([nr,nc]);
                cluster.push([nr,nc]);
              }
            }
          }
        }
        if (cluster.length >= minMatch) clusters.push({ type, cells: cluster });
      }
    }

    // 执行消除与加分、特效
    for (const cl of clusters) {
      const fruitScore = FRUIT_CONFIG[cl.type]?.score || 1;
      const base = fruitScore * cl.cells.length;
      const bonus = Math.floor(base * GAME_CONFIG.GAMEPLAY.MATCH3.scoreMultiplier);
      const total = base + bonus + (this.combo > 0 ? Math.floor(base * 0.25 * this.combo) : 0);
      this.addScore(total);

      for (const [r,c] of cl.cells) {
        const cx = this.boardLeft + c * this.cellSize + this.cellSize / 2;
        const cy = this.boardTop + r * this.cellSize + this.cellSize / 2;
        this.grid[r][c] = null;
        this.effectSystem.createEliminateEffect(cx, cy, cl.type, { score: fruitScore });
      }
      // 大团簇额外反馈：光环与屏震
      if (cl.cells.length >= 5) {
        const mid = cl.cells[Math.floor(cl.cells.length / 2)];
        const mx = this.boardLeft + mid[1] * this.cellSize + this.cellSize / 2;
        const my = this.boardTop + mid[0] * this.cellSize + this.cellSize / 2;
        if (this.effectSystem?.createRingEffect) {
          this.effectSystem.createRingEffect(mx, my, { startRadius: 12, endRadius: 60, life: 0.6, color: '#FFD54F', lineWidth: 3 });
        }
        if (this.effectSystem?.triggerScreenShake) {
          this.effectSystem.triggerScreenShake(6, 0.18);
        }
      }
      audioManager.playSound('MERGE');
      totalEliminated += cl.cells.length;
    }

    if (totalEliminated > 0) {
      // 下落与补充
      this.applyGravity();
      this.refillBoard();
      // 连锁检测
      totalEliminated += this.detectAndEliminate();
    }

    return totalEliminated;
  }

  // 炸弹爆炸：清除以(r,c)为中心的曼哈顿半径radius范围（含对角）
  explodeAt(r, c, radius = 1) {
    let cleared = 0;
    for (let rr = r - radius; rr <= r + radius; rr++) {
      for (let cc = c - radius; cc <= c + radius; cc++) {
        if (rr<0||rr>=this.rows||cc<0||cc>=this.cols) continue;
        const cell = this.grid[rr][cc];
        if (!cell) continue;
        const cx = this.boardLeft + cc * this.cellSize + this.cellSize/2;
        const cy = this.boardTop + rr * this.cellSize + this.cellSize/2;
        this.grid[rr][cc] = null;
        cleared++;
        if (this.effectSystem?.createRingEffect) {
          this.effectSystem.createRingEffect(cx, cy, { startRadius: 8, endRadius: 48, life: 0.4, color: '#FF7043', lineWidth: 2 });
        }
      }
    }
    if (cleared > 0 && this.effectSystem?.triggerScreenShake) {
      this.effectSystem.triggerScreenShake(8, 0.2);
    }
    this.addScore(cleared * 2);
    return cleared;
  }

  applyGravity() {
    for (let c = 0; c < this.cols; c++) {
      let writeRow = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c]) {
          const cell = this.grid[r][c];
          if (writeRow !== r) {
            this.grid[writeRow][c] = cell;
            this.grid[r][c] = null;
            // 视觉下落目标更新
            const cy = this.boardTop + writeRow * this.cellSize + this.cellSize / 2;
            cell.settleY = cy;
          }
          writeRow--;
        }
      }
    }
  }

  refillBoard() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c]) {
          this.grid[r][c] = { type: this.randomType() };
        }
      }
    }
  }

  addScore(v) {
    this.score += v;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
  }

  // 生命周期
  start() {}
  restart() {
    this.grid = this.createEmptyGrid();
    this.score = 0;
    this.combo = 0;
    this.nextType = this.randomType();
  }

  update(currentTime) {
    // 连击计时
    if (this.comboTimer > 0) {
      this.comboTimer -= 1/60; // 入口按帧循环，这里用近似
      if (this.comboTimer <= 0) this.combo = 0;
    }
    // 投放冷却
    if (!this.canDrop) {
      this.dropCooldown -= 1/60;
      if (this.dropCooldown <= 0) this.canDrop = true;
    }

    // 高亮透明度缓动（ease-in-out 近似，使用指数逼近）
    this.highlightAlpha += (this.highlightTargetAlpha - this.highlightAlpha) * this.highlightEase;
    // 预览位置缓动
    if (this.previewTargetX !== null && this.previewX !== null) {
      this.previewX += (this.previewTargetX - this.previewX) * this.previewEase;
    }

    // 单元下落动画：按目标位置趋近，带轻微弹性
    const settleSpeed = 0.25;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (!cell) continue;
        const targetY = this.boardTop + r * this.cellSize + this.cellSize / 2;
        if (cell.visualY === undefined) cell.visualY = targetY;
        cell.settleY = targetY;
        const dy = targetY - cell.visualY;
        cell.visualY += dy * settleSpeed;
        if (Math.abs(dy) < 0.5) {
          cell.visualY = targetY;
          cell.settled = true;
        } else {
          cell.settled = false;
        }
      }
    }

    // 限时模式计时
    if (this.mode === 'timed' && this.timeLeft !== null && this.gameState === GAME_STATES.PLAYING) {
      this.timeLeft -= 1/60;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.gameState = GAME_STATES.GAME_OVER;
      }
    }

    // 3D动效时间推进
    if (this.useThree && this.threeRenderer) {
      this.threeRenderer.tick(16);
    }
  }

  render() {
    const ctx = this.ctx;
    // 背景
    ctx.save();
    ctx.fillStyle = '#FFF5D6';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 棋盘背景
    ctx.fillStyle = '#FDE6A8';
    ctx.fillRect(this.boardLeft, this.boardTop, this.boardWidth, this.boardHeight);

    // 画网格
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    for (let r = 0; r <= this.rows; r++) {
      const y = this.boardTop + r * this.cellSize;
      ctx.beginPath(); ctx.moveTo(this.boardLeft, y); ctx.lineTo(this.boardLeft + this.boardWidth, y); ctx.stroke();
    }
    for (let c = 0; c <= this.cols; c++) {
      const x = this.boardLeft + c * this.cellSize;
      ctx.beginPath(); ctx.moveTo(x, this.boardTop); ctx.lineTo(x, this.boardTop + this.boardHeight); ctx.stroke();
    }

    // 高亮当前列（柔性入出场）
    if (this.hoverCol !== null || this.highlightAlpha > 0.01) {
      const col = this.hoverCol ?? Math.max(
        0,
        Math.min(
          this.cols - 1,
          Math.floor(((this.previewX ?? (this.boardLeft + this.boardWidth / 2)) - this.boardLeft) / this.cellSize)
        )
      );
      const x = this.boardLeft + col * this.cellSize;
      ctx.fillStyle = `rgba(255,107,53,${Math.max(0, Math.min(0.22, this.highlightAlpha))})`;
      ctx.fillRect(x, this.boardTop, this.cellSize, this.boardHeight);
    }

    // 画水果（3D 或 2D）
    if (this.useThree && this.threeRenderer?.enabled) {
      // 用三维离屏渲染后合成到2D画布
      // 注意：renderGrid为异步加载纹理，首帧可能为空，随后会逐步贴图
      // 为避免每帧await阻塞，这里简单处理：触发渲染并在完成后绘制拷贝
      // 在小型项目可接受；后续可引入更完善的管线
      const promise = this.threeRenderer.renderGrid(this.grid, {
        boardLeft: this.boardLeft,
        boardTop: this.boardTop,
        cellSize: this.cellSize,
        texturesByType: this.texturesByType
      });
      if (promise && typeof promise.then === 'function') {
        promise.then((threeCanvas) => {
          if (threeCanvas) ctx.drawImage(threeCanvas, 0, 0);
        });
      }
    } else {
      // 2D拟真渲染
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const cell = this.grid[r][c];
          if (!cell) continue;
          const type = cell.type;
          const cx = this.boardLeft + c * this.cellSize + this.cellSize / 2;
          const cy = (cell.visualY !== undefined) ? cell.visualY : (this.boardTop + r * this.cellSize + this.cellSize / 2);
          const imgSrc = FRUIT_CONFIG[type]?.texture;
          const img = imgSrc && imageLoader.getImage(imgSrc);
          this.renderer.renderFruit(ctx, type, cx, cy, this.cellSize, img);
        }
      }
    }

    // 绘制分数与连击
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`分数 ${this.score}`, 12, 24);
    ctx.fillText(`最高 ${this.highScore}`, 12, 46);
    if (this.combo > 1) {
      ctx.fillStyle = '#FF6B35';
      ctx.fillText(`连击 x${this.combo}`, 12, 68);
    }

    // 预览下一个水果
    ctx.textAlign = 'right';
    ctx.fillStyle = '#555';
    // 右上 HUD：下一个与计时
    ctx.fillText('下一个', this.canvas.width - 16, 24);
    if (this.mode === 'timed') {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#333';
      const t = Math.ceil(this.timeLeft || 0);
      ctx.fillText(`时间 ${t}s`, 12, 88);
    }
    const previewX = this.canvas.width - 20;
    const previewY = 50;
    const imgSrc = FRUIT_CONFIG[this.nextType]?.texture;
    const img = imgSrc && imageLoader.getImage(imgSrc);
    this.renderer.renderFruit(ctx, this.nextType, previewX, previewY, 36, img);

    // 顶部悬停预览（跟随并缓动）
    if ((this.hoverCol !== null || this.highlightAlpha > 0.01) && this.previewX !== null) {
      const gy = this.boardTop - 20;
      this.renderer.renderFruit(ctx, this.nextType, this.previewX, gy, 36, img);
    }

    ctx.restore();
  }
}

export default Match3Logic;