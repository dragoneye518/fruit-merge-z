// 修复ES6模块导入路径问题
const fs = require('fs');
const path = require('path');

console.log('=== 修复ES6模块导入路径问题 ===\n');

// 需要检查和修复的文件列表
const filesToFix = [
  'game.js',
  'src/game/gameLogic.js',
  'src/game/match3.js',
  'src/game/tetris.js',
  'src/effects/effectSystem.js',
  'src/douyin/api.js',
  'src/config/constants.js',
  'src/utils/imageLoader.js',
  'src/managers/audioManager.js'
];

// 修复单个文件的导入路径
function fixImportsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ 文件不存在: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 修复相对路径导入，确保包含.js扩展名
  const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
  const newContent = content.replace(importRegex, (match, importPath) => {
    // 如果是相对路径且没有.js扩展名
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      if (!importPath.endsWith('.js') && !importPath.includes('.')) {
        const newImportPath = importPath + '.js';
        console.log(`  修复: ${importPath} -> ${newImportPath}`);
        modified = true;
        return match.replace(importPath, newImportPath);
      }
    }
    return match;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ 已修复: ${filePath}`);
    return true;
  } else {
    console.log(`✓ 无需修复: ${filePath}`);
    return false;
  }
}

// 主修复函数
function fixAllImports() {
  console.log('开始修复ES6模块导入路径...\n');
  
  let totalFixed = 0;
  
  filesToFix.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fixImportsInFile(fullPath)) {
      totalFixed++;
    }
  });
  
  console.log(`\n修复完成！共修复了 ${totalFixed} 个文件。`);
  
  // 验证修复结果
  console.log('\n=== 验证修复结果 ===');
  filesToFix.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const imports = content.match(/import\s+.*\s+from\s+['"][^'"]+['"]/g) || [];
      const relativeImports = imports.filter(imp => 
        (imp.includes('./') || imp.includes('../')) && !imp.includes('.js')
      );
      
      if (relativeImports.length === 0) {
        console.log(`✓ ${file}: 导入路径正常`);
      } else {
        console.log(`⚠️ ${file}: 仍有 ${relativeImports.length} 个问题导入`);
        relativeImports.forEach(imp => console.log(`    ${imp}`));
      }
    }
  });
}

// 运行修复
fixAllImports();
