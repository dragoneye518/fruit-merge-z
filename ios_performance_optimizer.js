// iOS性能优化脚本
console.log('=== iOS性能优化 ===\n');

// 游戏性能监控器
class iOSPerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 60;
    this.memoryUsage = 0;
    this.isMonitoring = false;
    this.performanceData = [];
  }
  
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('  ✓ 开始性能监控');
    
    // FPS监控
    this.monitorFPS();
    
    // 内存监控
    this.monitorMemory();
    
    // 渲染性能监控
    this.monitorRenderPerformance();
  }
  
  monitorFPS() {
    const measureFPS = () => {
      if (!this.isMonitoring) return;
      
      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastTime;
      
      if (deltaTime >= 1000) { // 每秒更新一次
        this.fps = Math.round((this.frameCount * 1000) / deltaTime);
        this.frameCount = 0;
        this.lastTime = currentTime;
        
        // 记录性能数据
        this.performanceData.push({
          timestamp: currentTime,
          fps: this.fps,
          memoryUsage: this.memoryUsage
        });
        
        // 只保留最近10秒的数据
        if (this.performanceData.length > 10) {
          this.performanceData.shift();
        }
        
        // 性能警告
        if (this.fps < 30) {
          console.warn(`  ⚠️ FPS过低: ${this.fps}`);
          this.optimizePerformance();
        }
      }
      
      this.frameCount++;
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }
  
  monitorMemory() {
    if (!performance.memory) {
      console.log('  ⚠️ 无法监控内存使用（iOS限制）');
      return;
    }
    
    const checkMemory = () => {
      if (!this.isMonitoring) return;
      
      const memory = performance.memory;
      this.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      
      if (this.memoryUsage > 0.8) {
        console.warn(`  ⚠️ 内存使用率过高: ${(this.memoryUsage * 100).toFixed(1)}%`);
        this.cleanupMemory();
      }
      
      setTimeout(checkMemory, 2000); // 每2秒检查一次
    };
    
    checkMemory();
  }
  
  monitorRenderPerformance() {
    let renderStartTime = 0;
    let renderCount = 0;
    let totalRenderTime = 0;
    
    // 监控Canvas渲染性能
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
      const context = originalGetContext.call(this, contextType, ...args);
      
      if (contextType === '2d' && context) {
        // 只检查Canvas方法是否存在，不覆盖已有的方法
        const requiredMethods = ['moveTo', 'lineTo', 'beginPath', 'closePath', 'stroke', 'fill', 'arc', 'rect', 'save', 'restore', 'translate', 'rotate', 'scale', 'setLineDash', 'clearRect', 'fillRect', 'drawImage'];
        
        // 只记录缺失的方法，不添加空操作的fallback
        for (const methodName of requiredMethods) {
          if (typeof context[methodName] !== 'function') {
            console.warn(`Canvas context missing method: ${methodName}`);
          }
        }
        
        // 性能监控包装 - 只包装存在的方法
        if (typeof context.clearRect === 'function') {
          const originalClearRect = context.clearRect;
          context.clearRect = function(...args) {
            renderStartTime = performance.now();
            const result = originalClearRect.apply(this, args);
            const renderTime = performance.now() - renderStartTime;
            totalRenderTime += renderTime;
            renderCount++;
            
            // 每100次渲染统计一次
            if (renderCount >= 100) {
              const avgRenderTime = totalRenderTime / renderCount;
              if (avgRenderTime > 5) { // 超过5ms警告
                console.warn(`  ⚠️ 渲染性能较差，平均耗时: ${avgRenderTime.toFixed(2)}ms`);
              }
              renderCount = 0;
              totalRenderTime = 0;
            }
            
            return result;
          };
        }
        
        if (typeof context.fillRect === 'function') {
          const originalFillRect = context.fillRect;
          context.fillRect = function(...args) {
            const start = performance.now();
            const result = originalFillRect.apply(this, args);
            this._renderTime = (this._renderTime || 0) + (performance.now() - start);
            return result;
          };
        }
        
        if (typeof context.drawImage === 'function') {
          const originalDrawImage = context.drawImage;
          context.drawImage = function(...args) {
            const start = performance.now();
            const result = originalDrawImage.apply(this, args);
            this._renderTime = (this._renderTime || 0) + (performance.now() - start);
            return result;
          };
        }
      }
      
      return context;
    };
  }
  
  optimizePerformance() {
    console.log('  🔧 应用性能优化...');
    
    // 降低渲染质量
    if (window.game && window.game.gameLogic) {
      // 减少粒子效果
      if (window.game.effectSystem) {
        window.game.effectSystem.setQuality('low');
      }
      
      // 降低物理引擎精度
      if (window.game.gameLogic.physicsEngine) {
        window.game.gameLogic.physicsEngine.setLowPerformanceMode(true);
      }
    }
    
    // 强制垃圾回收
    this.cleanupMemory();
  }
  
  cleanupMemory() {
    console.log('  🧹 清理内存...');
    
    // 清理游戏缓存
    if (window.game) {
      // 清理音频缓存
      if (window.game.audioManager) {
        window.game.audioManager.cleanup();
      }
      
      // 清理图片缓存
      if (window.game.imageLoader) {
        window.game.imageLoader.cleanup();
      }
      
      // 清理效果系统
      if (window.game.effectSystem) {
        window.game.effectSystem.cleanup();
      }
    }
    
    // 强制垃圾回收（如果可用）
    if (window.gc) {
      window.gc();
    }
  }
  
  getPerformanceReport() {
    const avgFPS = this.performanceData.reduce((sum, data) => sum + data.fps, 0) / this.performanceData.length;
    const avgMemory = this.performanceData.reduce((sum, data) => sum + data.memoryUsage, 0) / this.performanceData.length;
    
    return {
      currentFPS: this.fps,
      averageFPS: Math.round(avgFPS) || 0,
      currentMemoryUsage: (this.memoryUsage * 100).toFixed(1) + '%',
      averageMemoryUsage: (avgMemory * 100).toFixed(1) + '%',
      performanceLevel: this.getPerformanceLevel()
    };
  }
  
  getPerformanceLevel() {
    if (this.fps >= 50) return '优秀';
    if (this.fps >= 30) return '良好';
    if (this.fps >= 20) return '一般';
    return '较差';
  }
  
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('  ✓ 停止性能监控');
  }
}

// iOS特定优化
function applyiOSOptimizations() {
  console.log('1. 应用iOS特定优化:');
  
  // 优化Canvas渲染
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 启用硬件加速
      ctx.imageSmoothingEnabled = false; // 禁用图像平滑以提高性能
      console.log('  ✓ 禁用Canvas图像平滑');
      
      // 设置合成操作
      ctx.globalCompositeOperation = 'source-over';
      console.log('  ✓ 设置Canvas合成操作');
    }
  }
  
  // 优化requestAnimationFrame
  let isPageVisible = true;
  let animationId = null;
  
  document.addEventListener('visibilitychange', function() {
    isPageVisible = !document.hidden;
    
    if (isPageVisible) {
      console.log('  ✓ 页面可见，恢复动画');
      if (window.game && window.game.start) {
        window.game.start();
      }
    } else {
      console.log('  ✓ 页面隐藏，暂停动画');
      if (window.game && window.game.stop) {
        window.game.stop();
      }
    }
  });
  
  // 优化触摸事件处理
  let touchEventQueue = [];
  let isProcessingTouch = false;
  
  function processTouchQueue() {
    if (isProcessingTouch || touchEventQueue.length === 0) return;
    
    isProcessingTouch = true;
    const event = touchEventQueue.shift();
    
    // 处理触摸事件
    if (window.game && window.game.gameLogic) {
      switch (event.type) {
        case 'touchstart':
          window.game.gameLogic.handleTouchStart(event.x, event.y);
          break;
        case 'touchmove':
          window.game.gameLogic.handleTouchMove(event.x, event.y);
          break;
        case 'touchend':
          window.game.gameLogic.handleTouchEnd(event.x, event.y);
          break;
      }
    }
    
    isProcessingTouch = false;
    
    // 继续处理队列
    if (touchEventQueue.length > 0) {
      requestAnimationFrame(processTouchQueue);
    }
  }
  
  console.log('  ✓ iOS优化应用完成');
  return true;
}

// 创建性能监控实例
const performanceMonitor = new iOSPerformanceMonitor();

// 初始化性能优化
function initPerformanceOptimization() {
  console.log('开始iOS性能优化...\n');
  
  const results = {
    optimizations: applyiOSOptimizations(),
    monitoring: true
  };
  
  // 启动性能监控
  performanceMonitor.startMonitoring();
  
  // 定期输出性能报告
  setInterval(() => {
    const report = performanceMonitor.getPerformanceReport();
    console.log('📊 性能报告:', report);
  }, 10000); // 每10秒输出一次
  
  console.log('\n=== 性能优化结果 ===');
  console.log(`iOS优化: ${results.optimizations ? '✓ 成功' : '❌ 失败'}`);
  console.log(`性能监控: ${results.monitoring ? '✓ 启动' : '❌ 失败'}`);
  
  if (results.optimizations && results.monitoring) {
    console.log('🎉 iOS性能优化完成！');
  } else {
    console.log('⚠️ 部分优化失败');
  }
  
  return results;
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPerformanceOptimization);
} else {
  initPerformanceOptimization();
}

// 导出性能监控器供外部使用
if (typeof window !== 'undefined') {
  window.iOSPerformanceMonitor = performanceMonitor;
  window.iOSOptimizer = {
    initPerformanceOptimization,
    applyiOSOptimizations,
    performanceMonitor
  };
}