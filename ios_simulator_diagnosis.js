// iPhone12模拟器环境问题诊断脚本
console.log('=== iPhone12模拟器环境问题诊断 ===\n');

const fs = require('fs');
const path = require('path');

// 检查iOS Safari兼容性问题
function checkiOSCompatibility() {
  console.log('1. 检查iOS Safari兼容性问题:');
  
  const gameJsPath = path.join(__dirname, 'game.js');
  if (fs.existsSync(gameJsPath)) {
    const content = fs.readFileSync(gameJsPath, 'utf8');
    
    const issues = [];
    
    // 检查可能的iOS兼容性问题
    
    // 1. 检查Canvas API使用
    if (content.includes('createCanvas')) {
      console.log('  ✓ 使用了Canvas API');
      
      // 检查Canvas上下文获取
      if (content.includes('getContext(\'2d\')')) {
        console.log('  ✓ 使用2D渲染上下文');
      } else {
        issues.push('缺少2D渲染上下文');
      }
    }
    
    // 2. 检查触摸事件处理
    const touchEvents = ['touchstart', 'touchmove', 'touchend'];
    const foundTouchEvents = touchEvents.filter(event => content.includes(event));
    console.log(`  触摸事件支持: ${foundTouchEvents.length}/3`);
    
    if (foundTouchEvents.length < 3) {
      issues.push('触摸事件处理不完整');
    }
    
    // 3. 检查preventDefault使用
    if (content.includes('preventDefault')) {
      console.log('  ✓ 使用了preventDefault防止默认行为');
    } else {
      issues.push('缺少preventDefault，可能导致页面滚动');
    }
    
    // 4. 检查requestAnimationFrame
    if (content.includes('requestAnimationFrame')) {
      console.log('  ✓ 使用了requestAnimationFrame');
    } else {
      issues.push('可能使用了setInterval，性能不佳');
    }
    
    // 5. 检查ES6语法兼容性
    const es6Features = [
      { name: 'async/await', pattern: /async\s+\w+|await\s+/ },
      { name: 'Arrow Functions', pattern: /=>\s*{?/ },
      { name: 'Template Literals', pattern: /`[^`]*`/ },
      { name: 'Destructuring', pattern: /{\s*\w+\s*}/ },
      { name: 'Classes', pattern: /class\s+\w+/ }
    ];
    
    console.log('  ES6特性使用情况:');
    es6Features.forEach(feature => {
      if (feature.pattern.test(content)) {
        console.log(`    ✓ ${feature.name}`);
      }
    });
    
    if (issues.length > 0) {
      console.log('  ⚠️ 发现iOS兼容性问题:');
      issues.forEach(issue => console.log(`    - ${issue}`));
    } else {
      console.log('  ✓ iOS兼容性基本正常');
    }
  }
}

// 检查Canvas渲染问题
function checkCanvasRendering() {
  console.log('\n2. 检查Canvas渲染问题:');
  
  const gameLogicPath = path.join(__dirname, 'src/game/gameLogic.js');
  if (fs.existsSync(gameLogicPath)) {
    const content = fs.readFileSync(gameLogicPath, 'utf8');
    
    // 检查渲染相关代码
    const renderingIssues = [];
    
    // 1. 检查Canvas清除
    if (content.includes('clearRect')) {
      console.log('  ✓ 使用clearRect清除画布');
    } else {
      renderingIssues.push('可能缺少画布清除操作');
    }
    
    // 2. 检查图像绘制
    if (content.includes('drawImage')) {
      console.log('  ✓ 使用drawImage绘制图像');
    }
    
    // 3. 检查路径绘制
    if (content.includes('beginPath') && content.includes('stroke')) {
      console.log('  ✓ 使用路径绘制');
    }
    
    // 4. 检查填充操作
    if (content.includes('fillRect') || content.includes('fill()')) {
      console.log('  ✓ 使用填充操作');
    }
    
    // 5. 检查变换操作
    const transforms = ['translate', 'rotate', 'scale', 'save', 'restore'];
    const usedTransforms = transforms.filter(t => content.includes(t));
    if (usedTransforms.length > 0) {
      console.log(`  ✓ 使用变换操作: ${usedTransforms.join(', ')}`);
    }
    
    if (renderingIssues.length > 0) {
      console.log('  ⚠️ 渲染问题:');
      renderingIssues.forEach(issue => console.log(`    - ${issue}`));
    } else {
      console.log('  ✓ Canvas渲染代码基本正常');
    }
  }
}

// 检查触摸事件处理
function checkTouchEventHandling() {
  console.log('\n3. 检查触摸事件处理:');
  
  const gameJsPath = path.join(__dirname, 'game.js');
  if (fs.existsSync(gameJsPath)) {
    const content = fs.readFileSync(gameJsPath, 'utf8');
    
    // 检查触摸事件绑定
    const touchEventBindings = [
      { event: 'touchstart', found: content.includes('touchstart') },
      { event: 'touchmove', found: content.includes('touchmove') },
      { event: 'touchend', found: content.includes('touchend') }
    ];
    
    touchEventBindings.forEach(binding => {
      if (binding.found) {
        console.log(`  ✓ 绑定了${binding.event}事件`);
      } else {
        console.log(`  ⚠️ 缺少${binding.event}事件绑定`);
      }
    });
    
    // 检查坐标处理
    if (content.includes('clientX') && content.includes('clientY')) {
      console.log('  ✓ 处理触摸坐标');
    } else {
      console.log('  ⚠️ 可能缺少触摸坐标处理');
    }
    
    // 检查多点触控
    if (content.includes('touches[0]') || content.includes('changedTouches[0]')) {
      console.log('  ✓ 处理多点触控');
    } else {
      console.log('  ⚠️ 可能不支持多点触控');
    }
    
    // 检查事件冒泡阻止
    if (content.includes('stopPropagation')) {
      console.log('  ✓ 阻止事件冒泡');
    }
  }
}

// 检查游戏初始化流程
function checkGameInitialization() {
  console.log('\n4. 检查游戏初始化流程:');
  
  const gameJsPath = path.join(__dirname, 'game.js');
  if (fs.existsSync(gameJsPath)) {
    const content = fs.readFileSync(gameJsPath, 'utf8');
    
    // 检查初始化步骤
    const initSteps = [
      { name: 'Canvas初始化', pattern: /initCanvas|createCanvas/ },
      { name: '图片预加载', pattern: /preload|loadImage/ },
      { name: '事件监听设置', pattern: /addEventListener|setupEvent/ },
      { name: '游戏循环启动', pattern: /gameLoop|requestAnimationFrame/ },
      { name: '错误处理', pattern: /try\s*{|catch\s*\(/ }
    ];
    
    console.log('  初始化步骤检查:');
    initSteps.forEach(step => {
      if (step.pattern.test(content)) {
        console.log(`    ✓ ${step.name}`);
      } else {
        console.log(`    ⚠️ 可能缺少${step.name}`);
      }
    });
    
    // 检查异步初始化
    if (content.includes('async init') || content.includes('await')) {
      console.log('  ✓ 使用异步初始化');
      
      // 检查Promise处理
      if (content.includes('.catch(') || content.includes('try')) {
        console.log('  ✓ 包含异步错误处理');
      } else {
        console.log('  ⚠️ 缺少异步错误处理');
      }
    }
  }
}

// 检查资源加载问题
function checkResourceLoading() {
  console.log('\n5. 检查资源加载问题:');
  
  // 检查图片资源
  const imageDir = path.join(__dirname, 'assets/images/fruits');
  if (fs.existsSync(imageDir)) {
    const images = fs.readdirSync(imageDir).filter(f => f.endsWith('.png'));
    console.log(`  ✓ 图片资源: ${images.length}个PNG文件`);
    
    // 检查图片大小（iOS对大图片敏感）
    let totalSize = 0;
    let largeImages = [];
    
    images.forEach(img => {
      const imgPath = path.join(imageDir, img);
      const stats = fs.statSync(imgPath);
      const sizeKB = Math.round(stats.size / 1024);
      totalSize += sizeKB;
      
      if (sizeKB > 100) { // iOS建议单个图片不超过100KB
        largeImages.push(`${img} (${sizeKB}KB)`);
      }
    });
    
    console.log(`  总图片大小: ${totalSize}KB`);
    
    if (largeImages.length > 0) {
      console.log(`  ⚠️ 较大的图片文件（建议压缩）:`);
      largeImages.forEach(img => console.log(`    - ${img}`));
    } else {
      console.log('  ✓ 图片大小适中');
    }
  }
  
  // 检查图片加载器
  const loaderPath = path.join(__dirname, 'src/utils/imageLoader.js');
  if (fs.existsSync(loaderPath)) {
    const content = fs.readFileSync(loaderPath, 'utf8');
    
    // 检查iOS图片加载兼容性
    if (content.includes('new Image()')) {
      console.log('  ✓ 使用标准Image对象');
    }
    
    if (content.includes('onload') && content.includes('onerror')) {
      console.log('  ✓ 包含图片加载事件处理');
    } else {
      console.log('  ⚠️ 可能缺少图片加载事件处理');
    }
    
    // 检查跨域处理
    if (content.includes('crossOrigin')) {
      console.log('  ✓ 处理跨域图片加载');
    }
  }
}

// 检查iOS特定问题
function checkiOSSpecificIssues() {
  console.log('\n6. 检查iOS特定问题:');
  
  const issues = [];
  
  // 检查viewport设置
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');
    
    if (content.includes('viewport')) {
      console.log('  ✓ 包含viewport设置');
      
      // 检查关键viewport属性
      const viewportChecks = [
        { name: 'width=device-width', found: content.includes('width=device-width') },
        { name: 'initial-scale=1', found: content.includes('initial-scale=1') },
        { name: 'user-scalable=no', found: content.includes('user-scalable=no') }
      ];
      
      viewportChecks.forEach(check => {
        if (check.found) {
          console.log(`    ✓ ${check.name}`);
        } else {
          console.log(`    ⚠️ 缺少${check.name}`);
          issues.push(`viewport缺少${check.name}`);
        }
      });
    } else {
      issues.push('缺少viewport设置');
    }
    
    // 检查iOS Web App设置
    if (content.includes('apple-mobile-web-app-capable')) {
      console.log('  ✓ 包含iOS Web App设置');
    } else {
      issues.push('缺少iOS Web App设置');
    }
  }
  
  // 检查CSS样式
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // 检查防止选择和缩放的CSS
    const cssChecks = [
      'user-select: none',
      'touch-action: none',
      '-webkit-touch-callout: none',
      '-webkit-user-select: none'
    ];
    
    const foundCSS = cssChecks.filter(css => content.includes(css.replace(/\s/g, '')));
    console.log(`  CSS优化: ${foundCSS.length}/${cssChecks.length} 项已设置`);
    
    if (foundCSS.length < cssChecks.length) {
      issues.push('缺少iOS触摸优化CSS');
    }
  }
  
  if (issues.length > 0) {
    console.log('  ⚠️ iOS特定问题:');
    issues.forEach(issue => console.log(`    - ${issue}`));
  } else {
    console.log('  ✓ iOS特定设置基本正常');
  }
}

// 生成修复建议
function generateiOSFixRecommendations() {
  console.log('\n=== iPhone12模拟器修复建议 ===');
  
  console.log('\n🔧 立即修复项目:');
  console.log('1. 检查index.html中的viewport和iOS设置');
  console.log('2. 确保Canvas在iOS Safari中正确初始化');
  console.log('3. 验证触摸事件在模拟器中的响应');
  console.log('4. 检查图片资源是否正确加载');
  
  console.log('\n⚠️ iOS模拟器常见问题:');
  console.log('1. Canvas渲染在iOS Safari中可能有差异');
  console.log('2. 触摸事件坐标计算可能不准确');
  console.log('3. 图片加载可能因为跨域问题失败');
  console.log('4. requestAnimationFrame在后台时会暂停');
  console.log('5. 内存限制比桌面浏览器更严格');
  
  console.log('\n�� 优化建议:');
  console.log('1. 添加iOS Safari特定的CSS样式');
  console.log('2. 优化触摸事件处理逻辑');
  console.log('3. 添加Canvas渲染错误检测');
  console.log('4. 实现资源加载失败的降级方案');
  console.log('5. 添加内存使用监控');
}

// 主诊断函数
function diagnoseiOSSimulatorIssues() {
  console.log('开始诊断iPhone12模拟器环境问题...\n');
  
  checkiOSCompatibility();
  checkCanvasRendering();
  checkTouchEventHandling();
  checkGameInitialization();
  checkResourceLoading();
  checkiOSSpecificIssues();
  generateiOSFixRecommendations();
  
  console.log('\n诊断完成！请根据建议进行修复。');
}

// 运行诊断
diagnoseiOSSimulatorIssues();
