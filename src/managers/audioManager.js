import { AUDIO_CONFIG, AUDIO_SETTINGS } from '../config/constants.js';

class AudioManager {
  constructor() {
    this.sounds = {};
    this.isMuted = !!(AUDIO_SETTINGS && AUDIO_SETTINGS.defaultMuted);
    // 分音量控制：适度降低“冲击”相关的音量
    this.volumes = {
      BGM: (AUDIO_SETTINGS && typeof AUDIO_SETTINGS.bgmVolume === 'number') ? AUDIO_SETTINGS.bgmVolume : 0.6,
      MERGE: 0.6,
      DROP: 0.5,
      GAME_OVER: 0.7,
      BUTTON_CLICK: 0.5,
      HIT: 0.4
    };
    this.loadSounds();
  }

  // 创建一个静音占位的音频对象，避免资源缺失导致报错
  createSilentAudio() {
    return {
      src: '',
      currentTime: 0,
      seek: () => {},
      play: () => {},
      pause: () => {},
    };
  }

  loadSounds() {
    for (const key in AUDIO_CONFIG) {
      // 如果明确关闭BGM，则直接使用静音占位，避免加载缺失资源
      if (key === 'BGM' && AUDIO_SETTINGS && AUDIO_SETTINGS.enableBGM === false) {
        this.sounds[key] = this.createSilentAudio();
        continue;
      }
      const path = `assets/audio/${AUDIO_CONFIG[key]}`;
      if (typeof tt !== 'undefined') {
        const audio = tt.createInnerAudioContext();
        audio.src = path;
        audio.autoplay = false;
        // 循环播放背景音乐
        if (key === 'BGM') audio.loop = true;
        // 资源加载失败时降级为静音占位，防止运行时报错
        if (typeof audio.onError === 'function') {
          audio.onError(() => {
            this.sounds[key] = this.createSilentAudio();
          });
        }
        this.sounds[key] = audio;
      } else {
        const audio = new Audio(path);
        // 避免在浏览器立即发起加载，缺失资源时产生 ERR_ABORTED 日志
        try { audio.preload = 'none'; } catch (_) {}
        if (key === 'BGM') audio.loop = true;
        // 资源加载失败时降级为静音占位，防止运行时报错
        audio.addEventListener('error', () => {
          this.sounds[key] = this.createSilentAudio();
        });
        this.sounds[key] = audio;
      }
    }
  }

  playSound(key) {
    // 兼容旧代码中的 CLICK 命名
    if (key === 'CLICK') key = 'BUTTON_CLICK';
    if (this.isMuted || !this.sounds[key]) return;
    const vol = (this.volumes && typeof this.volumes[key] === 'number') ? this.volumes[key] : 0.6;
    
    if (typeof tt !== 'undefined') {
        try {
          // 设置音量（如环境支持）
          if ('volume' in this.sounds[key]) {
            try { this.sounds[key].volume = vol; } catch (_) {}
          }
          if (typeof this.sounds[key].seek === 'function') this.sounds[key].seek(0);
          this.sounds[key].play();
        } catch (_) {
          // 忽略播放异常以保证游戏主循环稳定
        }
    } else {
        try {
          // 设置音量（浏览器Audio支持）
          if ('volume' in this.sounds[key]) {
            try { this.sounds[key].volume = vol; } catch (_) {}
          }
          if ('currentTime' in this.sounds[key]) this.sounds[key].currentTime = 0;
          const r = this.sounds[key].play();
          if (r && typeof r.catch === 'function') r.catch(() => {});
        } catch (_) {
          // 忽略播放异常以保证游戏主循环稳定
        }
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
  }

  setMute(muted) {
    this.isMuted = !!muted;
  }
}

export const audioManager = new AudioManager();