// 游戏常量配置
export const GAME_CONFIG = {
  // 渲染器选择：'canvas' | 'three'
  RENDERER: 'three',

  // 画布尺寸
  CANVAS: {
    width: 375,
    height: 667
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
    y: 200,
    previewY: 150,
    width: 300
  },
  
  // 兼容旧代码常量
  DROP_LINE_Y: 200,
  DROP_COOLDOWN: 0.5,
  COMBO_DURATION: 2,
  
  // 危险线
  DANGER_LINE: {
    y: 300,
    color: '#FF4444',
    flashDuration: 500
  },
  // 危险判定参数
  DANGER: {
    // 新生成水果的危险判定宽限时间（秒），避免顶部生成瞬间被判定危险
    spawnGraceSec: 0.3,
    // 仅在顶部接近停滞时才计入危险（垂直速度阈值，px/s）
    settleSpeedY: 20,
    // 顶部危险线的判定边距（像素），小幅越线不立即计入
    marginPx: 3
  },
  
  // 物理参数
  PHYSICS: {
    gravity: 360,          // 重力保持适中
    friction: 0.92,        // 增强摩擦力，快速消除水平震动
    restitution: 0.08,     // 大幅降低弹性，几乎无弹跳
    airResistance: 0.96,   // 增强空气阻力，快速衰减速度
    maxVelocity: 480,      // 最大速度限制
    mergeDistance: 1.0,    // 合成距离阈值
    bounceDamping: 0.3,    // 新增：落地弹跳额外阻尼
    settleThreshold: 8,    // 新增：静止判定速度阈值
    // 底部微重叠过滤阈值（像素）：小于该值且近静止时不参与重复碰撞
    tinyOverlapEpsilon: 1.2,
    // 睡眠/唤醒机制（底部长期稳定后进入睡眠，受较大冲量或明显压紧时唤醒）
    sleepEnabled: true,
    sleepVelThreshold: 6,      // 速度低于该值（px/s）计入睡眠判定
    sleepTimeoutSec: 0.9,      // 持续低速超过该秒数进入睡眠
    wakeImpulse: 24,           // 冲量强度超过该值时唤醒
    wakeOverlapPx: 2.0,        // 重叠超过该像素时唤醒/参与碰撞
    // 冲击传播参数（新增，可调）
    impactSourceVelY: 160,         // 下落体垂直速度超过该值标为冲击源
    impactSourceDurationSec: 0.6,  // 冲击源标记持续时间（秒）
    propagationDamping: 0.25,      // 底部非冲击源对的传播阻尼（越小越弱）
    bottomStackImpulseClamp: 26    // 底部堆叠非冲击源最大冲击强度上限
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
    initialVelocityY: 180,  // 降低下落初速度，减轻落地冲击
    sideJitterPx: 0         // 水平轻微扰动（可为0）
  },

  // 游戏玩法参数（可切换：升级合成 或 消除）
  GAMEPLAY: {
    // 主玩法模式：'tetris' 俄罗斯方块式堆叠消行 | 'physics' 物理堆叠 | 'match3' 网格三消
    MODE: 'physics',
    // 可选值：'upgrade' | 'eliminate' | 'eliminate_on_bottom'
    // 改为“碰撞即消除”的模式：同类型水果发生碰撞且形成团簇则消除
    MERGE_BEHAVIOR: 'eliminate',
    // 物理模式/自由投放的可生成水果列表（扩展为十种）
    STARTER_TYPES: ['CHERRY','STRAWBERRY','GRAPE','LEMON','ORANGE','APPLE','KIWI','TOMATO','COCONUT','WATERMELON','BLUEBERRY','PEACH','PEAR','MANGO','PINEAPPLE'],
    // 消除得分倍率（相对该水果基础分）
    ELIMINATE_SCORE_MULTIPLIER: 1.0,
    // 是否因消除增加连击
    COMBO_ON_ELIMINATE: true,
    // 同类消除的最小团簇数量（建议 2 或 3）
    ELIMINATE_MIN_CLUSTER: 2,
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
  // 渲染器选择：'canvas' | 'three'
  RENDERER: 'three',

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
      KIWI: [[1,1],[1,1]],
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

  // 画质与性能档位（含自动回退）
  QUALITY: {
    tier: 'auto',          // 'low' | 'medium' | 'high' | 'auto'
    autoFallbackFps: 24,   // 连续低于该FPS则回退至2D
    autoFallbackWindowSec: 3, // 统计窗口（秒）
    autoFallbackEnabled: true
  }
};

// 水果配置 - 基于PRD但优化色彩设计
export const FRUIT_CONFIG = {
  CHERRY: {
    id: 1,
    name: '樱桃',
    radius: 20,  // 从16增加到20
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
    radius: 25,  // 从20增加到25
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
    radius: 30,  // 从24增加到30
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
    radius: 35,  // 从28增加到35
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
    radius: 41,  // 从33增加到41
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
    radius: 46,  // 从37增加到46
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
    radius: 54,  // 从43增加到54
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
    radius: 60,  // 从48增加到60
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
    radius: 66,  // 从53增加到66
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
    radius: 75,  // 从60增加到75
    color: '#38A169', // 西瓜绿
    gradient: ['#38A169', '#2F855A'],
    texture: 'assets/images/fruits/watermelon.png',
    score: 55,
    mass: 6.5,
    nextLevel: null
  }
  ,
  // 新增：5种常见水果（参考Fruit Ninja并按现有尺寸比例）
  BLUEBERRY: {
    id: 11,
    name: '蓝莓',
    radius: 16,                 // 比樱桃更小的微型果
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
    radius: 38,                 // 介于橙子与苹果之间
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
    radius: 42,                 // 接近猕猴桃大小
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
    radius: 44,                 // 略大于梨子
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
    radius: 68,                 // 接近椰子/次于西瓜的大型果
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
    radius: 37,
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
    radius: 37,
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
