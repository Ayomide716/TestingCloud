import { createServer } from 'vite';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const server = await createServer({ server: { port: 5198 }, logLevel: 'error' });
await server.listen();
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 500 } });
p.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 600)));
await p.goto('http://localhost:5198/still.html?shot=dbg');
await p.waitForFunction('window.__ready===true');
await p.evaluate(() => { const m = space.layers[0].material; m.fragmentShader = 'void main(){ gl_FragColor = vec4(1.,0.,0.,1.); }'; m.vertexShader = m.vertexShader.replace(/vec2 off = [^;]*;/, 'vec2 off = __EXPR__;'); m.blending = 1; m.transparent=false; m.needsUpdate = true; space.renderOnce(); });
await p.locator('canvas').screenshot({ path: process.argv[2] });
console.log(await p.evaluate(() => {
  const g = space.layers[0].geometry; const a = g.getAttribute('aPos'); const out=[]; for (let i=0;i<5;i++){ out.push([a.getX(i),a.getY(i),a.getZ(i)].map(v=>v.toFixed(1)).join(',')); }
  space.sky.visible=false; space.renderer.info.autoReset=false; space.renderer.info.reset(); space.renderOnce(); const px = new Uint8Array(4*800*500); const gl = space.renderer.getContext(); gl.readPixels(0,0,800,500,gl.RGBA,gl.UNSIGNED_BYTE,px); let lit=0; for(let i=0;i<px.length;i+=4) if(px[i]>10) lit++;
  return JSON.stringify({lit, tri: space.renderer.info.render.triangles, calls: space.renderer.info.render.calls, out, pos: g.getAttribute('position').count, idx: g.index && g.index.count, attrs: Object.keys(g.attributes), camM: space.camera.matrixWorldInverse.elements.map(v=>+v.toFixed(2))});
  const l = space.layers[0]; const u = l.material.uniforms;
  const info = space.renderer.info;
  return JSON.stringify({ res: u.uRes.value, pr: u.uPR.value, cam: u.uCam.value, travel: u.uTravel.value, min: u.uMin.value, bright: u.uBright.value, vis: l.visible, calls: info.render.calls, cnt: l.geometry.instanceCount, prog: info.programs.length });
}));
await b.close(); await server.close();
