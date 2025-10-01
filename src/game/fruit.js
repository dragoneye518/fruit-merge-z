import { RigidBody, Vector2 } from '../engine/physics.js';
import { FRUIT_CONFIG, GAME_CONFIG } from '../config/constants.js';
import { imageLoader } from '../utils/imageLoader.js';

// 水果类
export class Fruit extends RigidBody {
  constructor(type, x, y) {
    const config = FRUIT_CONFIG[type];
    if (!config) {
      throw new Error(`Unknown fruit type: ${type}`);
    }
    
    super({
      x,
      y,
      radius: config.radius,
      mass: config.mass,
      type: type,
      id: `fruit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    });
    
    this.fruitType = type;
    this.config = config;
    this.name = config.name;
    this.score = config.score;
    this.nextLevel = config.nextLevel;
    
    // 渲染相关
    this.color = config.color;
    this.gradient = config.gradient;
    this.texture = config.texture;
    
    // 动画相关
    this.scale = 0.1; // 初始缩放（生成动画）
    this.targetScale = 1.0;
    this.rotation = 0;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;

    // 碰撞/落地挤压动画
    this.impactScaleX = 1.0;
    this.impactScaleY = 1.0;
    this.impactTimer = 0;
    
    // 特效相关
    this.glowIntensity = 0;
    this.pulsePhase = Math.random() * Math.PI * 2;
    
    // 状态
    this.isNew = true;
    this.age = 0;
    this.lastMergeTime = 0;
    
    // 图片相关
    this.image = null;
    this.imageLoaded = false;
    
    // 尝试加载图片
    this.loadImage();
  }
  
  // 加载水果图片
  async loadImage() {
    try {
      this.image = await imageLoader.loadImage(this.texture);
      this.imageLoaded = true;
    } catch (error) {
      console.warn(`Failed to load fruit image: ${this.texture}`, error);
      this.imageLoaded = false;
    }
  }
  
  // 更新水果状态
  update(deltaTime) {
    super.update(deltaTime);
    
    this.age += deltaTime;
    
    // 生成动画
    if (this.scale < this.targetScale) {
      // 加快生成动画速度，使水果快速达到正常尺寸
      this.scale = Math.min(this.targetScale, this.scale + deltaTime * 2);
      if (this.scale >= this.targetScale) {
        this.isNew = false;
      }
    }
    
    // 旋转动画
    this.rotation += this.rotationSpeed * deltaTime;

    // 脉冲效果
    this.pulsePhase += deltaTime * 0.003;
    this.glowIntensity = Math.sin(this.pulsePhase) * 0.1 + 0.1;

    // 受击挤压回弹动画
    if (this.impactTimer > 0) {
      this.impactTimer -= deltaTime;
    }
    // 回弹插值到 1
    const recoverSpeed = 10 * deltaTime;
    this.impactScaleX += (1 - this.impactScaleX) * recoverSpeed;
    this.impactScaleY += (1 - this.impactScaleY) * recoverSpeed;
    
    // 减少合成冷却时间 - 同时更新两个计时器
    if (this.lastMergeTime > 0) {
      this.lastMergeTime -= deltaTime;
      if (this.lastMergeTime <= 0) {
        this.canMerge = true;
      }
    }
    
    if (this.mergeTimer > 0) {
      this.mergeTimer -= deltaTime;
      if (this.mergeTimer <= 0) {
        this.canMerge = true;
      }
    }
  }
  
  // 渲染水果
  render(ctx) {
    if (this.isMarkedForRemoval) return;
    
    ctx.save();
    
    // 移动到水果位置
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale * this.impactScaleX, this.scale * this.impactScaleY);
    
    // 绘制发光效果
    if (this.glowIntensity > 0) {
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 1.5);
      gradient.addColorStop(0, `${this.color}${Math.floor(this.glowIntensity * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 绘制水果主体
    this.renderFruitBody(ctx);
    
    // 绘制高光
    this.renderHighlight(ctx);
    
    ctx.restore();
  }

  // 触发受击挤压动画
  triggerImpact(strength = 50) {
    const s = Math.max(0, Math.min(1, strength / 200));
    this.impactScaleX = 1 + 0.08 * s;
    this.impactScaleY = 1 - 0.06 * s;
    this.impactTimer = 0.08 + s * 0.05;
  }
  
  // 渲染水果主体
  renderFruitBody(ctx) {
    // 如果有图片且已加载，优先使用图片渲染
    if (this.imageLoaded && this.image) {
      try {
        const size = this.radius * 2;
        ctx.drawImage(this.image, -this.radius, -this.radius, size, size);
        return;
      } catch (error) {
        console.warn('Failed to draw fruit image, falling back to color rendering', error);
      }
    }
    
    // 回退到纯色渲染
    // 创建径向渐变
    const gradient = ctx.createRadialGradient(
      -this.radius * 0.3, -this.radius * 0.3, 0,
      0, 0, this.radius
    );
    
    if (this.gradient && this.gradient.length >= 2) {
      gradient.addColorStop(0, this.gradient[0]);
      gradient.addColorStop(1, this.gradient[1]);
    } else {
      gradient.addColorStop(0, this.color);
      gradient.addColorStop(1, this.darkenColor(this.color, 0.3));
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制外皮与果肉边缘（更贴近切片视觉）
    ctx.strokeStyle = this.darkenColor(this.color, 0.6);
    ctx.lineWidth = Math.max(3, this.radius * 0.12);
    ctx.stroke();

    // 内圈（果肉中心浅色）
    const innerRingRadius = this.radius * 0.75;
    const innerRing = ctx.createRadialGradient(-innerRingRadius * 0.2, -innerRingRadius * 0.2, 0, 0, 0, innerRingRadius);
    innerRing.addColorStop(0, 'rgba(255,255,255,0.35)');
    innerRing.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = innerRing;
    ctx.beginPath();
    ctx.arc(0, 0, innerRingRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // 根据水果类型绘制特殊纹理
    this.renderFruitTexture(ctx);
  }
  
  // 渲染水果纹理
  renderFruitTexture(ctx) {
    const seedColor = this.darkenColor(this.color, 0.35);
    const lineColor = this.darkenColor(this.color, 0.45);
    ctx.fillStyle = seedColor;
    ctx.strokeStyle = lineColor;
    
    const drawSeedsRing = (count, rRatio, sizeRatio) => {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * this.radius * rRatio;
        const y = Math.sin(angle) * this.radius * rRatio;
        ctx.beginPath();
        ctx.ellipse(x, y, this.radius * sizeRatio, this.radius * sizeRatio * 0.6, angle, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawSegments = (count, rRatio) => {
      ctx.lineWidth = Math.max(1, this.radius * 0.05);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * this.radius * rRatio, Math.sin(angle) * this.radius * rRatio);
        ctx.stroke();
      }
    };
    
    switch (this.fruitType) {
      case 'CHERRY':
        drawSeedsRing(6, 0.35, 0.08);
        break;
      case 'STRAWBERRY':
        drawSeedsRing(12, 0.5, 0.06);
        break;
      case 'GRAPE':
        drawSeedsRing(10, 0.55, 0.05);
        break;
      case 'LEMON':
        drawSegments(12, 0.85);
        drawSeedsRing(8, 0.4, 0.05);
        break;
      case 'ORANGE':
        drawSegments(10, 0.85);
        drawSeedsRing(10, 0.45, 0.05);
        break;
      case 'APPLE':
        drawSeedsRing(6, 0.35, 0.07);
        break;
      case 'KIWI':
        drawSeedsRing(20, 0.7, 0.04);
        // 中心淡色环
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'TOMATO':
        drawSegments(8, 0.8);
        drawSeedsRing(12, 0.6, 0.06);
        break;
      case 'COCONUT':
        // 椰子：外圈更厚，中心白色肉
        ctx.lineWidth = Math.max(4, this.radius * 0.15);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.95, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'WATERMELON':
        drawSeedsRing(14, 0.55, 0.06);
        break;
    }
  }
  
  // 渲染高光
  renderHighlight(ctx) {
    const highlightGradient = ctx.createRadialGradient(
      -this.radius * 0.4, -this.radius * 0.4, 0,
      -this.radius * 0.4, -this.radius * 0.4, this.radius * 0.6
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 颜色加深函数
  darkenColor(color, factor) {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - factor));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - factor));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - factor));
    
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }
  
  // 设置合成冷却
  setMergeCooldown(duration = 100) {
    this.canMerge = false;
    this.lastMergeTime = duration;
    this.mergeTimer = duration; // 添加mergeTimer属性以与物理引擎保持一致
  }
  
  // 获取下一级水果类型
  getNextLevel() {
    return this.nextLevel;
  }
  
  // 检查是否可以合成
  canMergeWith(otherFruit) {
    return this.fruitType === otherFruit.fruitType && 
           this.canMerge && 
           otherFruit.canMerge &&
           !this.isMarkedForRemoval && 
           !otherFruit.isMarkedForRemoval;
  }
}

// 水果管理器
export class FruitManager {
  constructor(physicsEngine) {
    this.physicsEngine = physicsEngine;
    this.fruits = [];
    this.nextFruitType = this.getRandomStarterFruit();
    this.mergeCallbacks = [];
    
    // 监听物理引擎的合成事件
    this.physicsEngine.onMerge((mergeData) => {
      this.handleMerge(mergeData);
    });
  }
  
  // 创建水果
  createFruit(type, x, y) {
    const fruit = new Fruit(type, x, y);
    this.fruits.push(fruit);
    this.physicsEngine.addBody(fruit);
    return fruit;
  }
  
  // 投放水果
  dropFruit(x, y) {
    // 统一在容器顶部上方生成，并赋予初始下落速度，避免长时间停留在危险线上方
    const area = GAME_CONFIG.GAME_AREA;
    const topY = area.centerY - area.radius;
    const spawnY = topY - (GAME_CONFIG?.DROP?.spawnAboveTopPx || 0);
    const fruit = this.createFruit(this.nextFruitType, x, spawnY);
    // 初始下落速度与轻微水平扰动（可选）
    if (fruit && fruit.velocity) {
      fruit.velocity.y = GAME_CONFIG?.DROP?.initialVelocityY || 240;
      const jitter = GAME_CONFIG?.DROP?.sideJitterPx || 0;
      if (jitter > 0) {
        const sign = Math.random() < 0.5 ? -1 : 1;
        fruit.velocity.x = sign * Math.random() * jitter;
      }
    }
    this.nextFruitType = this.getRandomStarterFruit();
    return fruit;
  }
  
  // 获取随机初始水果类型
  getRandomStarterFruit() {
    const starterFruits = (GAME_CONFIG?.GAMEPLAY?.STARTER_TYPES) || ['CHERRY', 'STRAWBERRY', 'GRAPE', 'LEMON', 'ORANGE'];
    return starterFruits[Math.floor(Math.random() * starterFruits.length)];
  }
  
  // 处理合成事件
  handleMerge(mergeData) {
    const { type, position } = mergeData;
    const config = FRUIT_CONFIG[type];
    
    // 玩法行为：消除 或 升级
    const behavior = GAME_CONFIG?.GAMEPLAY?.MERGE_BEHAVIOR || 'upgrade';

    if (behavior === 'eliminate') {
      // 在物理引擎中已标记团簇移除；这里统一转发事件与得分
      const multiplier = (GAME_CONFIG?.GAMEPLAY?.ELIMINATE_SCORE_MULTIPLIER || 1);
      const count = mergeData.count ?? 2;
      const score = (mergeData.score != null)
        ? mergeData.score
        : Math.floor((config?.score || 1) * count * multiplier);
      this.mergeCallbacks.forEach(callback => {
        try {
          callback({
            action: 'eliminate',
            // 兼容旧字段与新字段，二者都提供
            oldType: type,
            type,
            position,
            count,
            score
          });
        } catch {}
      });
    } else {
      if (config && config.nextLevel) {
        // 创建新的更高级水果
        const newFruit = this.createFruit(config.nextLevel, position.x, position.y);
        if (newFruit) {
          newFruit.setMergeCooldown(300); // 设置更长的合成冷却，防止新水果立即参与合成
          
          // 给新水果一个轻微的向上速度，避免立即下沉
          newFruit.velocity.y = -50;
          
          // 通知合成事件
          this.mergeCallbacks.forEach(callback => {
            callback({
              oldType: type,
              newType: config.nextLevel,
              position: position,
              score: config.score,
              newFruit: newFruit
            });
          });
        }
      }
    }
  }
  
  // 添加合成回调
  onMerge(callback) {
    this.mergeCallbacks.push(callback);
  }
  
  // 更新所有水果
  update(deltaTime) {
    // 清理已移除的水果
    this.fruits = this.fruits.filter(fruit => {
      if (fruit.isMarkedForRemoval) {
        return false;
      }
      fruit.update(deltaTime);
      return true;
    });
  }
  
  // 渲染所有水果
  render(ctx) {
    // 按照y坐标排序，确保正确的层次关系
    const sortedFruits = [...this.fruits].sort((a, b) => a.position.y - b.position.y);
    
    sortedFruits.forEach(fruit => {
      fruit.render(ctx);
    });
  }

  clear() {
    this.fruits = [];
  }
  
  // 获取下一个水果类型
  getNextFruitType() {
    return this.nextFruitType;
  }
  
  // 获取指定位置的水果
  getFruitAtPosition(position, radius = 5) {
    return this.fruits.find(fruit => 
      !fruit.isMarkedForRemoval && 
      fruit.position.distance(position) <= fruit.radius + radius
    );
  }
  
  // 获取所有水果
  getAllFruits() {
    return this.fruits.filter(fruit => !fruit.isMarkedForRemoval);
  }
  
  // 清空所有水果
  clear() {
    this.fruits.forEach(fruit => {
      this.physicsEngine.removeBody(fruit);
    });
    this.fruits = [];
  }
  
  // 获取统计信息
  getStats() {
    const activeFruits = this.getAllFruits();
    const fruitCounts = {};
    
    activeFruits.forEach(fruit => {
      fruitCounts[fruit.fruitType] = (fruitCounts[fruit.fruitType] || 0) + 1;
    });
    
    return {
      totalFruits: activeFruits.length,
      fruitCounts: fruitCounts,
      nextFruit: this.nextFruitType
    };
  }
}