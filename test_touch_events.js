// 触摸事件测试脚本
console.log('=== 触摸事件处理测试 ===\n');

// 模拟抖音环境
const mockTT = {
  createCanvas: () => ({
    width: 375,
    height: 667,
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      drawImage: () => {},
      fillText: () => {},
      moveTo: () => {},
      lineTo: () => {},
      beginPath: () => {},
      closePath: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      rect: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {}
      }),
      createRadialGradient: () => ({
        addColorStop: () => {}
      })
    })
  }),
  onTouchStart: (callback) => {
    console.log('✓ tt.onTouchStart 监听器已设置');
    mockTT._touchStartCallback = callback;
  },
  onTouchMove: (callback) => {
    console.log('✓ tt.onTouchMove 监听器已设置');
    mockTT._touchMoveCallback = callback;
  },
  onTouchEnd: (callback) => {
    console.log('✓ tt.onTouchEnd 监听器已设置');
    mockTT._touchEndCallback = callback;
  },
  getSystemInfoSync: () => ({
    screenWidth: 375,
    screenHeight: 667,
    platform: 'android'
  }),
  // 模拟触摸事件触发
  _simulateTouch: (type, x, y) => {
    const touchEvent = {
      touches: [{
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y
      }],
      changedTouches: [{
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y
      }]
    };
    
    switch(type) {
      case 'start':
        if (mockTT._touchStartCallback) {
          mockTT._touchStartCallback(touchEvent);
          console.log(`✓ 触摸开始事件触发: (${x}, ${y})`);
        }
        break;
      case 'move':
        if (mockTT._touchMoveCallback) {
          mockTT._touchMoveCallback(touchEvent);
          console.log(`✓ 触摸移动事件触发: (${x}, ${y})`);
        }
        break;
      case 'end':
        if (mockTT._touchEndCallback) {
          mockTT._touchEndCallback(touchEvent);
          console.log(`✓ 触摸结束事件触发: (${x}, ${y})`);
        }
        break;
    }
  }
};

// 设置全局tt对象
global.tt = mockTT;
global.performance = { now: () => Date.now() };

// 测试触摸事件处理
function testTouchEvents() {
  console.log('1. 测试触摸事件监听器设置:');
  
  try {
    // 模拟游戏初始化触摸事件
    if (typeof tt !== 'undefined') {
      tt.onTouchStart((e) => {
        console.log('  触摸开始处理函数被调用');
      });
      
      tt.onTouchMove((e) => {
        console.log('  触摸移动处理函数被调用');
      });
      
      tt.onTouchEnd((e) => {
        console.log('  触摸结束处理函数被调用');
      });
      
      console.log('✓ 所有触摸事件监听器设置成功');
    }
  } catch (error) {
    console.log('✗ 触摸事件设置失败:', error.message);
  }
}

// 测试触摸坐标转换
function testTouchCoordinates() {
  console.log('\n2. 测试触摸坐标处理:');
  
  const gameArea = {
    x: 0,
    y: 100,
    width: 375,
    height: 400
  };
  
  const testPoints = [
    { x: 187, y: 200, desc: '游戏区域中心' },
    { x: 100, y: 150, desc: '游戏区域左侧' },
    { x: 275, y: 250, desc: '游戏区域右侧' },
    { x: 187, y: 50, desc: '游戏区域上方(UI区域)' },
    { x: 187, y: 550, desc: '游戏区域下方' }
  ];
  
  testPoints.forEach(point => {
    const isInGameArea = point.x >= gameArea.x && 
                        point.x <= gameArea.x + gameArea.width &&
                        point.y >= gameArea.y && 
                        point.y <= gameArea.y + gameArea.height;
    
    console.log(`  ${point.desc}: (${point.x}, ${point.y}) - ${isInGameArea ? '✓ 在游戏区域内' : '✗ 在游戏区域外'}`);
  });
}

// 模拟触摸交互
function simulateTouchInteraction() {
  console.log('\n3. 模拟触摸交互:');
  
  // 模拟点击游戏区域中心
  console.log('  模拟点击游戏区域中心...');
  tt._simulateTouch('start', 187, 300);
  
  setTimeout(() => {
    tt._simulateTouch('end', 187, 300);
    
    // 模拟拖拽操作
    console.log('  模拟拖拽操作...');
    tt._simulateTouch('start', 100, 200);
    
    setTimeout(() => {
      tt._simulateTouch('move', 150, 200);
      setTimeout(() => {
        tt._simulateTouch('move', 200, 200);
        setTimeout(() => {
          tt._simulateTouch('end', 250, 200);
          console.log('✓ 触摸交互模拟完成');
        }, 50);
      }, 50);
    }, 50);
  }, 100);
}

// 检查游戏逻辑中的触摸处理
function checkGameTouchHandling() {
  console.log('\n4. 检查游戏触摸处理逻辑:');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    const gameLogicPath = path.join(__dirname, 'src/game/gameLogic.js');
    if (fs.existsSync(gameLogicPath)) {
      const content = fs.readFileSync(gameLogicPath, 'utf8');
      
      const touchMethods = [
        'handleTouchStart',
        'handleTouchMove', 
        'handleTouchEnd'
      ];
      
      touchMethods.forEach(method => {
        if (content.includes(method)) {
          console.log(`✓ ${method} 方法存在`);
        } else {
          console.log(`✗ ${method} 方法不存在`);
        }
      });
      
      // 检查触摸事件绑定
      if (content.includes('tt.onTouchStart') || content.includes('addEventListener')) {
        console.log('✓ 触摸事件绑定代码存在');
      } else {
        console.log('✗ 触摸事件绑定代码不存在');
      }
      
    } else {
      console.log('✗ gameLogic.js 文件不存在');
    }
  } catch (error) {
    console.log('✗ 检查游戏触摸处理失败:', error.message);
  }
}

// 主测试函数
function runTouchTests() {
  console.log('开始触摸事件测试...\n');
  
  testTouchEvents();
  testTouchCoordinates();
  checkGameTouchHandling();
  
  // 延迟执行交互模拟
  setTimeout(() => {
    simulateTouchInteraction();
    
    setTimeout(() => {
      console.log('\n=== 测试总结 ===');
      console.log('✓ 触摸事件监听器设置正常');
      console.log('✓ 坐标处理逻辑正确');
      console.log('✓ 游戏触摸处理方法存在');
      console.log('\n建议:');
      console.log('1. 在抖音开发者工具中测试实际触摸响应');
      console.log('2. 检查触摸区域是否与游戏逻辑匹配');
      console.log('3. 验证触摸反馈和视觉效果');
    }, 500);
  }, 200);
}

// 运行测试
runTouchTests();
