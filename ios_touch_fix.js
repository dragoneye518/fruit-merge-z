// iOS触摸事件修复脚本
console.log('=== iOS触摸事件修复 ===\n');

// 修复iOS触摸坐标计算
function fixiOSTouchCoordinates() {
  console.log('1. 修复iOS触摸坐标计算:');
  
  // 获取Canvas元素
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('  ❌ 找不到Canvas元素');
    return false;
  }
  
  // 创建优化的坐标计算函数
  function getOptimizedTouchCoordinates(touch, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // 考虑设备像素比
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    let x = (touch.clientX - rect.left) * scaleX;
    let y = (touch.clientY - rect.top) * scaleY;
    
    // iOS Safari特殊处理
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // 处理iOS的viewport缩放
      const viewportScale = window.visualViewport ? window.visualViewport.scale : 1;
      x = x / viewportScale;
      y = y / viewportScale;
    }
    
    return { x: Math.round(x), y: Math.round(y) };
  }
  
  // 移除现有的触摸事件监听器（如果存在）
  const newCanvas = canvas.cloneNode(true);
  canvas.parentNode.replaceChild(newCanvas, canvas);
  
  // 添加优化的触摸事件监听器
  let touchStartTime = 0;
  let lastTouchPosition = null;
  
  newCanvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    touchStartTime = Date.now();
    const touch = e.touches[0];
    const coords = getOptimizedTouchCoordinates(touch, newCanvas);
    lastTouchPosition = coords;
    
    console.log('  触摸开始:', coords.x, coords.y);
    
    // 触发游戏的触摸开始事件
    if (window.game && window.game.gameLogic) {
      window.game.gameLogic.handleTouchStart(coords.x, coords.y);
    }
  }, { passive: false });
  
  newCanvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    const coords = getOptimizedTouchCoordinates(touch, newCanvas);
    lastTouchPosition = coords;
    
    // 触发游戏的触摸移动事件
    if (window.game && window.game.gameLogic) {
      window.game.gameLogic.handleTouchMove(coords.x, coords.y);
    }
  }, { passive: false });
  
  newCanvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime;
    
    let coords;
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      coords = getOptimizedTouchCoordinates(touch, newCanvas);
    } else if (lastTouchPosition) {
      coords = lastTouchPosition;
    } else {
      return;
    }
    
    console.log('  触摸结束:', coords.x, coords.y, '持续时间:', touchDuration + 'ms');
    
    // 触发游戏的触摸结束事件
    if (window.game && window.game.gameLogic) {
      window.game.gameLogic.handleTouchEnd(coords.x, coords.y);
    }
  }, { passive: false });
  
  console.log('  ✓ iOS触摸事件修复完成');
  return true;
}

// 修复iOS页面滚动问题
function fixiOSScrolling() {
  console.log('\n2. 修复iOS页面滚动问题:');
  
  // 阻止页面滚动
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });
  
  // 阻止双击缩放
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
  
  // 阻止长按菜单
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
  
  console.log('  ✓ iOS滚动问题修复完成');
  return true;
}

// 修复iOS Canvas渲染问题
function fixiOSCanvasRendering() {
  console.log('\n3. 修复iOS Canvas渲染问题:');
  
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('  ❌ 找不到Canvas元素');
    return false;
  }
  
  // 设置Canvas的CSS样式以确保正确显示
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';
  canvas.style.webkitTouchCallout = 'none';
  canvas.style.webkitUserSelect = 'none';
  canvas.style.userSelect = 'none';
  
  // 确保Canvas尺寸正确
  const rect = canvas.getBoundingClientRect();
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  // 设置Canvas的实际尺寸
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  
  // 缩放Canvas上下文以匹配设备像素比
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(devicePixelRatio, devicePixelRatio);
    console.log('  ✓ Canvas像素比缩放设置完成');
  }
  
  console.log('  ✓ iOS Canvas渲染修复完成');
  return true;
}

// 添加iOS性能优化
function optimizeiOSPerformance() {
  console.log('\n4. iOS性能优化:');
  
  // 优化requestAnimationFrame
  let isVisible = true;
  
  // 监听页面可见性变化
  document.addEventListener('visibilitychange', function() {
    isVisible = !document.hidden;
    console.log('  页面可见性:', isVisible ? '可见' : '隐藏');
    
    if (window.game) {
      if (isVisible) {
        window.game.onGameShow();
      } else {
        window.game.onGameHide();
      }
    }
  });
  
  // 监听页面焦点变化
  window.addEventListener('focus', function() {
    isVisible = true;
    if (window.game) {
      window.game.onGameShow();
    }
  });
  
  window.addEventListener('blur', function() {
    isVisible = false;
    if (window.game) {
      window.game.onGameHide();
    }
  });
  
  // 内存管理
  let lastMemoryCheck = 0;
  function checkMemoryUsage() {
    const now = Date.now();
    if (now - lastMemoryCheck > 5000) { // 每5秒检查一次
      lastMemoryCheck = now;
      
      if (performance.memory) {
        const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
        if (memoryUsage > 0.8) {
          console.warn('  ⚠️ 内存使用率过高:', (memoryUsage * 100).toFixed(1) + '%');
          // 触发垃圾回收（如果可能）
          if (window.gc) {
            window.gc();
          }
        }
      }
    }
  }
  
  // 定期检查内存
  setInterval(checkMemoryUsage, 5000);
  
  console.log('  ✓ iOS性能优化设置完成');
  return true;
}

// 运行所有修复
function applyAllFixes() {
  console.log('开始应用iOS修复...\n');
  
  const results = {
    touchCoordinates: fixiOSTouchCoordinates(),
    scrolling: fixiOSScrolling(),
    canvasRendering: fixiOSCanvasRendering(),
    performance: optimizeiOSPerformance()
  };
  
  console.log('\n=== 修复结果汇总 ===');
  console.log(`触摸坐标修复: ${results.touchCoordinates ? '✓ 成功' : '❌ 失败'}`);
  console.log(`滚动问题修复: ${results.scrolling ? '✓ 成功' : '❌ 失败'}`);
  console.log(`Canvas渲染修复: ${results.canvasRendering ? '✓ 成功' : '❌ 失败'}`);
  console.log(`性能优化: ${results.performance ? '✓ 成功' : '❌ 失败'}`);
  
  const successCount = Object.values(results).filter(r => r).length;
  console.log(`\n总体结果: ${successCount}/4 项修复成功`);
  
  if (successCount === 4) {
    console.log('🎉 所有iOS修复应用成功！');
  } else {
    console.log('⚠️ 部分修复失败，请检查控制台错误信息');
  }
  
  return results;
}

// 页面加载完成后应用修复
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyAllFixes);
} else {
  applyAllFixes();
}

// 导出修复函数供手动调用
if (typeof window !== 'undefined') {
  window.iOSTouchFix = {
    applyAllFixes,
    fixiOSTouchCoordinates,
    fixiOSScrolling,
    fixiOSCanvasRendering,
    optimizeiOSPerformance
  };
}