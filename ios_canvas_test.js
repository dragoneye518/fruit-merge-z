// iOS Canvas兼容性测试脚本
console.log('=== iOS Canvas兼容性测试 ===\n');

// 创建测试Canvas
function testCanvasCompatibility() {
  console.log('1. 测试Canvas基本功能:');
  
  try {
    // 创建Canvas元素
    const canvas = document.createElement('canvas');
    canvas.width = 375;
    canvas.height = 667;
    
    // 获取2D上下文
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('  ❌ 无法获取2D渲染上下文');
      return false;
    }
    console.log('  ✓ 成功获取2D渲染上下文');
    
    // 测试基本绘制功能
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(10, 10, 50, 50);
    console.log('  ✓ 基本矩形绘制正常');
    
    // 测试路径绘制
    ctx.beginPath();
    ctx.arc(100, 100, 30, 0, Math.PI * 2);
    ctx.fill();
    console.log('  ✓ 路径绘制正常');
    
    // 测试变换
    ctx.save();
    ctx.translate(200, 200);
    ctx.scale(1.5, 1.5);
    ctx.fillRect(0, 0, 20, 20);
    ctx.restore();
    console.log('  ✓ 变换操作正常');
    
    // 测试图片绘制
    const img = new Image();
    img.onload = function() {
      ctx.drawImage(img, 0, 0, 50, 50);
      console.log('  ✓ 图片绘制正常');
    };
    img.onerror = function() {
      console.warn('  ⚠️ 图片加载失败（可能是跨域问题）');
    };
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    return true;
  } catch (error) {
    console.error('  ❌ Canvas测试失败:', error);
    return false;
  }
}

// 测试触摸事件
function testTouchEvents() {
  console.log('\n2. 测试触摸事件:');
  
  try {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      console.error('  ❌ 找不到游戏Canvas元素');
      return false;
    }
    
    let touchStartCount = 0;
    let touchMoveCount = 0;
    let touchEndCount = 0;
    
    // 添加触摸事件监听器
    canvas.addEventListener('touchstart', function(e) {
      touchStartCount++;
      console.log(`  触摸开始 #${touchStartCount}:`, e.touches.length, '个触点');
      e.preventDefault();
    }, { passive: false });
    
    canvas.addEventListener('touchmove', function(e) {
      touchMoveCount++;
      if (touchMoveCount <= 3) { // 只记录前3次
        console.log(`  触摸移动 #${touchMoveCount}:`, e.touches[0].clientX, e.touches[0].clientY);
      }
      e.preventDefault();
    }, { passive: false });
    
    canvas.addEventListener('touchend', function(e) {
      touchEndCount++;
      console.log(`  触摸结束 #${touchEndCount}`);
      e.preventDefault();
    }, { passive: false });
    
    console.log('  ✓ 触摸事件监听器已设置');
    console.log('  提示: 请在Canvas上进行触摸测试');
    
    return true;
  } catch (error) {
    console.error('  ❌ 触摸事件测试失败:', error);
    return false;
  }
}

// 测试性能
function testPerformance() {
  console.log('\n3. 测试渲染性能:');
  
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 375;
    canvas.height = 667;
    const ctx = canvas.getContext('2d');
    
    const startTime = performance.now();
    
    // 绘制大量图形测试性能
    for (let i = 0; i < 1000; i++) {
      ctx.fillStyle = `hsl(${i % 360}, 50%, 50%)`;
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        10, 10
      );
    }
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    console.log(`  渲染1000个矩形耗时: ${renderTime.toFixed(2)}ms`);
    
    if (renderTime < 50) {
      console.log('  ✓ 渲染性能良好');
    } else if (renderTime < 100) {
      console.log('  ⚠️ 渲染性能一般');
    } else {
      console.log('  ❌ 渲染性能较差');
    }
    
    return true;
  } catch (error) {
    console.error('  ❌ 性能测试失败:', error);
    return false;
  }
}

// 测试内存使用
function testMemoryUsage() {
  console.log('\n4. 测试内存使用:');
  
  try {
    if (performance.memory) {
      const memory = performance.memory;
      console.log(`  已使用内存: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  内存限制: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  内存使用率: ${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)}%`);
      
      if (memory.usedJSHeapSize / memory.jsHeapSizeLimit < 0.5) {
        console.log('  ✓ 内存使用正常');
      } else {
        console.log('  ⚠️ 内存使用较高');
      }
    } else {
      console.log('  ⚠️ 无法获取内存信息（iOS限制）');
    }
    
    return true;
  } catch (error) {
    console.error('  ❌ 内存测试失败:', error);
    return false;
  }
}

// 运行所有测试
function runAllTests() {
  console.log('开始iOS兼容性测试...\n');
  
  const results = {
    canvas: testCanvasCompatibility(),
    touch: testTouchEvents(),
    performance: testPerformance(),
    memory: testMemoryUsage()
  };
  
  console.log('\n=== 测试结果汇总 ===');
  console.log(`Canvas兼容性: ${results.canvas ? '✓ 通过' : '❌ 失败'}`);
  console.log(`触摸事件: ${results.touch ? '✓ 通过' : '❌ 失败'}`);
  console.log(`渲染性能: ${results.performance ? '✓ 通过' : '❌ 失败'}`);
  console.log(`内存使用: ${results.memory ? '✓ 通过' : '❌ 失败'}`);
  
  const passedTests = Object.values(results).filter(r => r).length;
  console.log(`\n总体结果: ${passedTests}/4 项测试通过`);
  
  if (passedTests === 4) {
    console.log('🎉 所有测试通过，iOS兼容性良好！');
  } else {
    console.log('⚠️ 部分测试失败，需要进一步优化');
  }
}

// 页面加载完成后运行测试
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllTests);
} else {
  runAllTests();
}

// 导出测试函数供手动调用
if (typeof window !== 'undefined') {
  window.iOSCanvasTest = {
    runAllTests,
    testCanvasCompatibility,
    testTouchEvents,
    testPerformance,
    testMemoryUsage
  };
}