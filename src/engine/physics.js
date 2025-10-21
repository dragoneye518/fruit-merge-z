// 物理引擎 - v2 - 基于迭代求解器
import { GAME_CONFIG, FRUIT_CONFIG } from '../config/constants.js';

export class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
  subtract(v) { return new Vector2(this.x - v.x, this.y - v.y); }
  multiply(s) { return new Vector2(this.x * s, this.y * s); }
  magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  normalize() {
    const mag = this.magnitude();
    return mag > 0 ? new Vector2(this.x / mag, this.y / mag) : new Vector2(0, 0);
  }
}

export class RigidBody {
  constructor({ position = new Vector2(), radius = 20, mass = 1, fruitType = 'UNKNOWN', color = '#FFF', id = '' } = {}) {
    this.position = position;
    this.prevPosition = new Vector2(position.x, position.y);
    this.velocity = new Vector2(0, 0);
    this.acceleration = new Vector2(0, 0);
    this.radius = radius;
    this.mass = mass > 0 ? mass : 1;
    this.invMass = 1 / this.mass;
    this.restitution = 0.15; // 增加弹性，让水果碰撞后保持更多速度
    this.fruitType = fruitType;
    this.color = color;
    this.id = id || `rb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    this.isStatic = false;
    this.isMarkedForRemoval = false;
    this.canMerge = true;
    this.mergeTimer = 0;
    this.mergeCooldown = 0;

    this.bottomContact = false;
    this.bottomContactDuration = 0;
    // 碰撞特效冷却（毫秒），避免重复触发
    this.impactCooldown = 0;
    this.isStackLocked = false;
  }

  updatePosition(dt) {
    if (this.isStatic) return;

    const usedDt = (!dt || !isFinite(dt) || dt <= 1e-6) ? 1/60 : dt;

    if (this.mergeCooldown > 0) {
      this.mergeCooldown -= usedDt * 1000;
      if (this.mergeCooldown <= 0) {
        this.mergeCooldown = 0;
        this.canMerge = true;
      }
    }
    // 更新碰撞冷却计时
    if (this.impactCooldown > 0) {
      this.impactCooldown -= usedDt * 1000;
      if (this.impactCooldown < 0) this.impactCooldown = 0;
    }

    this.velocity = this.position.subtract(this.prevPosition).multiply(1/usedDt);
    if (!isFinite(this.velocity.x) || !isFinite(this.velocity.y)) {
      this.velocity.x = 0;
      this.velocity.y = 0;
    }
    
    this.prevPosition.x = this.position.x;
    this.prevPosition.y = this.position.y;
    
    const newPosX = this.position.x + this.velocity.x * usedDt + this.acceleration.x * usedDt * usedDt;
    const newPosY = this.position.y + this.velocity.y * usedDt + this.acceleration.y * usedDt * usedDt;

    this.position = new Vector2(newPosX, newPosY);
    this.acceleration = new Vector2(0, 0);
  }

  applyForce(force) {
    if (this.isStatic) return;
    this.acceleration = this.acceleration.add(force.multiply(this.invMass));
  }
  
  setMergeCooldown(duration = 100) {
    this.canMerge = false;
    this.mergeCooldown = duration;
    this.mergeTimer = duration / 1000;
  }
}

export class PhysicsEngine {
  constructor() {
    this.world = {
      width: 375,
      height: 667,
      groundHeight: 28,
      leftMargin: 6,
      rightMargin: 6,
      gravity: new Vector2(0, GAME_CONFIG.PHYSICS.gravity)
    };
    this.dangerLineY = 120;
    this.bodies = [];
    this.activeBody = null;
    this.solverIterations = GAME_CONFIG.PHYSICS.solverIterations;
    this.mergeCallbacks = [];
    this.impactCallbacks = [];
    this.lastDt = 0;
  }

  clear() {
    this.bodies = [];
    this.activeBody = null;
  }

  setContainer({ width, height }) {
    if (typeof width === 'number') this.world.width = width;
    if (typeof height === 'number') this.world.height = height;
  }

  setWorld(config) {
    Object.assign(this.world, config || {});
  }

  setDangerLine(y) { this.dangerLineY = y; }

  onMerge(cb) { if (typeof cb === 'function') this.mergeCallbacks.push(cb); }
  onImpact(cb) { if (typeof cb === 'function') this.impactCallbacks.push(cb); }

  addBody(body) {
    if (!body) return;
    this.bodies.push(body);
  }

  step(dt) {
    this.lastDt = dt;
    this.applyGravity();
    this.updatePositions(dt);
    for (let i = 0; i < this.solverIterations; i++) {
      this.solveCollisions();
      this.applyConstraints();
    }
    this.handleMergeByBehavior();
    this.cleanupBodies();
  }

  applyGravity() {
    for (const body of this.bodies) {
      body.applyForce(this.world.gravity);
    }
  }

  updatePositions(dt) {
    for (const body of this.bodies) {
      body.updatePosition(dt);
    }
  }

  applyConstraints() {
    const groundHeight = GAME_CONFIG?.GROUND?.height ?? 28;
    const groundY = this.world.height - groundHeight;
    const leftWallX = this.world.leftMargin;
    const rightWallX = this.world.width - this.world.rightMargin;
    const isDouyinEnv = typeof tt !== 'undefined';

    for (const body of this.bodies) {
      const onGround = (body.position.y + body.radius >= groundY);
      if (onGround) {
        body.position.y = groundY - body.radius;
        const prev = body.prevPosition;
        const pos = body.position;
        const groundFriction = 0.85; // 减少地面摩擦，让水果能更快滑落 
        const groundBounceDamping = GAME_CONFIG.PHYSICS.groundBounceDamping;

        body.prevPosition.x = pos.x - (pos.x - prev.x) * groundFriction;
        body.prevPosition.y = pos.y - (pos.y - prev.y) * groundBounceDamping;

        if (!body.bottomContact) {
          body.bottomContact = true;
          body.bottomContactDuration = 0;
          // 仅在满足速度阈值且冷却结束时触发落地特效
          try {
            const vyAbs = Math.abs(body.velocity.y || 0);
            const speedThreshold = (GAME_CONFIG?.PHYSICS?.impactSpeedThreshold ?? 36);
            const cooldownMs = isDouyinEnv ? 180 : 260;
            if (vyAbs >= speedThreshold && body.impactCooldown <= 0) {
              const impactStrength = Math.min(vyAbs * 0.5 + 4, 16);
              this.emitImpact({
                position: { x: body.position.x, y: groundY },
                strength: impactStrength,
                bodyA: body,
                bodyB: null,
                normal: { x: 0, y: -1 }
              });
              body.impactCooldown = cooldownMs;
            }
          } catch (_) {}
          // 避免在抖音环境产生高频日志导致卡顿，仅在显式开启调试时输出
          if (!isDouyinEnv || (GAME_CONFIG?.DEBUG?.dyGroundLogs === true)) {
            // eslint-disable-next-line no-console
            console.log('[Physics] Body contacted ground:', body.id, 'y:', body.position.y.toFixed(1));
          }
        } else {
          body.bottomContactDuration += (this.lastDt || 0);
        }
      } else {
        if (body.bottomContact) {
          body.bottomContact = false;
          body.bottomContactDuration = 0;
        }
        const prev = body.prevPosition;
        const pos = body.position;
        const ar = GAME_CONFIG.PHYSICS.airResistance;
        body.prevPosition.x = pos.x - (pos.x - prev.x) * ar;
        body.prevPosition.y = pos.y - (pos.y - prev.y) * ar;
      }

      if (body.position.x - body.radius < leftWallX) {
        body.position.x = leftWallX + body.radius;
        const prev = body.prevPosition;
        const pos = body.position;
        const wallFriction = 0.9; // 墙壁摩擦力，减少阻碍让水果更快滑落
        body.prevPosition.x = pos.x - (pos.x - prev.x) * wallFriction;
      }

      if (body.position.x + body.radius > rightWallX) {
        body.position.x = rightWallX - body.radius;
        const prev = body.prevPosition;
        const pos = body.position;
        const wallFriction = 0.9; // 墙壁摩擦力，减少阻碍让水果更快滑落
        body.prevPosition.x = pos.x - (pos.x - prev.x) * wallFriction;
      }

      const speed = body.velocity.magnitude();
      if (speed > GAME_CONFIG.PHYSICS.maxVelocity) {
        body.velocity = body.velocity.normalize().multiply(GAME_CONFIG.PHYSICS.maxVelocity);
      }
    }
  }

  solveCollisions() {
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const bodyA = this.bodies[i];
        const bodyB = this.bodies[j];
        const axis = bodyA.position.subtract(bodyB.position);
        const dist = axis.magnitude();
        const min_dist = (bodyA.radius + bodyB.radius) * 0.998;
        if (dist < min_dist) {
          if (GAME_CONFIG?.DEBUG?.verboseCollisions) {
            console.log(`Collision: ${bodyA.id} vs ${bodyB.id}, overlap: ${(min_dist - dist).toFixed(2)}`);
          }

          const normal = axis.normalize();
          const overlap = min_dist - dist;
          const totalMass = bodyA.mass + bodyB.mass;
          const moveA = overlap * (bodyB.mass / totalMass);
          const moveB = overlap * (bodyA.mass / totalMass);
          bodyA.position = bodyA.position.add(normal.multiply(moveA));
          bodyB.position = bodyB.position.subtract(normal.multiply(moveB));

          // 碰撞耗能：在位置修正后，衰减两刚体的位移（从而降低下一帧速度），加速收敛
          try {
            const damping = (GAME_CONFIG?.PHYSICS?.bounceDamping ?? 0.3);
            if (damping > 0 && damping < 1) {
              const dispA = bodyA.position.subtract(bodyA.prevPosition);
              const dispB = bodyB.position.subtract(bodyB.prevPosition);
              // 仅沿碰撞法线方向进行耗能，减少多余侧向抖动
              const dispAAlong = normal.multiply((dispA.x * normal.x + dispA.y * normal.y));
              const dispBAlong = normal.multiply((dispB.x * normal.x + dispB.y * normal.y));
              bodyA.prevPosition = bodyA.position.subtract(dispAAlong.multiply(damping));
              bodyB.prevPosition = bodyB.position.subtract(dispBAlong.multiply(damping));
            }
          } catch (_) { /* ignore collision damping errors */ }
          // 仅在法向相对速度达到阈值且双方冷却结束时触发水果间碰撞特效
          try {
            const relVel = bodyA.velocity.subtract(bodyB.velocity);
            const normalSpeed = Math.abs(relVel.x * normal.x + relVel.y * normal.y);
            const speedThreshold = (GAME_CONFIG?.PHYSICS?.impactSpeedThreshold ?? 36);
            const isDouyinEnv = typeof tt !== 'undefined';
            const cooldownMs = isDouyinEnv ? 160 : 240;
            if (normalSpeed >= speedThreshold && bodyA.impactCooldown <= 0 && bodyB.impactCooldown <= 0) {
              this.emitImpact({
                position: bodyA.position.add(bodyB.position).multiply(0.5),
                strength: Math.min(overlap * 0.5, 20),
                bodyA,
                bodyB,
                normal
              });
              bodyA.impactCooldown = cooldownMs;
              bodyB.impactCooldown = cooldownMs;
            }
          } catch (_) { /* ignore impact gating errors */ }
        }
      }
    }
  }
  
  // 根据配置选择合成行为
  handleMergeByBehavior() {
    const behavior = GAME_CONFIG?.GAMEPLAY?.MERGE_BEHAVIOR || 'eliminate';
    if (behavior === 'upgrade') {
      this.handleUpgrade();
    } else {
      this.handleElimination();
    }
  }

  handleElimination() {
    const pairsToEliminate = [];
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const bodyA = this.bodies[i];
        const bodyB = this.bodies[j];
        if (bodyA.isMarkedForRemoval || bodyB.isMarkedForRemoval) continue;
        if (bodyA.fruitType !== bodyB.fruitType) continue;
        
        if (bodyA.mergeCooldown > 0 || bodyB.mergeCooldown > 0) continue;
        
        const axis = bodyA.position.subtract(bodyB.position);
        const dist = axis.magnitude();
        const min_dist = (bodyA.radius + bodyB.radius) * 0.998;

        if (dist < min_dist) {
          pairsToEliminate.push([bodyA, bodyB]);
        }
      }
    }
    for (const [bodyA, bodyB] of pairsToEliminate) {
        if (bodyA.isMarkedForRemoval || bodyB.isMarkedForRemoval) continue;
        
        bodyA.setMergeCooldown(30);
        bodyB.setMergeCooldown(30);
        
        bodyA.isMarkedForRemoval = true;
        bodyB.isMarkedForRemoval = true;
        const mergePosition = bodyA.position.add(bodyB.position).multiply(0.5);
        this.emitMerge({
            type: bodyA.fruitType,
            position: { x: mergePosition.x, y: mergePosition.y },
            count: 2,
            action: 'eliminate',
            score: this.getFruitScore(bodyA.fruitType)
        });
    }
  }

  // 升级合成：相同水果相交后，移除两者并生成更高级类型（由上层负责创建）
  handleUpgrade() {
    const pairsToUpgrade = [];
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const bodyA = this.bodies[i];
        const bodyB = this.bodies[j];
        if (bodyA.isMarkedForRemoval || bodyB.isMarkedForRemoval) continue;
        if (bodyA.fruitType !== bodyB.fruitType) continue;
        if (bodyA.mergeCooldown > 0 || bodyB.mergeCooldown > 0) continue;

        const axis = bodyA.position.subtract(bodyB.position);
        const dist = axis.magnitude();
        const min_dist = (bodyA.radius + bodyB.radius) * 0.998;

        if (dist < min_dist) {
          const type = bodyA.fruitType;
          const nextType = FRUIT_CONFIG?.[type]?.nextLevel || null;
          if (nextType) {
            pairsToUpgrade.push([bodyA, bodyB, nextType]);
          }
        }
      }
    }
    for (const [bodyA, bodyB, nextType] of pairsToUpgrade) {
      if (bodyA.isMarkedForRemoval || bodyB.isMarkedForRemoval) continue;

      bodyA.setMergeCooldown(40);
      bodyB.setMergeCooldown(40);
      bodyA.isMarkedForRemoval = true;
      bodyB.isMarkedForRemoval = true;

      const mergePosition = bodyA.position.add(bodyB.position).multiply(0.5);
      // 不在物理层直接创建新刚体，交由上层FruitManager创建；此处仅派发事件
      this.emitMerge({
        oldType: bodyA.fruitType,
        newType: nextType,
        position: { x: mergePosition.x, y: mergePosition.y },
        count: 2,
        action: 'upgrade'
      });
    }
  }

  getFruitScore(fruitType) {
    try {
      const config = FRUIT_CONFIG?.[fruitType] || {};
      return config.score || 1;
    } catch (e) {
      console.warn(`Failed to get score for fruit type ${fruitType}:`, e);
      return 1;
    }
  }

  cleanupBodies() {
    this.bodies = this.bodies.filter(body => !body.isMarkedForRemoval);
  }
  
  getStackTopY() {
    if (this.bodies.length === 0) {
      const groundHeight = GAME_CONFIG?.GROUND?.height ?? 28;
      return this.world.height - groundHeight;
    }
    let topY = this.world.height;
    for (const b of this.bodies) {
      const yTop = b.position.y - b.radius;
      if (yTop < topY) topY = yTop;
    }
    return topY;
  }

  getGroundTopY() {
    const groundHeight = GAME_CONFIG?.GROUND?.height ?? 28;
    return this.world.height - groundHeight;
  }

  emitMerge(data) { for (const cb of this.mergeCallbacks) { try { cb(data); } catch {} } }
  emitImpact(data) { for (const cb of this.impactCallbacks) { try { cb(data); } catch {} } }
  
  isWorldSettled() {
    const velocityThreshold = (GAME_CONFIG?.PHYSICS?.settleThreshold ?? 8);
    const isDouyinEnv = typeof tt !== 'undefined';
    
    const effectiveThreshold = isDouyinEnv ? velocityThreshold * 1.5 : velocityThreshold;
    
    for (const body of this.bodies) {
      // 不再忽略当前活动刚体；活动刚体的移动也应参与“未稳定”的判定
      const isActive = !!(this.activeBody && body === this.activeBody && !body.isMarkedForRemoval);
      // 活动刚体在刚投放的短时间内使用更严格的阈值，避免误判已稳定
      const dropAgeSec = isActive ? (((Date.now() - (body.dropTime || 0)) / 1000) || 0) : 0;
      const activeFactor = (isActive && dropAgeSec < 0.6) ? 0.66 : 1.0;
      const thresholdForBody = effectiveThreshold * activeFactor;
      
      const speed = body.velocity ? body.velocity.magnitude() : 0;
      
      // 抖音环境：已稳定接触的轻微抖动（速度接近阈值）容忍，但不对活动刚体应用该容忍
      if (!isActive && isDouyinEnv && body.bottomContact && body.bottomContactDuration > 0.2) {
        if (speed > thresholdForBody && speed < thresholdForBody * 2) {
          continue;
        }
      }
      
      if (speed > thresholdForBody) {
        return false;
      }
    }
    return true;
  }
}