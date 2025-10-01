// 抖音小游戏入口文件
// 符合抖音小游戏标准规范

import './game.js';

// 抖音小游戏生命周期
App({
  onLaunch(options) {
    console.log('抖音小游戏启动', options);
    
    // 获取系统信息
    tt.getSystemInfo({
      success: (res) => {
        console.log('系统信息:', res);
        // 设置全局系统信息
        tt.systemInfo = res;
      },
      fail: (err) => {
        console.error('获取系统信息失败:', err);
      }
    });
  },

  onShow(options) {
    console.log('抖音小游戏显示', options);
    // 游戏显示时的处理
    if (window.game && window.game.onGameShow) {
      window.game.onGameShow();
    }
  },

  onHide() {
    console.log('抖音小游戏隐藏');
    // 游戏隐藏时的处理
    if (window.game && window.game.onGameHide) {
      window.game.onGameHide();
    }
  },

  onError(error) {
    console.error('抖音小游戏错误:', error);
    // 错误处理
    if (window.game && window.game.showErrorScreen) {
      window.game.showErrorScreen(error);
    }
  }
});