// The camera path. Each keyframe pins a pose of the scene to a scroll position
// measured from the page itself, so the journey stays in step with the layout
// at every viewport size. Between keyframes the pose is eased (smootherstep);
// the renderer then adds its own inertia on top.

import { DEFAULT_POSE } from './space/space.js';

const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);

const top = (el) => el.getBoundingClientRect().top + scrollY;

export function buildJourney({ reduced = false } = {}) {
  const vh = innerHeight;
  const q = (s) => document.querySelector(s);
  const uni = q('.universe'), worlds = q('.worlds'), atlas = q('.atlas');
  const app = q('.approach'), imm = q('.immersion'), disc = q('.discover');
  const portrait = innerWidth / innerHeight < 0.9;
  const P = (desk, mob = {}) => (portrait ? { ...desk, ...mob } : desk);

  const wStart = top(worlds);
  const wLen = Math.max(1, worlds.offsetHeight - vh);
  const aStart = top(app);
  const aLen = Math.max(1, app.offsetHeight - vh);
  const iStart = top(imm);

  // In reduced motion the camera never dives: the planet holds still and the
  // atmosphere simply fades in.
  const dive = reduced
    ? [
      [aStart + aLen * 0.1, { camZ: 8, warp: 0 }],
      [aStart + aLen * 0.7, { camZ: 8, warp: 0, entry: 0 }],
      [aStart + aLen, { camZ: 8, entry: 1 }],
    ]
    : [
      [aStart + aLen * 0.1, { camZ: 8.6, warp: 0 }],
      [aStart + aLen * 0.42, { camZ: 3.4, warp: 0.95 }],
      [aStart + aLen * 0.66, { camZ: 1.38, warp: 0.4, entry: 0 }],
      [aStart + aLen * 0.84, { camZ: 1.1, warp: 0.08, entry: 0.85 }],
      [aStart + aLen, { camZ: 1.06, warp: 0, entry: 1 }],
    ];

  const raw = [
    [0, P({ ...DEFAULT_POSE, camZ: 6, planetX: 0.36, planetY: 0.12, planetScale: 1.5, lightA: -1.15, lightE: 0.32, orbit: 0, compareX: 0.02 },
      { camZ: 7, planetX: 0.12, planetY: 0.42, planetScale: 0.95 })],
    [top(uni) - vh * 0.1, P({ camZ: 7.5, planetX: 0.82, planetY: 0.46, planetScale: 0.8, lightA: -0.95, orbit: 0.35 },
      { planetX: 1.0, planetY: 0.78, planetScale: 0.55 })],
    [top(uni) + uni.offsetHeight * 0.55 - vh * 0.5, P({ planetX: 1.2, planetY: 0.6, planetScale: 0.5, bright: 1.2, sky: 1.25, orbit: 0.6 },
      { planetX: 1.4, planetY: 0.8, planetScale: 0.35 })],
    [wStart - vh * 0.35, P({ camZ: 6.5, planetX: 0.95, planetY: 0.1, planetScale: 0.85, lightA: -0.8, orbit: 0.8, bright: 1, sky: 1 },
      { planetX: 0.9, planetY: 0.5, planetScale: 0.6 })],
    [wStart, P({ planetX: 0.45, planetY: 0, planetScale: 1.1, lightA: -0.75, orbit: 0.9 },
      { planetX: 0.1, planetY: 0.45, planetScale: 0.78 })],
    [wStart + wLen * 0.3, P({ orbit: 2.3, lightA: -1.35, planetScale: 1.15 }, { planetScale: 0.8 })],
    [wStart + wLen * 0.36, P({ orbit: 2.4, planetScale: 1.05 }, { planetScale: 0.74 })],
    [wStart + wLen * 0.62, P({ orbit: 2.6, planetScale: 1.05, planetX: 0.45, compare: 0 }, { planetScale: 0.74, planetX: 0.1 })],
    [wStart + wLen * 0.72, P({ planetX: 0.58, planetScale: 1.45, lightA: -1.0, compare: 0, compareX: 0.04 },
      { planetX: 0.3, planetY: 0.42, planetScale: 1.0, compareX: -0.62 })],
    // Earth beside Jupiter at true relative size (12,742 km against 139,820 km)
    [wStart + wLen * 0.84, P({ compare: 0.0911 })],
    [wStart + wLen, P({ compare: 0.0911 })],
    [top(atlas) - vh * 0.35, P({ planetX: -0.42, planetY: 0, planetScale: 1.12, compare: 0, lightA: 0.95, lightE: 0.28, orbit: 2.9, camZ: 6.5 },
      { planetX: 0, planetY: 0.52, planetScale: 0.62 })],
    [top(atlas) + atlas.offsetHeight - vh * 0.85, P({ planetX: -0.42, planetY: 0, planetScale: 1.12 },
      { planetX: 0, planetY: 0.6, planetScale: 0.55 })],
    [aStart, P({ planetX: 0, planetY: 0, planetScale: 1, camZ: 9, lightA: 0.75, lightE: 0.25, bright: 1, warp: 0, orbit: 3.1 })],
    ...dive.map(([y, p]) => [y, p]),
    // inside the cloud deck the camera is quietly moved back out, unseen
    [aStart + aLen + vh * 0.55, P({ planetVis: 0, camZ: 6, entry: 1, warp: 0 })],
    [iStart + vh * 0.15, P({ entry: 0, bright: 0.55, sky: 0.5, planetVis: 0 })],
    [top(disc) - vh * 0.5, P({ bright: 0.85, sky: 0.8 })],
  ];

  raw.sort((a, b) => a[0] - b[0]);
  // carry every property forward so each keyframe is a complete pose
  const keys = [];
  let acc = { ...DEFAULT_POSE };
  for (const [y, p] of raw) {
    acc = { ...acc, ...p };
    keys.push({ y, pose: acc });
  }

  return {
    keys,
    worlds: { start: wStart, len: wLen },
    approach: { start: aStart, len: aLen },
    immersion: { start: iStart },
    atlasStart: top(atlas) - vh * 0.6,
  };
}

const out = {};
export function sampleJourney(j, y) {
  const k = j.keys;
  if (y <= k[0].y) return Object.assign(out, k[0].pose);
  for (let i = 1; i < k.length; i++) {
    if (y <= k[i].y) {
      const a = k[i - 1], b = k[i];
      const t = smoother((y - a.y) / Math.max(1, b.y - a.y));
      for (const key in b.pose) out[key] = a.pose[key] + (b.pose[key] - a.pose[key]) * t;
      return out;
    }
  }
  return Object.assign(out, k[k.length - 1].pose);
}

// Which world is on screen for a given scroll position.
export function worldAt(j, y, selected) {
  const { start, len } = j.worlds;
  if (y >= j.atlasStart) return selected;
  if (y < start + len * 0.33) return 'saturn';
  if (y < start + len * 0.44) return 'earth';
  if (y < start + len * 0.55) return 'mars';
  if (y < start + len * 0.66) return 'neptune';
  return 'jupiter';
}
