import { UI_THEME, GAME_CONFIG, FRUIT_CONFIG, GAME_STATES, RENDER_TUNING } from '../config/constants.js';
import { imageLoader } from '../utils/imageLoader.js';

export class GameUI {
  constructor(canvas) {
    if (!canvas) {
      throw new Error('Canvas is required for GameUI initialization');
    }
    
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // 验证Canvas上下文是否有效
    if (!this.ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    
    // 验证关键Canvas方法是否存在，并添加fallback
    this.validateAndFixCanvasContext();
    
    // 添加Canvas上下文验证和错误处理
    this.isCanvasValid = this.validateCanvasContext();
    if (!this.isCanvasValid) {
      console.warn('Canvas context validation failed, some features may not work properly');
    }
    
    this.width = canvas.width;
    this.height = canvas.height;
    
    this.scoreAnimation = {
      current: 0,
      target: 0,
      speed: 0.1
    };
    
    this.highScore = 0;
    this.combo = 0;
    this.highCombo = 0;
    this.runMaxCombo = 0;
    this.nextFruitType = null;
    this.dangerLineFlash = false;
    
    // 下一个水果预览拖动状态
    this.nextFruitDragState = {
      isDragging: false,
      startX: 0,
      currentX: this.width / 2, // 默认居中
      minX: 80,  // 左边界
      maxX: this.width - 80  // 右边界
    };
    
    this.buttons = {
      power: {
        x: this.width - 80,   // 移动到右上角，距离右边缘80像素
        y: 20,                // 移动到顶部，距离顶部20像素，远离游戏操作区域
        width: 50,            // 进一步减小按钮尺寸，减少误触
        height: 50,           // 进一步减小按钮尺寸，减少误触
        disabled: false
      }
    };
    
    this.touchState = {
      isDown: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    };
    
    this.floatingLeaves = [];
    for (let i = 0; i < 8; i++) {
      this.floatingLeaves.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 8 + 4,
        speed: Math.random() * 0.5 + 0.2,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02
      });
    }
  }

  // 验证Canvas上下文并添加fallback方法
  validateAndFixCanvasContext() {
    const requiredMethods = ['moveTo', 'lineTo', 'beginPath', 'closePath', 'clearRect', 'fillRect', 'arc', 'rect', 'stroke', 'fill', 'save', 'restore', 'setLineDash', 'drawImage', 'translate', 'rotate', 'scale'];
    
    for (const method of requiredMethods) {
      if (typeof this.ctx[method] !== 'function') {
        console.warn(`Canvas context missing method: ${method}, adding fallback`);
        this.addCanvasMethodFallback(method);
      }
    }
  }
  
  // 验证Canvas上下文的完整性
  validateCanvasContext() {
    if (!this.ctx) return false;
    
    const requiredMethods = ['moveTo', 'lineTo', 'beginPath', 'closePath', 'stroke', 'fill'];
    for (const method of requiredMethods) {
      if (typeof this.ctx[method] !== 'function') {
        return false;
      }
    }
    return true;
  }
  
  // 为缺失的Canvas方法添加fallback实现
  addCanvasMethodFallback(method) {
    if (!this.ctx) return;
    
    // 不添加fallback方法，让Canvas上下文保持原有状态
    // 如果方法不存在，roundRect会检测并回退到简单绘制
    console.warn(`Canvas method ${method} not available, will use fallback in roundRect`);
  }

  reset() {
    this.scoreAnimation.current = 0;
    this.scoreAnimation.target = 0;
    this.combo = 0;
    this.runMaxCombo = 0;
    this.nextFruitType = null;
    this.dangerLineFlash = false;
    
    this.touchState = {
      isDown: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    };
  }
  
  update(deltaTime) {
    const diff = this.scoreAnimation.target - this.scoreAnimation.current;
    if (Math.abs(diff) > 0.1) {
      this.scoreAnimation.current += diff * this.scoreAnimation.speed;
    } else {
      this.scoreAnimation.current = this.scoreAnimation.target;
    }
    
    this.floatingLeaves.forEach(leaf => {
      leaf.y += leaf.speed;
      leaf.x += Math.sin(leaf.angle) * 0.3;
      leaf.angle += leaf.rotationSpeed;
      
      if (leaf.y > this.height + leaf.size) {
        leaf.y = -leaf.size;
        leaf.x = Math.random() * this.width;
      }
    });
  }
  
  render() {
    if (!this.ctx || typeof this.ctx.clearRect !== 'function') {
      console.warn('Invalid Canvas context in render method');
      return;
    }
    
    this.renderBackground();
    this.renderGrassWorldBottom();
    this.renderHeader();
    this.renderDangerLine();
    // 移除 renderNextFruitPreview() - 不再显示下一个水果预览
    // 移除 renderBombButton() - 现在由gameLogic统一管理渲染顺序
    // this.renderButtons();
  }
  
  renderBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, UI_THEME.background.light);
    gradient.addColorStop(1, UI_THEME.background.dark);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
  
  renderBackgroundPattern() {
    this.ctx.save();
    this.ctx.globalAlpha = 0.08;
    
    const patternSize = 40;
    const rows = Math.ceil(this.height / patternSize) + 1;
    const cols = Math.ceil(this.width / patternSize) + 1;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * patternSize + (row % 2) * (patternSize / 2);
        const y = row * patternSize;
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const size = Math.random() * 20 + 10;
      
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
      
      const innerGradient = this.ctx.createRadialGradient(
        x - size * 0.3, y - size * 0.3, 0,
        x, y, size
      );
      innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
      
      this.ctx.fillStyle = innerGradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  renderDynamicLighting(time) {
    this.ctx.save();
    
    const lightX = this.width * 0.3 + Math.sin(time * 0.001) * 50;
    const lightY = this.height * 0.2 + Math.cos(time * 0.0015) * 30;
    
    const lightGradient = this.ctx.createRadialGradient(
      lightX, lightY, 0,
      lightX, lightY, 200
    );
    lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    lightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    lightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.ctx.fillStyle = lightGradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    const secondLightX = this.width * 0.7 + Math.sin(time * 0.0008) * 40;
    const secondLightY = this.height * 0.6 + Math.cos(time * 0.0012) * 35;
    
    const secondLightGradient = this.ctx.createRadialGradient(
      secondLightX, secondLightY, 0,
      secondLightX, secondLightY, 150
    );
    secondLightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    secondLightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.ctx.fillStyle = secondLightGradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.restore();
  }

  renderFloatingLeaves(time) {
    this.ctx.save();
    
    this.floatingLeaves.forEach(leaf => {
      this.ctx.save();
      this.ctx.translate(leaf.x, leaf.y);
      this.ctx.rotate(leaf.angle);
      this.ctx.globalAlpha = 0.6;
      
      const leafGradient = this.ctx.createRadialGradient(
        -leaf.size * 0.3, -leaf.size * 0.3, 0,
        0, 0, leaf.size
      );
      leafGradient.addColorStop(0, '#90EE90');
      leafGradient.addColorStop(1, '#228B22');
      
      this.ctx.fillStyle = leafGradient;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, leaf.size, leaf.size * 0.6, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    });
    
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const size = Math.random() * 3 + 1;
      const alpha = Math.sin(time * 0.003 + i) * 0.3 + 0.4;
      
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
    
    this.ctx.restore();
  }
  
  renderGrassWorldBottom() {
    const bottomY = this.height - 60;
    
    this.ctx.save();
    
    if (typeof this.ctx.createLinearGradient === 'function' && typeof this.ctx.fillRect === 'function') {
      const grad = this.ctx.createLinearGradient(0, bottomY, 0, this.height);
      grad.addColorStop(0, '#8FBC8F');
      grad.addColorStop(1, '#556B2F');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, bottomY, this.width, 60);
    }
    
    if (typeof this.ctx.beginPath === 'function' && 
        typeof this.ctx.moveTo === 'function' && 
        typeof this.ctx.lineTo === 'function' && 
        typeof this.ctx.stroke === 'function') {
      this.ctx.strokeStyle = '#228B22';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, bottomY);
      this.ctx.lineTo(this.width, bottomY);
      this.ctx.stroke();

      for (let i = 0; i < 20; i++) {
        const x = (i / 19) * this.width;
        const grassHeight = Math.random() * 15 + 5;
        const grassWidth = Math.random() * 3 + 1;
        
        this.ctx.strokeStyle = '#228B22';
        this.ctx.lineWidth = grassWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(x, bottomY);
        this.ctx.lineTo(x + Math.random() * 4 - 2, bottomY - grassHeight);
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  renderDecorativeCircles() {
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const radius = Math.random() * 30 + 10;
      
      this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1 + 0.05})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
      this.ctx.shadowBlur = 6;
      this.ctx.shadowOffsetY = 2;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetY = 0;
    }
  }
  
  renderHeader() {
    // this.renderTitle();
    this.renderScore();
    // this.renderComboHeader(); // 暂时禁用以避免Canvas错误
  }
  
  renderTitle() {
    this.ctx.save();
    
    const titleText = '合成新水果';
    this.ctx.font = 'bold 32px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const x = this.width / 2;
    const y = 50;
    
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 2;
    
    this.ctx.strokeStyle = '#8B4513';
    this.ctx.lineWidth = 4;
    this.ctx.strokeText(titleText, x, y);
    
    this.ctx.strokeStyle = '#D2691E';
    this.ctx.lineWidth = 2;
    this.ctx.strokeText(titleText, x, y);
    
    const titleGradient = this.ctx.createLinearGradient(
      x, y - 16,
      x, y + 16
    );
    titleGradient.addColorStop(0, '#FFD700');
    titleGradient.addColorStop(0.5, '#FFA500');
    titleGradient.addColorStop(1, '#FF8C00');
    
    this.ctx.shadowColor = 'transparent';
    this.ctx.fillStyle = titleGradient;
    this.ctx.fillText(titleText, x, y);
    
    const highlightGradient = this.ctx.createLinearGradient(
      x, y - 16,
      x, y - 8
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    
    this.ctx.fillStyle = highlightGradient;
    this.ctx.fillText(titleText, x, y);
    
    this.ctx.restore();
  }
  
  renderScore() {
    // 检查Canvas上下文是否有效
    if (!this.ctx || typeof this.ctx.fillText !== 'function') {
      console.warn('Invalid Canvas context in renderScore method');
      return;
    }
    
    this.ctx.save();
    
    const displayScore = Math.floor(this.scoreAnimation.current);
    
    // 左上角积分显示区域
    const leftMargin = 15;
    const topMargin = 15;
    const lineHeight = 25;
    
    // 本局积分 - 字体较大
    this.ctx.font = 'bold 24px Arial, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillStyle = '#333333';
    this.ctx.fillText(`本局: ${displayScore}`, leftMargin, topMargin);
    
    // 历史最高分 - 字体较小
    this.ctx.font = 'bold 16px Arial, sans-serif';
    this.ctx.fillStyle = '#666666';
    this.ctx.fillText(`最高: ${this.highScore}`, leftMargin, topMargin + lineHeight);
    
    // 本局连击 - 字体较小
    this.ctx.fillStyle = '#888888';
    this.ctx.fillText(`连击: ${this.combo}`, leftMargin, topMargin + lineHeight * 2);
    
    this.ctx.restore();
  }
  
  renderComboHeader() {
    // 暂时禁用renderComboHeader以避免Canvas错误
    return;
    
    const combo = Math.max(0, this.combo || 0);
    const high = Math.max(0, this.highCombo || 0);
    if (combo <= 0 && high <= 0) {
      return;
    }
    
    this.ctx.save();
    
    const x = this.width / 2;
    const y = 80;
    const padding = 12;
    
    this.ctx.font = 'bold 18px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const text = `连击: ${combo}   最高: ${high}`;
    const metrics = this.ctx.measureText(text);
    const bgWidth = Math.max(metrics.width + padding * 2, 160);
    const bgHeight = 24;
    
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
    
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.shadowColor = 'transparent';
    this.ctx.fillStyle = UI_THEME.text.primary;
    this.ctx.fillText(text, x, y);
    
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
  
  renderDropPreview() {
    if (!this.touchState.isDown) return;
    
    // 验证Canvas上下文
    if (!this.ctx) {
      console.warn('Invalid Canvas context in renderDropPreview method');
      return;
    }

    const baseRadius = FRUIT_CONFIG[this.nextFruitType].radius;
    const radiusScale = (GAME_CONFIG?.SIZE?.radiusScale || 1);
    const fruitRadius = Math.round(baseRadius * radiusScale);
    const x = this.nextFruitDragState.isDragging ? this.nextFruitDragState.currentX : this.touchState.currentX;
    const y = GAME_CONFIG.DROP_LINE_Y;
    
    this.ctx.save();
    
    const texturePath = FRUIT_CONFIG[this.nextFruitType]?.texture;
    const img = texturePath ? imageLoader.getImage(texturePath) : null;
    if (img) {
      this.ctx.globalAlpha = 0.75;
      
      const size = fruitRadius * 2;
      
      this.ctx.save();
      if (typeof this.ctx.beginPath === 'function' && typeof this.ctx.arc === 'function' && typeof this.ctx.clip === 'function') {
        this.ctx.beginPath();
        this.ctx.arc(x, y, fruitRadius, 0, Math.PI * 2);
        this.ctx.clip();
      }
      
      if (typeof this.ctx.drawImage === 'function') {
        this.ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
      }
      this.ctx.restore();
      
      this.ctx.globalAlpha = 1.0;
    } else {
      if (typeof this.ctx.createRadialGradient === 'function') {
        const previewGrad = this.ctx.createRadialGradient(
          x - fruitRadius * 0.3, y - fruitRadius * 0.3, 0,
          x, y, fruitRadius
        );
        previewGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
        previewGrad.addColorStop(1, 'rgba(255,255,255,0.2)');
        this.ctx.fillStyle = previewGrad;
      }
      
      if (typeof this.ctx.beginPath === 'function' && typeof this.ctx.arc === 'function' && typeof this.ctx.fill === 'function') {
        this.ctx.beginPath();
        this.ctx.arc(x, y, fruitRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // 绘制预览线 - 检查所需方法是否存在
    if (typeof this.ctx.beginPath === 'function' && 
        typeof this.ctx.moveTo === 'function' && 
        typeof this.ctx.lineTo === 'function' && 
        typeof this.ctx.stroke === 'function') {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x, this.height);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      if (typeof this.ctx.setLineDash === 'function') {
        this.ctx.setLineDash([5, 5]);
      }
      this.ctx.stroke();
      if (typeof this.ctx.setLineDash === 'function') {
        this.ctx.setLineDash([]);
      }
    }
    
    this.ctx.restore();
  }
  
  renderDangerLine() {
    // 始终显示危险线，不依赖于 dangerLineFlash 状态
    this.ctx.save();
    
    const dangerY = GAME_CONFIG.DANGER_LINE?.y || GAME_CONFIG.DROP_LINE_Y || 200;
    
    // 检查Canvas方法是否存在
    if (typeof this.ctx.beginPath === 'function' && 
        typeof this.ctx.moveTo === 'function' && 
        typeof this.ctx.lineTo === 'function' && 
        typeof this.ctx.stroke === 'function') {
      
      // 根据是否处于危险状态调整透明度
      const baseAlpha = this.dangerLineFlash ? 0.8 : 0.4;
      const flashAlpha = this.dangerLineFlash ? 
        (baseAlpha + 0.2 * Math.sin(Date.now() * 0.01)) : baseAlpha;
      
      // 背景光晕效果 - 覆盖整个屏幕宽度
      if (typeof this.ctx.createLinearGradient === 'function' && typeof this.ctx.fillRect === 'function') {
        const glowGradient = this.ctx.createLinearGradient(
          0, dangerY - 20, 0, dangerY + 20
        );
        glowGradient.addColorStop(0, 'rgba(255, 68, 68, 0)');
        glowGradient.addColorStop(0.5, `rgba(255, 68, 68, ${flashAlpha * 0.2})`);
        glowGradient.addColorStop(1, 'rgba(255, 68, 68, 0)');

        this.ctx.fillStyle = glowGradient;
        this.ctx.fillRect(0, dangerY - 20, this.width, 40);
      }
      
      // 主危险线 - 横跨整个屏幕宽度
      this.ctx.strokeStyle = `rgba(255, 68, 68, ${flashAlpha})`;
      this.ctx.lineWidth = 3;
      if (typeof this.ctx.setLineDash === 'function') {
        this.ctx.setLineDash([10, 5]);
        this.ctx.lineDashOffset = this.dangerLineFlash ? -Date.now() * 0.05 : 0;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(0, dangerY);
      this.ctx.lineTo(this.width, dangerY);
      this.ctx.stroke();
      
      // 危险线上方高亮
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha * 0.6})`;
      this.ctx.lineWidth = 1;
      if (typeof this.ctx.setLineDash === 'function') {
        this.ctx.setLineDash([8, 4]);
        this.ctx.lineDashOffset = this.dangerLineFlash ? -Date.now() * 0.03 : 0;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(0, dangerY - 1);
      this.ctx.lineTo(this.width, dangerY - 1);
      this.ctx.stroke();
      
      if (typeof this.ctx.setLineDash === 'function') {
        this.ctx.setLineDash([]);
        this.ctx.lineDashOffset = 0;
      }
    }
    
    this.ctx.restore();
  }
  
  renderBombButton() {
    this.ctx.save();
    
    // 炸弹按钮位置：危险线附近靠右
    const buttonSize = 50;
    const margin = 20;
    const dangerY = GAME_CONFIG.DANGER_LINE?.y || GAME_CONFIG.DROP_LINE_Y || 200;
    const buttonX = this.width - margin - buttonSize; // 靠右
    const buttonY = dangerY - 10; // 危险线下方10像素，确保按钮完全可见
    
    // 添加调试日志
    console.log(`[BombButton] Rendering at x=${buttonX}, y=${buttonY}, size=${buttonSize}, dangerY=${dangerY}, canvas=${this.width}x${this.height}`);
    
    // 检查Canvas方法是否存在
    if (typeof this.ctx.createRadialGradient === 'function') {
      // 绘制按钮背景
      const gradient = this.ctx.createRadialGradient(
        buttonX + buttonSize/2, buttonY + buttonSize/2, 0,
        buttonX + buttonSize/2, buttonY + buttonSize/2, buttonSize/2
      );
      gradient.addColorStop(0, '#ff6b6b');
      gradient.addColorStop(0.7, '#ff5252');
      gradient.addColorStop(1, '#d32f2f');
      
      this.ctx.fillStyle = gradient;
    } else {
      this.ctx.fillStyle = '#ff6b6b';
    }
    
    if (typeof this.ctx.beginPath === 'function' && 
        typeof this.ctx.arc === 'function' && 
        typeof this.ctx.fill === 'function') {
      this.ctx.beginPath();
      this.ctx.arc(buttonX + buttonSize/2, buttonY + buttonSize/2, buttonSize/2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 绘制按钮边框
      if (typeof this.ctx.stroke === 'function') {
        this.ctx.strokeStyle = '#b71c1c';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }
    }
    
    // 绘制炸弹图标（简化版）
    const centerX = buttonX + buttonSize/2;
    const centerY = buttonY + buttonSize/2;
    
    // 炸弹图标 - 检查绘制方法是否存在
    if (typeof this.ctx.beginPath === 'function' && 
        typeof this.ctx.arc === 'function' && 
        typeof this.ctx.fill === 'function') {
      
      // 炸弹主体
      this.ctx.fillStyle = '#2c2c2c';
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY + 3, 12, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 炸弹引线
      if (typeof this.ctx.moveTo === 'function' && 
          typeof this.ctx.lineTo === 'function' && 
          typeof this.ctx.stroke === 'function') {
        this.ctx.strokeStyle = '#8d6e63';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - 8, centerY - 6);
        this.ctx.lineTo(centerX - 12, centerY - 12);
        this.ctx.stroke();
      }
      
      // 火花效果
      this.ctx.fillStyle = '#ff9800';
      this.ctx.beginPath();
      this.ctx.arc(centerX - 12, centerY - 12, 2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 高光效果
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(centerX - 4, centerY - 2, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // 存储按钮区域用于点击检测
    this.bombButton = {
      x: buttonX,
      y: buttonY,
      width: buttonSize,
      height: buttonSize
    };
    
    this.ctx.restore();
  }
  
  renderNextFruitPreview() {
    if (!this.nextFruitType || !FRUIT_CONFIG[this.nextFruitType]) return;
    
    this.ctx.save();
    
    const fruit = FRUIT_CONFIG[this.nextFruitType];
    
    // 固定在右上角显示下一个水果
    const previewX = this.width - 80;
    const previewY = 60;
    const previewRadius = 25;
    
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 6;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 3;
    
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
    
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(previewX, previewY, previewRadius + 2, 0, Math.PI * 2);
    this.ctx.stroke();
    
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
    
    // 添加"下一个"文本标签
    this.ctx.font = 'bold 14px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#333333';
    this.ctx.fillText('下一个', previewX, previewY + previewRadius + 20);
    
    this.ctx.restore();
  }
  
  renderButtons() {
    const powerBtn = this.buttons.power;
    const powerColor = powerBtn?.disabled ? this.darkenColor(UI_THEME.primary.main, 0.4) : UI_THEME.primary.main;

    const isDouyinEnv = typeof tt !== 'undefined';

    if (isDouyinEnv) {
      // 增强视觉反馈：添加警告色边框提醒用户这是重要按钮
      if (!powerBtn?.disabled) {
        this.ctx.strokeStyle = '#FF4444';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(powerBtn.x - 2, powerBtn.y - 2, powerBtn.width + 4, powerBtn.height + 4);
      }
      this.renderButton(powerBtn, '✨', powerColor, powerBtn?.disabled ? '已用' : '清除道具');
    } else {
      // 开发环境：保持绿色边框用于调试，同时添加警告色内边框
      this.ctx.strokeStyle = '#00FF00';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(powerBtn.x, powerBtn.y, powerBtn.width, powerBtn.height);
      
      if (!powerBtn?.disabled) {
        this.ctx.strokeStyle = '#FF4444';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(powerBtn.x + 2, powerBtn.y + 2, powerBtn.width - 4, powerBtn.height - 4);
      }
      
      this.renderButton(powerBtn, '✨', powerColor, powerBtn?.disabled ? '已用' : '清除道具');
    }
  }
  
  renderButton(button, icon, color, tooltip) {
    this.ctx.save();
    const disabled = !!(button && button.disabled);
    if (disabled) { this.ctx.globalAlpha = 0.6; }

    const isDouyinEnv = typeof tt !== 'undefined';

    if (isDouyinEnv) {
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      this.ctx.shadowBlur = 4;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 2;
    } else {
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      this.ctx.shadowBlur = 6;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 3;
    }

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
    // 暂时使用简单矩形替代roundRect
    this.ctx.fillRect(button.x, button.y, button.width, button.height);

    const highlightGradient = this.ctx.createLinearGradient(
      button.x, button.y,
      button.x, button.y + button.height/2
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    this.ctx.fillStyle = highlightGradient;
    // 暂时使用简单矩形替代roundRect
    this.ctx.fillRect(button.x, button.y, button.width, button.height/2);

    this.ctx.shadowColor = 'transparent';
    this.ctx.strokeStyle = this.darkenColor(color, 0.4);
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(button.x, button.y, button.width, button.height);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    // 暂时使用简单矩形替代roundRect
    this.ctx.strokeRect(button.x + 1, button.y + 1, button.width - 2, button.height - 2);

    const iconSize = isDouyinEnv ? '26px' : '22px';
    this.ctx.font = `bold ${iconSize} Arial, sans-serif`;
    this.ctx.fillStyle = (button && button.disabled) ? '#E5E7EB' : 'white';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    if (!isDouyinEnv) {
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      this.ctx.shadowBlur = 2;
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;
    }

    this.ctx.fillText(icon, button.x + button.width/2, button.y + button.height/2);

    if (isDouyinEnv && tooltip && !disabled) {
      this.ctx.font = '12px Arial, sans-serif';
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.shadowColor = 'transparent';
      this.ctx.fillText(tooltip, button.x + button.width/2, button.y + button.height + 15);
    }

    this.ctx.restore();
  }
  
  setScore(score) {
    this.scoreAnimation.target = score;
  }
  
  setHighScore(highScore) {
    this.highScore = highScore;
  }
  
  setCombo(combo) {
    this.combo = Number(combo) || 0;
  }
  
  setHighCombo(highCombo) {
    this.highCombo = Number(highCombo) || 0;
  }
  
  setRunMaxCombo(maxCombo) {
    this.runMaxCombo = Number(maxCombo) || 0;
  }
  
  setNextFruitType(type) {
    this.nextFruitType = type;
  }
  
  setDangerLineFlash(flash) {
    this.dangerLineFlash = flash;
  }
  
  onTouchStart(x, y) {
    // 检查炸弹按钮
    const bombResult = this.checkButtonClick(x, y);
    if (bombResult && bombResult.type === 'bomb') {
      console.log(`[GameUI] Bomb button clicked at (${x}, ${y})`);
      return bombResult;
    }

    // 检查其他按钮
    for (const [name, button] of Object.entries(this.buttons)) {
      if (x >= button.x && x <= button.x + button.width &&
          y >= button.y && y <= button.y + button.height) {
        const isDouyinEnv = typeof tt !== 'undefined';
        if (isDouyinEnv) {
          console.log(`[DouyinUI] TouchStart triggered button: ${name}`);
        }
        return { name, type: 'button' };
      }
    }

    return null;
  }
  
  onTouchMove(x, y) {
    // 处理下一个水果预览拖动
    if (this.nextFruitDragState.isDragging) {
      const newX = Math.max(this.nextFruitDragState.minX, 
                           Math.min(this.nextFruitDragState.maxX, x));
      this.nextFruitDragState.currentX = newX;
      return { type: 'preview_drag', x: newX, y };
    }
    
    if (this.touchState.isDown) {
      this.touchState.currentX = x;
      this.touchState.currentY = y;

      const buttonClick = this.checkButtonClick(x, y);
      if (buttonClick) {
        console.log(`[UI] Button touched during move: ${buttonClick.name}`);
        return buttonClick;
      }
    }

    return null;
  }
  
  onTouchEnd(x, y) {
    // 结束下一个水果预览拖动
    if (this.nextFruitDragState.isDragging) {
      this.nextFruitDragState.isDragging = false;
      
      // 拖拽结束时触发投放
      return {
        type: 'drop',
        x: this.nextFruitDragState.currentX, // 使用拖拽的X坐标
        y: y // 使用释放时的Y坐标
      };
    }
    
    this.touchState.isDown = false;

    const buttonClick = this.checkButtonClick(x, y);
    if (buttonClick) {
      console.log(`[UI] Button clicked: ${buttonClick.name}`);
      return buttonClick;
    }

    // 检查是否是有效的点击投放（需要在游戏区域内且不是按钮点击）
    const gameAreaTop = GAME_CONFIG?.GAME_AREA?.top || 100;
    const gameAreaBottom = GAME_CONFIG?.GAME_AREA?.bottom || this.canvas.height - 50;
    
    // 只有在游戏区域内的点击才触发投放
    if (y >= gameAreaTop && y <= gameAreaBottom) {
      return {
        type: 'drop',
        x: this.nextFruitDragState.currentX, // 使用当前预览位置的X坐标
        y: y // 使用点击的Y坐标
      };
    }

    // 其他情况不触发投放
    return null;
  }
  
  checkButtonClick(x, y) {
    const isDouyinEnv = typeof tt !== 'undefined';

    // 添加调试日志
    console.log(`[TouchDebug] Click at (${x}, ${y})`);
    
    // 检查炸弹按钮点击 - 扩大点击区域
    if (this.bombButton) {
      // 扩大点击区域：上下左右各增加20像素的边距
      const expandedMargin = 20;
      const expandedX = this.bombButton.x - expandedMargin;
      const expandedY = this.bombButton.y - expandedMargin;
      const expandedWidth = this.bombButton.width + (expandedMargin * 2);
      const expandedHeight = this.bombButton.height + (expandedMargin * 2);
      
      console.log(`[TouchDebug] Bomb button original bounds: x=${this.bombButton.x}, y=${this.bombButton.y}, width=${this.bombButton.width}, height=${this.bombButton.height}`);
      console.log(`[TouchDebug] Bomb button expanded bounds: x=${expandedX}, y=${expandedY}, width=${expandedWidth}, height=${expandedHeight}`);
      console.log(`[TouchDebug] Click in expanded bomb button? x: ${x >= expandedX && x <= expandedX + expandedWidth}, y: ${y >= expandedY && y <= expandedY + expandedHeight}`);
      console.log(`[TouchDebug] Expanded X range: ${expandedX} <= ${x} <= ${expandedX + expandedWidth} = ${x >= expandedX && x <= expandedX + expandedWidth}`);
      console.log(`[TouchDebug] Expanded Y range: ${expandedY} <= ${y} <= ${expandedY + expandedHeight} = ${y >= expandedY && y <= expandedY + expandedHeight}`);
      
      // 使用扩大的点击区域进行检测
      if (x >= expandedX && x <= expandedX + expandedWidth &&
          y >= expandedY && y <= expandedY + expandedHeight) {
        console.log(`[TouchDebug] Bomb button clicked in expanded area!`);
        return { name: 'bomb', type: 'bomb' };
      }
    } else {
      console.log(`[TouchDebug] Bomb button not found!`);
    }

    for (const [name, button] of Object.entries(this.buttons)) {
      if (x >= button.x && x <= button.x + button.width &&
          y >= button.y && y <= button.y + button.height) {
        
        if (isDouyinEnv) {
          console.log(`[DouyinUI] Button ${name} clicked at (${x}, ${y}), button bounds: (${button.x}, ${button.y}, ${button.width}, ${button.height})`);
        }
        
        return {
          name: name,
          type: 'button',
          x: x,
          y: y,
          disabled: button.disabled || false
        };
      }
    }

    return null;
  }
  
  roundRect(x, y, width, height, radius) {
    // 检查Canvas上下文是否有效
    if (!this.ctx) {
      console.warn('Invalid Canvas context in roundRect method');
      return;
    }
    
    // 简化实现：直接使用fillRect绘制矩形，避免Canvas方法兼容性问题
    if (typeof this.ctx.fillRect === 'function') {
      this.ctx.fillRect(x, y, width, height);
    } else {
      console.warn('Canvas fillRect method not available');
    }
  }
  
  darkenColor(color, factor) {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - factor));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - factor));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - factor));

    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }
  
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

  renderWoodTexture() {
    this.ctx.save();
    this.ctx.globalAlpha = 0.1;
    
    const woodLines = 15;
    for (let i = 0; i < woodLines; i++) {
      const y = (i / woodLines) * this.height;
      const waveOffset = Math.sin(y * 0.01) * 20;
      
      // 检查Canvas方法是否存在
      if (typeof this.ctx.beginPath === 'function' && 
          typeof this.ctx.moveTo === 'function' && 
          typeof this.ctx.quadraticCurveTo === 'function' && 
          typeof this.ctx.stroke === 'function') {
        
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = Math.random() * 2 + 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.quadraticCurveTo(
          this.width / 2 + waveOffset, y + Math.random() * 10 - 5,
          this.width, y
        );
        this.ctx.stroke();
      }
    }
    
    this.ctx.restore();
  }

  renderNinjaSlashes(time) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    
    if (!this.ninjaSlashes) {
      this.ninjaSlashes = [];
      for (let i = 0; i < 5; i++) {
        this.ninjaSlashes.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          angle: Math.random() * Math.PI * 2,
          length: Math.random() * 100 + 50,
          speed: Math.random() * 0.02 + 0.01,
          opacity: Math.random() * 0.5 + 0.2
        });
      }
    }
    
    this.ninjaSlashes.forEach((slash, index) => {
      slash.angle += slash.speed;
      slash.x += Math.cos(slash.angle) * 0.5;
      slash.y += Math.sin(slash.angle) * 0.5;
      
      if (slash.x < -slash.length || slash.x > this.width + slash.length ||
          slash.y < -slash.length || slash.y > this.height + slash.length) {
        slash.x = Math.random() * this.width;
        slash.y = Math.random() * this.height;
      }
      
      this.ctx.save();
      this.ctx.globalAlpha = slash.opacity * Math.sin(time * 0.003 + index);
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      
      // 检查Canvas方法是否存在
      if (typeof this.ctx.beginPath === 'function' && 
          typeof this.ctx.moveTo === 'function' && 
          typeof this.ctx.lineTo === 'function' && 
          typeof this.ctx.stroke === 'function') {
        
        this.ctx.beginPath();
        this.ctx.moveTo(slash.x, slash.y);
        this.ctx.lineTo(
          slash.x + Math.cos(slash.angle) * slash.length,
          slash.y + Math.sin(slash.angle) * slash.length
        );
        this.ctx.stroke();
      }
      this.ctx.restore();
    });
    
    this.ctx.restore();
  }
}