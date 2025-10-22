import { UI_THEME, GAME_CONFIG, FRUIT_CONFIG, GAME_STATES, RENDER_TUNING } from '../config/constants.js';
import { imageLoader } from '../utils/imageLoader.js';

export class GameUI {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    
    // UI状态
    this.score = 0;
    this.highScore = 0;
    this.nextFruitType = 'CHERRY';
    this.gameState = GAME_STATES.PLAYING;
    this.dangerLineFlash = false;
    this.flashTimer = 0;
    // 连击状态
    this.combo = 0;
    this.highCombo = 0;
    this.runMaxCombo = 0;
    
    // 动画相关
    this.scoreAnimation = {
      current: 0,
      target: 0,
      speed: 0.1
    };
    
    // 按钮区域
    this.buttons = {
      power: { x: 12, y: 12, width: 40, height: 40, disabled: false }
    };
    
    // 触摸状态
    this.touchState = {
      isDown: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    };
  }

  reset() {
    this.dangerLineFlash = false;
    this.flashTimer = 0;
    this.scoreAnimation.current = 0;
    this.scoreAnimation.target = 0;
    // 重置连击显示但保留历史最高连击
    this.combo = 0;
    this.runMaxCombo = 0;
  }
  
  // 更新UI状态
  update(deltaTime) {
    // 更新分数动画
    if (this.scoreAnimation.current < this.scoreAnimation.target) {
      const diff = this.scoreAnimation.target - this.scoreAnimation.current;
      this.scoreAnimation.current += diff * this.scoreAnimation.speed;
      
      if (Math.abs(diff) < 1) {
        this.scoreAnimation.current = this.scoreAnimation.target;
      }
    }
    
    // 更新危险线闪烁
    this.flashTimer += deltaTime;
    if (this.flashTimer >= GAME_CONFIG.DANGER_LINE.flashDuration) {
      this.flashTimer = 0;
      if (this.dangerLineFlash) {
        this.dangerLineFlash = !this.dangerLineFlash;
      }
    }
  }
  
  // 渲染完整UI
  render() {
    this.renderBackground();
    // 改为屏幕底部整幅草地，无圆容器
    this.renderGrassWorldBottom();
    this.renderHeader();
    this.renderDropPreview();
    this.renderDangerLine();
    this.renderNextFruitPreview();
    this.renderButtons();
  }
  
  // 渲染背景（简化版本）
  renderBackground() {
    // 简单的背景渐变
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#FFE0B2');
    gradient.addColorStop(1, '#FFCC80');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
  
  // 渲染背景图案
  renderBackgroundPattern() {
    this.ctx.save();
    this.ctx.globalAlpha = 0.08;
    
    // 绘制水果忍者风格的装饰元素
    const time = Date.now() * 0.0005;
    
    // 绘制旋转的水果轮廓
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time;
      const x = this.width * 0.5 + Math.cos(angle) * 120;
      const y = this.height * 0.4 + Math.sin(angle) * 80;
      const size = 20 + Math.sin(time * 2 + i) * 5;
      
      this.ctx.fillStyle = i % 2 === 0 ? '#FF6B35' : '#4ECDC4';
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // 绘制忍者刀光效果
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 3;
    this.ctx.globalAlpha = 0.15;
    
    for (let i = 0; i < 3; i++) {
      const slashAngle = time * 0.5 + i * Math.PI * 0.7;
      const centerX = this.width * (0.2 + i * 0.3);
      const centerY = this.height * (0.3 + i * 0.2);
      const length = 60;
      
      this.ctx.beginPath();
      this.ctx.moveTo(
        centerX - Math.cos(slashAngle) * length,
        centerY - Math.sin(slashAngle) * length
      );
      this.ctx.lineTo(
        centerX + Math.cos(slashAngle) * length,
        centerY + Math.sin(slashAngle) * length
      );
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  // 渲染动态光影效果
  renderDynamicLighting(time) {
    this.ctx.save();
    
    // 主光源效果
    const lightX = this.width * (0.5 + Math.sin(time * 0.3) * 0.2);
    const lightY = this.height * (0.3 + Math.cos(time * 0.2) * 0.1);
    
    const lightGradient = this.ctx.createRadialGradient(
      lightX, lightY, 0,
      lightX, lightY, 200
    );
    lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    lightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
    lightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.ctx.fillStyle = lightGradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // 次光源效果
    const light2X = this.width * (0.8 + Math.cos(time * 0.4) * 0.1);
    const light2Y = this.height * (0.7 + Math.sin(time * 0.3) * 0.1);
    
    const light2Gradient = this.ctx.createRadialGradient(
      light2X, light2Y, 0,
      light2X, light2Y, 150
    );
    light2Gradient.addColorStop(0, 'rgba(255, 193, 7, 0.12)');
    light2Gradient.addColorStop(0.6, 'rgba(255, 193, 7, 0.06)');
    light2Gradient.addColorStop(1, 'rgba(255, 193, 7, 0)');
    
    this.ctx.fillStyle = light2Gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.restore();
  }

  // 渲染飘落的叶子效果
  renderFloatingLeaves(time) {
    this.ctx.save();
    
    // 初始化叶子数据（如果不存在）
    if (!this.floatingLeaves) {
      this.floatingLeaves = [];
      for (let i = 0; i < 12; i++) {
        this.floatingLeaves.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: 8 + Math.random() * 12,
          rotation: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 1.5,
          swayAmplitude: 20 + Math.random() * 30,
          swayFreq: 0.5 + Math.random() * 1.0
        });
      }
    }
    
    // 更新和绘制叶子
    this.ctx.globalAlpha = 0.3;
    
    this.floatingLeaves.forEach((leaf, index) => {
      // 更新位置
      leaf.y += leaf.speed;
      leaf.x += Math.sin(time * leaf.swayFreq + index) * 0.5;
      leaf.rotation += 0.02;
      
      // 重置超出屏幕的叶子
      if (leaf.y > this.height + leaf.size) {
        leaf.y = -leaf.size;
        leaf.x = Math.random() * this.width;
      }
      
      // 绘制叶子
      this.ctx.save();
      this.ctx.translate(leaf.x, leaf.y);
      this.ctx.rotate(leaf.rotation);
      
      // 叶子形状
      this.ctx.fillStyle = index % 3 === 0 ? '#4CAF50' : 
                          index % 3 === 1 ? '#66BB6A' : '#81C784';
      
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, leaf.size * 0.6, leaf.size, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 叶子纹理
      this.ctx.strokeStyle = '#2E7D32';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -leaf.size);
      this.ctx.lineTo(0, leaf.size);
      this.ctx.stroke();
      
      this.ctx.restore();
    });
    
    this.ctx.restore();
  }
  
  // 废弃圆容器，改为渲染屏幕底部草地
  renderGrassWorldBottom() {
    const groundHeight = GAME_CONFIG?.GROUND?.height ?? 28;
    const groundTopY = this.height - groundHeight;
    const left = 0;
    const right = this.width;

    this.ctx.save();
    // 草地主体（柔和绿渐变）
    const grad = this.ctx.createLinearGradient(0, groundTopY, 0, groundTopY + groundHeight);
    grad.addColorStop(0, '#A7E56B');
    grad.addColorStop(1, '#6CC74C');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(left, groundTopY, right - left, groundHeight);

    // 草地顶边高光（强调“平”的视觉）
    this.ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    // 与物理地面严格对齐，避免视觉上的缝隙
    this.ctx.moveTo(left + 6, groundTopY);
    this.ctx.lineTo(right - 6, groundTopY);
    this.ctx.stroke();

    // 简单草叶（少量，避免杂乱）
    this.ctx.strokeStyle = 'rgba(60,140,60,0.8)';
    this.ctx.lineWidth = 1.5;
    const blades = 22;
    for (let i = 0; i < blades; i++) {
      const x = left + (i + 0.3 + Math.random() * 0.4) * (right - left) / blades;
      const h = 8 + Math.random() * 6;
      this.ctx.beginPath();
      this.ctx.moveTo(x, groundTopY + groundHeight - 2);
      this.ctx.quadraticCurveTo(x - 2, groundTopY + groundHeight - 6, x, groundTopY + groundHeight - h);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  // 贴近截图风格：在容器内添加上下两个装饰圆圈
  renderDecorativeCircles() {
    const { centerX, centerY, radius } = GAME_CONFIG.GAME_AREA;
    const ringRadius = radius * 0.32;
    const offsetY = radius * 0.55;
    
    const drawRing = (x, y) => {
      this.ctx.save();
      // 背景白色圆
      this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 灰色内圈
      this.ctx.strokeStyle = 'rgba(120,120,120,0.6)';
      this.ctx.lineWidth = Math.max(3, ringRadius * 0.12);
      this.ctx.stroke();
      
      // 轻微阴影
      this.ctx.shadowColor = 'rgba(0,0,0,0.15)';
      this.ctx.shadowBlur = 6;
      this.ctx.shadowOffsetY = 2;
      this.ctx.beginPath();
      this.ctx.arc(x, y, ringRadius * 0.9, 0, Math.PI * 2);
      this.ctx.stroke();
      
      this.ctx.restore();
    };
    
    drawRing(centerX, centerY - offsetY);
    drawRing(centerX, centerY + offsetY);
  }
  
  // 渲染头部信息
  renderHeader() {
    // 渲染游戏标题
    this.renderTitle();
    
    // 渲染分数
    this.renderScore();
  }
  
  // 渲染游戏标题
  renderTitle() {
    this.ctx.save();
    
    // 标题文字
    this.ctx.font = 'bold 36px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // 标题外层阴影
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 4;
    
    // 标题描边 - 外层
    this.ctx.strokeStyle = '#8B4513';
    this.ctx.lineWidth = 4;
    this.ctx.strokeText('合成新水果', this.width / 2, 70);
    
    // 标题描边 - 内层
    this.ctx.strokeStyle = '#D2691E';
    this.ctx.lineWidth = 2;
    this.ctx.strokeText('合成新水果', this.width / 2, 70);
    
    // 标题渐变填充
    const titleGradient = this.ctx.createLinearGradient(0, 50, 0, 90);
    titleGradient.addColorStop(0, '#FFD700');
    titleGradient.addColorStop(0.3, '#FFA500');
    titleGradient.addColorStop(0.7, '#FF8C00');
    titleGradient.addColorStop(1, '#FF6347');
    
    this.ctx.shadowColor = 'transparent';
    this.ctx.fillStyle = titleGradient;
    this.ctx.fillText('合成新水果', this.width / 2, 70);
    
    // 标题高光效果
    const highlightGradient = this.ctx.createLinearGradient(0, 50, 0, 65);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    
    this.ctx.fillStyle = highlightGradient;
    this.ctx.fillText('合成新水果', this.width / 2, 68);
    
    this.ctx.restore();
  }
  
  // 渲染分数
  renderScore() {
    this.ctx.save();
    
    const displayScore = Math.floor(this.scoreAnimation.current);
    
    // 分数背景
    const scoreX = this.width / 2;
    const scoreY = 120;
    const scorePadding = 25;
    
    this.ctx.font = 'bold 32px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    const scoreText = displayScore.toString();
    const textMetrics = this.ctx.measureText(scoreText);
    const bgWidth = Math.max(textMetrics.width + scorePadding * 2, 120);
    const bgHeight = 50;
    
    // 绘制分数背景 - 增加多层阴影效果
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    this.ctx.shadowBlur = 5;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 4;
    
    // 外层阴影
    const outerGradient = this.ctx.createLinearGradient(
      scoreX - bgWidth/2 - 2, scoreY - bgHeight/2 - 2,
      scoreX + bgWidth/2 + 2, scoreY + bgHeight/2 + 2
    );
    outerGradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
    outerGradient.addColorStop(0.5, 'rgba(255, 193, 7, 0.65)');
    outerGradient.addColorStop(1, 'rgba(255, 152, 0, 0.6)');
    
    this.ctx.fillStyle = outerGradient;
    this.roundRect(scoreX - bgWidth/2 - 2, scoreY - bgHeight/2 - 2, bgWidth + 4, bgHeight + 4, 20);
    this.ctx.fill();
    
    // 主背景
    const bgGradient = this.ctx.createLinearGradient(
      scoreX - bgWidth/2, scoreY - bgHeight/2,
      scoreX + bgWidth/2, scoreY + bgHeight/2
    );
    bgGradient.addColorStop(0, '#FFF9E8');
    bgGradient.addColorStop(0.3, '#FFEFD0');
    bgGradient.addColorStop(0.7, '#FFDFA6');
    bgGradient.addColorStop(1, '#FFCC80');
    
    this.ctx.fillStyle = bgGradient;
    this.roundRect(scoreX - bgWidth/2, scoreY - bgHeight/2, bgWidth, bgHeight, 22);
    this.ctx.fill();
    
    // 内层高光
    const highlightGradient = this.ctx.createLinearGradient(
      scoreX - bgWidth/2, scoreY - bgHeight/2,
      scoreX + bgWidth/2, scoreY - bgHeight/2 + 15
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    
    this.ctx.fillStyle = highlightGradient;
    this.roundRect(scoreX - bgWidth/2, scoreY - bgHeight/2, bgWidth, 15, 22);
    this.ctx.fill();
    
    // 分数文字 - 增加文字阴影和描边
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 2;
    this.ctx.shadowOffsetX = 1;
    this.ctx.shadowOffsetY = 2;
    
    // 文字描边
    this.ctx.strokeStyle = '#A0522D';
    this.ctx.lineWidth = 2;
    this.ctx.textBaseline = 'middle';
    this.ctx.strokeText(scoreText, scoreX, scoreY);
    
    // 文字填充
    const textGradient = this.ctx.createLinearGradient(
      scoreX, scoreY - 16,
      scoreX, scoreY + 16
    );
    textGradient.addColorStop(0, '#FFFFFF');
    textGradient.addColorStop(0.5, '#FFF2D6');
    textGradient.addColorStop(1, '#FFE8A8');
    
    this.ctx.fillStyle = textGradient;
    this.ctx.fillText(scoreText, scoreX, scoreY);
    
    // 在当前分数右侧展示“本局最高连击”徽标，不增加行高
    this.ctx.shadowColor = 'rgba(0,0,0,0)';
    this.ctx.shadowBlur = 0;
    const scoreTextWidth = this.ctx.measureText(scoreText).width;
    const badgeX = scoreX + scoreTextWidth / 2 + scorePadding + 10;
    const badgeY = scoreY - 14; // 与分数垂直居中对齐
    const badgeText = `${Math.max(0, this.runMaxCombo || 0)}`;
    this.ctx.font = '12px Arial, sans-serif';
    const badgeW = Math.max(this.ctx.measureText(badgeText).width + 8, 32);
    const badgeH = 22;
    // 徽标背景（浅灰胶囊）
    // this.ctx.fillStyle = '#EDF2F7';
    // this.roundRect(badgeX - badgeW/2, badgeY+16, badgeW, badgeH, 11);
    // this.ctx.fill();
    // 徽标边框
    this.ctx.strokeStyle = '#CBD5E0';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    // 徽标文字
    this.ctx.fillStyle = '#2D3748';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(badgeText, badgeX  - badgeW/2, badgeY + badgeH / 2 + 16);

    // 恢复居中对齐，避免影响后续行的布局
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // 最高分显示 + 历史最高连击（保持原在分数下方一行，不再增加第三行）
    if (this.highScore > 0) {
      this.ctx.shadowColor = 'rgba(0,0,0,0)';
      this.ctx.shadowBlur = 0;
      this.ctx.font = 'bold 16px Arial, sans-serif';
      const highLineText = `最高: ${this.highScore}  |  连击: ${this.highCombo || 0}`;
      this.ctx.fillStyle = UI_THEME.text.secondary;
      this.ctx.fillText(highLineText, scoreX, scoreY + 35);
    }
    
    this.ctx.restore();
  }
  
  // 新增：渲染连击头部信息
  renderComboHeader() {
    const combo = Math.max(0, this.combo || 0);
    const high = Math.max(0, this.highCombo || 0);
    if (combo <= 0 && high <= 0) {
      // 开局无连击且最高为0时，不显示以减少视觉噪音
      return;
    }
    
    this.ctx.save();
    
    // 位置：居中，置于分数之上、标题之下
    const x = this.width / 2;
    const y = 80; // 保持与分数(120, 高50)有约3px以上安全间距
    const padding = 12;
    
    this.ctx.font = 'bold 18px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const text = `连击: ${combo}   最高: ${high}`;
    const metrics = this.ctx.measureText(text);
    const bgWidth = Math.max(metrics.width + padding * 2, 160);
    const bgHeight = 24;
    
    // 背景胶囊
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 2;
    
    const grad = this.ctx.createLinearGradient(
      x - bgWidth/2, y - bgHeight/2,
      x + bgWidth/2, y + bgHeight/2
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.75)');
    this.ctx.fillStyle = grad;
    this.roundRect(x - bgWidth/2, y - bgHeight/2, bgWidth, bgHeight, 14);
    this.ctx.fill();
    
    // 边框
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    // 文本
    this.ctx.shadowColor = 'transparent';
    this.ctx.fillStyle = UI_THEME.text.primary;
    this.ctx.fillText(text, x, y);
    
    // 高亮与图标（当有当前连击时显示）
    if (combo > 0) {
      this.ctx.font = '16px Arial, sans-serif';
      this.ctx.fillText('🔥', x - bgWidth/2 + 16, y);
      const highlight = this.ctx.createLinearGradient(
        x - bgWidth/2, y - bgHeight/2,
        x + bgWidth/2, y - bgHeight/2 + 8
      );
      highlight.addColorStop(0, 'rgba(255,255,255,0.35)');
      highlight.addColorStop(1, 'rgba(255,255,255,0.1)');
      this.ctx.fillStyle = highlight;
      this.roundRect(x - bgWidth/2 + 2, y - bgHeight/2 + 2, bgWidth - 4, 8, 12);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }
  
  // 渲染投放预览
  renderDropPreview() {
    if (!this.touchState.isDown) return;
    
    const baseRadius = FRUIT_CONFIG[this.nextFruitType].radius;
    const radiusScale = (GAME_CONFIG?.SIZE?.radiusScale || 1);
    const fruitRadius = Math.round(baseRadius * radiusScale);
    const x = this.touchState.currentX;
    const y = GAME_CONFIG.DROP_LINE_Y;
    
    this.ctx.save();
    // 贴图预览（半透明幽灵效果），无贴图时回退至渐变圆
    const texturePath = FRUIT_CONFIG[this.nextFruitType]?.texture;
    const img = texturePath ? imageLoader.getImage(texturePath) : null;
    if (img) {
      this.ctx.globalAlpha = 0.75;
      // 使用物理半径作为渲染半径，确保预览与实际一致
      const size = fruitRadius * 2;
      // 暂时禁用透明边距裁剪，确保预览与实际水果的视觉一致性
      // const bounds = imageLoader?.getOpaqueBounds ? imageLoader.getOpaqueBounds(texturePath) : null;
      // if (bounds && bounds.sw && bounds.sh) {
      //   this.ctx.drawImage(
      //     img,
      //     bounds.sx, bounds.sy, bounds.sw, bounds.sh,
      //     x - size / 2, y - size / 2, size, size
      //   );
      // } else {
        this.ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
      // }
      this.ctx.globalAlpha = 1.0;
    } else {
      const previewGrad = this.ctx.createRadialGradient(
        x - fruitRadius * 0.3, y - fruitRadius * 0.3, 0,
        x, y, fruitRadius
      );
      previewGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
      previewGrad.addColorStop(1, 'rgba(255,255,255,0.2)');
      this.ctx.fillStyle = previewGrad;
      this.ctx.beginPath();
      this.ctx.arc(x, y, fruitRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x, this.height);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.setLineDash([5, 5]);
    this.ctx.stroke();
    
    this.ctx.restore();
  }
  
  // 渲染危险警示线
  renderDangerLine() {
    if (!this.dangerLineFlash) return;
    
    this.ctx.save();
    
    const dangerY = GAME_CONFIG.DANGER_LINE.y;
    const centerX = GAME_CONFIG.GAME_AREA.centerX;
    const radius = GAME_CONFIG.GAME_AREA.radius;
    
    // 计算闪烁透明度
    const flashAlpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.01);
    
    // 危险线背景光晕
    const glowGradient = this.ctx.createRadialGradient(
      centerX, dangerY, 0,
      centerX, dangerY, radius + 20
    );
    glowGradient.addColorStop(0, `rgba(255, 68, 68, ${flashAlpha * 0.3})`);
    glowGradient.addColorStop(0.7, `rgba(255, 68, 68, ${flashAlpha * 0.1})`);
    glowGradient.addColorStop(1, 'rgba(255, 68, 68, 0)');
    
    this.ctx.fillStyle = glowGradient;
    this.ctx.fillRect(0, dangerY - 30, this.width, 60);
    
    // 主危险线
    this.ctx.strokeStyle = `rgba(255, 68, 68, ${flashAlpha})`;
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([10, 5]);
    this.ctx.lineDashOffset = -Date.now() * 0.05;
    
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - radius, dangerY);
    this.ctx.lineTo(centerX + radius, dangerY);
    this.ctx.stroke();
    
    // 危险线上方高亮
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha * 0.8})`;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 4]);
    this.ctx.lineDashOffset = -Date.now() * 0.03;
    
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - radius, dangerY - 1);
    this.ctx.lineTo(centerX + radius, dangerY - 1);
    this.ctx.stroke();
    
    // 重置线条样式
    this.ctx.setLineDash([]);
    this.ctx.lineDashOffset = 0;
    
    this.ctx.restore();
  }
  
  // 渲染下一个水果预览
  renderNextFruitPreview() {
    if (!this.nextFruitType || !FRUIT_CONFIG[this.nextFruitType]) return;
    
    this.ctx.save();
    
    const fruit = FRUIT_CONFIG[this.nextFruitType];
    const previewX = this.width - 60;
    const previewY = 120;
    const previewRadius = 25;
    
    // 预览背景圆形
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 6;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 3;
    
    // 外层背景
    const outerGradient = this.ctx.createRadialGradient(
      previewX, previewY, 0,
      previewX, previewY, previewRadius + 8
    );
    outerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    outerGradient.addColorStop(0.7, 'rgba(240, 240, 240, 0.8)');
    outerGradient.addColorStop(1, 'rgba(200, 200, 200, 0.6)');
    
    this.ctx.fillStyle = outerGradient;
    this.ctx.beginPath();
    this.ctx.arc(previewX, previewY, previewRadius + 8, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 内层背景
    const innerGradient = this.ctx.createRadialGradient(
      previewX, previewY, 0,
      previewX, previewY, previewRadius + 3
    );
    innerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    innerGradient.addColorStop(1, 'rgba(245, 245, 245, 0.9)');
    
    this.ctx.shadowColor = 'transparent';
    this.ctx.fillStyle = innerGradient;
    this.ctx.beginPath();
    this.ctx.arc(previewX, previewY, previewRadius + 3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 边框
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // 内边框高光
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(previewX, previewY, previewRadius + 2, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // 水果图像
    if (fruit.texture && imageLoader.hasImage(fruit.texture)) {
      const img = imageLoader.getImage(fruit.texture);
      const size = previewRadius * 1.6;
      this.ctx.drawImage(
        img,
        previewX - size/2,
        previewY - size/2,
        size,
        size
      );
    } else {
      // 备用圆形显示
      const fruitGradient = this.ctx.createRadialGradient(
        previewX - previewRadius * 0.3, previewY - previewRadius * 0.3, 0,
        previewX, previewY, previewRadius
      );
      fruitGradient.addColorStop(0, fruit.gradient[0]);
      fruitGradient.addColorStop(1, fruit.gradient[1]);
      
      this.ctx.fillStyle = fruitGradient;
      this.ctx.beginPath();
      this.ctx.arc(previewX, previewY, previewRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // "下一个" 标签
    this.ctx.font = 'bold 12px Arial, sans-serif';
    this.ctx.fillStyle = UI_THEME.text.secondary;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    this.ctx.shadowBlur = 1;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 1;
    this.ctx.fillText('下一个', previewX, previewY + previewRadius + 20);
    
    this.ctx.restore();
  }
  
  // 渲染按钮
  renderButtons() {
    // 道具按钮
    const powerBtn = this.buttons.power;
    const powerColor = powerBtn?.disabled ? this.darkenColor(UI_THEME.primary.main, 0.4) : UI_THEME.primary.main;
    this.renderButton(powerBtn, '✨', powerColor, powerBtn?.disabled ? '已用' : '道具');
  }
  
  // 渲染单个按钮
  renderButton(button, icon, color, tooltip) {
    this.ctx.save();
    const disabled = !!(button && button.disabled);
    if (disabled) { this.ctx.globalAlpha = 0.6; }
    
    // 按钮阴影
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 6;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 3;
    
    // 按钮背景渐变
    const gradient = this.ctx.createRadialGradient(
      button.x + button.width/2, button.y + button.height/3,
      0,
      button.x + button.width/2, button.y + button.height/2,
      button.width/2
    );
    gradient.addColorStop(0, this.lightenColor(color, 0.3));
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, this.darkenColor(color, 0.2));
    
    this.ctx.fillStyle = gradient;
    this.roundRect(button.x, button.y, button.width, button.height, 12);
    this.ctx.fill();
    
    // 按钮高光
    const highlightGradient = this.ctx.createLinearGradient(
      button.x, button.y,
      button.x, button.y + button.height/2
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    
    this.ctx.fillStyle = highlightGradient;
    this.roundRect(button.x, button.y, button.width, button.height/2, 12);
    this.ctx.fill();
    
    // 按钮边框
    this.ctx.shadowColor = 'transparent';
    this.ctx.strokeStyle = this.darkenColor(color, 0.4);
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // 内边框高光
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.roundRect(button.x + 1, button.y + 1, button.width - 2, button.height - 2, 11);
    this.ctx.stroke();
    
    // 按钮图标
    this.ctx.font = '22px Arial, sans-serif';
    this.ctx.fillStyle = (button && button.disabled) ? '#E5E7EB' : 'white';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 2;
    this.ctx.shadowOffsetX = 1;
    this.ctx.shadowOffsetY = 1;
    this.ctx.fillText(icon, button.x + button.width/2, button.y + button.height/2);
    
    this.ctx.restore();
  }
  
  // 更新分数
  setScore(score) {
    this.scoreAnimation.target = score;
  }
  
  // 设置最高分
  setHighScore(highScore) {
    this.highScore = highScore;
  }
  
  // 新增：设置当前连击
  setCombo(combo) {
    this.combo = Number(combo) || 0;
  }
  
  // 新增：设置最高连击
  setHighCombo(highCombo) {
    this.highCombo = Number(highCombo) || 0;
  }
  
  // 新增：设置本局最高连击
  setRunMaxCombo(maxCombo) {
    this.runMaxCombo = Number(maxCombo) || 0;
  }
  
  // 设置下一个水果类型
  setNextFruitType(type) {
    this.nextFruitType = type;
  }
  
  // 设置危险线闪烁
  setDangerLineFlash(flash) {
    this.dangerLineFlash = flash;
  }
  
  // 处理触摸开始
  onTouchStart(x, y) {
    this.touchState.isDown = true;
    this.touchState.startX = x;
    this.touchState.startY = y;
    this.touchState.currentX = x;
    this.touchState.currentY = y;
    
    // 检查按钮点击
    return this.checkButtonClick(x, y);
  }
  
  // 处理触摸移动
  onTouchMove(x, y) {
    if (this.touchState.isDown) {
      this.touchState.currentX = x;
      this.touchState.currentY = y;

      // 检查按钮点击（在移动过程中也可能触发按钮）
      const buttonClick = this.checkButtonClick(x, y);
      if (buttonClick) {
        console.log(`[UI] Button touched during move: ${buttonClick.name}`);
        return buttonClick;
      }
    }

    // 如果没有点击按钮，返回null（与onTouchEnd保持一致）
    return null;
  }
  
  // 处理触摸结束
  onTouchEnd(x, y) {
    // 放宽结束事件判定，确保单击触发投放
    this.touchState.isDown = false;

    // 优先检查按钮点击，避免按钮区域触发投放
    const buttonClick = this.checkButtonClick(x, y);
    if (buttonClick) {
      console.log(`[UI] Button clicked: ${buttonClick.name}`);
      return buttonClick;
    }

    // 如果没有点击按钮，才返回投放事件
    return {
      type: 'drop',
      x: x,
      y: y
    };
  }
  
  // 检查按钮点击
  checkButtonClick(x, y) {
    for (const [name, button] of Object.entries(this.buttons)) {
      if (button && button.disabled) continue;
      if (x >= button.x && x <= button.x + button.width &&
          y >= button.y && y <= button.y + button.height) {
        return { type: 'button', name: name };
      }
    }
    return null;
  }
  
  // 工具函数：绘制圆角矩形
  roundRect(x, y, width, height, radius) {
    const ctx = this.ctx;
    if (!ctx) return;
    const r = Math.max(0, Math.min(radius || 0, Math.min(width, height) / 2));
    // 兼容环境兜底：若不支持 moveTo/quadraticCurveTo，则退化为矩形路径
    if (typeof ctx.moveTo !== 'function' || typeof ctx.quadraticCurveTo !== 'function') {
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.closePath();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // 保留工具函数：圆角矩形
  
  // 工具函数：颜色加深
  darkenColor(color, factor) {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - factor));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - factor));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - factor));
    
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }
  
  // 辅助方法：颜色变暗
  darkenColor(color, factor) {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    const amt = Math.round(255 * factor);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return (usePound ? '#' : '') + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  // 辅助方法：颜色变亮
  lightenColor(color, amount) {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + Math.round(255 * amount);
    let g = (num >> 8 & 0x00FF) + Math.round(255 * amount);
    let b = (num & 0x0000FF) + Math.round(255 * amount);
    r = r > 255 ? 255 : r;
    g = g > 255 ? 255 : g;
    b = b > 255 ? 255 : b;
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
  }

  // 渲染木质纹理效果
  renderWoodTexture() {
    this.ctx.save();
    this.ctx.globalAlpha = 0.08;
    
    // 创建木纹效果
    const woodLines = 15;
    for (let i = 0; i < woodLines; i++) {
      const y = (i / woodLines) * this.height;
      const waveAmplitude = 8 + Math.sin(i * 0.5) * 4;
      
      this.ctx.strokeStyle = i % 2 === 0 ? '#8D6E63' : '#A1887F';
      this.ctx.lineWidth = 2 + Math.random() * 2;
      this.ctx.globalAlpha = 0.06 + Math.random() * 0.04;
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      
      for (let x = 0; x <= this.width; x += 10) {
        const waveY = y + Math.sin(x * 0.02 + i) * waveAmplitude;
        this.ctx.lineTo(x, waveY);
      }
      
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  // 渲染忍者刀光轨迹
  renderNinjaSlashes(time) {
    this.ctx.save();
    
    // 初始化刀光数据
    if (!this.ninjaSlashes) {
      this.ninjaSlashes = [];
      for (let i = 0; i < 5; i++) {
        this.ninjaSlashes.push({
          startX: Math.random() * this.width,
          startY: Math.random() * this.height,
          endX: Math.random() * this.width,
          endY: Math.random() * this.height,
          life: Math.random(),
          maxLife: 2 + Math.random() * 3,
          speed: 0.3 + Math.random() * 0.4,
          width: 2 + Math.random() * 3
        });
      }
    }
    
    // 更新和绘制刀光
    this.ninjaSlashes.forEach((slash, index) => {
      slash.life += slash.speed * 0.016; // 假设60fps
      
      if (slash.life > slash.maxLife) {
        // 重新生成刀光
        slash.startX = Math.random() * this.width;
        slash.startY = Math.random() * this.height;
        slash.endX = Math.random() * this.width;
        slash.endY = Math.random() * this.height;
        slash.life = 0;
        slash.maxLife = 2 + Math.random() * 3;
      }
      
      // 计算透明度
      const alpha = Math.max(0, 1 - (slash.life / slash.maxLife));
      if (alpha <= 0) return;
      
      // 绘制刀光
      this.ctx.globalAlpha = alpha * 0.15;
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = slash.width;
      this.ctx.lineCap = 'round';
      
      // 添加发光效果
      this.ctx.shadowColor = '#FFFFFF';
      this.ctx.shadowBlur = 8;
      
      this.ctx.beginPath();
      this.ctx.moveTo(slash.startX, slash.startY);
      this.ctx.lineTo(slash.endX, slash.endY);
      this.ctx.stroke();
      
      // 重置阴影
      this.ctx.shadowBlur = 0;
    });
    
    this.ctx.restore();
  }

  // 工具函数：绘制圆角矩形
  roundRect(x, y, width, height, radius) {
    const ctx = this.ctx;
    if (!ctx) return;
    const r = Math.max(0, Math.min(radius || 0, Math.min(width, height) / 2));
    if (typeof ctx.moveTo !== 'function' || typeof ctx.quadraticCurveTo !== 'function') {
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.closePath();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // 工具函数：颜色加深
  darkenColor(color, factor) {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    const amt = Math.round(255 * factor);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return (usePound ? '#' : '') + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  // 工具函数：颜色变亮
  lightenColor(color, amount) {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + Math.round(255 * amount);
    let g = (num >> 8 & 0x00FF) + Math.round(255 * amount);
    let b = (num & 0x0000FF) + Math.round(255 * amount);
    r = r > 255 ? 255 : r;
    g = g > 255 ? 255 : g;
    b = b > 255 ? 255 : b;
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
  }
}