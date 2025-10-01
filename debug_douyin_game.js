// 抖音小游戏调试脚本
console.log('=== 抖音小游戏调试工具 ===');

// 检查抖音环境
function checkDouyinEnvironment() {
  console.log('\n1. 检查抖音环境:');
  
  if (typeof tt !== 'undefined') {
    console.log('✓ 抖音环境检测成功');
    
    // 检查关键API
    const apis = ['createCanvas', 'getSystemInfoSync', 'onTouchStart', 'onTouchMove', 'onTouchEnd'];
    apis.forEach(api => {
      if (typeof tt[api] === 'function') {
        console.log(`✓ tt.${api} 可用`);
      } else {
        console.log(`✗ tt.${api} 不可用`);
      }
    });
    
    // 获取系统信息
    try {
      const systemInfo = tt.getSystemInfoSync();
      console.log('✓ 系统信息:', {
        platform: systemInfo.platform,
        screenWidth: systemInfo.screenWidth,
        screenHeight: systemInfo.screenHeight
      });
    } catch (e) {
      console.log('✗ 获取系统信息失败:', e.message);
    }
    
  } else {
    console.log('✗ 非抖音环境，使用模拟模式');
    return false;
  }
  
  return true;
}

// 检查游戏配置
function checkGameConfig() {
  console.log('\n2. 检查游戏配置:');
  
  try {
    // 这里需要在抖音环境中动态导入
    console.log('✓ 准备检查游戏配置文件');
    console.log('注意：需要在抖音开发者工具中运行此脚本');
  } catch (e) {
    console.log('✗ 配置检查失败:', e.message);
  }
}

// 检查画布创建
function checkCanvasCreation() {
  console.log('\n3. 检查画布创建:');
  
  if (typeof tt !== 'undefined' && typeof tt.createCanvas === 'function') {
    try {
      const canvas = tt.createCanvas();
      const ctx = canvas.getContext('2d');
      
      canvas.width = 375;
      canvas.height = 667;
      
      console.log('✓ 画布创建成功');
      console.log('✓ 画布尺寸:', canvas.width, 'x', canvas.height);
      console.log('✓ 上下文获取成功');
      
      return canvas;
    } catch (e) {
      console.log('✗ 画布创建失败:', e.message);
      return null;
    }
  } else {
    console.log('✗ tt.createCanvas 不可用');
    return null;
  }
}

// 检查触摸事件
function checkTouchEvents() {
  console.log('\n4. 检查触摸事件:');
  
  if (typeof tt !== 'undefined') {
    try {
      tt.onTouchStart(() => {
        console.log('✓ 触摸开始事件触发');
      });
      
      tt.onTouchMove(() => {
        console.log('✓ 触摸移动事件触发');
      });
      
      tt.onTouchEnd(() => {
        console.log('✓ 触摸结束事件触发');
      });
      
      console.log('✓ 触摸事件监听器设置成功');
    } catch (e) {
      console.log('✗ 触摸事件设置失败:', e.message);
    }
  } else {
    console.log('✗ 抖音环境不可用');
  }
}

// 主调试函数
function debugDouyinGame() {
  console.log('开始调试抖音小游戏...\n');
  
  const isDouyinEnv = checkDouyinEnvironment();
  checkGameConfig();
  const canvas = checkCanvasCreation();
  checkTouchEvents();
  
  console.log('\n=== 调试总结 ===');
  console.log('抖音环境:', isDouyinEnv ? '✓' : '✗');
  console.log('画布创建:', canvas ? '✓' : '✗');
  
  if (isDouyinEnv && canvas) {
    console.log('✓ 基础环境检查通过，游戏应该可以正常运行');
  } else {
    console.log('✗ 存在问题，需要在抖音开发者工具中运行');
  }
}

// 导出调试函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { debugDouyinGame };
} else if (typeof window !== 'undefined') {
  window.debugDouyinGame = debugDouyinGame;
}

// 如果直接运行，执行调试
if (typeof require !== 'undefined' && require.main === module) {
  debugDouyinGame();
}
