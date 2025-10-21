const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 水果列表
const fruits = [
  'apple', 'blueberry', 'cherry', 'coconut', 'grape', 
  'kiwi', 'lemon', 'mango', 'orange', 'peach', 
  'pear', 'pineapple', 'strawberry', 'tomato', 'watermelon'
];

const svgDir = './assets/images/fruits';
const pngDir = './assets/images/fruits';

// 确保目录存在
if (!fs.existsSync(pngDir)) {
  fs.mkdirSync(pngDir, { recursive: true });
}

console.log('开始批量转换SVG为PNG...');

async function convertSvgToPng() {
  for (const fruit of fruits) {
    const svgPath = path.join(svgDir, `${fruit}.svg`);
    const pngPath = path.join(pngDir, `${fruit}.png`);
    
    if (fs.existsSync(svgPath)) {
      try {
        await sharp(svgPath)
          .png()
          .toFile(pngPath);
        console.log(`✓ 转换完成: ${fruit}.svg -> ${fruit}.png`);
      } catch (error) {
        console.error(`✗ 转换失败: ${fruit}.svg - ${error.message}`);
      }
    } else {
      console.error(`✗ 文件不存在: ${svgPath}`);
    }
  }
  console.log('批量转换完成！');
}

convertSvgToPng();