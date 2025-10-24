// 抖音小程序API封装
export class DouyinAPI {
  constructor() {
    this.isInitialized = false;
    this.userInfo = null;
    this.gameData = {};
    
    // 检查抖音环境
    this.isDouyinEnv = typeof tt !== 'undefined';
    
    if (this.isDouyinEnv) {
      this.init();
    } else {
      console.warn('Not in Douyin environment, using mock API');
      this.initMockAPI();
    }
  }
  
  // 初始化抖音API
  async init() {
    try {
      // 设置初始化标志
      this.isInitialized = true;
      
      // 获取系统信息
      const systemInfo = await this.getSystemInfo();
      console.log('System info:', systemInfo);
      
      // 检查登录状态（非阻塞）
      this.checkLoginStatus().catch(err => {
        console.warn('Login check failed:', err);
      });
      
      console.log('Douyin API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Douyin API:', error);
      this.initMockAPI();
    }
  }
  
  // 初始化模拟API（用于开发调试）
  initMockAPI() {
    this.isDouyinEnv = false;
    this.isInitialized = true;
    this.userInfo = {
      nickName: '测试用户',
      avatarUrl: '',
      openId: 'mock_openid_123'
    };
    console.log('Mock API initialized for development');
  }
  
  // 获取系统信息
  getSystemInfo() {
    return new Promise((resolve, reject) => {
      if (!this.isDouyinEnv) {
        resolve({
          platform: 'devtools',
          system: 'mock',
          version: '1.0.0',
          screenWidth: 375,
          screenHeight: 667
        });
        return;
      }
      
      tt.getSystemInfo({
        success: (res) => resolve(res),
        fail: (err) => reject(err)
      });
    });
  }
  
  // 检查登录状态
  async checkLoginStatus() {
    try {
      const loginRes = await this.checkSession();
      if (loginRes.isValid) {
        // 获取用户信息
        await this.getUserInfo();
      } else {
        console.log('User not logged in');
      }
    } catch (error) {
      console.log('Login check failed:', error);
    }
  }
  
  // 检查会话是否有效
  checkSession() {
    return new Promise((resolve) => {
      if (!this.isDouyinEnv) {
        resolve({ isValid: true });
        return;
      }
      
      tt.checkSession({
        success: () => resolve({ isValid: true }),
        fail: () => resolve({ isValid: false })
      });
    });
  }
  
  // 用户登录
  login() {
    return new Promise((resolve, reject) => {
      if (!this.isDouyinEnv) {
        resolve({
          code: 'mock_code_123',
          anonymousCode: 'mock_anonymous_123'
        });
        return;
      }
      
      tt.login({
        success: (res) => {
          console.log('Login success:', res);
          resolve(res);
        },
        fail: (err) => {
          console.error('Login failed:', err);
          reject(err);
        }
      });
    });
  }
  
  // 获取用户信息
  getUserInfo() {
    return new Promise((resolve, reject) => {
      if (!this.isDouyinEnv) {
        this.userInfo = {
          nickName: '测试用户',
          avatarUrl: '',
          openId: 'mock_openid_123'
        };
        resolve(this.userInfo);
        return;
      }
      
      tt.getUserInfo({
        success: (res) => {
          this.userInfo = res.userInfo;
          console.log('User info:', this.userInfo);
          resolve(this.userInfo);
        },
        fail: (err) => {
          console.error('Get user info failed:', err);
          reject(err);
        }
      });
    });
  }
  
  // 分享游戏
  shareGame(options = {}) {
    const shareData = {
      title: options.title || '我在玩合成水果，快来挑战我的分数！',
      desc: options.desc || `我的最高分是${options.score || 0}分，你能超越我吗？`,
      path: options.path || '/pages/index/index',
      imageUrl: options.imageUrl || '',
      query: options.query || `score=${options.score || 0}&challenge=1`
    };
    
    return new Promise((resolve, reject) => {
      if (!this.isDouyinEnv) {
        console.log('Mock share:', shareData);
        resolve({ success: true });
        return;
      }
      
      tt.shareAppMessage({
        ...shareData,
        success: (res) => {
          console.log('Share success:', res);
          resolve(res);
        },
        fail: (err) => {
          console.error('Share failed:', err);
          reject(err);
        }
      });
    });
  }
  
  // 保存游戏数据到云端
  async saveGameData(data) {
    try {
      const saveData = {
        ...data,
        timestamp: Date.now(),
        version: '1.0.0'
      };
      
      if (this.isDouyinEnv) {
        // 使用抖音云存储
        await this.setCloudStorage('gameData', saveData);
      } else {
        // 使用本地存储
        localStorage.setItem('fruitMergeZ_cloudData', JSON.stringify(saveData));
      }
      
      this.gameData = saveData;
      console.log('Game data saved:', saveData);
      return true;
    } catch (error) {
      console.error('Failed to save game data:', error);
      return false;
    }
  }
  
  // 从云端加载游戏数据
  async loadGameData() {
    try {
      let data;
      
      if (this.isDouyinEnv) {
        // 从抖音云存储加载
        data = await this.getCloudStorage('gameData');
      } else {
        // 从本地存储加载
        const saved = localStorage.getItem('fruitMergeZ_cloudData');
        data = saved ? JSON.parse(saved) : null;
      }
      
      if (data) {
        this.gameData = data;
        console.log('Game data loaded:', data);
        return data;
      } else {
        console.log('No saved game data found');
        return null;
      }
    } catch (error) {
      console.error('Failed to load game data:', error);
      return null;
    }
  }
  
  // 设置云存储
  setCloudStorage(key, value) {
    return new Promise((resolve, reject) => {
      if (!this.isDouyinEnv) {
        resolve();
        return;
      }
      
      tt.setStorage({
        key: key,
        data: value,
        success: () => resolve(),
        fail: (err) => reject(err)
      });
    });
  }
  
  // 获取云存储
  getCloudStorage(key) {
    return new Promise((resolve, reject) => {
      if (!this.isDouyinEnv) {
        resolve(null);
        return;
      }
      
      tt.getStorage({
        key: key,
        success: (res) => resolve(res.data),
        fail: () => resolve(null)
      });
    });
  }
  
  // 显示排行榜
  showRankList(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isDouyinEnv) {
        console.log('Mock rank list:', options);
        // 模拟排行榜数据
        const mockRankData = {
          success: true,
          data: {
            selfRank: {
              rank: Math.floor(Math.random() * 100) + 1,
              score: options.score || 0,
              nickName: '我',
              avatarUrl: ''
            },
            friendRanks: [
              { rank: 1, score: 9999, nickName: '高手玩家', avatarUrl: '' },
              { rank: 2, score: 8888, nickName: '水果达人', avatarUrl: '' },
              { rank: 3, score: 7777, nickName: '合成专家', avatarUrl: '' }
            ]
          }
        };
        resolve(mockRankData);
        return;
      }

      try {
        const rankOptions = {
          relationType: options.relationType || 'friend', // 好友排行
          dataType: options.dataType || 1, // 分数类型
          rankType: options.rankType || 'week', // 周排行
          suffix: options.suffix || '分',
          title: options.title || '水果合成排行榜',
          ...options
        };

        tt.showRankList({
          ...rankOptions,
          success: (res) => {
            console.log('Show rank list success:', res);
            resolve(res);
          },
          fail: (err) => {
            console.error('Show rank list failed:', err);
            // 提供用户友好的错误信息
            const errorMsg = err.errCode === 1001 ? '排行榜暂时无法显示' : '排行榜加载失败';
            reject(new Error(errorMsg));
          }
        });
      } catch (error) {
        console.error('Failed to create rank list:', error);
        reject(new Error('排行榜初始化失败'));
      }
    });
  }
  
  // 上报游戏数据
  reportGameData(data) {
    return new Promise((resolve, reject) => {
      if (!this.isDouyinEnv) {
        console.log('Mock report data:', data);
        resolve({ success: true });
        return;
      }

      try {
        // 数据验证和格式化
        const reportData = {
          score: Math.max(0, parseInt(data.score) || 0),
          level: Math.max(1, parseInt(data.level) || 1),
          playTime: Math.max(0, parseInt(data.playTime) || 0),
          combo: Math.max(0, parseInt(data.combo) || 0),
          event: data.event || 'game_data',
          timestamp: data.timestamp || Date.now()
        };

        // 上报到抖音分析平台
        tt.reportAnalytics('game_data', reportData);

        // 如果是游戏结束事件，额外上报排行榜数据
        if (data.event === 'game_over' && reportData.score > 0) {
          tt.setRankData({
            score: reportData.score,
            costTime: reportData.playTime,
            dataType: 1, // 分数类型
            success: (res) => {
              console.log('Rank data uploaded:', res);
            },
            fail: (err) => {
              console.warn('Failed to upload rank data:', err);
            }
          });
        }

        console.log('Game data reported:', reportData);
        resolve({ success: true });
      } catch (error) {
        console.error('Failed to report game data:', error);
        reject(error);
      }
    });
  }
  
  // 显示激励视频广告
  showRewardedVideoAd() {
    return new Promise((resolve, reject) => {
      if (!this.isDouyinEnv) {
        console.log('Mock rewarded video ad');
        resolve({ success: true, reward: true });
        return;
      }

      // 广告位ID配置（需要在抖音开发者后台申请）
      const adUnitId = process.env.DOUYIN_REWARDED_AD_ID || 'test_rewarded_ad_id';
      
      try {
        const rewardedVideoAd = tt.createRewardedVideoAd({
          adUnitId: adUnitId
        });

        let isAdLoaded = false;
        let loadTimeout = null;

        // 设置加载超时
        loadTimeout = setTimeout(() => {
          if (!isAdLoaded) {
            console.warn('Rewarded video ad load timeout');
            reject(new Error('广告加载超时，请稍后再试'));
          }
        }, 10000); // 10秒超时

        rewardedVideoAd.onLoad(() => {
          console.log('Rewarded video ad loaded');
          isAdLoaded = true;
          if (loadTimeout) {
            clearTimeout(loadTimeout);
            loadTimeout = null;
          }
        });

        rewardedVideoAd.onError((err) => {
          console.error('Rewarded video ad error:', err);
          if (loadTimeout) {
            clearTimeout(loadTimeout);
            loadTimeout = null;
          }
          // 提供用户友好的错误信息
          const errorMsg = err.errCode === 1004 ? '暂无广告，请稍后再试' : '广告加载失败';
          reject(new Error(errorMsg));
        });

        rewardedVideoAd.onClose((res) => {
          if (res && res.isEnded) {
            console.log('Rewarded video ad completed');
            resolve({ success: true, reward: true });
          } else {
            console.log('Rewarded video ad closed early');
            resolve({ success: false, reward: false });
          }
        });

        // 预加载广告
        rewardedVideoAd.load().then(() => {
          return rewardedVideoAd.show();
        }).catch((err) => {
          console.error('Failed to show rewarded video ad:', err);
          if (loadTimeout) {
            clearTimeout(loadTimeout);
            loadTimeout = null;
          }
          reject(new Error('广告显示失败'));
        });
      } catch (error) {
        console.error('Failed to create rewarded video ad:', error);
        reject(new Error('广告初始化失败'));
      }
    });
  }
  
  // 显示插屏广告
  showInterstitialAd() {
    return new Promise((resolve, reject) => {
      if (!this.isDouyinEnv) {
        console.log('Mock interstitial ad');
        resolve({ success: true });
        return;
      }

      // 广告位ID配置（需要在抖音开发者后台申请）
      const adUnitId = process.env.DOUYIN_INTERSTITIAL_AD_ID || 'test_interstitial_ad_id';

      try {
        const interstitialAd = tt.createInterstitialAd({
          adUnitId: adUnitId
        });

        let isAdLoaded = false;
        let loadTimeout = null;

        // 设置加载超时
        loadTimeout = setTimeout(() => {
          if (!isAdLoaded) {
            console.warn('Interstitial ad load timeout');
            reject(new Error('广告加载超时，请稍后再试'));
          }
        }, 8000); // 8秒超时

        interstitialAd.onLoad(() => {
          console.log('Interstitial ad loaded');
          isAdLoaded = true;
          if (loadTimeout) {
            clearTimeout(loadTimeout);
            loadTimeout = null;
          }
        });

        interstitialAd.onError((err) => {
          console.error('Interstitial ad error:', err);
          if (loadTimeout) {
            clearTimeout(loadTimeout);
            loadTimeout = null;
          }
          // 提供用户友好的错误信息
          const errorMsg = err.errCode === 1004 ? '暂无广告，请稍后再试' : '广告加载失败';
          reject(new Error(errorMsg));
        });

        interstitialAd.onClose(() => {
          console.log('Interstitial ad closed');
          resolve({ success: true });
        });

        // 预加载并显示广告
        interstitialAd.load().then(() => {
          return interstitialAd.show();
        }).catch((err) => {
          console.error('Failed to show interstitial ad:', err);
          if (loadTimeout) {
            clearTimeout(loadTimeout);
            loadTimeout = null;
          }
          reject(new Error('广告显示失败'));
        });
      } catch (error) {
        console.error('Failed to create interstitial ad:', error);
        reject(new Error('广告初始化失败'));
      }
    });
  }
  
  // 震动反馈
  vibrateShort() {
    if (!this.isDouyinEnv) {
      console.log('Mock vibrate short');
      return;
    }
    
    tt.vibrateShort({
      success: () => console.log('Vibrate short success'),
      fail: (err) => console.error('Vibrate short failed:', err)
    });
  }
  
  // 长震动反馈
  vibrateLong() {
    if (!this.isDouyinEnv) {
      console.log('Mock vibrate long');
      return;
    }
    
    tt.vibrateLong({
      success: () => console.log('Vibrate long success'),
      fail: (err) => console.error('Vibrate long failed:', err)
    });
  }
  
  // 显示Toast
  showToast(title, options = {}) {
    return new Promise((resolve) => {
      if (!this.isDouyinEnv) {
        console.log('Mock toast:', title);
        resolve();
        return;
      }
      
      tt.showToast({
        title: title,
        icon: options.icon || 'none',
        duration: options.duration || 2000,
        success: () => resolve(),
        fail: () => resolve()
      });
    });
  }
  
  // 显示加载提示
  showLoading(title = '加载中...') {
    if (!this.isDouyinEnv) {
      console.log('Mock loading:', title);
      return;
    }
    
    tt.showLoading({
      title: title,
      mask: true
    });
  }
  
  // 隐藏加载提示
  hideLoading() {
    if (!this.isDouyinEnv) {
      console.log('Mock hide loading');
      return;
    }
    
    tt.hideLoading();
  }
  
  // 获取启动参数
  getLaunchOptions() {
    if (!this.isDouyinEnv) {
      return {
        scene: 1001,
        query: {},
        path: '/pages/index/index'
      };
    }
    
    return tt.getLaunchOptionsSync();
  }
  
  // 监听小程序显示
  onShow(callback) {
    if (!this.isDouyinEnv) {
      console.log('Mock onShow listener registered');
      return;
    }
    
    tt.onShow(callback);
  }
  
  // 监听小程序隐藏
  onHide(callback) {
    if (!this.isDouyinEnv) {
      console.log('Mock onHide listener registered');
      return;
    }
    
    tt.onHide(callback);
  }
  
  // 获取用户信息（如果已登录）
  getCurrentUser() {
    return this.userInfo;
  }
  
  // 检查是否在抖音环境中
  isInDouyinEnv() {
    return this.isDouyinEnv;
  }
  
  // 获取游戏数据
  // 错误上报
  reportError(errorData) {
    if (this.isDouyinEnv && tt.reportAnalytics) {
      try {
        tt.reportAnalytics('game_error', {
          error: errorData.error,
          source: errorData.source,
          timestamp: errorData.timestamp,
          gameState: errorData.gameState
        });
        console.log('Error reported to Douyin analytics');
      } catch (error) {
        console.warn('Failed to report error to Douyin analytics:', error);
      }
    } else {
      // 开发环境或非抖音环境，只记录到控制台
      console.log('Mock error report:', errorData);
    }
  }

  getGameData() {
    return this.gameData;
  }
}

// 创建全局实例
export const douyinAPI = new DouyinAPI();