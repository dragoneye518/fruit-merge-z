import { RigidBody, Vector2 } from '../engine/physics.js';
import { FRUIT_CONFIG, GAME_CONFIG, RENDER_TUNING } from '../config/constants.js';
import { imageLoader } from '../utils/imageLoader.js';

// v2 - 简化版 Fruit 类 (已注入诊断日志)
export class Fruit {
  constructor(type, rigidBody) {
    const config = FRUIT_CONFIG[type];
    if (!config) {
      throw new Error(`Unknown fruit type: ${type}`);
    }
    
    this.body = rigidBody; 
    this.fruitType = type;
    this.config = config;
    this.radius = this.body.radius;
    
    this.texture = config.texture;
    this.image = null;
    this.imageLoaded = false;
    this.bounds = null; // 缓存透明边界，避免每帧重复计算
    this.rotation = Math.random() * Math.PI * 2;
    
    this.loadImage();
  }

  async loadImage() {
    try {
      this.image = await imageLoader.loadImage(this.texture);
      this.imageLoaded = true;
      // 加载完成后一次性计算并缓存透明边界
      try {
        this.bounds = imageLoader.getOpaqueBounds(this.texture) || null;
      } catch (_) {
        this.bounds = null;
      }
    } catch (error) {
      console.warn(`Failed to load fruit image: ${this.texture}`, error);
    }
  }

  render(ctx) {
    if (this.body.isMarkedForRemoval) return;

    ctx.save();
    ctx.translate(this.body.position.x, this.body.position.y);
    ctx.rotate(this.rotation);

    if (this.imageLoaded && this.image) {
      try {
        // 完全使用物理半径，确保渲染边界与物理边界完全一致
        const renderSize = this.radius * 2;

        // 直接渲染到完整的物理边界，无任何内缩或边距
        ctx.drawImage(
          this.image,
          0, 0, this.image.naturalWidth || this.image.width, this.image.naturalHeight || this.image.height,
          -this.radius, -this.radius, renderSize, renderSize
        );
      } catch (e) {
        this.renderFallback(ctx);
      }
    } else {
      this.renderFallback(ctx);
    }

    ctx.restore();
  }

  renderFallback(ctx) {
    ctx.fillStyle = this.config.color || '#CCCCCC';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  get isMarkedForRemoval() {
    return this.body.isMarkedForRemoval;
  }
}

// v2 - 简化版 FruitManager (已修正回调注册)
export class FruitManager {
  constructor(physicsEngine) {
    this.physicsEngine = physicsEngine;
    this.fruits = [];
    this.nextFruitType = this.getRandomStarterFruit();
  }

  createFruit(type, x, y) {
    const config = FRUIT_CONFIG[type];
    const radiusScale = (GAME_CONFIG?.SIZE?.radiusScale || 1);
    const scaledRadius = Math.round(config.radius * radiusScale);

    const rigidBody = new RigidBody({
      position: new Vector2(x, y),
      radius: scaledRadius,
      mass: config.mass,
      fruitType: type,
    });

    this.physicsEngine.addBody(rigidBody);
    const fruit = new Fruit(type, rigidBody);
    this.fruits.push(fruit);
    return fruit;
  }

  dropFruit(x, y) {
    const type = this.nextFruitType;
    const dropY = GAME_CONFIG?.DROP_LINE_Y ?? 120;
    const fruit = this.createFruit(type, x, dropY);
    this.nextFruitType = this.getRandomStarterFruit();
    return fruit;
  }

  getRandomStarterFruit() {
    const starterFruits = (GAME_CONFIG?.GAMEPLAY?.STARTER_TYPES) || ['CHERRY', 'STRAWBERRY', 'GRAPE'];
    return starterFruits[Math.floor(Math.random() * starterFruits.length)];
  }

  onMerge(callback) {
    // 直接将 gameLogic 的回调注册到物理引擎上
    this.physicsEngine.onMerge(callback);
  }

  update(deltaTime) {
    this.fruits = this.fruits.filter(fruit => !fruit.isMarkedForRemoval);
  }

  render(ctx) {
    this.fruits.forEach(fruit => fruit.render(ctx));
  }

  clear() {
    this.fruits = [];
    this.physicsEngine.clear();
  }

  getAllFruits() {
    return this.fruits;
  }
}