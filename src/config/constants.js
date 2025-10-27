// 游戏常量配置
export const GAME_CONFIG = {
  // 渲染器选择：'canvas' | 'three'
  RENDERER: 'canvas',

  // 画布尺寸
  CANVAS: {
    width: 375,
    height: 667
  },
  // 尺寸全局缩放（用于统一调整水果半径）
  SIZE: {
    // 统一缩放为 0.65（相对原始半径）
    radiusScale: 0.65
  },
  
  // 游戏区域配置
  GAME_AREA: {
    centerX: 187.5,
    centerY: 450,
    radius: 150,
    borderWidth: 8
  },
  // 世界地面设定（替代圆容器底部）：高度用于UI与物理的接触判定
  GROUND: {
    height: 28
  },
  
  // 投放区域
  DROP_AREA: {
    y: 111,  // 调整到屏幕1/6位置 (667 * 1/6 ≈ 111)
    previewY: 80,  // 相应调整预览位置
    width: 300
  },
  
  // 兼容旧代码常量
  DROP_LINE_Y: 111,  // 调整到屏幕1/6位置
  DROP_COOLDOWN: 0.5,
  COMBO_DURATION: 2,
  
  // 危险线
  DANGER_LINE: {
    y: 500,  // 设置到草地上方合适位置 (667 - 28 - 140 = 499，约为屏幕3/4位置)
    color: '#FF4444',
    flashDuration: 500
  },
  // 危险判定参数
  DANGER: {
    // 新生成水果的危险判定宽限时间（秒），避免顶部生成瞬间被判定危险
    spawnGraceSec: 0.3,
    // 仅在顶部接近停滞时才计入危险（垂直速度阈值，px/s）
    settleSpeedY: 24,
    // 顶部危险线的判定边距（像素），小幅越线不立即计入
    marginPx: 3
  },
  
  // 物理引擎参数
  PHYSICS: {
    gravity: 1200,       // 重力（提高整体下落速度）
    friction: 0.95,      // 摩擦力
    restitution: 0.1,    // 弹性系数
    airResistance: 0.988, // 空气阻力（增加阻力，帮助快速稳定）
    groundFriction: 0.988, // 地面摩擦（增加摩擦，帮助稳定）
    wallFriction: 0.988,   // 墙壁摩擦（增加摩擦）
    maxVelocity: 300,    // 最大速度（降低最大速度）
    settleThreshold: 8,  // 静止阈值（进一步降低）
    mergeDistance: 2.0,  // 合成距离
    bounceDamping: 0.15, // 弹跳阻尼（增加阻尼，减少弹跳）
    groundBounceDamping: 0.20, // 地面弹跳阻尼（增加阻尼）
    sleepVelThreshold: 4,   // 睡眠速度阈值（降低阈值）
    solverIterations: 3,    // 求解器迭代次数
    stableContactSec: 0.15  // 接触稳定时间要求（降低到0.15秒）
  },
  
  // 性能限制
  LIMITS: {
    maxFruits: 50, // 场景中允许的最大水果数量
    DROP_COOLDOWN: 0.5, // 投放冷却时间（秒）
    COMBO_DURATION: 2, // 连击持续时间（秒）
  },

  // 掉落行为参数（顶部上方生成 + 初速度）
  DROP: {
    spawnAboveTopPx: 60,    // 生成位置相对容器顶部向上偏移
    initialVelocityY: 650,  // 提高初始下落速度，确保更快进入支撑
    sideJitterPx: 0         // 水平轻微扰动（可为0）
  },

  // 游戏玩法参数（可切换：升级合成 或 消除）
  GAMEPLAY: {
    // 主玩法模式：'tetris' 俄罗斯方块式堆叠消行 | 'physics' 物理堆叠 | 'match3' 网格三消
    MODE: 'physics',
    // 可选值：'upgrade' | 'eliminate' | 'eliminate_on_bottom'
    // 升级模式：相同水果碰撞后合成更高级水果
    MERGE_BEHAVIOR: 'upgrade',
    // 物理模式/自由投放的可生成水果列表（仅限可升级链条，最高级不直接出现）
    STARTER_TYPES: ['CHERRY','STRAWBERRY','GRAPE','LEMON','ORANGE','APPLE','KIWI','TOMATO','COCONUT'],
    // 消除得分倍率（相对该水果基础分）
    ELIMINATE_SCORE_MULTIPLIER: 1.0,
    // 是否因消除增加连击
    COMBO_ON_ELIMINATE: true,
    // 同类消除的最小团簇数量（建议 2 或 3）
    ELIMINATE_MIN_CLUSTER: 2,
    // 开局宽限时间（秒），避免初始化时误判游戏结束
    BOOT_GRACE_SEC: 1.5,
    // 游戏结束判定容差（像素）
    GAMEOVER_TOLERANCE_PX: 4,
    // 游戏结束持续时间（秒）
    GAMEOVER_SUSTAIN_SEC: 1.0,
    // 网格三消配置
    MATCH3: {
      cols: 7,
      rows: 10,
      cellSize: 42,            // 单元格尺寸（像素）
      boardTop: 90,            // 棋盘距离顶部的偏移
      minMatch: 3,             // 至少三个消除
      scoreMultiplier: 1.0,    // 三消模式额外分数倍率
      // 可生成的水果类型（十种常见水果）
      types: ['CHERRY','STRAWBERRY','GRAPE','LEMON','ORANGE','APPLE','KIWI','TOMATO','COCONUT','WATERMELON','BLUEBERRY','PEACH','PEAR','MANGO','PINEAPPLE']
    },
    // 模式与道具配置
    MODES: {
      default: 'timed',
      timed: { durationSec: 120 },
      endless: {}
    },
    POWER_UPS: {
      bombChance: 0.05,
      rainbowChance: 0.03
    }
  },

  // 画质与性能档位（新增）
  QUALITY: {
    // 可选：'low' | 'medium' | 'high' | 'auto'
    tier: 'auto',
    // 自动回退到2D的FPS阈值（低于该值一段时间触发）
    autoFallbackFps: 28,
    // 连续低帧的检测窗口（秒）
    autoFallbackWindowSec: 5,
    // 启用自动回退
    autoFallbackEnabled: true
  },
  // Tetris 模式参数
  TETRIS: {
    cols: 8,
    rows: 16,
    cellSize: 40,
    boardTop: 80,
    gravityCellsPerSec: 2.0,
    // 加速与等级参数
    linesPerLevel: 10,
    gravityIncPerLevel: 0.3,
    maxGravity: 6.0,
    lockDelaySec: 0.25,
    // 将水果映射为不同大小的块（1x1、1x2、2x2）
    pieceMap: {
      CHERRY: [[1]],
      STRAWBERRY: [[1]],
      GRAPE: [[1,1]],
      LEMON: [[1],[1]],
      ORANGE: [[1,1],[1,1]],
      APPLE: [[1,1],[1,1]],
      KIWI: [[1.1],[1,1]],
      TOMATO: [[1,1]],
      COCONUT: [[1,1],[1,1]],
      WATERMELON: [[1,1],[1,1]]
    }
  },

  // 视觉与奖励参数
  PRECISION: {
    centerTolerancePx: 12, // 距离容器中心的精准判定阈值
    bonusScore: 20,        // 精准投放加分
  },

  // 特效系统上限（超出自动降级）
  EFFECT_LIMITS: {
    maxParticles: 300,
    maxEffects: 120
  },
  
  // 危险状态持续时间（秒），超过则判定游戏结束（抖音手机节奏更紧凑）- 减少到1.5秒，更快触发游戏结束
  DANGER_TIMEOUT: 1.5,
};

// 水果配置 - 基于PRD但优化色彩设计
export const FRUIT_CONFIG = {
  CHERRY: {
    id: 1,
    name: '樱桃',
    radius: 32,
    color: '#E53E3E', // 深红色
    gradient: ['#E53E3E', '#C53030'],
    texture: 'assets/images/fruits/cherry.png',
    score: 1,
    mass: 0.8,
    nextLevel: 'STRAWBERRY'
  },
  STRAWBERRY: {
    id: 2,
    name: '草莓',
    radius: 32,
    color: '#F56565', // 亮红色
    gradient: ['#F56565', '#E53E3E'],
    texture: 'assets/images/fruits/strawberry.png',
    score: 3,
    mass: 1.0,
    nextLevel: 'GRAPE'
  },
  GRAPE: {
    id: 3,
    name: '葡萄',
    radius: 32,
    color: '#9F7AEA', // 紫色
    gradient: ['#9F7AEA', '#805AD5'],
    texture: 'assets/images/fruits/grape.png',
    score: 6,
    mass: 1.3,
    nextLevel: 'LEMON'
  },
  LEMON: {
    id: 4,
    name: '柠檬',
    radius: 48,
    color: '#F6E05E', // 柠檬黄
    gradient: ['#F6E05E', '#ECC94B'],
    texture: 'assets/images/fruits/lemon.png',
    score: 10,
    mass: 1.6,
    nextLevel: 'ORANGE'
  },
  ORANGE: {
    id: 5,
    name: '橙子',
    radius: 64,
    color: '#FF8C00', // 橙色
    gradient: ['#FF8C00', '#FF7F00'],
    texture: 'assets/images/fruits/orange.png',
    score: 15,
    mass: 2.0,
    nextLevel: 'APPLE'
  },
  APPLE: {
    id: 6,
    name: '苹果',
    radius: 64,
    color: '#FF6B6B', // 苹果红
    gradient: ['#FF6B6B', '#EE5A52'],
    texture: 'assets/images/fruits/apple.png',
    score: 21,
    mass: 2.5,
    nextLevel: 'KIWI'
  },
  KIWI: {
    id: 7,
    name: '猕猴桃',
    radius: 48,
    color: '#68D391', // 猕猴桃绿
    gradient: ['#68D391', '#48BB78'],
    texture: 'assets/images/fruits/kiwi.png',
    score: 28,
    mass: 3.2,
    nextLevel: 'TOMATO'
  },
  TOMATO: {
    id: 8,
    name: '番茄',
    radius: 48,
    color: '#FC8181', // 番茄红
    gradient: ['#FC8181', '#F56565'],
    texture: 'assets/images/fruits/tomato.png',
    score: 36,
    mass: 4.0,
    nextLevel: 'COCONUT'
  },
  COCONUT: {
    id: 9,
    name: '椰子',
    radius: 96,
    color: '#A0522D', // 椰子棕
    gradient: ['#A0522D', '#8B4513'],
    texture: 'assets/images/fruits/coconut.png',
    score: 45,
    mass: 5.0,
    nextLevel: 'WATERMELON'
  },
  WATERMELON: {
    id: 10,
    name: '西瓜',
    radius: 128,
    color: '#38A169', // 西瓜绿
    gradient: ['#38A169', '#2F855A'],
    texture: 'assets/images/fruits/watermelon.png',
    score: 45,
    mass: 6.5,
    nextLevel: null
  },
  BLUEBERRY: {
    id: 11,
    name: '蓝莓',
    radius: 32,
    color: '#4A90E2',
    gradient: ['#4A90E2', '#357ABD'],
    texture: 'assets/images/fruits/blueberry.png',
    score: 2,
    mass: 0.7,
    nextLevel: null
  },
  PEACH: {
    id: 12,
    name: '桃子',
    radius: 64,
    color: '#FFA07A',
    gradient: ['#FFA07A', '#FF7F50'],
    texture: 'assets/images/fruits/peach.png',
    score: 18,
    mass: 2.2,
    nextLevel: null
  },
  PEAR: {
    id: 13,
    name: '梨子',
    radius: 64,
    color: '#A3D170',
    gradient: ['#A3D170', '#7FBF3F'],
    texture: 'assets/images/fruits/pear.png',
    score: 22,
    mass: 2.8,
    nextLevel: null
  },
  MANGO: {
    id: 14,
    name: '芒果',
    radius: 64,
    color: '#FFC04D',
    gradient: ['#FFC04D', '#FFA72B'],
    texture: 'assets/images/fruits/mango.png',
    score: 26,
    mass: 3.0,
    nextLevel: null
  },
  PINEAPPLE: {
    id: 15,
    name: '菠萝',
    radius: 96,
    color: '#FFCC00',
    gradient: ['#FFCC00', '#E0B000'],
    texture: 'assets/images/fruits/pineapple.png',
    score: 48,
    mass: 5.4,
    nextLevel: null
  },
  // 特殊道具：炸弹与彩虹（不参与十种水果计数）
  BOMB: {
    id: 101,
    name: '炸弹',
    radius: 25,                 // 缩小为原来的2/3
    color: '#333333',
    gradient: ['#4a4a4a', '#1f1f1f'],
    texture: null,
    score: 0,
    mass: 3.0,
    nextLevel: null
  },
  RAINBOW: {
    id: 102,
    name: '彩虹果',
    radius: 25,                 // 缩小为原来的2/3
    color: '#FFD54F',
    gradient: ['#FF6B6B', '#4ECDC4'],
    texture: null,
    score: 0,
    mass: 2.5,
    nextLevel: null
  }
};

// UI颜色主题 - 独立设计的现代化配色
export const UI_THEME = {
  // 主色调 - 温暖的渐变色系
  primary: {
    main: '#FF6B9D',      // 粉红主色
    light: '#FFB3D1',     // 浅粉
    dark: '#E91E63',      // 深粉
    gradient: ['#FF6B9D', '#C44569']
  },
  
  // 辅助色
  secondary: {
    main: '#4ECDC4',      // 青绿色
    light: '#81E6DB',     // 浅青绿
    dark: '#26A69A',      // 深青绿
    gradient: ['#4ECDC4', '#26A69A']
  },
  
  // 背景色系
  background: {
    main: '#FFF8E1',      // 温暖的米色
    light: '#FFFDE7',     // 极浅米色
    dark: '#F9F7E8',      // 深米色
    gradient: ['#FFF8E1', '#F9F7E8', '#FFF3C4']
  },
  
  // 游戏容器
  container: {
    border: '#D4A574',    // 金棕色边框
    shadow: '#B8956A',    // 阴影色
    inner: '#FFFEF7'      // 内部背景
  },
  
  // 文字颜色
  text: {
    primary: '#2D3748',   // 深灰主文字
    secondary: '#4A5568', // 中灰副文字
    accent: '#FF6B9D',    // 强调色文字
    score: '#FFD700'      // 分数金色
  },
  
  // 状态颜色
  status: {
    success: '#48BB78',   // 成功绿
    warning: '#ED8936',   // 警告橙
    error: '#F56565',     // 错误红
    info: '#4299E1'       // 信息蓝
  },

  // 震动与特效控制（新增）
  // 默认关闭屏幕震动，进一步降低头晕感；并适度降低粒子上限
  // 开启一次性震屏以满足“落地震一下”的需求（其他事件已显著减弱）
  shakeEnabled: true,
  shakeScale: 0.3,    // 降低强度，避免持续震动不适
  shakeMax: 1.0,      // 下调单次震动的最大强度
  comboShakeEnabled: false,      // 关闭连击来源震屏
  gameOverShakeEnabled: false,   // 关闭游戏结束来源震屏
  mergeShakeEnabled: false,      // 关闭合成事件震屏，避免多次震动
  maxParticles: 220,  // 粒子数量上限（低于默认300）
  maxEffects: 90      // 特效实例上限（低于默认120）
};

// 游戏状态
export const GAME_STATES = {
  LOADING: 'loading',
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over'
};

// 音效配置
export const AUDIO_CONFIG = {
  BGM: 'bgm.mp3',
  MERGE: 'merge.mp3',
  DROP: 'drop.mp3',
  GAME_OVER: 'game_over.mp3',
  BUTTON_CLICK: 'click.mp3'
};

// 音频行为设置（浏览器/Douyin资源缺失时的兜底）
export const AUDIO_SETTINGS = {
  // 临时关闭BGM，避免在资源缺失时产生加载错误日志
  enableBGM: false,
  // 默认是否静音（仍可通过UI按钮切换）
  defaultMuted: false
};
    // 接触法线缓存与偏置消除
// 注意：以上接触法线与CCD参数已移至 PHYSICS 对象内部，避免语法错误与重复定义

// 渲染细节微调：完全移除内缩，确保所有水果完美贴合
export const RENDER_TUNING = {
  insetDefaultPx: 0,  // 完全移除默认内缩
  insetOverrides: {}   // 移除所有水果的内缩覆盖，确保使用完整物理边界
};

// Global fallbacks for non-module environments
// Some runtimes (e.g., certain embedded webviews or legacy loaders) may execute
// scripts outside ES module scope and expect configuration objects on the global.
// This attaches read-only-style references to the global object without
// overriding existing values.
try {
  const g = (typeof globalThis !== 'undefined')
    ? globalThis
    : (typeof window !== 'undefined' ? window : null);
  if (g) {
    g.GAME_CONFIG = g.GAME_CONFIG || GAME_CONFIG;
    g.FRUIT_CONFIG = g.FRUIT_CONFIG || FRUIT_CONFIG;
    g.UI_THEME = g.UI_THEME || UI_THEME;
    g.GAME_STATES = g.GAME_STATES || GAME_STATES;
    g.AUDIO_CONFIG = g.AUDIO_CONFIG || AUDIO_CONFIG;
    g.AUDIO_SETTINGS = g.AUDIO_SETTINGS || AUDIO_SETTINGS;
  }
} catch (_) {}