// Three.js 3D水果渲染器（离屏WebGL渲染，拷贝到2D画布）
// 浏览器环境下依赖 window.THREE；抖音小游戏使用内置WebGL适配（后续适配）

import { imageLoader } from '../utils/imageLoader.js';

export class ThreeFruit3DRenderer {
  constructor(width, height) {
    const THREE = window.THREE;
    if (!THREE) {
      console.warn('Three.js not found. 3D renderer disabled.');
      this.enabled = false;
      return;
    }
    this.enabled = true;
    this.width = width;
    this.height = height;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, width, height, 0, -1000, 1000);
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0); // 透明背景
    this.canvas = this.renderer.domElement; // 离屏canvas

    // 光照
    this.ambient = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(this.ambient);
    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    this.dirLight.position.set(-0.5, -1, 1).normalize();
    this.scene.add(this.dirLight);

    // 资源缓存
    this.textureLoader = new THREE.TextureLoader();
    this.textures = new Map(); // type -> Texture
    this.materials = new Map(); // type -> Material 缓存，避免频繁创建
    this.meshPool = []; // 复用mesh，降低GC
    this.activeMeshes = []; // 当前帧使用的mesh
    this.lastGridHash = '';
    this.time = 0;

    // 合成特效临时对象
    this.mergeBursts = [];
  }

  setSize(width, height) {
    if (!this.enabled) return;
    this.width = width;
    this.height = height;
    this.camera.left = 0; this.camera.right = width;
    this.camera.top = 0; this.camera.bottom = height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  async getTextureFor(type, url) {
    if (!this.enabled) return null;
    if (this.textures.has(type)) return this.textures.get(type);
    return new Promise((resolve) => {
      this.textureLoader.load(url, (tex) => {
        tex.colorSpace = (window.THREE?.SRGBColorSpace) || tex.colorSpace;
        this.textures.set(type, tex);
        resolve(tex);
      }, undefined, () => {
        console.warn('Failed to load texture:', url);
        resolve(null);
      });
    });
  }

  acquireMesh() {
    const THREE = window.THREE;
    let mesh = this.meshPool.pop();
    if (!mesh) {
      const geo = new THREE.SphereGeometry(16, 32, 24);
      const mat = this.createDefaultMaterial();
      mesh = new THREE.Mesh(geo, mat);
    }
    this.scene.add(mesh);
    this.activeMeshes.push(mesh);
    return mesh;
  }

  releaseMeshes() {
    for (const mesh of this.activeMeshes) {
      this.scene.remove(mesh);
      this.meshPool.push(mesh);
    }
    this.activeMeshes.length = 0;
  }

  // 将网格水果渲染为3D球体（贴图），位置与2D像素对齐
  async renderGrid(grid, options) {
    if (!this.enabled) return null;
    const { boardLeft, boardTop, cellSize, texturesByType } = options;
    this.releaseMeshes();

    const THREE = window.THREE;
    const radius = Math.max(10, (cellSize - 8) / 2);
    const scale = radius / 16; // 基于默认球半径16的缩放

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (!cell) continue;
        const type = cell.type;
        const cx = boardLeft + c * cellSize + cellSize / 2;
        const cy = (cell.visualY !== undefined) ? cell.visualY : (boardTop + r * cellSize + cellSize / 2);

        const mesh = this.acquireMesh();
        mesh.position.set(cx, cy, 0);
        mesh.scale.set(scale, scale, scale);

        const texUrl = texturesByType[type];
        const texture = texUrl ? await this.getTextureFor(type, texUrl) : null;
        if (texture && texUrl) {
          try {
            await imageLoader.loadImage(texUrl);
            const b = imageLoader.getOpaqueBounds(texUrl);
            const img = texture.image;
            const w = img?.naturalWidth || img?.width || 0;
            const h = img?.naturalHeight || img?.height || 0;
            if (b && w && h) {
              const THREE = window.THREE;
              texture.wrapS = THREE.ClampToEdgeWrapping;
              texture.wrapT = THREE.ClampToEdgeWrapping;
              texture.offset.set(b.sx / w, b.sy / h);
              texture.repeat.set(b.sw / w, b.sh / h);
              texture.needsUpdate = true;
            }
          } catch (e) {
            // 静默降级：纹理裁剪失败时继续使用原图
          }
        }
        const material = mesh.material;
        if (texture) {
          material.map = texture;
          material.color = new THREE.Color(0xffffff);
        } else {
          // 无纹理则用类型色近似（可选增强）
          material.map = null;
          material.color = new THREE.Color(0xffffff);
        }
        material.needsUpdate = true;

        // 微动效：轻微旋转与呼吸缩放
        const t = this.time;
        mesh.rotation.y = (Math.sin(t * 0.001 + c * 0.3 + r * 0.2)) * 0.3;
        mesh.rotation.x = (Math.cos(t * 0.0012 + r * 0.25)) * 0.15;
      }
    }

    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }

  tick(deltaMs) {
    this.time += deltaMs || 16;

    // 更新合成特效：闪光淡出 + 粒子散射
    for (let i = this.mergeBursts.length - 1; i >= 0; i--) {
      const burst = this.mergeBursts[i];
      burst.life -= (deltaMs || 16) / 1000;
      const t = Math.max(0, burst.life / burst.maxLife);
      if (burst.flash) {
        burst.flash.material.opacity = t * 0.6;
        burst.flash.scale.set(1 + (1 - t) * 0.6, 1 + (1 - t) * 0.6, 1);
      }
      if (burst.points) {
        // 粒子向外扩散并逐渐消失
        const pos = burst.points.geometry.attributes.position;
        for (let k = 0; k < pos.count; k++) {
          const idx = k * 3;
          const vx = burst.velocities[k][0];
          const vy = burst.velocities[k][1];
          pos.array[idx] += vx * ((deltaMs || 16) / 1000);
          pos.array[idx + 1] += vy * ((deltaMs || 16) / 1000);
        }
        pos.needsUpdate = true;
        burst.points.material.opacity = t;
      }
      if (burst.life <= 0) {
        if (burst.flash) {
          this.scene.remove(burst.flash);
          // 释放资源，避免长期累积
          burst.flash.geometry?.dispose?.();
          burst.flash.material?.dispose?.();
        }
        if (burst.points) {
          this.scene.remove(burst.points);
          burst.points.geometry?.dispose?.();
          burst.points.material?.dispose?.();
        }
        this.mergeBursts.splice(i, 1);
      }
    }
  }

  // 渲染物理模式下的水果列表
  async renderFruits(fruits, options) {
    if (!this.enabled) return null;
    const { texturesByType } = options || {};
    this.releaseMeshes();

    const THREE = window.THREE;
    for (const fruit of fruits) {
      if (!fruit || fruit.isMarkedForRemoval) continue;
      const mesh = this.acquireMesh();
      const pos = fruit.body?.position || fruit.position || { x: 0, y: 0 };
      mesh.position.set(pos.x, pos.y, 0);
      const baseRadius = 16;
      const scale = (fruit.radius || 16) / baseRadius;
      mesh.scale.set(scale, scale, scale);
      const type = fruit.fruitType || fruit.type;
      const url = texturesByType?.[type];
      const texture = url ? await this.getTextureFor(type, url) : null;
      const material = this.getMaterialForType(type, texture);
      mesh.material = material;
      // 轻微旋转
      const t = this.time;
      mesh.rotation.y = Math.sin(t * 0.001 + pos.x * 0.01) * 0.25;
      mesh.rotation.x = Math.cos(t * 0.001 + pos.y * 0.01) * 0.12;
    }

    // 渲染前添加活跃的合成特效对象
    for (const burst of this.mergeBursts) {
      if (burst.flash && !burst.flash.parent) this.scene.add(burst.flash);
      if (burst.points && !burst.points.parent) this.scene.add(burst.points);
    }

    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }

  // 触发合成闪光/粒子特效
  triggerMergeBurst(x, y, { color = '#FFFFFF', count = 12 } = {}) {
    if (!this.enabled) return;
    const THREE = window.THREE;

    // 闪光平面
    const flashGeo = new THREE.PlaneGeometry(40, 40);
    const flashMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.6 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.set(x, y, 0);

    // 粒子
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const speed = 80 + Math.random() * 80;
      const vx = Math.cos(a) * speed;
      const vy = Math.sin(a) * speed;
      velocities.push([vx, vy]);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = 0;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: new THREE.Color(color), size: 4, transparent: true, opacity: 1 });
    const points = new THREE.Points(geo, mat);

    this.mergeBursts.push({ flash, points, velocities, life: 0.6, maxLife: 0.6 });
  }

  // 材质优化：按水果类型设置粗糙度/高光并模拟厚度
  getMaterialForType(type, texture) {
    const THREE = window.THREE;
    const usePhysical = !!THREE.MeshPhysicalMaterial;
    const baseColor = new THREE.Color(0xffffff);
    const params = this.getMaterialParams(type);
    // 复用同类型材质，避免每帧创建导致内存增长
    let mat = this.materials.get(type);
    if (!mat) {
      if (usePhysical) {
        mat = new THREE.MeshPhysicalMaterial({
          color: baseColor,
          roughness: params.roughness,
          metalness: params.metalness,
          transmission: params.transmission,
          thickness: params.thickness,
          transparent: true,
          opacity: 1
        });
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: params.roughness,
          metalness: params.metalness
        });
      }
      this.materials.set(type, mat);
    }
    // 更新贴图（如存在）
    if (texture) {
      mat.map = texture;
    } else {
      mat.map = null;
    }
    mat.needsUpdate = true;
    return mat;
  }

  createDefaultMaterial() {
    const THREE = window.THREE;
    if (THREE.MeshPhysicalMaterial) {
      return new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0, transmission: 0.05, thickness: 0.4, transparent: true });
    }
    return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0 });
  }

  getMaterialParams(type) {
    // 基于水果类型的材质参数
    switch (type) {
      case 'SANSHENG':
      case 'CHENGZI':
        return { roughness: 0.35, metalness: 0.0, transmission: 0.12, thickness: 0.6 };
      case 'PUTAO':
      case 'SHANZHU':
        return { roughness: 0.4, metalness: 0.05, transmission: 0.08, thickness: 0.5 };
      case 'MIHUOTAO':
      case 'PINGGUO':
        return { roughness: 0.5, metalness: 0.02, transmission: 0.06, thickness: 0.5 };
      case 'XIGUA':
        return { roughness: 0.45, metalness: 0.02, transmission: 0.04, thickness: 0.7 };
      default:
        return { roughness: 0.5, metalness: 0.02, transmission: 0.06, thickness: 0.5 };
    }
  }

  // 销毁并释放所有WebGL资源（用于退出或切换渲染模式）
  destroy() {
    if (!this.enabled) return;
    // 释放合成特效残留
    for (const burst of this.mergeBursts) {
      if (burst.flash) {
        this.scene.remove(burst.flash);
        burst.flash.geometry?.dispose?.();
        burst.flash.material?.dispose?.();
      }
      if (burst.points) {
        this.scene.remove(burst.points);
        burst.points.geometry?.dispose?.();
        burst.points.material?.dispose?.();
      }
    }
    this.mergeBursts.length = 0;
    // 释放纹理与材质缓存
    for (const tex of this.textures.values()) {
      tex?.dispose?.();
    }
    this.textures.clear();
    for (const mat of this.materials.values()) {
      mat?.dispose?.();
    }
    this.materials.clear();
    // 释放meshPool内的几何（默认球体）
    for (const mesh of this.meshPool) {
      mesh.geometry?.dispose?.();
    }
    this.meshPool.length = 0;
    // 释放renderer
    this.renderer?.dispose?.();
    this.enabled = false;
  }
}