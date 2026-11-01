import * as THREE from 'three';
import {
  starVert, starFrag, planetVert, planetFrag, atmoVert, atmoFrag,
  ringVert, ringFrag, skyVert, skyFrag, quadVert, sunFrag, entryVert, entryFrag,
} from './shaders.js';
import { WORLDS, MOON } from './worlds.js';

const TAU = Math.PI * 2;
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

// Everything the scroll can drive. Values are targets; the renderer eases
// toward them every frame, which gives the camera its weight and inertia.
export const DEFAULT_POSE = {
  camX: 0, camY: 0, camZ: 6,
  planetX: 0.3, planetY: 0.2, planetScale: 1.6,
  lightA: 2.6, lightE: 0.25,
  orbit: 0,
  warp: 0, entry: 0,
  bright: 1, sky: 1,
  sun: 0, sunX: 0, sunY: 0, sunSize: 30,
  compare: 0, compareX: -0.55, compareY: 0, compareZ: 0.4, compareAbs: 0,
  planetVis: 1,
};

function detectTier() {
  const mobile = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (mobile || cores <= 4 || mem <= 2) return mobile && (cores <= 4 || mem <= 3) ? 'low' : 'mid';
  return 'high';
}

const TIERS = {
  high: { dpr: 1.75, stars: 9000, seg: 160, oct: 6, dust: 260 },
  mid: { dpr: 1.5, stars: 5200, seg: 112, oct: 5, dust: 160 },
  low: { dpr: 1.0, stars: 2600, seg: 72, oct: 4, dust: 80 },
};

function makeStarLayer({ count, wrap, spread, sizeMin, sizeMax, sizeMul, bright, warm = 0.25, seed = 1 }) {
  let s = seed * 9301 + 49297;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const base = new THREE.PlaneGeometry(2, 2);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const color = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const palette = [
    new THREE.Color('#ffffff'), new THREE.Color('#dbe6ff'), new THREE.Color('#c4d6ff'),
    new THREE.Color('#ffe9cf'), new THREE.Color('#ffd3a6'),
  ];
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rand() * 2 - 1) * spread;
    pos[i * 3 + 1] = (rand() * 2 - 1) * spread * 0.75;
    pos[i * 3 + 2] = (rand() * 2 - 1) * wrap;
    size[i] = sizeMin + Math.pow(rand(), 5) * (sizeMax - sizeMin);
    const r = rand();
    const c = r < warm * 0.4 ? palette[4] : r < warm ? palette[3] : r < 0.55 ? palette[0] : r < 0.85 ? palette[1] : palette[2];
    color[i * 3] = c.r; color[i * 3 + 1] = c.g; color[i * 3 + 2] = c.b;
    phase[i] = rand();
  }
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1));
  geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3));
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
  geo.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    vertexShader: starVert,
    fragmentShader: starFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uWarp: { value: 0 }, uBright: { value: bright },
      uRes: { value: new THREE.Vector2(1, 1) }, uPR: { value: 1 }, uWrap: { value: wrap },
      uCam: { value: new THREE.Vector3() }, uTravel: { value: 0 }, uSizeMul: { value: sizeMul }, uMin: { value: 0.4 },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.userData.baseBright = bright;
  return mesh;
}

function lookUniforms(look) {
  return {
    uColA: { value: new THREE.Color(look.colA) },
    uColB: { value: new THREE.Color(look.colB) },
    uColC: { value: new THREE.Color(look.colC) },
    uColD: { value: new THREE.Color(look.colD) },
    uAtmo: { value: new THREE.Color(look.atmo) },
    uAtmoStr: { value: look.atmoStr },
    uGas: { value: look.gas },
    uBand: { value: look.band },
    uOcean: { value: look.ocean },
    uCloud: { value: look.cloud },
    uCaps: { value: look.caps },
    uStorm: { value: look.storm },
    uSeed: { value: look.seed },
  };
}

class Body {
  constructor({ look, seg, oct, sun, light, rings = true }) {
    this.group = new THREE.Group();
    this.tilt = new THREE.Group();
    this.tilt.rotation.z = 0.42;
    this.tilt.rotation.x = 0.12;
    this.group.add(this.tilt);
    this.look = { ...look };
    this.spin = 0;

    const u = lookUniforms(look);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: planetVert,
      fragmentShader: planetFrag,
      uniforms: {
        ...u,
        uLight: { value: light }, uSun: { value: sun }, uTime: { value: 0 }, uSpin: { value: 0 },
        uOct: { value: oct },
        uRingN: { value: new THREE.Vector3(0, 1, 0) }, uRingIn: { value: 1.35 }, uRingOut: { value: 2.35 },
        uRingShadow: { value: look.rings }, uCenter: { value: new THREE.Vector3() }, uDim: { value: 0 },
      },
    });
    this.sphere = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)), this.mat);
    this.tilt.add(this.sphere);

    this.atmoMat = new THREE.ShaderMaterial({
      vertexShader: atmoVert,
      fragmentShader: atmoFrag,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uLight: { value: light }, uAtmo: this.mat.uniforms.uAtmo, uAtmoStr: this.mat.uniforms.uAtmoStr, uOpacity: { value: 1 }, uCenter: this.mat.uniforms.uCenter, uRadius: { value: 1 }, uDim: this.mat.uniforms.uDim },
    });
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(1.085, Math.round(seg * 0.6), Math.round(seg * 0.45)), this.atmoMat);
    this.group.add(this.atmo);

    if (rings) {
      this.ringMat = new THREE.ShaderMaterial({
        vertexShader: ringVert,
        fragmentShader: ringFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uLight: { value: light }, uSun: { value: sun }, uCenter: this.mat.uniforms.uCenter,
          uRadius: { value: 1 }, uInner: { value: 1.35 }, uOuter: { value: 2.35 },
          uColA: { value: new THREE.Color('#8d7556') }, uColB: { value: new THREE.Color('#e3d1aa') },
          uOpacity: { value: look.rings }, uNormal: this.mat.uniforms.uRingN, uDim: this.mat.uniforms.uDim,
        },
      });
      this.ring = new THREE.Mesh(new THREE.RingGeometry(1.35, 2.35, 256, 1), this.ringMat);
      this.ring.rotation.x = -Math.PI / 2;
      this.ring.renderOrder = 2;
      this.tilt.add(this.ring);
    }
    this._n = new THREE.Vector3();
  }

  // A new world arrives during an eclipse: the planet turns into shadow,
  // changes while it is dark, and the light comes back. No colour soup.
  setLook(look, { instant = false } = {}) {
    if (instant || !this.target) {
      this.target = look;
      this.pending = null;
      this.snap();
    } else if (look !== this.target || this.pending) {
      this.pending = look === this.target ? null : look;
    }
  }

  snap() {
    const t = this.target, u = this.mat.uniforms;
    u.uColA.value.set(t.colA); u.uColB.value.set(t.colB); u.uColC.value.set(t.colC); u.uColD.value.set(t.colD);
    u.uAtmo.value.set(t.atmo);
    Object.assign(this, { spinRate: t.spin });
    const num = { gas: 'uGas', band: 'uBand', ocean: 'uOcean', cloud: 'uCloud', caps: 'uCaps', storm: 'uStorm', atmoStr: 'uAtmoStr', seed: 'uSeed' };
    for (const [k, key] of Object.entries(num)) u[key].value = t[k];
    u.uRingShadow.value = t.rings;
    if (this.ringMat) this.ringMat.uniforms.uOpacity.value = t.rings;
    this.tilt.rotation.z = t.tilt ?? 0.42;
  }

  update(dt, time, lambda = 2.4) {
    const u = this.mat.uniforms;
    this.dim = damp(this.dim ?? 0, this.pending ? 1 : 0, this.pending ? 9 : 4.5, dt);
    if (this.pending && this.dim > 0.95) {
      this.target = this.pending;
      this.pending = null;
      this.snap();
    }
    u.uDim.value = this.dim;
    const t = this.target;
    if (t) {
      for (const k of ['colA', 'colB', 'colC', 'colD', 'atmo']) {
        const key = k === 'atmo' ? 'uAtmo' : 'u' + k[0].toUpperCase() + k.slice(1);
        u[key].value.lerp(this._color(k, t[k]), 1 - Math.exp(-lambda * dt));
      }
      const num = { gas: 'uGas', band: 'uBand', ocean: 'uOcean', cloud: 'uCloud', caps: 'uCaps', storm: 'uStorm', atmoStr: 'uAtmoStr', seed: 'uSeed' };
      for (const [k, key] of Object.entries(num)) u[key].value = damp(u[key].value, t[k], lambda, dt);
      u.uRingShadow.value = damp(u.uRingShadow.value, t.rings, lambda, dt);
      if (this.ringMat) {
        this.ringMat.uniforms.uOpacity.value = damp(this.ringMat.uniforms.uOpacity.value, t.rings, lambda, dt);
        this.ring.visible = this.ringMat.uniforms.uOpacity.value > 0.01;
      }
      this.spinRate = damp(this.spinRate ?? t.spin, t.spin, lambda, dt);
      this.tilt.rotation.z = damp(this.tilt.rotation.z, t.tilt ?? 0.42, lambda, dt);
    }
    this.spin += dt * (this.spinRate ?? 0.05);
    u.uSpin.value = this.spin;
    u.uTime.value = time;

    // world-space data the shaders need for ring shadows
    this.group.updateMatrixWorld(true);
    u.uCenter.value.setFromMatrixPosition(this.group.matrixWorld);
    const s = this.group.scale.x;
    u.uRingIn.value = 1.35 * s;
    u.uRingOut.value = 2.35 * s;
    if (this.ringMat) this.ringMat.uniforms.uRadius.value = s;
    this.atmoMat.uniforms.uRadius.value = s;
    this._n.set(0, 1, 0).applyQuaternion(this.tilt.getWorldQuaternion(new THREE.Quaternion()));
    u.uRingN.value.copy(this._n);
  }

  _color(k, hex) {
    this._cache ??= {};
    const id = k + hex;
    return (this._cache[id] ??= new THREE.Color(hex));
  }
}

export class Space {
  constructor(canvas, { tier = detectTier(), still = false } = {}) {
    this.canvas = canvas;
    this.tier = tier;
    this.q = TIERS[tier];
    this.still = still;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
      preserveDrawingBuffer: still,
    });
    this.renderer.setClearColor('#020306', 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.dprCap = this.q.dpr;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 3000);
    this.camera.position.set(0, 0, 6);
    this.scene.add(this.camera);

    this.light = new THREE.Vector3(1, 0.2, 0.3).normalize();
    this.sunColor = new THREE.Color('#fff4e6');

    // backdrop
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false,
      uniforms: { uBright: { value: 1 }, uGalN: { value: new THREE.Vector3(0.45, 1, 0.25) }, uTravel: { value: 0 } },
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 32), this.skyMat);
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    // stars in three depths, plus foreground dust
    const n = this.q.stars;
    this.layers = [
      makeStarLayer({ count: Math.round(n * 0.62), wrap: 700, spread: 520, sizeMin: 0.9, sizeMax: 4.5, sizeMul: 1, bright: 0.9, seed: 3 }),
      makeStarLayer({ count: Math.round(n * 0.34), wrap: 140, spread: 110, sizeMin: 0.12, sizeMax: 0.9, sizeMul: 1, bright: 0.95, seed: 7 }),
      makeStarLayer({ count: Math.round(n * 0.04), wrap: 40, spread: 28, sizeMin: 0.05, sizeMax: 0.22, sizeMul: 1, bright: 1, seed: 11 }),
      makeStarLayer({ count: this.q.dust, wrap: 12, spread: 7, sizeMin: 0.004, sizeMax: 0.03, sizeMul: 1, bright: 0.22, warm: 0.6, seed: 19 }),
    ];
    this.layers.forEach((l) => this.scene.add(l));

    // the world
    this.worldId = 'saturn';
    this.body = new Body({ look: WORLDS.saturn.look, seg: this.q.seg, oct: this.q.oct, sun: this.sunColor, light: this.light });
    this.body.setLook(WORLDS.saturn.look);
    this.scene.add(this.body.group);

    // a second, smaller body used to show scale (Earth beside Jupiter) and as a moon in stills
    this.companion = new Body({ look: WORLDS.earth.look, seg: Math.round(this.q.seg * 0.5), oct: Math.min(this.q.oct, 5), sun: this.sunColor, light: this.light, rings: false });
    this.companion.setLook(WORLDS.earth.look);
    this.companion.tilt.rotation.z = 0.41;
    this.scene.add(this.companion.group);

    // a star, for the closing scene
    this.sunMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: sunFrag, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color('#ffb46b') } },
    });
    this.sunMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.sunMat);
    this.sunMesh.renderOrder = -5;
    this.camera.add(this.sunMesh);

    // atmosphere entry pass
    this.entryMat = new THREE.ShaderMaterial({
      vertexShader: entryVert, fragmentShader: entryFrag, transparent: true, depthTest: false, depthWrite: false,
      uniforms: {
        uEntry: { value: 0 }, uTime: { value: 0 }, uTravel: { value: 0 },
        uAtmo: this.body.mat.uniforms.uAtmo, uDeep: { value: new THREE.Color('#03060d') }, uAspect: { value: 1 },
      },
    });
    this.entry = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.entryMat);
    this.entry.frustumCulled = false;
    this.entry.renderOrder = 999;
    this.scene.add(this.entry);

    this.pose = { ...DEFAULT_POSE };
    this.target = { ...DEFAULT_POSE };
    this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    this.scrollVel = 0;
    this.travel = 0;
    this.time = 0;
    this.lambda = this.reduced ? 9 : 2.6;
    this.running = false;
    this.frameTimes = [];

    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    if (!still) {
      addEventListener('resize', this.resize, { passive: true });
      document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
      addEventListener('pointermove', (e) => {
        this.mouse.tx = (e.clientX / innerWidth) * 2 - 1;
        this.mouse.ty = (e.clientY / innerHeight) * 2 - 1;
      }, { passive: true });
    }
    this.resize();
  }

  setWorld(id, { instant = false } = {}) {
    if (!WORLDS[id]) return;
    this.worldId = id;
    this.body.setLook(WORLDS[id].look, { instant });
  }

  setCompanion(id) {
    this.companion.setLook((WORLDS[id] || MOON).look, { instant: true });
  }

  setPose(p) { Object.assign(this.target, p); }

  jump() { Object.assign(this.pose, this.target); }

  resize() {
    const w = this.still ? this.canvas.width : innerWidth;
    const h = this.still ? this.canvas.height : innerHeight;
    const dpr = this.still ? 1 : Math.min(devicePixelRatio || 1, this.dprCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, !this.still);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const l of this.layers) {
      l.material.uniforms.uRes.value.set(w * dpr, h * dpr);
      l.material.uniforms.uPR.value = dpr;
    }
    this.entryMat.uniforms.uAspect.value = w / h;
    this.aspect = w / h;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.tick);
  }

  stop() { this.running = false; }

  tick(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.adapt(dt);
    requestAnimationFrame(this.tick);
  }

  // Lower the resolution if this device cannot hold ~45 fps.
  adapt(dt) {
    if (this.time < 1.5) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > 1 / 45 && this.dprCap > 0.75) {
      this.dprCap = Math.max(0.75, this.dprCap - 0.25);
      this.resize();
    }
  }

  update(dt) {
    this.time += dt;
    const p = this.pose, t = this.target, L = this.lambda;
    for (const k in t) p[k] = damp(p[k], t[k], k === 'warp' || k === 'entry' ? L * 1.4 : L, dt);

    const m = this.mouse;
    m.x = damp(m.x, this.reduced ? 0 : m.tx, 2.2, dt);
    m.y = damp(m.y, this.reduced ? 0 : m.ty, 2.2, dt);

    // camera: a slow breathing drift plus the visitor's pointer
    const breathe = this.reduced ? 0 : 1;
    const cam = this.camera;
    const near = Math.min(1, Math.max(0, (p.camZ - 1.2) / 3));
    cam.position.set(
      p.camX + m.x * 0.22 * near + Math.sin(this.time * 0.11) * 0.04 * breathe,
      p.camY - m.y * 0.14 * near + Math.cos(this.time * 0.09) * 0.03 * breathe,
      p.camZ,
    );
    cam.up.set(Math.sin(m.x * 0.02 + p.orbit * 0.05), 1, 0).normalize();
    cam.lookAt(p.camX * 0.85 + m.x * 0.06, p.camY * 0.85 - m.y * 0.04, p.camZ - 10);

    // planet placement as a fraction of the visible half-frame at z = 0
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * Math.max(p.camZ, 0.5);
    const halfW = halfH * this.aspect;
    const g = this.body.group;
    const s = Math.max(p.planetScale, 0.0001);
    g.scale.setScalar(s);
    g.position.set(
      p.camX + p.planetX * halfW + Math.sin(this.time * 0.13) * 0.02 * breathe,
      p.camY + p.planetY * halfH + Math.cos(this.time * 0.17) * 0.015 * breathe,
      0,
    );
    g.rotation.y = p.orbit;
    g.visible = p.planetVis > 0.01 && s > 0.001;
    this.body.atmoMat.uniforms.uOpacity.value = Math.min(1, p.planetVis);

    const c = this.companion.group;
    const cs = Math.max(p.compare, 0.0001) * (p.compareAbs > 0.5 ? 1 : s);
    c.visible = p.compare > 0.002;
    c.scale.setScalar(cs);
    const cd = Math.max(p.camZ - p.compareZ, 0.5);
    const cH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cd;
    const relY = g.position.y - s * 0.25;
    c.position.set(
      p.camX + p.compareX * cH * this.aspect,
      relY + (p.camY + p.compareY * cH - relY) * p.compareAbs,
      p.compareZ,
    );

    // light: azimuth around the planet + elevation
    this.light.set(Math.sin(p.lightA) * Math.cos(p.lightE), Math.sin(p.lightE), Math.cos(p.lightA) * Math.cos(p.lightE)).normalize();

    this.body.update(dt, this.time, this.reduced ? 12 : 2.2);
    if (c.visible) this.companion.update(dt, this.time, 4);

    // travel through the star field: scroll velocity bends into a gentle streak
    const vel = this.reduced ? 0 : Math.min(Math.abs(this.scrollVel) / 2600, 0.35);
    const warp = Math.min(1.2, p.warp + vel);
    this.travel += dt * (1.2 + warp * 260) * (this.reduced ? 0.15 : 1);
    const behind = Math.max(0.4, p.camZ + 0.5);
    this.layers.forEach((l, i) => {
      const u = l.material.uniforms;
      const dust = i === this.layers.length - 1;
      u.uTime.value = this.time;
      u.uWarp.value = dust ? 0 : warp;
      u.uCam.value.copy(cam.position);
      u.uTravel.value = this.travel;
      u.uMin.value = dust ? 0.3 : behind;
      u.uBright.value = l.userData.baseBright * p.bright * (dust ? Math.max(0, 1 - warp * 2.5) : 1);
    });
    this.sky.position.copy(cam.position);
    this.skyMat.uniforms.uBright.value = p.sky;
    this.skyMat.uniforms.uTravel.value = this.travel;

    // the distant star
    this.sunMat.uniforms.uOpacity.value = p.sun;
    this.sunMat.uniforms.uTime.value = this.time;
    this.sunMesh.visible = p.sun > 0.01;
    const sd = 200;
    const sh = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * sd;
    this.sunMesh.position.set(p.sunX * sh * this.aspect, p.sunY * sh, -sd);
    this.sunMesh.scale.setScalar(p.sunSize * (sd / 200));

    this.entryMat.uniforms.uEntry.value = p.entry;
    this.entryMat.uniforms.uTime.value = this.time;
    this.entryMat.uniforms.uTravel.value = this.travel * 0.004;
    this.entry.visible = p.entry > 0.003;
  }

  renderOnce() {
    this.update(1 / 60);
    this.renderer.render(this.scene, this.camera);
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export { TAU };
