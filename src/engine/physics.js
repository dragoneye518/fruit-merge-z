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
    this.restitution = 0.2; // 进一步增加弹性，让水果碰撞后更快滑落
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
      // 如果重力被禁用，跳过重力应用
      if (body.gravityDisabled) {
        continue;
      }
      body.applyForce(this.world.gravity);
    }
  }

  updatePositions(dt) {
    for (const body of this.bodies) {
      // 处理水果移动到目标位置的逻辑
      if (body.isMovingToTarget && body.targetX !== undefined) {
        const currentX = body.position.x;
        const targetX = body.targetX;
        const moveSpeed = body.moveSpeed || 8;
        
        const distance = Math.abs(targetX - currentX);
        if (distance > 1) {
          // 计算移动方向和距离
          const direction = targetX > currentX ? 1 : -1;
          const moveDistance = Math.min(moveSpeed, distance);
          
          // 更新位置
          body.position.x += direction * moveDistance;
          body.prevPosition.x = body.position.x; // 保持一致性
        } else {
          // 到达目标位置，停止移动
          body.position.x = targetX;
          body.prevPosition.x = targetX;
          body.isMovingToTarget = false;
          body.targetX = undefined;
          
          // 如果水果需要在移动完成后开始下落，重新启用重力并给予初始下落速度
          if (body.shouldDropAfterMove) {
            body.gravityDisabled = false;
            body.shouldDropAfterMove = false;
            
            // 给予初始下落速度
            try {
              const initialVy = (GAME_CONFIG?.DROP?.initialVelocityY ?? 420);
              const dt0 = (this.lastDt && isFinite(this.lastDt) && this.lastDt > 0)
                ? this.lastDt
                : (1 / 60);
              // 通过调整 prevPosition 来赋予初速度，使下一步更新时速度为 initialVy
              body.prevPosition.y = body.position.y - initialVy * dt0;
            } catch (_) { /* ignore initial velocity injection errors */ }
          }
          
          console.log(`[Physics] Fruit reached target position: ${targetX}`);
        }
      }
      
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
      
      // 检查是否有稳定的支撑（地面或其他水果）
      let hasStableSupport = onGround;
      let supportContactDuration = 0;
      
      if (!onGround) {
        // 检查是否稳定地支撑在其他水果上
        for (const otherBody of this.bodies) {
          if (otherBody === body) continue;
          
          const dx = body.position.x - otherBody.position.x;
          const dy = body.position.y - otherBody.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = body.radius + otherBody.radius;
          
          // 如果接触且当前水果在上方
          if (distance <= minDistance * 1.02 && dy < 0) {
            // 初始化接触追踪
            if (!body.supportContacts) body.supportContacts = new Map();
            
            const contactKey = otherBody.id || `body_${this.bodies.indexOf(otherBody)}`;
            const existingContact = body.supportContacts.get(contactKey);
            
            if (existingContact) {
              existingContact.duration += (this.lastDt || 0);
              supportContactDuration = Math.max(supportContactDuration, existingContact.duration);
            } else {
              body.supportContacts.set(contactKey, { duration: 0, otherBody });
            }
            
            // 如果接触时间足够长，认为是稳定支撑
            const stableThreshold = GAME_CONFIG?.PHYSICS?.stableContactSec ?? 0.35;
            if (supportContactDuration >= stableThreshold) {
              hasStableSupport = true;
            }
          }
        }
        
        // 清理不再接触的支撑记录
        if (body.supportContacts) {
          for (const [key, contact] of body.supportContacts.entries()) {
            const otherBody = contact.otherBody;
            const dx = body.position.x - otherBody.position.x;
            const dy = body.position.y - otherBody.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = body.radius + otherBody.radius;
            
            if (distance > minDistance * 1.1 || dy >= 0) {
              body.supportContacts.delete(key);
            }
          }
        }
      }
      
      if (onGround) {
        body.position.y = groundY - body.radius;
        const prev = body.prevPosition;
        const pos = body.position;
        const groundFriction = (GAME_CONFIG?.PHYSICS?.groundFriction ?? 0.96);
        const groundBounceDamping = GAME_CONFIG.PHYSICS.groundBounceDamping;

        body.prevPosition.x = pos.x - (pos.x - prev.x) * groundFriction;
        body.prevPosition.y = pos.y - (pos.y - prev.y) * groundBounceDamping;

        if (!body.bottomContact) {
          body.bottomContact = true;
          body.bottomContactDuration = 0;
          // 触发落地特效
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
          if (!isDouyinEnv || (GAME_CONFIG?.DEBUG?.dyGroundLogs === true)) {
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
        
        // 更新支撑接触时长（用于稳定性判断）
        body.bottomContactDuration = supportContactDuration;
        
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
        const wallFriction = (GAME_CONFIG?.PHYSICS?.wallFriction ?? 0.96); // 使用可配置墙摩擦以提升沿壁滑动速度
        body.prevPosition.x = pos.x - (pos.x - prev.x) * wallFriction;
      }

      if (body.position.x + body.radius > rightWallX) {
        body.position.x = rightWallX - body.radius;
        const prev = body.prevPosition;
        const pos = body.position;
        const wallFriction = (GAME_CONFIG?.PHYSICS?.wallFriction ?? 0.96); // 使用可配置墙摩擦以提升沿壁滑动速度
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
          
          // 检查是否为稳定接触（减少不必要的分离力）
          const stableThreshold = GAME_CONFIG?.PHYSICS?.stableContactSec ?? 0.35;
          const aStable = bodyA.bottomContactDuration >= stableThreshold;
          const bStable = bodyB.bottomContactDuration >= stableThreshold;
          const bothStable = aStable && bStable;
          
          // 对于稳定接触的水果，使用更温和的分离
          const separationFactor = bothStable ? 0.3 : 1.0;
          const effectiveOverlap = overlap * separationFactor;
          
          const totalMass = bodyA.mass + bodyB.mass;
          const moveA = effectiveOverlap * (bodyB.mass / totalMass);
          const moveB = effectiveOverlap * (bodyA.mass / totalMass);

          // 分离水果，避免穿透
          bodyA.position = bodyA.position.add(normal.multiply(moveA));
          bodyB.position = bodyB.position.subtract(normal.multiply(moveB));

          // 主动添加滑落力（仅对非稳定接触）
          if (!bothStable) {
            const tangent = new Vector2(-normal.y, normal.x);
            const relVel = bodyA.velocity.subtract(bodyB.velocity);
            const tangentSpeed = relVel.x * tangent.x + relVel.y * tangent.y;

            if (Math.abs(tangentSpeed) > 10) {
              const slideForce = Math.min(Math.abs(tangentSpeed) * 2.5, 400);
              const slideDirection = tangentSpeed > 0 ? tangent : tangent.multiply(-1);
              const impulse = slideDirection.multiply(slideForce);
              
              bodyA.velocity = bodyA.velocity.add(impulse.multiply(bodyB.invMass));
              bodyB.velocity = bodyB.velocity.subtract(impulse.multiply(bodyA.invMass));

              // 立即更新位置，实现快速滑落
              const slideVelA = impulse.multiply(bodyB.invMass);
              const slideVelB = impulse.multiply(-bodyA.invMass);
              bodyA.prevPosition = bodyA.position.subtract(bodyA.velocity.subtract(slideVelA).multiply(0.016));
              bodyB.prevPosition = bodyB.position.subtract(bodyB.velocity.subtract(slideVelB).multiply(0.016));
            }
          }

          // 碰撞耗能：对稳定接触使用更强的阻尼
          try {
            const baseDamping = GAME_CONFIG?.PHYSICS?.bounceDamping ?? 0.15;
            const damping = bothStable ? Math.min(baseDamping * 2.5, 0.8) : baseDamping;
            
            if (damping > 0 && damping < 1) {
              const dispA = bodyA.position.subtract(bodyA.prevPosition);
              const dispB = bodyB.position.subtract(bodyB.prevPosition);
              
              if (bothStable) {
                // 稳定接触：全方向阻尼，快速收敛
                bodyA.prevPosition = bodyA.position.subtract(dispA.multiply(1 - damping));
                bodyB.prevPosition = bodyB.position.subtract(dispB.multiply(1 - damping));
              } else {
                // 非稳定接触：仅法向阻尼，保留切向速度
                const dispAAlong = normal.multiply((dispA.x * normal.x + dispA.y * normal.y));
                const dispBAlong = normal.multiply((dispB.x * normal.x + dispB.y * normal.y));
                bodyA.prevPosition = bodyA.position.subtract(dispAAlong.multiply(damping));
                bodyB.prevPosition = bodyB.position.subtract(dispBAlong.multiply(damping));
              }
            }
          } catch (_) { /* ignore collision damping errors */ }
          
          // 碰撞特效：稳定接触不触发特效，避免持续震动
          if (!bothStable) {
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