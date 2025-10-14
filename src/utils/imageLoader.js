// 图片加载器 - 处理SVG和其他图片资源 - Updated
export class ImageLoader {
  constructor() {
    this.images = new Map();
    this.loadingPromises = new Map();
    // 透明边距裁剪缓存：src -> { sx, sy, sw, sh }
    this.bounds = new Map();
  }
  
  // 加载图片
  async loadImage(src) {
    // 如果已经加载过，直接返回
    if (this.images.has(src)) {
      return this.images.get(src);
    }
    
    // 如果正在加载，返回加载Promise
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src);
    }
    
    // 开始加载
    const loadPromise = this._loadImageInternal(src);
    this.loadingPromises.set(src, loadPromise);
    
    try {
      const image = await loadPromise;
      this.images.set(src, image);
      this.loadingPromises.delete(src);
      return image;
    } catch (error) {
      this.loadingPromises.delete(src);
      // 使用 warn 降低噪音，同时保留失败信息；抛出以便上层降级渲染
      console.warn(`图片加载失败: ${src}`, error?.message || error);
      throw error;
    }
  }
  
  // 内部加载方法
  async _loadImageInternal(src) {
    return new Promise((resolve, reject) => {
      // 在抖音小游戏环境使用 tt.createImage，否则使用浏览器 Image
      const createImage = () => {
        if (typeof tt !== 'undefined' && typeof tt.createImage === 'function') {
          return tt.createImage();
        }
        if (typeof Image !== 'undefined') {
          return new Image();
        }
        return null;
      };

      const img = createImage();
      if (!img) {
        reject(new Error('No image constructor available in current environment'));
        return;
      }

      // 处理抖音环境下的图片路径
      let imageSrc = src;
      if (typeof tt !== 'undefined') {
        // 抖音环境下，确保路径以 ./ 开头或者是绝对路径
        if (!imageSrc.startsWith('./') && !imageSrc.startsWith('/') && !imageSrc.startsWith('http')) {
          imageSrc = './' + imageSrc;
        }
        console.log(`[DouyinImage] Loading: ${src} -> ${imageSrc}`);
      }

      // 单张图片加载超时兜底，避免长时间挂起
      const timeoutMs = 3000; // 增加超时时间到3秒
      const timeoutId = setTimeout(() => {
        console.warn(`Image load timeout: ${imageSrc}`);
        reject(new Error(`Image timeout: ${imageSrc}`));
      }, timeoutMs);

      img.onload = () => {
        clearTimeout(timeoutId);
        console.log(`[ImageLoader] Successfully loaded: ${imageSrc}`);
        resolve(img);
      };
      img.onerror = (error) => {
        clearTimeout(timeoutId);
        console.error(`[ImageLoader] Failed to load: ${imageSrc}`, error);
        reject(new Error(`Image onerror: ${imageSrc}`));
      };
      
      // 设置图片源
      img.src = imageSrc;
    });
  }
  
  // 预加载多个图片
  async preloadImages(srcList) {
    const promises = srcList.map(src => this.loadImage(src));
    const results = await Promise.allSettled(promises);
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length) {
      console.warn(`预加载失败 ${failed.length} 张图片`);
    }
    return results;
  }
  
  // 获取已加载的图片
  getImage(src) {
    return this.images.get(src);
  }
  
  // 检查图片是否已加载
  hasImage(src) {
    return this.images.has(src);
  }
  
  // 检查图片是否已加载（别名方法）
  isLoaded(src) {
    return this.images.has(src);
  }
  
  // 清除缓存
  clear() {
    this.images.clear();
    this.loadingPromises.clear();
    this.bounds.clear();
  }
  
  // 获取加载状态
  getLoadingStatus() {
    return {
      loaded: this.images.size,
      loading: this.loadingPromises.size
    };
  }
}

// 全局图片加载器实例
export const imageLoader = new ImageLoader();

// 扩展：透明边距裁剪与查询（挂载到实例原型，避免破坏构造）
ImageLoader.prototype.computeOpaqueBounds = function(img) {
  const w = img.naturalWidth || img.width || 0;
  const h = img.naturalHeight || img.height || 0;
  if (!w || !h) return null;
  const canvas = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
  if (!canvas) return null;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const alphaThreshold = 8; // 近透明视为留白
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x++) {
        const a = data[rowOffset + x * 4 + 3];
        if (a > alphaThreshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0 || maxY < 0) {
      // 全透明，返回全图（避免异常）
      return { sx: 0, sy: 0, sw: w, sh: h };
    }
    const margin = 1; // 轻微安全边距
    const sx = Math.max(0, minX - margin);
    const sy = Math.max(0, minY - margin);
    const ex = Math.min(w - 1, maxX + margin);
    const ey = Math.min(h - 1, maxY + margin);
    const sw = Math.max(1, ex - sx + 1);
    const sh = Math.max(1, ey - sy + 1);
    return { sx, sy, sw, sh };
  } catch (e) {
    console.warn('computeOpaqueBounds error', e);
    return null;
  }
};

ImageLoader.prototype.getOpaqueBounds = function(src) {
  if (this.bounds.has(src)) return this.bounds.get(src);
  const img = this.images.get(src);
  if (!img) return null;
  const b = this.computeOpaqueBounds(img);
  if (b) this.bounds.set(src, b);
  return b;
};