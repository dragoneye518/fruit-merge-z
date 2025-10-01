// 测试图片加载功能
const fs = require('fs');
const path = require('path');

console.log('=== PNG图片资源加载测试 ===\n');

// 检查图片文件是否存在
function checkImageFiles() {
  console.log('1. 检查PNG图片文件:');
  
  const imageDir = path.join(__dirname, 'assets/images/fruits');
  
  if (!fs.existsSync(imageDir)) {
    console.log('✗ 图片目录不存在:', imageDir);
    return [];
  }
  
  const files = fs.readdirSync(imageDir);
  const pngFiles = files.filter(file => file.endsWith('.png'));
  
  console.log(`✓ 找到 ${pngFiles.length} 个PNG文件:`);
  pngFiles.forEach(file => {
    const filePath = path.join(imageDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  - ${file} (${Math.round(stats.size / 1024)}KB)`);
  });
  
  return pngFiles;
}

// 检查图片路径配置
function checkImagePaths() {
  console.log('\n2. 检查图片路径配置:');
  
  try {
    // 读取常量配置文件
    const constantsPath = path.join(__dirname, 'src/config/constants.js');
    if (fs.existsSync(constantsPath)) {
      const constantsContent = fs.readFileSync(constantsPath, 'utf8');
      
      // 查找图片路径相关配置
      const imagePathMatches = constantsContent.match(/assets\/images\/fruits\/[^'"]+/g);
      if (imagePathMatches) {
        console.log('✓ 找到图片路径配置:');
        imagePathMatches.forEach(path => {
          console.log(`  - ${path}`);
        });
      } else {
        console.log('? 未找到明确的图片路径配置');
      }
      
      // 检查水果类型配置
      const fruitConfigMatch = constantsContent.match(/FRUIT_CONFIG\s*=\s*{[\s\S]*?};/);
      if (fruitConfigMatch) {
        console.log('✓ 找到FRUIT_CONFIG配置');
      } else {
        console.log('✗ 未找到FRUIT_CONFIG配置');
      }
    } else {
      console.log('✗ constants.js文件不存在');
    }
  } catch (error) {
    console.log('✗ 检查配置文件失败:', error.message);
  }
}

// 模拟图片加载测试
function simulateImageLoading() {
  console.log('\n3. 模拟图片加载测试:');
  
  const imageFiles = [
    'cherry.png',
    'strawberry.png', 
    'grape.png',
    'orange.png',
    'apple.png',
    'pear.png',
    'peach.png',
    'pineapple.png',
    'coconut.png',
    'watermelon.png'
  ];
  
  imageFiles.forEach(filename => {
    const imagePath = path.join(__dirname, 'assets/images/fruits', filename);
    if (fs.existsSync(imagePath)) {
      console.log(`✓ ${filename} - 文件存在`);
    } else {
      console.log(`✗ ${filename} - 文件不存在`);
    }
  });
}

// 检查图片加载器代码
function checkImageLoader() {
  console.log('\n4. 检查图片加载器:');
  
  const loaderPath = path.join(__dirname, 'src/utils/imageLoader.js');
  if (fs.existsSync(loaderPath)) {
    console.log('✓ imageLoader.js 存在');
    
    const loaderContent = fs.readFileSync(loaderPath, 'utf8');
    
    // 检查关键功能
    const checks = [
      { name: 'tt.createImage支持', pattern: /tt\.createImage/ },
      { name: '错误处理', pattern: /catch.*error|onerror/ },
      { name: '预加载功能', pattern: /preloadImages/ },
      { name: '缓存机制', pattern: /Map.*images/ }
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(loaderContent)) {
        console.log(`✓ ${check.name} - 已实现`);
      } else {
        console.log(`? ${check.name} - 可能未实现`);
      }
    });
  } else {
    console.log('✗ imageLoader.js 不存在');
  }
}

// 主测试函数
function testImageLoading() {
  console.log('开始测试图片加载功能...\n');
  
  const pngFiles = checkImageFiles();
  checkImagePaths();
  simulateImageLoading();
  checkImageLoader();
  
  console.log('\n=== 测试总结 ===');
  if (pngFiles.length > 0) {
    console.log(`✓ 找到 ${pngFiles.length} 个PNG文件`);
    console.log('✓ 图片资源基本完整');
  } else {
    console.log('✗ 未找到PNG图片文件');
  }
  
  console.log('\n建议:');
  console.log('1. 在抖音开发者工具中测试实际图片加载');
  console.log('2. 检查网络权限和资源路径配置');
  console.log('3. 确认tt.createImage API可用性');
}

// 运行测试
testImageLoading();
