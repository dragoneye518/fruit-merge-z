import { UI_THEME, FRUIT_CONFIG } from '../config/constants.js';

// 增强版粒子类
class Particle {
  constructor(x, y, options = {}) {
    this.position = { x, y };
    this.velocity = {
      x: options.velocityX || (Math.random() - 0.5) * 200,
      y: options.velocityY || (Math.random() - 0.5) * 200
    };
    this.acceleration = {
      x: options.accelerationX || 0,
      y: options.accelerationY || 100
    };
    
    this.life = options.life || 1.0;
    this.maxLife = this.life;
    this.size = options.size || 3;
    this.color = options.color || '#FFD700';
    this.alpha = options.alpha || 1.0;
    
    this.rotation = options.rotation || 0;
    this.rotationSpeed = options.rotationSpeed || 0;
    
    this.scale = options.scale || 1.0;
    this.scaleSpeed = options.scaleSpeed || 0;
    
    this.gravity = options.gravity !== undefined ? options.gravity : true;
    this.bounce = options.bounce || 0;
    this.friction = options.friction || 0.98;
    
    // 新增属性
    this.type = options.type || 'circle'; // circle, star, square, triangle, spark
    this.trail = options.trail || false;
    this.trailLength = options.trailLength || 5;
    this.trailPositions = [];
    this.glow = options.glow || false;
    this.glowSize = options.glowSize || 10;
    this.colorShift = options.colorShift || false;
    this.colorShiftSpeed = options.colorShiftSpeed || 2;
    this.hue = options.hue || 0;
    this.physics = options.physics || 'normal'; // normal, bouncy, floaty, magnetic
    this.magnetTarget = options.magnetTarget || null;
    this.magnetStrength = options.magnetStrength || 100;
  }
  
  update(deltaTime) {
    // 更新生命值
    this.life -= deltaTime;
    
    // 记录轨迹
    if (this.trail) {
      this.trailPositions.push({ x: this.position.x, y: this.position.y, alpha: this.alpha });
      if (this.trailPositions.length > this.trailLength) {
        this.trailPositions.shift();
      }
    }
    
    // 物理效果处理
    switch (this.physics) {
      case 'bouncy':
        // 弹性物理
        if (this.position.y > 500) { // 假设地面在y=500
          this.velocity.y *= -this.bounce;
          this.position.y = 500;
        }
        break;
      case 'floaty':
        // 漂浮物理（减少重力影响）
        this.acceleration.y *= 0.3;
        break;
      case 'magnetic':
        // 磁性物理（向目标点吸引）
        if (this.magnetTarget) {
          const dx = this.magnetTarget.x - this.position.x;
          const dy = this.magnetTarget.y - this.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 0) {
            this.acceleration.x += (dx / distance) * this.magnetStrength * deltaTime;
            this.acceleration.y += (dy / distance) * this.magnetStrength * deltaTime;
          }
        }
        break;
    }
    
    // 更新物理属性
    if (this.gravity) {
      this.velocity.x += this.acceleration.x * deltaTime;
      this.velocity.y += this.acceleration.y * deltaTime;
    }
    
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    
    // 应用摩擦力
    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;
    
    // 更新旋转
    this.rotation += this.rotationSpeed * deltaTime;
    
    // 更新缩放
    this.scale += this.scaleSpeed * deltaTime;
    
    // 颜色变化
    if (this.colorShift) {
      this.hue += this.colorShiftSpeed * deltaTime * 60;
      this.color = `hsl(${this.hue % 360}, 100%, 60%)`;
    }
    
    // 更新透明度（基于生命值）
    this.alpha = this.life / this.maxLife;
    
    return this.life > 0;
  }
  
  render(ctx) {
    if (this.life <= 0) return;
    
    ctx.save();
    
    // 渲染轨迹
    if (this.trail && this.trailPositions.length > 1) {
      for (let i = 0; i < this.trailPositions.length - 1; i++) {
        const pos = this.trailPositions[i];
        const alpha = (i / this.trailPositions.length) * pos.alpha * 0.5;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);
    
    // 发光效果
    if (this.glow) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.glowSize;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    
    ctx.fillStyle = this.color;
    
    // 根据类型渲染不同形状
    switch (this.type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'star':
        this.drawStar(ctx, 0, 0, 5, this.size, this.size * 0.5);
        break;
      case 'square':
        ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(-this.size, this.size);
        ctx.lineTo(this.size, this.size);
        ctx.closePath();
        ctx.fill();
        break;
      case 'spark':
        ctx.beginPath();
        ctx.moveTo(-this.size, 0);
        ctx.lineTo(0, -this.size * 0.3);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size * 0.3);
        ctx.closePath();
        ctx.fill();
        break;
    }
    
    ctx.restore();
  }
  
  drawStar(ctx, x, y, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    
    ctx.beginPath();
    ctx.moveTo(x, y - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
      rot += step;
    }
    
    ctx.lineTo(x, y - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}

// 特效系统类
export class EffectSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.particles = [];
    this.effects = [];
    // 屏幕震动
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeMagnitude = 0;
    // 全局震动控制（从 UI_THEME 读取）
    this.shakeEnabled = (typeof UI_THEME?.shakeEnabled === 'boolean') ? UI_THEME.shakeEnabled : false;
    this.shakeScale = (typeof UI_THEME?.shakeScale === 'number') ? UI_THEME.shakeScale : 0.25;
    this.shakeMax = (typeof UI_THEME?.shakeMax === 'number') ? UI_THEME.shakeMax : 2;
    // 仅底部事件允许震屏的来源控制
    this.comboShakeEnabled = (typeof UI_THEME?.comboShakeEnabled === 'boolean') ? UI_THEME.comboShakeEnabled : false;
    this.gameOverShakeEnabled = (typeof UI_THEME?.gameOverShakeEnabled === 'boolean') ? UI_THEME.gameOverShakeEnabled : false;
    // 合成事件震屏开关（默认关闭，避免多次震动）
    this.mergeShakeEnabled = (typeof UI_THEME?.mergeShakeEnabled === 'boolean') ? UI_THEME.mergeShakeEnabled : false;

    // 上限
    this.maxParticles = (typeof UI_THEME?.maxParticles === 'number') ? UI_THEME.maxParticles : 300;
    this.maxEffects = (typeof UI_THEME?.maxEffects === 'number') ? UI_THEME.maxEffects : 120;
  }
  
  // 游戏结束特效：强震动 + 大量粒子 + 多重光环
  createGameOverEffect(x, y, options = {}) {
    const ringCount = options.ringCount || 3;
    const particleCount = options.particleCount || 40;
    const colors = options.colors || ['#FF3B30', '#FF6B35', '#FFD700'];
    const shakeIntensity = options.shakeIntensity || 10;
    const shakeDuration = options.shakeDuration || 0.35;

    // 屏幕震动（受全局开关与强度缩放控制）
    if (this.shakeEnabled && this.gameOverShakeEnabled) {
      this.triggerScreenShake(shakeIntensity, shakeDuration);
    }

    // 爆裂粒子
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 160 + Math.random() * 140;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push(new Particle(x, y, {
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        accelerationY: 180,
        life: 0.8 + Math.random() * 0.6,
        size: 3 + Math.random() * 3,
        color,
        friction: 0.96,
        rotationSpeed: (Math.random() - 0.5) * 8,
        scaleSpeed: -0.6
      }));
    }

    // 多重冲击波光环（逐步扩散）
    for (let i = 0; i < ringCount; i++) {
      setTimeout(() => {
        this.createRingEffect(x, y, {
          startRadius: 18,
          endRadius: 120 + i * 40,
          life: 0.6 + i * 0.15,
          color: i % 2 === 0 ? '#FF3B30' : '#FFD700',
          lineWidth: 5 - i
        });
      }, i * 120);
    }
  }
  
  // 创建爆炸特效
  createExplosion(x, y, options = {}) {
    const particleCount = options.particleCount || 15;
    const colors = options.colors || ['#FFD700', '#FF6B35', '#FF8E53', '#FFA726'];
    const speed = options.speed || 150;
    const life = options.life || 1.5;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = speed * (0.5 + Math.random() * 0.5);
      
      this.particles.push(new Particle(x, y, {
        velocityX: Math.cos(angle) * velocity,
        velocityY: Math.sin(angle) * velocity,
        accelerationY: 200,
        life: life * (0.8 + Math.random() * 0.4),
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotationSpeed: (Math.random() - 0.5) * 10,
        scaleSpeed: -0.5,
        friction: 0.95
      }));
    }
  }
  
  // 增强版合并特效：多样化粒子 + 更丰富的视觉效果
  createMergeEffect(x, y, fruitType, options = {}) {
    const fruitColor = FRUIT_CONFIG[fruitType].color;
    const fruitSize = FRUIT_CONFIG[fruitType].radius;
    
    // 1. 增强的粒子爆炸效果（多种粒子类型）
    const particleCount = 12 + Math.floor(Math.random() * 8); // 12-20个粒子
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 120 + Math.random() * 100;
      const particleTypes = ['circle', 'star', 'spark'];
      const particleType = particleTypes[Math.floor(Math.random() * particleTypes.length)];
      
      this.particles.push(new Particle(x, y, {
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 30,
        accelerationY: 150,
        life: 0.8 + Math.random() * 0.6,
        size: 2 + Math.random() * 3,
        color: fruitColor,
        friction: 0.96,
        rotationSpeed: (Math.random() - 0.5) * 8,
        scaleSpeed: -0.4,
        type: particleType,
        glow: true,
        glowSize: 8,
        trail: Math.random() < 0.3,
        trailLength: 3,
        colorShift: Math.random() < 0.2,
        colorShiftSpeed: 1,
        hue: Math.random() * 360
      }));
    }
    
    // 2. 添加金色闪光粒子（增强版）
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 60;
      
      this.particles.push(new Particle(x, y, {
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 20,
        accelerationY: 120,
        life: 1.0 + Math.random() * 0.5,
        size: 3 + Math.random() * 2,
        color: '#FFD700',
        friction: 0.98,
        rotationSpeed: (Math.random() - 0.5) * 6,
        scaleSpeed: -0.3,
        type: 'star',
        glow: true,
        glowSize: 12,
        trail: true,
        trailLength: 4
      }));
    }
    
    // 3. 多层光环扩散效果
    this.createRingEffect(x, y, {
      startRadius: 8,
      endRadius: 45 + fruitSize * 0.5,
      life: 0.6,
      color: fruitColor,
      lineWidth: 3
    });
    
    // 延迟第二个光环
    setTimeout(() => {
      this.createRingEffect(x, y, {
        startRadius: 5,
        endRadius: 35 + fruitSize * 0.3,
        life: 0.4,
        color: '#FFD700',
        lineWidth: 2
      });
    }, 100);
    
    // 4. 星形爆裂效果
    this.createStarBurst(x, y, {
      starCount: 6,
      innerRadius: 8,
      outerRadius: 25 + fruitSize * 0.4,
      life: 0.5,
      color: fruitColor,
      rotationSpeed: 3
    });
    
    // 5. 添加磁性粒子效果（向中心聚集后爆散）
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = 60 + Math.random() * 40;
      
      this.particles.push(new Particle(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        {
          velocityX: 0,
          velocityY: 0,
          life: 1.2,
          size: 3,
          color: fruitColor,
          type: 'spark',
          glow: true,
          glowSize: 12,
          physics: 'magnetic',
          magnetTarget: { x, y },
          magnetStrength: 200,
          friction: 0.9
        }
      ));
    }
    
  // 6. 分数飞字动画（增强版）
    if (options.score) {
      this.createEnhancedFlyingScore(x, y, options.score, fruitColor);
    }
    
    // 7. 轻微屏幕震动（受合成震屏开关控制）
    if (this.shakeEnabled && this.mergeShakeEnabled) {
      this.triggerScreenShake(3, 0.15);
    }
  }

  // 创建消除特效（快速吸收+金粉爆裂+光环）
  createEliminateEffect(x, y, fruitType, options = {}) {
    const fruitColor = FRUIT_CONFIG[fruitType]?.color || '#FFFFFF';
    const particleCount = 10 + Math.floor(Math.random() * 10);

    // 向内收缩的粒子（制造“消失吸收”感）
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 90;
      this.particles.push(new Particle(x + Math.cos(angle) * 8, y + Math.sin(angle) * 8, {
        velocityX: -Math.cos(angle) * speed,
        velocityY: -Math.sin(angle) * speed,
        accelerationY: 120,
        life: 0.45 + Math.random() * 0.35,
        size: 2 + Math.random() * 2,
        color: fruitColor,
        friction: 0.97,
        scaleSpeed: -0.8
      }));
    }

    // 金色爆裂（少量）
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 60;
      this.particles.push(new Particle(x, y, {
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 20,
        accelerationY: 160,
        life: 0.5,
        size: 2,
        color: '#FFD700',
        friction: 0.96
      }));
    }

    // 冲击波光环（比合成更轻）
    this.createRingEffect(x, y, {
      startRadius: 5,
      endRadius: 28,
      life: 0.3,
      color: fruitColor,
      lineWidth: 2
    });

    // 可选：飞字分数
    if (options.score) {
      this.createFlyingScore(x, y - 6, `消除 +${options.score}`);
    }
  }
  
  // 创建分数飞字特效
  createEnhancedFlyingScore(x, y, score, color) {
    this.effects.push({
      type: 'enhanced_flying_score',
      position: { x, y },
      text: `+${score}`,
      life: 2.0,
      maxLife: 2.0,
      velocityY: -120,
      scale: 0.5,
      targetScale: 1.5,
      alpha: 1.0,
      color: color,
      glowColor: '#FFD700',
      bouncePhase: 0
    });
  }
  
  // 创建光环特效
  createRingEffect(x, y, options = {}) {
    this.effects.push({
      type: 'ring',
      position: { x, y },
      startRadius: options.startRadius || 5,
      endRadius: options.endRadius || 50,
      currentRadius: options.startRadius || 5,
      life: options.life || 1.0,
      maxLife: options.life || 1.0,
      color: options.color || '#FFD700',
      lineWidth: options.lineWidth || 2,
      alpha: 1.0
    });
  }
  
  // 创建星星爆发特效
  createStarBurst(x, y, options = {}) {
    const starCount = options.starCount || 6;
    const size = options.size || 10;
    const life = options.life || 1.0;
    const color = options.color || '#FFFFFF';
    
    for (let i = 0; i < starCount; i++) {
      const angle = (Math.PI * 2 * i) / starCount;
      const distance = 30 + Math.random() * 20;
      
      this.effects.push({
        type: 'star',
        position: {
          x: x + Math.cos(angle) * distance,
          y: y + Math.sin(angle) * distance
        },
        size: size,
        life: life * (0.8 + Math.random() * 0.4),
        maxLife: life,
        color: color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 5,
        scale: 1.0,
        scaleSpeed: -1.0,
        alpha: 1.0
      });
    }
  }
  
  // 创建连击特效
  // 增强版连击特效
  createComboEffect(x, y, combo, options = {}) {
    // 根据连击数确定特效强度
    const isHighCombo = combo >= 5;
    const isSuperCombo = combo >= 10;
    const isMegaCombo = combo >= 20;
    
    // 创建连击文字特效（增强版）
    this.effects.push({
      type: 'combo',
      position: { x, y },
      combo: combo,
      life: 2.5,
      maxLife: 2.5,
      scale: 0.3,
      targetScale: isMegaCombo ? 1.8 : isSuperCombo ? 1.5 : isHighCombo ? 1.3 : 1.0,
      alpha: 1.0,
      color: isMegaCombo ? '#FF1744' : isSuperCombo ? '#FF6B35' : isHighCombo ? '#FF9800' : '#FFD700',
      pulseSpeed: isMegaCombo ? 8 : isSuperCombo ? 6 : isHighCombo ? 4 : 2,
      rainbow: isMegaCombo,
      glow: true,
      glowSize: combo * 2
    });
    
    // 创建连击粒子（增强版）
    const particleCount = Math.min(combo * 3, 30);
    const particleTypes = isMegaCombo ? ['star', 'spark', 'circle'] : 
                         isSuperCombo ? ['star', 'circle'] : ['circle'];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = (100 + combo * 15) * (0.8 + Math.random() * 0.4);
      const particleType = particleTypes[Math.floor(Math.random() * particleTypes.length)];
      const colors = isMegaCombo ? ['#FF1744', '#E91E63', '#9C27B0'] :
                     isSuperCombo ? ['#FF6B35', '#FF8E53', '#FFA726'] : 
                     isHighCombo ? ['#FF9800', '#FFA726', '#FFB74D'] : 
                     ['#FFD700', '#FFA726'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      this.particles.push(new Particle(x, y, {
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        accelerationY: 100,
        life: 1.0 + combo * 0.05,
        size: 2 + Math.random() * (isMegaCombo ? 4 : 2),
        color: color,
        friction: 0.96,
        rotationSpeed: (Math.random() - 0.5) * 8,
        type: particleType,
        glow: true,
        glowSize: 6 + combo * 0.5,
        trail: isSuperCombo,
        trailLength: 4,
        colorShift: isMegaCombo,
        colorShiftSpeed: 3,
        hue: Math.random() * 360
      }));
    }
    
    // 创建连击环效果
    const ringCount = Math.min(Math.floor(combo / 3), 4);
    for (let i = 0; i < ringCount; i++) {
      this.effects.push({
        type: 'ring',
        position: { x, y },
        startRadius: 10 + i * 15,
        endRadius: 60 + i * 30,
        currentRadius: 10 + i * 15,
        color: isMegaCombo ? '#FF1744' : isSuperCombo ? '#FF6B35' : '#FFD700',
        alpha: 0.8 - i * 0.15,
        life: 0.8 + i * 0.2,
        maxLife: 0.8 + i * 0.2,
        lineWidth: 3
      });
    }
    
    // 屏幕震动效果（受全局开关控制并明显减弱）
    if (this.shakeEnabled && this.comboShakeEnabled) {
      if (isMegaCombo) {
        this.triggerScreenShake(3, 0.18);
      } else if (isSuperCombo) {
        this.triggerScreenShake(2, 0.14);
      } else if (isHighCombo) {
        this.triggerScreenShake(1.5, 0.12);
      }
    }
  }
  
  // 创建等级提升特效
  createLevelUpEffect(x, y, level, options = {}) {
    // 创建等级文字特效
    this.effects.push({
      type: 'levelup',
      position: { x, y },
      level: level,
      life: 3.0,
      maxLife: 3.0,
      scale: 0.3,
      targetScale: 1.5,
      alpha: 1.0,
      pulseSpeed: 2.0
    });
    
    // 创建庆祝粒子
    this.createExplosion(x, y, {
      particleCount: 30,
      colors: ['#FFD700', '#FF6B35', '#4ECDC4', '#45B7D1'],
      speed: 200,
      life: 2.0
    });
    
    // 创建多个光环
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.createRingEffect(x, y, {
          startRadius: 20,
          endRadius: 100,
          life: 1.5,
          color: i % 2 === 0 ? '#FFD700' : '#FF6B35',
          lineWidth: 4
        });
      }, i * 200);
    }
  }
  
  // 增强版水果掉落轨迹特效
  createDropTrail(x, y, options = {}) {
    const particleCount = options.particleCount || 8;
    const colors = options.colors || ['#87CEEB', '#B0E0E6', '#E0F6FF'];

    // 主轨迹粒子（增强版）
    for (let i = 0; i < particleCount; i++) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = Math.random() * 10;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      this.particles.push(new Particle(x + offsetX, y + offsetY, {
        velocityX: (Math.random() - 0.5) * 30,
        velocityY: Math.random() * 50 + 20,
        accelerationY: 80,
        life: 0.8 + Math.random() * 0.4,
        size: 2 + Math.random() * 2,
        color: color,
        friction: 0.98,
        type: 'circle',
        glow: true,
        glowSize: 6,
        trail: true,
        trailLength: 5,
        physics: 'floaty'
      }));
    }

    // 闪烁粒子（新增）
    for (let i = 0; i < 4; i++) {
      this.particles.push(new Particle(x, y, {
        velocityX: (Math.random() - 0.5) * 60,
        velocityY: (Math.random() - 0.5) * 60,
        life: 0.3,
        size: 1 + Math.random(),
        color: '#FFFFFF',
        type: 'spark',
        glow: true,
        glowSize: 10,
        colorShift: true,
        colorShiftSpeed: 5,
        hue: Math.random() * 360
      }));
    }
  }

  // 增强版冲击（落地/碰撞）特效
  createImpactEffect(x, y, options = {}) {
    const strength = options.strength || 50;
    const noShake = options.noShake === true;
    const color = options.color || '#FFFFFF';
    const particleCount = Math.min(12, 4 + Math.floor(strength / 16));
    const speed = 60 + strength * 0.6;

    // 爆裂粒子（向上扩散）- 增强版
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
      const vx = Math.cos(angle) * speed * (0.4 + Math.random() * 0.6);
      const vy = Math.sin(angle) * speed * (0.2 + Math.random() * 0.8);
      const particleTypes = ['circle', 'star', 'square', 'spark'];
      const particleType = particleTypes[Math.floor(Math.random() * particleTypes.length)];
      
      this.particles.push(new Particle(x, y, {
        velocityX: vx,
        velocityY: vy - 30,
        accelerationY: 140,
        life: 0.45 + Math.random() * 0.35,
        size: 2 + Math.random() * 2,
        color: color,
        friction: 0.96,
        rotationSpeed: (Math.random() - 0.5) * 5,
        scaleSpeed: -0.5,
        type: particleType,
        glow: true,
        glowSize: 7 + strength * 0.08,
        trail: Math.random() < 0.3,
        trailLength: 4,
        physics: Math.random() < 0.25 ? 'bouncy' : 'normal',
        bounce: 0.5
      }));
    }

    // 地面尘土效果 - 增强版
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = 50 + Math.random() * 30;
      this.particles.push(new Particle(x, y, {
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        accelerationY: 80,
        life: 0.5 + Math.random() * 0.3,
        size: 2.5 + Math.random() * 1.5,
        color: '#D2B48C',
        alpha: 0.6,
        friction: 0.93,
        scaleSpeed: -0.25,
        type: 'square',
        glow: false,
        trail: true,
        trailLength: 3,
        physics: 'floaty'
      }));
    }

    // 冲击波光环
    this.createRingEffect(x, y, {
      startRadius: 6,
      endRadius: 24 + strength * 0.25,
      life: 0.36,
      color: color,
      lineWidth: 2
    });
    
    // 根据强度触发震动（更高阈值且受开关控制；允许禁用）
    if (!noShake && this.shakeEnabled && strength > 80) {
      this.triggerScreenShake(Math.min(3, strength * 0.05), 0.10);
    }
  }

  // 触发屏幕震动
  triggerScreenShake(intensity = 6, duration = 0.12) {
    // 全局关闭时直接忽略
    if (!this.shakeEnabled) return;
    // 统一降幅与上限，避免过强的冲击感
    const capped = Math.min(intensity, this.shakeMax) * this.shakeScale;
    this.shakeMagnitude = capped;
    this.shakeDuration = Math.min(duration, 0.12);
    this.shakeTime = this.shakeDuration;
  }

  // 供渲染阶段获取当前震动偏移
  getShakeOffset() {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    const t = this.shakeTime / this.shakeDuration;
    const m = this.shakeMagnitude * t;
    return {
      x: (Math.random() - 0.5) * 2 * m,
      y: (Math.random() - 0.5) * 2 * m
    };
  }

  // 创建危险区域闪烁特效
  createDangerEffect(x, y, width, height) {
    this.effects.push({
      type: 'danger',
      position: { x, y },
      width,
      height,
      life: 0.5,
      maxLife: 0.5,
      alpha: 0
    });
  }
  
  // 更新所有特效和粒子
  update(deltaTime) {
    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update(deltaTime)) {
        this.particles.splice(i, 1);
      }
    }
    
    // 更新特效
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (!this.updateEffect(this.effects[i], deltaTime)) {
        this.effects.splice(i, 1);
      }
    }

    // 更新震动时间
    if (this.shakeTime > 0) {
      this.shakeTime -= deltaTime;
      if (this.shakeTime < 0) this.shakeTime = 0;
    }

    // 上限控制：超出时按比例裁剪，避免卡顿
    if (this.particles.length > this.maxParticles) {
      const removeCount = this.particles.length - this.maxParticles;
      this.particles.splice(0, removeCount);
    }
    if (this.effects.length > this.maxEffects) {
      const removeCount = this.effects.length - this.maxEffects;
      this.effects.splice(0, removeCount);
    }
  }
  
  // 更新单个特效
  updateEffect(effect, deltaTime) {
    effect.life -= deltaTime;
    if (effect.life <= 0) return false;
    
    switch (effect.type) {
      case 'ring':
        effect.currentRadius += (effect.endRadius - effect.startRadius) * (deltaTime / effect.maxLife);
        effect.alpha = effect.life / effect.maxLife;
        break;
      case 'star':
        effect.rotation += effect.rotationSpeed * deltaTime;
        effect.scale += effect.scaleSpeed * deltaTime;
        effect.alpha = effect.life / effect.maxLife;
        break;
      case 'combo':
        // 数字放大效果：先快速放大，然后缓慢缩小
        const comboProgress = 1 - (effect.life / effect.maxLife);
        if (comboProgress < 0.2) {
          // 快速放大阶段
          effect.scale = 0.5 + (effect.targetScale * 1.3 - 0.5) * (comboProgress / 0.2);
        } else if (comboProgress < 0.4) {
          // 回弹到目标大小
          const bounceProgress = (comboProgress - 0.2) / 0.2;
          effect.scale = effect.targetScale * 1.3 - (effect.targetScale * 0.3) * bounceProgress;
        } else {
          // 保持目标大小
          effect.scale = effect.targetScale;
        }
        
        // 透明度渐变
        effect.alpha = Math.min(1, effect.life / effect.maxLife * 2);
        
        // 高连击时的额外震屏效果（受全局开关控制并减弱）
        if (this.shakeEnabled && this.comboShakeEnabled && effect.combo >= 10 && comboProgress < 0.1) {
          const shakeIntensity = Math.min(effect.combo * 0.2, 3);
          this.triggerScreenShake(shakeIntensity, 0.12);
        }
        break;
      case 'levelup':
        if (effect.scale < effect.targetScale) {
          effect.scale += (effect.targetScale - effect.scale) * 0.05;
        }
        effect.alpha = Math.sin(effect.life * effect.pulseSpeed) * 0.5 + 0.5;
        break;
      case 'danger':
        effect.alpha = Math.sin(effect.life / effect.maxLife * Math.PI);
        break;
      case 'flying_score':
        effect.position.y += effect.velocityY * deltaTime;
        effect.alpha = effect.life / effect.maxLife;
        break;
      case 'enhanced_flying_score':
        effect.position.y += effect.velocityY * deltaTime;
        effect.bouncePhase += deltaTime * 8;
        
        // 缩放动画：从小到大再到小
        const scaleProgress = 1 - (effect.life / effect.maxLife);
        if (scaleProgress < 0.3) {
          effect.scale = 0.5 + (effect.targetScale - 0.5) * (scaleProgress / 0.3);
        } else if (scaleProgress > 0.7) {
          const fadeProgress = (scaleProgress - 0.7) / 0.3;
          effect.scale = effect.targetScale * (1 - fadeProgress * 0.5);
        } else {
          effect.scale = effect.targetScale;
        }
        
        // 透明度和弹跳效果
        effect.alpha = Math.max(0, effect.life / effect.maxLife);
        effect.position.y += Math.sin(effect.bouncePhase) * 2;
        break;
      case 'milestone':
        // 里程碑特效的更新逻辑
        effect.position.y += effect.velocityY * deltaTime;
        
        // 脉冲动画
        effect.pulsePhase += deltaTime * effect.pulseSpeed;
        
        // 缩放动画：从小到大再到小
        const milestoneScaleProgress = 1 - (effect.life / effect.maxLife);
        if (milestoneScaleProgress < 0.2) {
          effect.scale = 0.3 + (effect.targetScale - 0.3) * (milestoneScaleProgress / 0.2);
        } else if (milestoneScaleProgress > 0.8) {
          const fadeProgress = (milestoneScaleProgress - 0.8) / 0.2;
          effect.scale = effect.targetScale * (1 - fadeProgress * 0.3);
        } else {
          effect.scale = effect.targetScale;
        }
        
        // 彩虹色彩变化
        const hue = (Date.now() * 0.005 + effect.colorOffset) % 360;
        effect.color = `hsl(${hue}, 100%, 60%)`;
        
        // 透明度
        effect.alpha = Math.max(0, effect.life / effect.maxLife);
        break;
    }
    
    return true;
  }
  
  // 渲染所有特效和粒子
  render() {
    if (!this.ctx) return;
    
    // 渲染粒子
    for (const particle of this.particles) {
      particle.render(this.ctx);
    }
    
    // 渲染特效
    for (const effect of this.effects) {
      this.renderEffect(effect);
    }
  }
  
  // 渲染单个特效
  renderEffect(effect) {
    if (effect.life <= 0) return;
    
    this.ctx.save();
    this.ctx.globalAlpha = effect.alpha;
    
    switch (effect.type) {
      case 'ring':
        this.renderRingEffect(effect);
        break;
      case 'star':
        this.renderStarEffect(effect);
        break;
      case 'combo':
        this.renderComboEffect(effect);
        break;
      case 'levelup':
        this.renderLevelUpEffect(effect);
        break;
      case 'danger':
        this.renderDangerEffect(effect);
        break;
      case 'flying_score':
        this.renderFlyingScoreEffect(effect);
        break;
      case 'enhanced_flying_score':
        this.renderEnhancedFlyingScoreEffect(effect);
        break;
      case 'milestone':
        this.renderMilestoneEffect(effect);
        break;
    }
    
    this.ctx.restore();
  }
  
  // 渲染光环特效
  renderRingEffect(effect) {
    this.ctx.strokeStyle = effect.color;
    this.ctx.lineWidth = effect.lineWidth;
    this.ctx.beginPath();
    this.ctx.arc(effect.position.x, effect.position.y, effect.currentRadius, 0, Math.PI * 2);
    this.ctx.stroke();
  }
  
  // 渲染星星特效
  renderStarEffect(effect) {
    this.ctx.translate(effect.position.x, effect.position.y);
    this.ctx.rotate(effect.rotation);
    this.ctx.scale(effect.scale, effect.scale);
    
    this.ctx.fillStyle = effect.color;
    this.drawStar(this.ctx, 0, 0, 5, effect.size, effect.size * 0.5);
  }
  
  // 渲染连击特效
  // 渲染连击特效（增强版）
  renderComboEffect(effect) {
    this.ctx.translate(effect.position.x, effect.position.y);
    
    // 脉冲缩放效果
    const pulseScale = 1 + Math.sin(effect.life * effect.pulseSpeed * Math.PI) * 0.1;
    this.ctx.scale(effect.scale * pulseScale, effect.scale * pulseScale);
    
    // 彩虹色彩变化（针对超级连击）
    let fillColor = effect.color;
    if (effect.rainbow) {
      const hue = (Date.now() * 0.01) % 360;
      fillColor = `hsl(${hue}, 100%, 60%)`;
    }
    
    // 发光效果
    if (effect.glow) {
      this.ctx.shadowColor = fillColor;
      this.ctx.shadowBlur = effect.glowSize;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    }
    
    // 字体大小根据连击数调整
    const fontSize = Math.min(24 + effect.combo * 2, 48);
    this.ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    this.ctx.fillStyle = fillColor;
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 3;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const text = `COMBO x${effect.combo}`;
    
    // 多层描边效果
    this.ctx.strokeText(text, 0, 0);
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = '#000000';
    this.ctx.strokeText(text, 0, 0);
    
    // 主文字
    this.ctx.fillText(text, 0, 0);
    
    // 添加额外的装饰文字（高连击时）
    if (effect.combo >= 20) {
      this.ctx.font = '16px Arial, sans-serif';
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillText('MEGA COMBO!', 0, 35);
    } else if (effect.combo >= 10) {
      this.ctx.font = '14px Arial, sans-serif';
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillText('SUPER COMBO!', 0, 30);
    } else if (effect.combo >= 5) {
      this.ctx.font = '12px Arial, sans-serif';
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillText('GREAT!', 0, 25);
    }
  }
  
  // 渲染等级提升特效
  renderLevelUpEffect(effect) {
    this.ctx.translate(effect.position.x, effect.position.y);
    this.ctx.scale(effect.currentScale || effect.scale, effect.currentScale || effect.scale);
    
    this.ctx.font = 'bold 32px Arial, sans-serif';
    this.ctx.fillStyle = '#FFD700';
    this.ctx.strokeStyle = '#FF6B35';
    this.ctx.lineWidth = 3;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const text = `LEVEL ${effect.level}!`;
    this.ctx.strokeText(text, 0, -10);
    this.ctx.fillText(text, 0, -10);
    
    this.ctx.font = '18px Arial, sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText('LEVEL UP!', 0, 20);
  }
  
  // 渲染危险警告特效
  renderDangerEffect(effect) {
    this.ctx.strokeStyle = effect.color;
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([10, 5]);
    
    this.ctx.beginPath();
    this.ctx.moveTo(effect.position.x - effect.width / 2, effect.position.y);
    this.ctx.lineTo(effect.position.x + effect.width / 2, effect.position.y);
    this.ctx.stroke();
    
    this.ctx.setLineDash([]);
  }
  
  // 绘制星星形状
  drawStar(ctx, x, y, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    
    ctx.beginPath();
    ctx.moveTo(x, y - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      const xOuter = x + Math.cos(rot) * outerRadius;
      const yOuter = y + Math.sin(rot) * outerRadius;
      ctx.lineTo(xOuter, yOuter);
      rot += step;
      
      const xInner = x + Math.cos(rot) * innerRadius;
      const yInner = y + Math.sin(rot) * innerRadius;
      ctx.lineTo(xInner, yInner);
      rot += step;
    }
    
    ctx.lineTo(x, y - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
  
  // 清理所有特效
  clear() {
    this.particles = [];
    this.effects = [];
  }
  
  // 获取特效数量（用于性能监控）
  getEffectCount() {
    return {
      particles: this.particles.length,
      effects: this.effects.length,
      total: this.particles.length + this.effects.length
    };
  }

  renderDangerEffect(effect) {
    this.ctx.fillStyle = `rgba(255, 0, 0, ${effect.alpha * 0.5})`;
    this.ctx.fillRect(effect.position.x, effect.position.y, effect.width, effect.height);
  }

  // 渲染分数飞字特效
  renderFlyingScoreEffect(effect) {
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillStyle = `rgba(255, 215, 0, ${effect.alpha})`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(effect.text, effect.position.x, effect.position.y);
  }

  // 渲染增强版分数飞字特效
  renderEnhancedFlyingScoreEffect(effect) {
    this.ctx.save();
    this.ctx.translate(effect.position.x, effect.position.y);
    this.ctx.scale(effect.scale, effect.scale);
    
    // 外发光效果
    this.ctx.shadowColor = effect.glowColor;
    this.ctx.shadowBlur = 15;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    
    // 主文字
    this.ctx.font = 'bold 28px Arial';
    this.ctx.fillStyle = effect.color;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(effect.text, 0, 0);
    
    // 描边效果
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.strokeText(effect.text, 0, 0);
    
    this.ctx.restore();
  }

  // 渲染里程碑特效
  renderMilestoneEffect(effect) {
    this.ctx.save();
    this.ctx.translate(effect.position.x, effect.position.y);
    
    // 脉冲效果
    const pulseScale = 1 + Math.sin(effect.life * effect.pulseSpeed * Math.PI) * 0.2;
    this.ctx.scale(effect.scale * pulseScale, effect.scale * pulseScale);
    
    // 彩虹发光效果
    this.ctx.shadowColor = effect.color;
    this.ctx.shadowBlur = 25;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    
    // 主文字
    this.ctx.font = 'bold 36px Arial';
    this.ctx.fillStyle = effect.color;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(effect.text, 0, 0);
    
    // 白色描边
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(effect.text, 0, 0);
    
    // 内层金色描边
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 1;
    this.ctx.strokeText(effect.text, 0, 0);
    
    this.ctx.restore();
  }
}