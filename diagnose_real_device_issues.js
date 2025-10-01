// 抖音真机环境问题诊断脚本
console.log('=== 抖音真机环境问题诊断 ===\n');

const fs = require('fs');
const path = require('path');

// 检查ES6模块兼容性问题
function checkES6ModuleIssues() {
  console.log('1. 检查ES6模块兼容性问题:');
  
  const gameJsPath = path.join(__dirname, 'game.js');
  if (fs.existsSync(gameJsPath)) {
    const content = fs.readFileSync(gameJsPath, 'utf8');
    
    // 检查可能的问题
    const issues = [];
    
    // 检查import语句
    const importMatches = content.match(/import\s+.*\s+from\s+['"][^'"]+['"]/g);
    if (importMatches) {
      console.log(`  发现 ${importMatches.length} 个import语句`);
      
      // 检查相对路径导入
      const relativeImports = importMatches.filter(imp => imp.includes('./'));
      if (relativeImports.length > 0) {
        issues.push(`相对路径导入可能在真机环境下失败: ${relativeImports.length}个`);
      }
      
      // 检查.js扩展名
      const withoutExtension = importMatches.filter(imp => !imp.includes('.js'));
      if (withoutExtension.length > 0) {
        issues.push(`缺少.js扩展名的导入: ${withoutExtension.length}个`);
      }
    }
    
    // 检查export语句
    if (content.includes('export default') || content.includes('export {')) {
      console.log('  ✓ 使用了ES6 export语法');
    }
    
    // 检查async/await
    const asyncCount = (content.match(/async\s+/g) || []).length;
    const awaitCount = (content.match(/await\s+/g) || []).length;
    if (asyncCount > 0 || awaitCount > 0) {
      console.log(`  发现异步操作: ${asyncCount}个async函数, ${awaitCount}个await调用`);
      issues.push('异步操作可能在真机环境下执行顺序不同');
    }
    
    if (issues.length > 0) {
      console.log('  ⚠️ 发现潜在问题:');
      issues.forEach(issue => console.log(`    - ${issue}`));
    } else {
      console.log('  ✓ ES6模块语法基本正常');
    }
  }
}

// 检查抖音API调用问题
function checkDouyinAPIIssues() {
  console.log('\n2. 检查抖音API调用问题:');
  
  const apiPath = path.join(__dirname, 'src/douyin/api.js');
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    // 检查关键API调用
    const criticalAPIs = [
      'tt.createCanvas',
      'tt.getSystemInfo',
      'tt.onTouchStart',
      'tt.onTouchMove', 
      'tt.onTouchEnd',
      'tt.createImage',
      'tt.checkSession',
      'tt.login'
    ];
    
    const missingAPIs = [];
    const presentAPIs = [];
    
    criticalAPIs.forEach(api => {
      if (content.includes(api)) {
        presentAPIs.push(api);
      } else {
        missingAPIs.push(api);
      }
    });
    
    console.log(`  ✓ 使用的API: ${presentAPIs.length}个`);
    presentAPIs.forEach(api => console.log(`    - ${api}`));
    
    if (missingAPIs.length > 0) {
      console.log(`  ⚠️ 未使用的关键API: ${missingAPIs.length}个`);
      missingAPIs.forEach(api => console.log(`    - ${api}`));
    }
    
    // 检查错误处理
    const errorHandling = [
      content.includes('try') && content.includes('catch'),
      content.includes('.catch('),
      content.includes('fail:')
    ];
    
    const errorHandlingCount = errorHandling.filter(Boolean).length;
    console.log(`  错误处理机制: ${errorHandlingCount}/3 种方式已实现`);
    
    // 检查环境检测
    if (content.includes('typeof tt !== \'undefined\'')) {
      console.log('  ✓ 包含抖音环境检测');
    } else {
      console.log('  ⚠️ 缺少抖音环境检测');
    }
  }
}

// 检查资源加载问题
function checkResourceLoadingIssues() {
  console.log('\n3. 检查资源加载问题:');
  
  // 检查图片资源
  const imageDir = path.join(__dirname, 'assets/images/fruits');
  if (fs.existsSync(imageDir)) {
    const images = fs.readdirSync(imageDir).filter(f => f.endsWith('.png'));
    console.log(`  ✓ PNG图片文件: ${images.length}个`);
    
    // 检查图片大小
    let totalSize = 0;
    let largeImages = [];
    
    images.forEach(img => {
      const imgPath = path.join(imageDir, img);
      const stats = fs.statSync(imgPath);
      const sizeKB = Math.round(stats.size / 1024);
      totalSize += sizeKB;
      
      if (sizeKB > 50) { // 大于50KB的图片
        largeImages.push(`${img} (${sizeKB}KB)`);
      }
    });
    
    console.log(`  总图片大小: ${totalSize}KB`);
    
    if (largeImages.length > 0) {
      console.log(`  ⚠️ 较大的图片文件:`);
      largeImages.forEach(img => console.log(`    - ${img}`));
    }
    
    if (totalSize > 500) {
      console.log('  ⚠️ 图片资源总大小较大，可能影响加载速度');
    }
  }
  
  // 检查图片加载器
  const loaderPath = path.join(__dirname, 'src/utils/imageLoader.js');
  if (fs.existsSync(loaderPath)) {
    const content = fs.readFileSync(loaderPath, 'utf8');
    
    if (content.includes('tt.createImage')) {
      console.log('  ✓ 图片加载器支持抖音环境');
    } else {
      console.log('  ⚠️ 图片加载器可能不支持抖音环境');
    }
    
    if (content.includes('Promise.all')) {
      console.log('  ✓ 支持批量预加载');
    }
  }
}

// 检查性能相关问题
function checkPerformanceIssues() {
  console.log('\n4. 检查性能相关问题:');
  
  const gameLogicPath = path.join(__dirname, 'src/game/gameLogic.js');
  if (fs.existsSync(gameLogicPath)) {
    const content = fs.readFileSync(gameLogicPath, 'utf8');
    
    // 检查游戏循环
    if (content.includes('requestAnimationFrame') || content.includes('gameLoop')) {
      console.log('  ✓ 包含游戏循环逻辑');
    } else {
      console.log('  ⚠️ 可能缺少游戏循环');
    }
    
    // 检查物理计算
    const physicsKeywords = ['physics', 'collision', 'velocity', 'gravity'];
    const physicsCount = physicsKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length;
    
    console.log(`  物理计算复杂度: ${physicsCount}/4 个关键词`);
    
    // 检查渲染优化
    if (content.includes('clearRect') || content.includes('fillRect')) {
      console.log('  ✓ 包含基础渲染操作');
    }
    
    // 检查内存管理
    if (content.includes('clear()') || content.includes('dispose()')) {
      console.log('  ✓ 包含内存清理逻辑');
    } else {
      console.log('  ⚠️ 可能缺少内存管理');
    }
  }
}

// 检查触摸事件问题
function checkTouchEventIssues() {
  console.log('\n5. 检查触摸事件问题:');
  
  const gameJsPath = path.join(__dirname, 'game.js');
  const gameLogicPath = path.join(__dirname, 'src/game/gameLogic.js');
  
  [gameJsPath, gameLogicPath].forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      // 检查触摸事件监听
      const touchEvents = ['onTouchStart', 'onTouchMove', 'onTouchEnd'];
      const foundEvents = touchEvents.filter(event => content.includes(event));
      
      if (foundEvents.length > 0) {
        console.log(`  ✓ ${fileName}: 监听了 ${foundEvents.length}/3 个触摸事件`);
      }
      
      // 检查触摸处理函数
      const touchHandlers = ['handleTouchStart', 'handleTouchMove', 'handleTouchEnd'];
      const foundHandlers = touchHandlers.filter(handler => content.includes(handler));
      
      if (foundHandlers.length > 0) {
        console.log(`  ✓ ${fileName}: 实现了 ${foundHandlers.length}/3 个触摸处理函数`);
      }
      
      // 检查坐标转换
      if (content.includes('clientX') && content.includes('clientY')) {
        console.log(`  ✓ ${fileName}: 包含坐标处理逻辑`);
      }
    }
  });
}

// 检查常见的真机环境问题
function checkCommonRealDeviceIssues() {
  console.log('\n6. 检查常见真机环境问题:');
  
  const issues = [];
  
  // 检查game.json配置
  const gameJsonPath = path.join(__dirname, 'game.json');
  if (fs.existsSync(gameJsonPath)) {
    const gameJson = JSON.parse(fs.readFileSync(gameJsonPath, 'utf8'));
    
    // 检查关键配置
    if (!gameJson.deviceOrientation) {
      issues.push('缺少deviceOrientation配置');
    }
    
    if (!gameJson.networkTimeout) {
      issues.push('缺少networkTimeout配置');
    }
    
    if (gameJson.resizable === undefined) {
      issues.push('缺少resizable配置');
    }
    
    console.log('  ✓ game.json配置检查完成');
  }
  
  // 检查project.config.json
  const projectConfigPath = path.join(__dirname, 'project.config.json');
  if (fs.existsSync(projectConfigPath)) {
    const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
    
    if (!projectConfig.appid) {
      issues.push('缺少appid配置');
    }
    
    if (!projectConfig.setting) {
      issues.push('缺少编译设置');
    }
    
    console.log('  ✓ project.config.json配置检查完成');
  }
  
  if (issues.length > 0) {
    console.log('  ⚠️ 发现配置问题:');
    issues.forEach(issue => console.log(`    - ${issue}`));
  } else {
    console.log('  ✓ 配置文件基本正常');
  }
}

// 生成诊断建议
function generateRecommendations() {
  console.log('\n=== 真机环境问题诊断建议 ===');
  
  console.log('\n�� 立即检查项目:');
  console.log('1. 在抖音开发者工具中打开项目');
  console.log('2. 检查控制台是否有错误信息');
  console.log('3. 使用真机调试功能连接手机测试');
  console.log('4. 查看网络请求是否正常');
  
  console.log('\n⚠️ 常见真机问题:');
  console.log('1. ES6模块在某些版本的抖音客户端不完全支持');
  console.log('2. 异步操作执行顺序在真机上可能不同');
  console.log('3. 图片资源加载失败或超时');
  console.log('4. 触摸事件在不同设备上响应不一致');
  console.log('5. 内存不足导致游戏卡顿或崩溃');
  
  console.log('\n🚀 优化建议:');
  console.log('1. 添加更多错误处理和降级方案');
  console.log('2. 优化图片资源大小和加载策略');
  console.log('3. 简化游戏逻辑，减少计算复杂度');
  console.log('4. 添加加载进度提示');
  console.log('5. 实现游戏状态的本地存储');
}

// 主诊断函数
function diagnoseRealDeviceIssues() {
  console.log('开始诊断抖音真机环境问题...\n');
  
  checkES6ModuleIssues();
  checkDouyinAPIIssues();
  checkResourceLoadingIssues();
  checkPerformanceIssues();
  checkTouchEventIssues();
  checkCommonRealDeviceIssues();
  generateRecommendations();
  
  console.log('\n诊断完成！请根据建议进行优化。');
}

// 运行诊断
diagnoseRealDeviceIssues();
