// 统一渲染适配层：在Canvas与Three之间切换，便于后续接入Douyin小游戏WebGL
import { GAME_CONFIG } from '../config/constants.js';
import { FruitRenderer } from './fruitRenderer.js';
import { ThreeFruit3DRenderer } from './threeFruit3DRenderer.js';

export class RendererAdapter {
  constructor(canvasWidth, canvasHeight) {
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.mode = (GAME_CONFIG.RENDERER || 'canvas');
    this.quality = GAME_CONFIG.QUALITY || { tier: 'auto' };

    // 基础2D渲染器
    this.canvasRenderer = new FruitRenderer();
    // 可选Three渲染器
    this.threeRenderer = (typeof window !== 'undefined' && window.THREE)
      ? new ThreeFruit3DRenderer(canvasWidth, canvasHeight)
      : null;
  }

  // 判断是否启用三维
  shouldUseThree() {
    if (!this.threeRenderer || !this.threeRenderer.enabled) return false;
    const tier = (this.quality?.tier || 'auto');
    if (tier === 'low') return false;
    if (tier === 'high' || tier === 'medium') return this.mode === 'three';
    // auto：简单启发式，可扩展为更复杂的设备能力检测
    const cores = (navigator && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 4;
    return this.mode === 'three' && cores >= 4;
  }

  setMode(mode) {
    this.mode = mode;
  }

  setSize(w, h) {
    this.width = w; this.height = h;
    if (this.threeRenderer) this.threeRenderer.setSize(w, h);
  }

  tick(deltaMs) {
    if (this.shouldUseThree() && this.threeRenderer) {
      this.threeRenderer.tick(deltaMs);
    }
  }

  // 物理堆叠：渲染水果数组
  async renderFruits(ctx, fruits, options) {
    if (this.shouldUseThree() && this.threeRenderer?.enabled) {
      const promise = this.threeRenderer.renderFruits(fruits, options);
      if (promise && typeof promise.then === 'function') {
        return promise.then((threeCanvas) => {
          if (threeCanvas) ctx.drawImage(threeCanvas, 0, 0);
          return true;
        });
      }
      return false;
    }
    // 2D渲染路径
    const sorted = fruits
      .filter(f => !f.isMarkedForRemoval)
      // 使用刚体位置进行排序，避免访问不存在的 fruit.position 导致崩溃
      .sort((a, b) => (a.body?.position?.y || 0) - (b.body?.position?.y || 0));
    for (const fruit of sorted) {
      fruit.render(ctx);
    }
    return true;
  }

  // 合成触发3D特效（若启用）
  triggerMergeEffect(x, y, fruitType, color) {
    if (this.shouldUseThree() && this.threeRenderer && typeof this.threeRenderer.triggerMergeBurst === 'function') {
      this.threeRenderer.triggerMergeBurst(x, y, { color, count: 10 });
    }
  }
}

export default RendererAdapter;