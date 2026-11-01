// Compositions photographed from the renderer by scripts/render-stills.mjs.
// `sunLight` aims the light from the visible star so lighting and sun agree.
export const SHOTS = {
  test: { w: 1440, h: 900, world: 'saturn', pose: { camZ: 6, planetX: 0.36, planetY: 0.12, planetScale: 1.5, lightA: -1.15, lightE: 0.32 } },
  hero: { w: 1600, h: 1000, world: 'saturn', spin: 1.2, pose: { camZ: 6, planetX: 0.36, planetY: 0.12, planetScale: 1.5, lightA: -1.15, lightE: 0.32 } },
  panorama: {
    w: 2400, h: 1028, world: 'mars', spin: 2.0,
    pose: { camZ: 6, planetX: -0.62, planetY: -0.62, planetScale: 0.42, lightA: 2.35, lightE: 0.15, bright: 1.9, sky: 3.4 },
  },
  atmosphere: {
    w: 1200, h: 1500, world: 'earth', spin: 2.4, sunLight: true,
    pose: { camZ: 1.25, planetX: 0, planetY: -2.25, planetScale: 1, sun: 1, sunX: 0.28, sunY: 0.14, sunSize: 24, bright: 0.7, sky: 0.8 },
  },
  giant: {
    w: 1200, h: 1500, world: 'jupiter', spin: 0.8,
    pose: { camZ: 3.1, planetX: 0.22, planetY: 0.04, planetScale: 1.18, lightA: -0.95, lightE: 0.18 },
  },
  surface: {
    w: 1200, h: 1500, world: 'mars', spin: 0.7, companion: 'moon', look: { caps: 0, tilt: 1.35 },
    pose: {
      camZ: 0.42, planetX: 0, planetY: -5.4, planetScale: 1,
      lightA: -0.55, lightE: 0.45, bright: 0.9, sky: 1.4,
      compare: 0.9, compareX: 0.35, compareY: 0.42, compareZ: -40, compareAbs: 1,
    },
  },
  star: {
    w: 1200, h: 1500, world: 'neptune', spin: 0.3, sunLight: true,
    pose: { camZ: 6, planetX: 0.09, planetY: 0.13, planetScale: 0.12, sun: 1, sunX: 0.05, sunY: 0.1, sunSize: 110, bright: 0.6, sky: 0.8 },
  },
  rings: {
    w: 1200, h: 1500, world: 'saturn', spin: 0.4,
    pose: { camZ: 3.4, camY: 0.22, planetX: 0.42, planetY: 0.28, planetScale: 0.95, lightA: -1.25, lightE: 0.3, orbit: 0.9 },
  },
  plate: {
    w: 1400, h: 1400, world: 'saturn', spin: 0.8,
    pose: { camZ: 6.5, camY: 1.3, planetX: 0, planetY: -0.05, planetScale: 1.05, lightA: -1.3, lightE: 0.35, orbit: 0.45 },
  },
};
