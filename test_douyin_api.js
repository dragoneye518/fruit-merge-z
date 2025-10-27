// 抖音API测试脚本
console.log('=== 抖音API功能测试 ===\n');

// 导入抖音API
import { douyinAPI } from './src/douyin/api.js';

// 测试数据
const testGameData = {
  score: 12345,
  level: 5,
  playTime: 180000, // 3分钟
  combo: 25,
  event: 'game_over',
  timestamp: Date.now()
};

// 测试函数
async function testDouyinAPI() {
  console.log('1. 测试API初始化状态');
  console.log(`   - 是否在抖音环境: ${douyinAPI.isInDouyinEnv()}`);
  console.log(`   - 初始化状态: ${douyinAPI.isInitialized}`);
  console.log(`   - 用户信息: ${JSON.stringify(douyinAPI.userInfo, null, 2)}`);
  
  console.log('\n2. 测试系统信息获取');
  try {
    const systemInfo = await douyinAPI.getSystemInfo();
    console.log('   ✓ 系统信息获取成功:', systemInfo);
  } catch (error) {
    console.error('   ✗ 系统信息获取失败:', error);
  }
  
  console.log('\n3. 测试游戏数据上报');
  try {
    const reportResult = await douyinAPI.reportGameData(testGameData);
    console.log('   ✓ 游戏数据上报成功:', reportResult);
  } catch (error) {
    console.error('   ✗ 游戏数据上报失败:', error);
  }
  
  console.log('\n4. 测试排行榜显示');
  try {
    const rankResult = await douyinAPI.showRankList({
      score: testGameData.score,
      title: '水果合成排行榜测试'
    });
    console.log('   ✓ 排行榜显示成功:', rankResult);
  } catch (error) {
    console.error('   ✗ 排行榜显示失败:', error);
  }
  
  console.log('\n5. 测试游戏数据保存和加载');
  try {
    await douyinAPI.saveGameData(testGameData);
    console.log('   ✓ 游戏数据保存成功');
    
    const loadedData = await douyinAPI.loadGameData();
    console.log('   ✓ 游戏数据加载成功:', loadedData);
  } catch (error) {
    console.error('   ✗ 游戏数据保存/加载失败:', error);
  }
  
  console.log('\n6. 测试分享功能');
  try {
    const shareResult = await douyinAPI.shareGame({
      title: '我在水果合成Z中得了' + testGameData.score + '分！',
      desc: '快来挑战我的记录吧！',
      imageUrl: ''
    });
    console.log('   ✓ 分享功能测试成功:', shareResult);
  } catch (error) {
    console.error('   ✗ 分享功能测试失败:', error);
  }
  
  console.log('\n7. 测试Toast提示');
  try {
    douyinAPI.showToast('API测试完成！', { icon: 'success' });
    console.log('   ✓ Toast提示显示成功');
  } catch (error) {
    console.error('   ✗ Toast提示显示失败:', error);
  }
  
  console.log('\n8. 测试震动反馈');
  try {
    douyinAPI.vibrateShort();
    console.log('   ✓ 短震动反馈成功');
    
    setTimeout(() => {
      douyinAPI.vibrateLong();
      console.log('   ✓ 长震动反馈成功');
    }, 1000);
  } catch (error) {
    console.error('   ✗ 震动反馈失败:', error);
  }
  
  console.log('\n=== 抖音API测试完成 ===');
}

// 运行测试
testDouyinAPI().catch(error => {
  console.error('API测试过程中发生错误:', error);
});

// 导出测试函数供外部调用
export { testDouyinAPI };