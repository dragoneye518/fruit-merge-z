import { FRUIT_CONFIG, RENDER_TUNING } from '../config/constants.js';
import { imageLoader } from '../utils/imageLoader.js';

// 2.5D 拟真水果绘制器（Canvas 纯绘制，支持贴图叠加）
export class FruitRenderer {
  constructor() {}

  // 统一入口：绘制水果（自动选择贴图或渐变）
  renderFruit(ctx, type, x, y, cellSize, image) {
    const radius = (cellSize - 8) / 2;
    ctx.save();

    if (image) {
      const inset = (RENDER_TUNING?.insetOverrides?.[type] ?? RENDER_TUNING?.insetDefaultPx ?? 1);
      const size = cellSize - 6 - inset * 2;
      const bounds = imageLoader?.computeOpaqueBounds ? imageLoader.computeOpaqueBounds(image) : null;
      if (bounds && bounds.sw && bounds.sh) {
        ctx.drawImage(
          image,
          bounds.sx, bounds.sy, bounds.sw, bounds.sh,
          x - size/2, y - size/2, size, size
        );
      } else {
        ctx.drawImage(image, x - size/2, y - size/2, size, size);
      }
    } else {
      if (type === 'RAINBOW') {
        this.drawRainbow(ctx, x, y, radius);
      } else if (type === 'BOMB') {
        this.drawBomb(ctx, x, y, radius);
      } else {
        this.drawBaseCircle(ctx, type, x, y, radius);
        // 叠加轻纹理以增强拟真
        this.addSubtleTexture(ctx, type, x, y, radius);
      }
    }

    // 叠加高光、阴影与边缘光，形成 2.5D 效果
    this.addRimLight(ctx, x, y, radius);
    this.addTopHighlight(ctx, x, y, radius);
    this.addDropShadow(ctx, x, y, radius);

    ctx.restore();
  }

  drawBaseCircle(ctx, type, x, y, radius) {
    const base = FRUIT_CONFIG[type]?.color || '#CCCCCC';
    const grad = ctx.createRadialGradient(x - radius*0.2, y - radius*0.2, radius*0.2, x, y, radius);
    grad.addColorStop(0, this.lighten(base, 0.12));
    grad.addColorStop(0.6, base);
    grad.addColorStop(1, this.darken(base, 0.15));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  addTopHighlight(ctx, x, y, radius) {
    const grad = ctx.createRadialGradient(x - radius*0.35, y - radius*0.4, 0, x - radius*0.35, y - radius*0.4, radius*0.8);
    grad.addColorStop(0, 'rgba(255,255,255,0.48)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  addRimLight(ctx, x, y, radius) {
    const grad = ctx.createRadialGradient(x, y, radius*0.82, x, y, radius*1.06);
    grad.addColorStop(0, 'rgba(255,255,255,0.0)');
    grad.addColorStop(1, 'rgba(255,255,255,0.32)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  addDropShadow(ctx, x, y, radius) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y + radius*0.75, radius*0.85, radius*0.3, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  // 轻纹理：籽/筋/斑点（低开销）
  addSubtleTexture(ctx, type, x, y, radius) {
    const base = FRUIT_CONFIG[type]?.color || '#999999';
    const seed = this.darken(base, 0.35);
    const line = this.darken(base, 0.45);
    ctx.save();
    ctx.translate(x, y);
    const ringSeeds = (count, rRatio, sizeRatio) => {
      ctx.fillStyle = seed;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const px = Math.cos(a) * radius * rRatio;
        const py = Math.sin(a) * radius * rRatio;
        ctx.beginPath();
        ctx.ellipse(px, py, radius * sizeRatio, radius * sizeRatio * 0.6, a, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const segments = (count, rRatio) => {
      ctx.strokeStyle = line;
      ctx.lineWidth = Math.max(1, radius * 0.06);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * radius * rRatio, Math.sin(a) * radius * rRatio);
        ctx.stroke();
      }
    };

    switch (type) {
      case 'LEMON':
        segments(12, 0.85);
        ringSeeds(8, 0.42, 0.05);
        break;
      case 'ORANGE':
        segments(10, 0.85);
        ringSeeds(10, 0.46, 0.05);
        break;
      case 'KIWI':
        ringSeeds(20, 0.7, 0.04);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.26, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'TOMATO':
        segments(8, 0.8);
        ringSeeds(12, 0.6, 0.06);
        break;
      case 'APPLE':
        ringSeeds(6, 0.38, 0.07);
        break;
      case 'GRAPE':
        ringSeeds(10, 0.55, 0.05);
        break;
      case 'CHERRY':
        ringSeeds(6, 0.35, 0.08);
        break;
      case 'WATERMELON':
        ringSeeds(14, 0.55, 0.06);
        break;
      default:
        // 其他类型保持简洁
        break;
    }

    ctx.restore();
  }

  // 特殊道具
  drawRainbow(ctx, x, y, radius) {
    // 多色环带
    const bands = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#9F7AEA'];
    ctx.lineWidth = Math.max(4, radius * 0.22);
    for (let i = 0; i < bands.length; i++) {
      ctx.strokeStyle = bands[i];
      ctx.beginPath();
      ctx.arc(x, y, radius - i*ctx.lineWidth*0.12, i*0.9, Math.PI*2 - i*0.6);
      ctx.stroke();
    }
    // 中心柔光
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius*0.6);
    grad.addColorStop(0, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius*0.85, 0, Math.PI*2);
    ctx.fill();
  }

  drawBomb(ctx, x, y, radius) {
    // 主体
    const grad = ctx.createRadialGradient(x - radius*0.2, y - radius*0.2, radius*0.2, x, y, radius);
    grad.addColorStop(0, '#4a4a4a');
    grad.addColorStop(1, '#1f1f1f');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius*0.95, 0, Math.PI*2);
    ctx.fill();
    // 导火索
    ctx.strokeStyle = '#6b6b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + radius*0.3, y - radius*0.6);
    ctx.quadraticCurveTo(x + radius*0.6, y - radius*1.0, x + radius*0.2, y - radius*1.2);
    ctx.stroke();
    // 火花
    ctx.fillStyle = '#FF7043';
    for (let i = 0; i < 5; i++) {
      const a = i/5 * Math.PI*2;
      ctx.beginPath();
      ctx.arc(x + radius*0.15*Math.cos(a), y - radius*1.22 + radius*0.12*Math.sin(a), 2.2, 0, Math.PI*2);
      ctx.fill();
    }
  }

  lighten(color, amount) {
    return this.adjust(color, amount);
  }
  darken(color, amount) {
    return this.adjust(color, -amount);
  }
  adjust(hex, amount) {
    const c = hex.replace('#','');
    const r = parseInt(c.substring(0,2),16);
    const g = parseInt(c.substring(2,4),16);
    const b = parseInt(c.substring(4,6),16);
    const adj = v => Math.max(0, Math.min(255, Math.round(v + 255*amount)));
    const toHex = v => v.toString(16).padStart(2,'0');
    return `#${toHex(adj(r))}${toHex(adj(g))}${toHex(adj(b))}`;
  }
}

export default FruitRenderer;