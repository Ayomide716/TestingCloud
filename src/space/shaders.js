// GLSL for the Astrion space renderer.
// Every surface is procedural: no textures are downloaded, so the scene costs
// a few kilobytes and renders identically on every device.

export const noise = /* glsl */ `
// 3D simplex noise — Ashima Arts / Stefan Gustavson (MIT)
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p, int oct){
  float a=0.5, s=0.0;
  for(int i=0;i<7;i++){
    if(i>=oct) break;
    s+=a*snoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5;
  }
  return s;
}
`;

/* ------------------------------------------------------------------ stars */
// Instanced camera-facing quads. During warp each quad stretches along its
// screen-space direction from the centre, so stars streak like long exposures.
export const starVert = /* glsl */ `
attribute vec3 aPos;
attribute float aSize;
attribute vec3 aColor;
attribute float aPhase;
uniform float uTime;
uniform float uWarp;
uniform float uBright;
uniform vec2 uRes;
uniform float uPR;
uniform float uWrap;
uniform vec3 uCam;
uniform float uTravel;
uniform float uSizeMul;
uniform float uMin;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
void main(){
  // x/y stay in world space so camera drift produces true parallax;
  // z wraps around the camera so the field is endless in the direction of travel.
  float rz = mod(aPos.z - uCam.z + uTravel + uWrap, uWrap * 2.0) - uWrap;
  vec3 rel = vec3(aPos.xy, rz);
  vec3 world = vec3(aPos.xy, uCam.z + rz);
  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vec4 clip = projectionMatrix * mv;
  float depth = max(-mv.z, 0.05);
  vec2 ndc = clip.xy / max(clip.w, 0.0001);
  float raw = aSize * uSizeMul * (260.0 / depth);
  float px = clamp(raw, 1.5, 7.0) * uPR;
  float r = length(ndc);
  vec2 dir = normalize(ndc + vec2(0.00001, 0.00002));
  float stretch = uWarp * (12.0 + 520.0 * r) * clamp(70.0 / depth, 0.15, 3.0) * uPR;
  vec2 perp = vec2(dir.y, -dir.x); // keeps the quad's winding front-facing
  vec2 off = perp * position.x * px + dir * position.y * (px + stretch * 0.5) - dir * stretch * 0.5;
  clip.xy += off / uRes * 2.0 * clip.w;
  gl_Position = clip;
  vUv = position.xy;
  vColor = aColor;
  float tw = 0.78 + 0.22 * sin(uTime * (0.4 + aPhase * 1.6) + aPhase * 31.0);
  float edge = 1.0 - smoothstep(uWrap * 0.7, uWrap, abs(rel.z));
  float near = smoothstep(uMin, uMin * 1.4 + 0.5, depth);
  vAlpha = tw * uBright * edge * near * clamp(raw / 1.5, 0.12, 1.0) / (1.0 + stretch * 0.0035);
}
`;

export const starFrag = /* glsl */ `
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
void main(){
  float d = dot(vUv, vUv);
  float core = exp(-d * 5.0);
  float halo = exp(-d * 1.6) * 0.18;
  float a = (core + halo) * vAlpha;
  if (a < 0.002) discard;
  gl_FragColor = vec4(vColor * a, a);
}
`;

/* ----------------------------------------------------------------- planet */
export const planetVert = /* glsl */ `
uniform float uSpin;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;
void main(){
  float c = cos(uSpin), s = sin(uSpin);
  vObj = vec3(c * position.x + s * position.z, position.y, -s * position.x + c * position.z);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPosW = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const planetFrag = /* glsl */ `
${noise}
uniform vec3 uLight;
uniform vec3 uSun;
uniform float uTime;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec3 uColD;
uniform vec3 uAtmo;
uniform float uAtmoStr;
uniform float uGas;
uniform float uBand;
uniform float uOcean;
uniform float uCloud;
uniform float uCaps;
uniform float uStorm;
uniform float uSeed;
uniform int uOct;
uniform vec3 uRingN;
uniform float uRingIn;
uniform float uRingOut;
uniform float uRingShadow;
uniform vec3 uCenter;
uniform float uDim;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;
void main(){
  vec3 p = normalize(vObj);
  vec3 sp = p + uSeed;

  // gas giant: latitude bands sheared by turbulence
  float flow = fbm(sp * vec3(2.2, 7.0, 2.2) + vec3(uTime * 0.004, 0.0, 0.0), uOct);
  float lat = p.y + flow * 0.035 * (0.6 + uStorm);
  float band = sin(lat * uBand + snoise(vec3(lat * 6.0, uSeed, 0.0)) * 1.3);
  vec3 gas = mix(uColA, uColB, smoothstep(-0.85, 0.85, band));
  float fine = snoise(vec3(lat * 42.0, uSeed * 2.0, 0.0)) * 0.5 + snoise(vec3(lat * 110.0, uSeed, 1.0)) * 0.25;
  gas = mix(gas, uColC, smoothstep(0.05, 0.7, fine) * 0.4);
  float eddy = fbm(sp * vec3(5.0, 16.0, 5.0) + vec3(uTime * 0.006, 0.0, 0.0), 4);
  gas *= 0.94 + 0.1 * eddy * (0.4 + uStorm);
  vec3 spot = normalize(vec3(0.8, -0.36, 0.6));
  float sd = length((p - spot) * vec3(1.0, 2.1, 1.0)) + flow * 0.025;
  gas = mix(gas, uColC * 1.15, smoothstep(0.16, 0.07, sd) * uStorm);

  // rocky world: height field, optional ocean, polar caps
  float h = fbm(sp * 1.9, uOct) + fbm(sp * 8.0, 4) * 0.28;
  vec3 land = mix(uColA, uColB, smoothstep(-0.35, 0.45, h));
  land = mix(land, uColC, smoothstep(0.25, 0.75, fbm(sp * 4.5 + 4.0, 4)) * 0.6);
  float isLand = smoothstep(uOcean - 0.015, uOcean + 0.015, h);
  vec3 rock = mix(uColD * (0.8 + 0.4 * smoothstep(uOcean - 0.4, uOcean, h)), land, isLand);
  float cap = smoothstep(0.8, 0.88, abs(p.y) + fbm(sp * 5.0, 3) * 0.07) * uCaps;
  rock = mix(rock, vec3(0.86, 0.88, 0.9), cap);

  vec3 albedo = mix(rock, gas, uGas);
  // rocky worlds get weather systems; gas giants get high, wind-stretched streaks
  vec3 cq = mix(vec3(2.4, 5.0, 2.4), vec3(1.4, 22.0, 1.4), uGas);
  float cl = smoothstep(mix(0.05, 0.35, uGas), 0.6, fbm(sp * cq + vec3(uTime * 0.006, 0.0, 0.0), uOct)) * uCloud;
  albedo = mix(albedo, mix(vec3(0.93), uColC, uGas * 0.5), cl * 0.9);

  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uLight);
  vec3 V = normalize(cameraPosition - vPosW);
  float ndl = dot(N, L);
  float diff = smoothstep(-0.06, 0.6, ndl);

  // ring shadow cast onto the planet body // physical ring/planet shadow — taste-skill-ignore
  float shade = 1.0;
  if (uRingShadow > 0.0) {
    float denom = dot(L, uRingN);
    if (abs(denom) > 0.0001) {
      float t = dot(uCenter - vPosW, uRingN) / denom;
      if (t > 0.0) {
        float rr = length(vPosW + L * t - uCenter);
        float band = smoothstep(uRingIn, uRingIn + 0.08, rr) * (1.0 - smoothstep(uRingOut - 0.2, uRingOut, rr));
        shade = 1.0 - band * 0.55 * uRingShadow;
      }
    }
  }

  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 70.0) * (1.0 - isLand) * (1.0 - cl) * (1.0 - uGas) * step(0.0, ndl);
  vec3 col = albedo * diff * uSun * 1.02 * shade + spec * uSun * 0.7;
  float term = smoothstep(-0.18, 0.02, ndl) * (1.0 - smoothstep(0.02, 0.32, ndl));
  col += uAtmo * term * 0.22 * uAtmoStr;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  col += uAtmo * fres * smoothstep(-0.3, 0.7, ndl) * mix(1.1, 0.55, uGas) * uAtmoStr;
  col *= 1.0 - uDim * 0.95;
  col += albedo * 0.006;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/* ------------------------------------------------------------- atmosphere */
export const atmoVert = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPosW = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const atmoFrag = /* glsl */ `
uniform vec3 uLight;
uniform vec3 uAtmo;
uniform float uAtmoStr;
uniform float uOpacity;
uniform vec3 uCenter;
uniform float uRadius;
uniform float uDim;
varying vec3 vNormalW;
varying vec3 vPosW;
void main(){
  // How close does this view ray pass to the planet? 1.0 = grazing the surface.
  vec3 D = normalize(vPosW - cameraPosition);
  vec3 oc = uCenter - cameraPosition;
  float along = dot(oc, D);
  vec3 closest = cameraPosition + D * along;
  float h = length(closest - uCenter) / uRadius;
  if (h < 1.0 && along > 0.0) discard;
  float glow = exp(-(h - 1.0) * 46.0) * (1.0 - smoothstep(1.06, 1.085, h));
  vec3 n = normalize(closest - uCenter);
  vec3 L = normalize(uLight);
  float lit = smoothstep(-0.3, 0.6, dot(n, L));
  float forward = pow(max(dot(D, L), 0.0), 6.0) * 2.5;
  vec3 col = uAtmo * glow * (lit + forward * smoothstep(-0.6, 0.1, dot(n, L))) * uAtmoStr * uOpacity * 1.5 * (1.0 - uDim * 0.6);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/* ------------------------------------------------------------------ rings */
export const ringVert = /* glsl */ `
varying vec3 vPosW;
varying vec3 vLocal;
void main(){
  vLocal = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPosW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const ringFrag = /* glsl */ `
${noise}
uniform vec3 uLight;
uniform vec3 uSun;
uniform vec3 uCenter;
uniform float uRadius;
uniform float uInner;
uniform float uOuter;
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uOpacity;
uniform vec3 uNormal;
uniform float uDim;
varying vec3 vPosW;
varying vec3 vLocal;
void main(){
  float r = length(vLocal.xy);
  float t = (r - uInner) / (uOuter - uInner);
  if (t < 0.0 || t > 1.0) discard;
  float bands = 0.55 + 0.45 * snoise(vec3(t * 38.0, 0.3, 0.0)) * 0.6 + 0.25 * snoise(vec3(t * 140.0, 1.7, 0.0));
  float density = bands;
  density *= smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.9, 1.0, t));
  density *= 1.0 - (smoothstep(0.58, 0.6, t) - smoothstep(0.645, 0.665, t)) * 0.92; // the division
  density *= 1.0 - smoothstep(0.86, 0.9, t) * 0.35;
  vec3 L = normalize(uLight);
  vec3 oc = vPosW - uCenter;
  float b = dot(oc, L);
  float c = dot(oc, oc) - uRadius * uRadius;
  float shadow = (b < 0.0 && b * b - c > 0.0) ? 0.06 : 1.0; // physical ring/planet shadow — taste-skill-ignore
  float lit = 0.45 + 0.55 * abs(dot(normalize(uNormal), L));
  vec3 col = mix(uColA, uColB, smoothstep(0.1, 0.9, t + snoise(vec3(t * 9.0, 2.0, 0.0)) * 0.1));
  float a = clamp(density, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(col * uSun * lit * shadow * 1.15 * (1.0 - uDim * 0.94), a); // physical ring/planet shadow — taste-skill-ignore
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/* --------------------------------------------------------------- backdrop */
// A faint galactic band and dust lanes on a sphere that travels with the camera.
export const skyVert = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 w = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * w;
  gl_Position.z = gl_Position.w * 0.99999;
}
`;

export const skyFrag = /* glsl */ `
${noise}
uniform float uBright;
uniform vec3 uGalN;
uniform float uTravel;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float lat = dot(d, normalize(uGalN));
  float n = fbm(d * 2.6 + vec3(0.0, 0.0, uTravel * 0.0004), 4);
  float band = exp(-pow(lat + n * 0.06, 2.0) / 0.012);
  float lanes = smoothstep(0.05, 0.5, fbm(d * 9.0 + 3.0, 4));
  float glow = band * (0.5 + 0.5 * n) * (1.0 - lanes * 0.6);
  float haze = (0.5 + 0.5 * n) * 0.12;
  vec3 deep = vec3(0.006, 0.010, 0.022);
  vec3 dust = vec3(0.060, 0.052, 0.046);
  vec3 cool = vec3(0.026, 0.038, 0.062);
  vec3 col = deep * haze + mix(cool, dust, smoothstep(-0.2, 0.6, n)) * glow;
  gl_FragColor = vec4(col * uBright, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/* -------------------------------------------------------------------- sun */
export const sunFrag = /* glsl */ `
${noise}
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;
void main(){
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float ang = atan(p.y, p.x);
  float core = smoothstep(0.17, 0.162, r);
  float mu = sqrt(max(0.0, 1.0 - pow(r / 0.17, 2.0)));
  float gran = 0.9 + 0.1 * snoise(vec3(p * 70.0, uTime * 0.2)) + 0.05 * snoise(vec3(p * 14.0, 4.0));
  vec3 disc = mix(vec3(1.0, 0.55, 0.22), vec3(1.0, 0.93, 0.8), pow(mu, 0.6)) * (0.45 + 0.75 * mu) * gran;
  float rays = 0.5 + 0.5 * snoise(vec3(cos(ang) * 2.5, sin(ang) * 2.5, uTime * 0.05));
  float corona = exp(-(r - 0.15) * 7.0) * (0.55 + 0.45 * rays) * step(0.15, r);
  float halo = exp(-r * 2.4) * 0.35;
  vec3 col = uColor * (corona + halo) * (1.0 - core) + disc * core * 0.95;
  float a = clamp(core + corona + halo, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(col * uOpacity, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const quadVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/* ------------------------------------------------------------------ entry */
// Full-screen pass for the moment the camera falls into an atmosphere:
// cloud decks rush past along radial streamlines.
export const entryVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const entryFrag = /* glsl */ `
${noise}
uniform float uEntry;
uniform float uTime;
uniform float uTravel;
uniform vec3 uAtmo;
uniform vec3 uDeep;
uniform float uAspect;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float z = log(r + 0.04) * 1.6 - uTravel;
  float c1 = fbm(vec3(cos(a) * 1.4, sin(a) * 1.4, z), 5);
  float c2 = fbm(vec3(cos(a) * 3.0 + 7.0, sin(a) * 3.0, z * 1.7 + 3.0), 4);
  float clouds = smoothstep(-0.15, 0.6, c1 * 0.7 + c2 * 0.5);
  float tunnel = smoothstep(0.0, 0.9, r);
  vec3 sky = mix(uDeep, uAtmo * 0.42, 0.35 + 0.65 * smoothstep(0.2, 0.95, uEntry));
  vec3 col = mix(sky, mix(uAtmo * 0.8, vec3(0.9, 0.93, 1.0), 0.45), clouds * tunnel * 0.85);
  float alpha = smoothstep(0.0, 0.55, uEntry) * (0.55 + 0.45 * smoothstep(0.0, 0.5, uEntry) + clouds * 0.2);
  alpha = clamp(alpha, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`;
