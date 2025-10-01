// 图片加载器 - 处理SVG和其他图片资源 - Updated
export class ImageLoader {
  constructor() {
    this.images = new Map();
    this.loadingPromises = new Map();
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
      // 单张图片加载超时兜底，避免长时间挂起
      const timeoutMs = 1500;
      const timeoutId = setTimeout(() => {
        console.warn(`Image load timeout: ${src}`);
        reject(new Error(`Image timeout: ${src}`));
      }, timeoutMs);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Image onerror: ${src}`));
      };
      img.src = src;
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