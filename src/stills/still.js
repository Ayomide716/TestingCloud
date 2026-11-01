// Dev-only page used by scripts/render-stills.mjs to photograph the renderer.
import { Space } from '../space/space.js';
import { SHOTS } from './shots.js';

const params = new URLSearchParams(location.search);
const shot = SHOTS[params.get('shot')] || SHOTS.test;
const canvas = document.getElementById('c');
canvas.width = shot.w;
canvas.height = shot.h;
const space = new Space(canvas, { tier: 'high', still: true });
space.reduced = true;
space.setWorld(shot.world, { instant: true });
if (shot.look) {
  space.body.setLook({ ...space.body.target, ...shot.look }, { instant: true });
}
if (shot.companion) space.setCompanion(shot.companion);
space.setPose(shot.pose);
if (shot.sunLight) {
  // aim the light from the drawn star: camera looks down -z
  const p = space.target;
  const t = Math.tan((space.camera.fov * Math.PI) / 360);
  const dx = p.sunX * t * (shot.w / shot.h), dy = p.sunY * t, dz = -1;
  const len = Math.hypot(dx, dy, dz);
  space.setPose({ lightA: Math.atan2(dx / len, dz / len), lightE: Math.asin(dy / len) });
}
space.jump();
space.body.spin = shot.spin ?? 0;
space.time = shot.time ?? 12;
space.travel = 40;
for (let i = 0; i < 3; i++) space.renderOnce();
window.space = space;
window.__ready = true;
