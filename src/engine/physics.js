import { GAME_CONFIG, FRUIT_CONFIG } from '../config/constants.js';

// 2D向量类
class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  
  add(vector) {
    return new Vector2(this.x + vector.x, this.y + vector.y);
  }
  
  subtract(vector) {
    return new Vector2(this.x - vector.x, this.y - vector.y);
  }
  
  multiply(scalar) {
    return new Vector2(this.x * scalar, this.y * scalar);
  }
  
  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  
  normalize() {
    const mag = this.magnitude();
    if (mag === 0) return new Vector2(0, 0);
    return new Vector2(this.x / mag, this.y / mag);
  }
  
  distance(vector) {
    return this.subtract(vector).magnitude();
  }
}

// 物理刚体类
class RigidBody {
  constructor(options = {}) {
    this.position = new Vector2(options.x || 0, options.y || 0);
    this.velocity = new Vector2(0, 0);
    this.acceleration = new Vector2(0, 0);
    this.radius = options.radius || 20;
    this.mass = options.mass || 1;
    this.restitution = options.restitution || GAME_CONFIG.PHYSICS.restitution;
    this.friction = options.friction || GAME_CONFIG.PHYSICS.friction;
    this.isStatic = options.isStatic || false;
    this.id = options.id || Math.random().toString(36).substr(2, 9);
    this.type = options.type || 'default';
    
    // 合成相关
    this.mergeTimer = 0;
    this.canMerge = true;
    this.isMarkedForRemoval = false;
    // 落地冲击单次触发标记（避免持续抖动）
    this.recentBottomImpact = false;
    // 底部接触与冷却（防止抖动连发）
    this.bottomContact = false;
    this.bottomImpactCooldown = 0;
    // 每个水果仅落地触发一次震屏
    this.hasBottomImpactTriggered = false; // 兼容旧逻辑
    // 限制落地震动次数（最多两次）
    this.bottomImpactCount = 0;
    // 睡眠/唤醒（底部长期稳定后进入睡眠）
    this.sleepTimer = 0;
    this.isSleeping = false;
    // 冲击源标记与计时：用于控制冲量传播与底部抑制
    this.isImpactSource = false;
    this.impactSourceTimer = 0;
  }
  
  // 应用力
  applyForce(force) {
    if (this.isStatic) return;
    const acceleration = force.multiply(1 / this.mass);
    this.acceleration = this.acceleration.add(acceleration);
  }
  
  // 更新物理状态
  update(deltaTime) {
    if (this.isStatic || this.isMarkedForRemoval) return;

    // 睡眠状态：保持静止，仍然消化冷却/计时器
    if (this.isSleeping) {
      this.acceleration = new Vector2(0, 0);
      this.velocity = new Vector2(0, 0);
      // 冷却计时（落地冲击）
      if (this.bottomImpactCooldown > 0) {
        this.bottomImpactCooldown -= deltaTime;
        if (this.bottomImpactCooldown < 0) this.bottomImpactCooldown = 0;
      }
      // 合成计时器
      if (this.mergeTimer > 0) {
        this.mergeTimer -= deltaTime;
        if (this.mergeTimer <= 0) {
          this.canMerge = true;
        }
      }
      return;
    }
    
    // 应用重力
    this.applyForce(new Vector2(0, GAME_CONFIG.PHYSICS.gravity * this.mass));
    
    // 更新速度
    this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
    
    // 应用空气阻力
    this.velocity = this.velocity.multiply(GAME_CONFIG.PHYSICS.airResistance);

    // 标记冲击源：非底部接触且垂直下落速度超过阈值
    const impactVth = (GAME_CONFIG?.PHYSICS?.impactSourceVelY ?? 160);
    const impactDuration = (GAME_CONFIG?.PHYSICS?.impactSourceDurationSec ?? 0.6);
    if (!this.bottomContact && this.velocity.y > impactVth) {
      this.isImpactSource = true;
      this.impactSourceTimer = impactDuration;
    }
    
    // 静止判定：仅在接触地面时对极小速度进行夹紧，避免自由下落阶段被误判为静止
    const settleThreshold = GAME_CONFIG.PHYSICS.settleThreshold || 8;
    if (this.bottomContact) {
      if (Math.abs(this.velocity.x) < settleThreshold) {
        this.velocity.x = 0;
      }
      if (Math.abs(this.velocity.y) < settleThreshold) {
        this.velocity.y = 0;
      }
    }
    
    // 限制最大速度
    const speed = this.velocity.magnitude();
    if (speed > GAME_CONFIG.PHYSICS.maxVelocity) {
      this.velocity = this.velocity.normalize().multiply(GAME_CONFIG.PHYSICS.maxVelocity);
    }
    
    // 更新位置
    this.position = this.position.add(this.velocity.multiply(deltaTime));
    
    // 重置加速度
    this.acceleration = new Vector2(0, 0);

    // 冷却计时（落地冲击）
    if (this.bottomImpactCooldown > 0) {
      this.bottomImpactCooldown -= deltaTime;
      if (this.bottomImpactCooldown < 0) this.bottomImpactCooldown = 0;
    }

    // 底部近似静止时夹紧速度防抖（防止微小数值导致持续轻抖）
    const settleY = (GAME_CONFIG?.DANGER?.settleSpeedY ?? 32);
    if (this.bottomContact && Math.abs(this.velocity.y) < settleY) {
      this.velocity.y = 0;
    }

    // 冲击源计时器衰减与接触底部时重置
    if (this.impactSourceTimer > 0) {
      this.impactSourceTimer -= deltaTime;
      if (this.impactSourceTimer <= 0) {
        this.isImpactSource = false;
        this.impactSourceTimer = 0;
      }
    } else if (this.bottomContact) {
      this.isImpactSource = false;
    }

    // 睡眠判定：底部持续低速一段时间则进入睡眠
    const sleepEnabled = !!(GAME_CONFIG?.PHYSICS?.sleepEnabled);
    if (sleepEnabled && this.bottomContact) {
      const vth = GAME_CONFIG?.PHYSICS?.sleepVelThreshold ?? 6;
      const tth = GAME_CONFIG?.PHYSICS?.sleepTimeoutSec ?? 0.9;
      if (Math.abs(this.velocity.x) < vth && Math.abs(this.velocity.y) < vth) {
        this.sleepTimer += deltaTime;
        if (this.sleepTimer >= tth) {
          this.isSleeping = true;
          this.velocity.x = 0;
          this.velocity.y = 0;
        }
      } else {
        this.sleepTimer = 0;
      }
    } else {
      this.sleepTimer = 0;
    }
    
    // 更新合成计时器
    if (this.mergeTimer > 0) {
      this.mergeTimer -= deltaTime;
      if (this.mergeTimer <= 0) {
        this.canMerge = true;
      }
    }
  }
  
  // 边界约束
  constrainToContainer(container) {
    const { centerX, centerY, radius: containerRadius } = container;
    const center = new Vector2(centerX, centerY);
    const distance = this.position.distance(center);
    
    if (distance + this.radius > containerRadius) {
      // 计算约束位置
      const direction = this.position.subtract(center).normalize();
      const constrainedPosition = center.add(direction.multiply(containerRadius - this.radius));
      
      // 计算碰撞响应
      const normal = direction;
      const relativeVelocity = this.velocity;
      const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;
      
      // 始终进行位置约束，防止继续穿透
      this.position = constrainedPosition;
      
      // 反射法向速度分量并施加弹性（避免穿底）
      const impulse = -(1 + this.restitution) * velocityAlongNormal;
      this.velocity = this.velocity.add(normal.multiply(impulse));
      
      // 应用摩擦力（切向速度阻尼）
      const tangent = new Vector2(-normal.y, normal.x);
      const tangentVelocity = relativeVelocity.x * tangent.x + relativeVelocity.y * tangent.y;
      this.velocity = this.velocity.subtract(tangent.multiply(tangentVelocity * this.friction));
    }
  }
}

// 物理引擎主类
export class PhysicsEngine {
  constructor() {
    this.bodies = [];
    this.constraints = [];
    this.collisionPairs = [];
    this.mergeCallbacks = [];
    this.impactCallbacks = [];
    this.container = GAME_CONFIG.GAME_AREA; // 兼容旧配置（不再用于约束）
    // 世界边界（屏幕宽度与地面高度）
    this.world = {
      width: GAME_CONFIG?.CANVAS?.width || 375,
      height: GAME_CONFIG?.CANVAS?.height || 667,
      groundHeight: GAME_CONFIG?.GROUND?.height ?? 28,
      leftMargin: 6,
      rightMargin: 6
    };
  }

  clear() {
    this.bodies = [];
  }
  
  // 添加刚体
  addBody(body) {
    this.bodies.push(body);
    return body;
  }
  
  // 移除刚体
  removeBody(body) {
    const index = this.bodies.indexOf(body);
    if (index > -1) {
      this.bodies.splice(index, 1);
    }
  }
  
  // 标记刚体为待移除
  markForRemoval(body) {
    body.isMarkedForRemoval = true;
  }
  
  // 清理已标记的刚体
  cleanupMarkedBodies() {
    this.bodies = this.bodies.filter(body => !body.isMarkedForRemoval);
  }
  
  // 添加合成回调
  onMerge(callback) {
    this.mergeCallbacks.push(callback);
  }

  // 添加碰撞冲击回调
  onImpact(callback) {
    this.impactCallbacks.push(callback);
  }

  emitImpact(event) {
    this.impactCallbacks.forEach(cb => {
      try { cb(event); } catch (e) { /* ignore */ }
    });
  }
  
  // 物理步进
  step(deltaTime) {
    // 更新所有刚体
    this.bodies.forEach(body => {
      body.update(deltaTime);
      this.constrainBodyToWorld(body);
    });
    
    // 碰撞检测和响应
    this.detectCollisions();
    this.resolveCollisions();
    this.detectBoundaryImpacts();
    
    // 检测合成或消除（底部消除改由 detectBoundaryImpacts 处理）
    const behavior = GAME_CONFIG?.GAMEPLAY?.MERGE_BEHAVIOR;
    if (behavior === 'eliminate') {
      this.detectEliminations();
    } else if (behavior === 'eliminate_on_bottom') {
      // 底部消除逻辑在 detectBoundaryImpacts 中处理，这里不进行全局消除或升级合成
    } else {
      // 默认或 'upgrade' 走传统升级合成
      this.detectMerges();
    }
    
    // 清理标记的刚体
    this.cleanupMarkedBodies();
  }

  // 将刚体约束在世界边界（左右墙 + 底部平地）
  constrainBodyToWorld(body) {
    if (body.isStatic || body.isMarkedForRemoval) return;
    const { width, height, groundHeight, leftMargin, rightMargin } = this.world;
    const leftX = leftMargin + body.radius;
    const rightX = width - rightMargin - body.radius;
    const groundTopY = height - groundHeight; // 草地顶边

    // 左右边界约束
    if (body.position.x < leftX) {
      body.position.x = leftX;
      if (body.velocity.x < 0) body.velocity.x = -body.velocity.x * body.restitution;
      // 切向阻尼（Y方向微降），避免贴边抖动
      body.velocity.y *= body.friction;
    } else if (body.position.x > rightX) {
      body.position.x = rightX;
      if (body.velocity.x > 0) body.velocity.x = -body.velocity.x * body.restitution;
      body.velocity.y *= body.friction;
    }

    // 地面约束（平地）
    const bottomY = groundTopY;
    if (body.position.y + body.radius > bottomY) {
      body.position.y = bottomY - body.radius;
      if (body.velocity.y > 0) {
        const bounceDamping = GAME_CONFIG.PHYSICS.bounceDamping || 0.3;
        body.velocity.y = -body.velocity.y * body.restitution * bounceDamping;
        // X方向摩擦阻尼，模拟落地减速
        body.velocity.x *= body.friction;
        
        // 强化静止判定：落地后速度过小直接置零
        const settleThreshold = GAME_CONFIG.PHYSICS.settleThreshold || 8;
        if (Math.abs(body.velocity.y) < settleThreshold) {
          body.velocity.y = 0;
        }
        if (Math.abs(body.velocity.x) < settleThreshold) {
          body.velocity.x = 0;
        }
      }
      body.bottomContact = true;
      // 接触地面后清除冲击源标记，防止深层堆叠误判为冲击源
      body.isImpactSource = false;
    } else {
      // 离开地面则清除底部接触标记，避免半空静止与误判
      body.bottomContact = false;
    }
  }

  // 同类消除：基于本帧碰撞构建接触图，查找同类型团簇
  detectEliminations() {
    const threshold = GAME_CONFIG?.GAMEPLAY?.ELIMINATE_MIN_CLUSTER ?? 2;
    if (threshold <= 1) return;

    // 邻接表：仅记录同类型、且距离足够近的接触
    const adj = new Map();
    const eligibleBodies = new Set();

    for (const { bodyA, bodyB, distance } of this.collisionPairs) {
      if (bodyA.isMarkedForRemoval || bodyB.isMarkedForRemoval) continue;
      if (bodyA.type !== bodyB.type) continue;
      const minDistance = bodyA.radius + bodyB.radius;
      if (distance > minDistance * GAME_CONFIG.PHYSICS.mergeDistance) continue;

      eligibleBodies.add(bodyA);
      eligibleBodies.add(bodyB);

      if (!adj.has(bodyA)) adj.set(bodyA, new Set());
      if (!adj.has(bodyB)) adj.set(bodyB, new Set());
      adj.get(bodyA).add(bodyB);
      adj.get(bodyB).add(bodyA);
    }

    // 通过DFS找到同类型团簇
    const visited = new Set();
    const clusters = [];

    const dfs = (start, type) => {
      const stack = [start];
      const cluster = [];
      visited.add(start);
      while (stack.length) {
        const node = stack.pop();
        cluster.push(node);
        const neighbors = adj.get(node) || new Set();
        for (const nb of neighbors) {
          if (!visited.has(nb) && !nb.isMarkedForRemoval && nb.type === type) {
            visited.add(nb);
            stack.push(nb);
          }
        }
      }
      return cluster;
    };

    for (const body of eligibleBodies) {
      if (visited.has(body)) continue;
      const type = body.type;
      const cluster = dfs(body, type);
      if (cluster.length >= threshold) {
        clusters.push({ type, bodies: cluster });
      }
    }

    // 执行消除：移除团簇并发事件
    clusters.forEach(({ type, bodies }) => {
      // 标记移除
      bodies.forEach(b => this.markForRemoval(b));

      // 质心位置（质量加权）
      const totalMass = bodies.reduce((m, b) => m + b.mass, 0);
      const mergePosition = new Vector2(
        bodies.reduce((sx, b) => sx + b.position.x * b.mass, 0) / totalMass,
        bodies.reduce((sy, b) => sy + b.position.y * b.mass, 0) / totalMass
      );

      // 计算得分（按每枚水果基础分求和）
      const baseScore = (FRUIT_CONFIG[type]?.score || 1);
      const totalScore = Math.floor(baseScore * bodies.length * (GAME_CONFIG?.GAMEPLAY?.ELIMINATE_SCORE_MULTIPLIER || 1));

      // 通知消除事件（复用合成事件管道）
      this.mergeCallbacks.forEach(callback => {
        callback({
          action: 'eliminate',
          type,
          position: mergePosition,
          count: bodies.length,
          score: totalScore,
          bodies
        });
      });
    });
  }
  
  // 碰撞检测
  detectCollisions() {
    this.collisionPairs = [];
    
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const bodyA = this.bodies[i];
        const bodyB = this.bodies[j];
        
        if (bodyA.isMarkedForRemoval || bodyB.isMarkedForRemoval) continue;
        
        const distance = bodyA.position.distance(bodyB.position);
        const minDistance = bodyA.radius + bodyB.radius;
        
        if (distance < minDistance) {
          this.collisionPairs.push({
            bodyA,
            bodyB,
            distance,
            minDistance,
            overlap: minDistance - distance
          });

          // 优化：底部近乎静止且仅存在极小重叠的水果，跳过后续重复碰撞计算，降低抖动与CPU负载
          // 保留一定重叠阈值，一旦压得更紧仍会进入碰撞处理
          const settle = GAME_CONFIG.PHYSICS.settleThreshold || 8;
          const tinyOverlap = (minDistance - distance) < (GAME_CONFIG?.PHYSICS?.tinyOverlapEpsilon || 0.8);
          if (bodyA.bottomContact && bodyB.bottomContact &&
              bodyA.velocity.magnitude() < settle && bodyB.velocity.magnitude() < settle &&
              tinyOverlap) {
            // 从碰撞对中移除该项以避免重复分离与冲量计算
            this.collisionPairs.pop();
          }

          // 睡眠对：若两者均处于睡眠且重叠小于唤醒阈值，则不纳入碰撞
          const wakeOverlap = (GAME_CONFIG?.PHYSICS?.wakeOverlapPx || 2.0);
          if (bodyA.isSleeping && bodyB.isSleeping) {
            const overlap = minDistance - distance;
            if (overlap < wakeOverlap) {
              this.collisionPairs.pop();
            }
          }
        }
      }
    }
  }
  
  // 碰撞响应
  resolveCollisions() {
    this.collisionPairs.forEach(collision => {
      const { bodyA, bodyB, overlap } = collision;

      if (bodyA.isStatic && bodyB.isStatic) return;

      // 底部低速且仅有微重叠的水果对：直接跳过，避免持续分离与冲量导致连锁抖动
      const vth = (GAME_CONFIG?.PHYSICS?.sleepVelThreshold ?? 6);
      const tinyOverlapEps = (GAME_CONFIG?.PHYSICS?.tinyOverlapEpsilon ?? 0.8);
      if (bodyA.bottomContact && bodyB.bottomContact &&
          bodyA.velocity.magnitude() < vth && bodyB.velocity.magnitude() < vth &&
          overlap < tinyOverlapEps * 1.5) {
        return;
      }

      // 睡眠对在极小重叠情况下直接跳过
      const wakeOverlap = (GAME_CONFIG?.PHYSICS?.wakeOverlapPx || 2.0);
      if (bodyA.isSleeping && bodyB.isSleeping && overlap < wakeOverlap) return;
      
      // 计算碰撞法向量
      const normal = bodyB.position.subtract(bodyA.position).normalize();
      
      // 分离物体：对底部堆叠减小位置修正，降低连锁抖动
      const sepScale = (bodyA.isImpactSource || bodyB.isImpactSource)
        ? 0.5
        : ((bodyA.bottomContact && bodyB.bottomContact) ? 0.15 : 0.5);
      const separation = normal.multiply(overlap * sepScale);
      if (!bodyA.isStatic) {
        bodyA.position = bodyA.position.subtract(separation);
      }
      if (!bodyB.isStatic) {
        bodyB.position = bodyB.position.add(separation);
      }
      
      // 计算相对速度
      const relativeVelocity = bodyB.velocity.subtract(bodyA.velocity);
      const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;
      
      if (velocityAlongNormal > 0) return; // 物体正在分离
      
      // 计算碰撞冲量，并对非冲击源/底部堆叠对进行传播阻尼
      const restitution = Math.min(bodyA.restitution, bodyB.restitution);
      let impulseScalar = -(1 + restitution) * velocityAlongNormal;
      const damping = (bodyA.isImpactSource || bodyB.isImpactSource)
        ? 1.0
        : ((bodyA.bottomContact && bodyB.bottomContact) ? (GAME_CONFIG?.PHYSICS?.propagationDamping ?? 0.25) : 0.5);
      impulseScalar *= damping;
      const totalMass = bodyA.isStatic ? bodyB.mass : 
                       bodyB.isStatic ? bodyA.mass : 
                       bodyA.mass + bodyB.mass;
      
      const impulse = normal.multiply(impulseScalar / totalMass);
      
      // 应用冲量
      if (!bodyA.isStatic) {
        bodyA.velocity = bodyA.velocity.subtract(impulse.multiply(bodyB.mass));
      }
      if (!bodyB.isStatic) {
        bodyB.velocity = bodyB.velocity.add(impulse.multiply(bodyA.mass));
      }

      // 触发碰撞冲击事件（根据法向速度估算强度，含传播阻尼）
      let impactStrength = Math.max(0, -velocityAlongNormal) * restitution * damping;
      // 底部堆叠的非冲击源对：限制最大冲击强度，避免深层持续“巨烈碰撞”
      if ((bodyA.bottomContact && bodyB.bottomContact) && !(bodyA.isImpactSource || bodyB.isImpactSource)) {
        const clampMax = (GAME_CONFIG?.PHYSICS?.bottomStackImpulseClamp ?? 28);
        if (impactStrength > clampMax) impactStrength = clampMax;
      }
      if (impactStrength > 45) {
        const contactX = (bodyA.position.x + bodyB.position.x) * 0.5;
        const contactY = (bodyA.position.y + bodyB.position.y) * 0.5;
        this.emitImpact({
          position: { x: contactX, y: contactY },
          strength: impactStrength,
          normal,
          bodyA,
          bodyB
        });
      }

      // 唤醒判定：明显冲击或重叠超过阈值时唤醒两者
      const wakeImpulse = (GAME_CONFIG?.PHYSICS?.wakeImpulse || 24);
      if (impactStrength > wakeImpulse || overlap > wakeOverlap) {
        if (bodyA.isSleeping) { bodyA.isSleeping = false; bodyA.sleepTimer = 0; }
        if (bodyB.isSleeping) { bodyB.isSleeping = false; bodyB.sleepTimer = 0; }
      }
    });
  }

  // 边界（容器底部）落地冲击检测
  detectBoundaryImpacts() {
    // 使用世界地面代替圆容器底部
    const bottomY = (this.world?.height || GAME_CONFIG?.CANVAS?.height || 667) - (this.world?.groundHeight ?? (GAME_CONFIG?.GROUND?.height ?? 28));

    for (const body of this.bodies) {
      if (body.isStatic || body.isMarkedForRemoval) continue;
      const margin = 3; // 接触判定裕量，减少数值抖动
      const nearBottom = body.position.y + body.radius >= bottomY - margin;
      if (nearBottom) {
        // 首次接触底部边界时触发冲击（仅一次），然后进入冷却
        if (!body.bottomContact) {
          if (body.bottomImpactCount < 1 && body.velocity.y > 140 && body.bottomImpactCooldown <= 0) {
            this.emitImpact({
              position: { x: body.position.x, y: bottomY },
              strength: body.velocity.y,
              normal: { x: 0, y: -1 },
              bodyA: body,
              bodyB: null
            });
            body.bottomImpactCooldown = 1.2; // 增加冷却，避免连续触发
            body.bottomImpactCount += 1;

            // 底部落地时的同类消除（仅在配置为 eliminate_on_bottom 时触发）
            if (GAME_CONFIG?.GAMEPLAY?.MERGE_BEHAVIOR === 'eliminate_on_bottom') {
              const threshold = GAME_CONFIG?.GAMEPLAY?.ELIMINATE_MIN_CLUSTER ?? 2;
              if (threshold > 1) {
                const type = body.type;
                const isNearBottom = (b) => (b.position.y + b.radius >= bottomY - margin) && !b.isMarkedForRemoval;
                const adj = new Map();
                const eligible = new Set();
                for (const { bodyA, bodyB, distance } of this.collisionPairs) {
                  if (!isNearBottom(bodyA) || !isNearBottom(bodyB)) continue;
                  if (bodyA.type !== type || bodyB.type !== type) continue;
                  const minDistance = bodyA.radius + bodyB.radius;
                  if (distance > minDistance * GAME_CONFIG.PHYSICS.mergeDistance) continue;
                  eligible.add(bodyA);
                  eligible.add(bodyB);
                  if (!adj.has(bodyA)) adj.set(bodyA, new Set());
                  if (!adj.has(bodyB)) adj.set(bodyB, new Set());
                  adj.get(bodyA).add(bodyB);
                  adj.get(bodyB).add(bodyA);
                }

                // DFS获取同类底部团簇（从当前落地水果出发）
                const visited = new Set();
                const stack = [body];
                const cluster = [];
                visited.add(body);
                while (stack.length) {
                  const node = stack.pop();
                  if (node.type !== type || !isNearBottom(node)) continue;
                  cluster.push(node);
                  const neighbors = adj.get(node) || new Set();
                  for (const nb of neighbors) {
                    if (!visited.has(nb) && nb.type === type && isNearBottom(nb)) {
                      visited.add(nb);
                      stack.push(nb);
                    }
                  }
                }

                if (cluster.length >= threshold) {
                  cluster.forEach(b => this.markForRemoval(b));
                  const totalMass = cluster.reduce((m, b) => m + b.mass, 0);
                  const mergePosition = new Vector2(
                    cluster.reduce((sx, b) => sx + b.position.x * b.mass, 0) / totalMass,
                    cluster.reduce((sy, b) => sy + b.position.y * b.mass, 0) / totalMass
                  );
                  const baseScore = (FRUIT_CONFIG[type]?.score || 1);
                  const totalScore = Math.floor(baseScore * cluster.length * (GAME_CONFIG?.GAMEPLAY?.ELIMINATE_SCORE_MULTIPLIER || 1));

                  this.mergeCallbacks.forEach(callback => {
                    try {
                      callback({
                        action: 'eliminate',
                        type,
                        position: mergePosition,
                        count: cluster.length,
                        score: totalScore,
                        bodies: cluster
                      });
                    } catch {}
                  });
                }
              }
            }
          }

          // 标记为已接触，直到离开底部区域才重置
          body.bottomContact = true;
        }
      } else {
        body.bottomContact = false;
      }
    }
  }
  
  // 检测合成
  detectMerges() {
    const mergedPairs = [];
    
    this.collisionPairs.forEach(collision => {
      const { bodyA, bodyB, distance } = collision;
      
      // 只有相同类型的水果才能合成（传统水果合成游戏规则）
      // 增加更严格的合成条件：
      // 1. 相同类型
      // 2. 都可以合成（没有冷却）
      // 3. 没有被标记移除
      // 4. 距离足够近（重叠度要求更高）
      // 5. 两个水果都相对稳定（速度不能太快）
      // 6. 水果存在时间足够长（避免刚生成就合成）
      if (bodyA.type === bodyB.type && 
          bodyA.canMerge && bodyB.canMerge &&
          !bodyA.isMarkedForRemoval && !bodyB.isMarkedForRemoval &&
          distance < (bodyA.radius + bodyB.radius) * GAME_CONFIG.PHYSICS.mergeDistance &&
          bodyA.age > 0.1 && bodyB.age > 0.1 && // 水果必须存在至少0.1秒
          bodyA.velocity.magnitude() < 200 && bodyB.velocity.magnitude() < 200) { // 速度不能太快
        
        mergedPairs.push({ bodyA, bodyB });
      }
    });
    
    // 执行合成
    mergedPairs.forEach(({ bodyA, bodyB }) => {
      this.performMerge(bodyA, bodyB);
    });
  }
  
  // 执行合成
  performMerge(bodyA, bodyB) {
    // 设置合成冷却，防止连续合成
    bodyA.canMerge = false;
    bodyB.canMerge = false;
    bodyA.mergeTimer = 0.5; // 0.5秒冷却
    bodyB.mergeTimer = 0.5;
    
    // 标记原水果为待移除
    this.markForRemoval(bodyA);
    this.markForRemoval(bodyB);
    
    // 计算合成位置（质心）
    const totalMass = bodyA.mass + bodyB.mass;
    const mergePosition = new Vector2(
      (bodyA.position.x * bodyA.mass + bodyB.position.x * bodyB.mass) / totalMass,
      (bodyA.position.y * bodyA.mass + bodyB.position.y * bodyB.mass) / totalMass
    );
    
    // 通知合成事件
    this.mergeCallbacks.forEach(callback => {
      callback({
        type: bodyA.type,
        position: mergePosition,
        bodyA,
        bodyB
      });
    });
  }
  
  // 获取指定位置的刚体
  getBodyAtPosition(position, radius = 5) {
    return this.bodies.find(body => 
      !body.isMarkedForRemoval && 
      body.position.distance(position) <= body.radius + radius
    );
  }
  
  // 清空所有刚体
  clear() {
    this.bodies = [];
    this.collisionPairs = [];
  }
  
  // 获取物理统计信息
  getStats() {
    return {
      bodyCount: this.bodies.length,
      collisionCount: this.collisionPairs.length,
      activeBodyCount: this.bodies.filter(body => !body.isStatic && !body.isMarkedForRemoval).length
    };
  }
}

export { Vector2, RigidBody };