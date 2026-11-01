import '@fontsource-variable/tiktok-sans/standard.css';
import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Space, webglAvailable } from './space/space.js';
import { WORLDS } from './space/worlds.js';
import { buildJourney, sampleJourney, worldAt } from './journey.js';
import { splitWords, splitChars } from './ui/split.js';
import { magnetic } from './ui/magnetic.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
if (reduced) root.classList.add('reduced');

/* ------------------------------------------------------------- the scene */
let space = null;
if (webglAvailable()) {
  try {
    space = new Space($('#space'));
    space.setWorld('saturn', { instant: true });
    space.start();
  } catch (err) {
    console.warn('Astrion: WebGL unavailable, showing still frames instead.', err);
    space = null;
  }
}
if (!space) root.classList.add('no-webgl');

/* --------------------------------------------------------- smooth scroll */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    lenis.start(); // a menu link may fire while the open menu has scrolling paused
    lenis.scrollTo(target, { duration: id === '#approach' ? 2.4 : 1.8, easing: (x) => 1 - Math.pow(1 - x, 4) });
  }));
}

/* ---------------------------------------------------------------- state */
const state = {
  intro: !reduced && scrollY < 40,
  selected: 'neptune',
  journey: null,
  lastY: scrollY,
  shownWorld: 'saturn',
};

function rebuild() {
  state.journey = buildJourney({ reduced });
}

/* -------------------------------------------------------- frame driver */
const nav = $('[data-nav]');
const approach = $('.approach');
const phases = $$('.approach__phase');
const steps = $$('.step');
const meter = $('[data-meter]');
const stepWorld = $('[data-step-world]');
const enterSection = $('.enter');
let activeStep = 0;
let activePhase = 0;

gsap.ticker.add((time, deltaMs) => {
  const y = lenis ? lenis.animatedScroll : scrollY;
  const dt = Math.max(deltaMs / 1000, 1 / 240);
  const v = (y - state.lastY) / dt;
  state.lastY = y;
  const j = state.journey;
  if (!j) return;

  if (space) {
    space.scrollVel = space.scrollVel * 0.85 + v * 0.15;
    if (!state.intro) space.setPose(sampleJourney(j, y));
    const w = worldAt(j, y, state.selected);
    if (!state.intro && w !== state.shownWorld) {
      state.shownWorld = w;
      space.setWorld(w);
    }
  }

  // worlds: which step is on screen
  const wp = gsap.utils.clamp(0, 1, (y - j.worlds.start) / j.worlds.len);
  meter.style.transform = `scaleX(${wp})`;
  const step = wp < 0.33 ? 0 : wp < 0.66 ? 1 : 2;
  if (step !== activeStep) setStep(step);
  const sw = worldAt(j, y, state.selected);
  if (step === 1 && stepWorld.textContent !== WORLDS[sw].name) swapText(stepWorld, WORLDS[sw].name);

  // the approach: phases, and the interface stepping aside
  const ap = (y - j.approach.start) / j.approach.len;
  const phase = ap < 0.6 ? 0 : 1;
  if (phase !== activePhase) {
    activePhase = phase;
    phases.forEach((p, i) => p.classList.toggle('is-active', i === phase));
  }
  approach.classList.toggle('is-deep', ap > 0.6);
  const immersed = ap > 0.28 && y < j.immersion.start + innerHeight * 0.15;
  nav.classList.toggle('is-hidden', immersed && !state.intro);
  document.body.classList.toggle('is-immersed', immersed);
  nav.classList.toggle('is-solid', y > 40);

  // the ENTER band and the footer are opaque: once they fill the screen, stop drawing
  if (space) space.covered = enterSection.getBoundingClientRect().top <= 0;
});

function setStep(i) {
  const prev = steps[activeStep];
  const next = steps[i];
  const dir = i > activeStep ? 1 : -1;
  activeStep = i;
  steps.forEach((s) => s.classList.toggle('is-active', s === next));
  if (reduced) return;
  gsap.fromTo(prev.querySelector('.line__in'), { yPercent: 0 }, { yPercent: -110 * dir, duration: 0.7, ease: 'expo.in', overwrite: true,
    onComplete: () => gsap.set(prev.querySelector('.line__in'), { clearProps: 'transform' }) });
  gsap.fromTo(next.querySelector('.line__in'), { yPercent: 110 * dir }, { yPercent: 0, duration: 1.2, ease: 'expo.out', delay: 0.18, overwrite: true });
}

function swapText(el, text) {
  if (reduced) { el.textContent = text; return; }
  gsap.timeline()
    .to(el, { yPercent: -40, opacity: 0, duration: 0.25, ease: 'power2.in' })
    .add(() => { el.textContent = text; })
    .fromTo(el, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'expo.out' });
}

/* --------------------------------------------------------------- intro */
function runIntro() {
  const mark = $('[data-intro-word]');
  const navWord = $('[data-wordmark]');
  const heroLines = $$('[data-hero-line]');
  const heroFades = $$('[data-hero-fade]');
  const navBits = $$('.nav__link, .nav__cta');

  // once it has faded, the veil leaves the page so nothing sits over the text
  const veil = $('.veil');
  setTimeout(() => veil.classList.add('is-gone'), state.intro ? 2400 : 2000);

  if (!state.intro) {
    root.classList.add('is-loaded');
    $('.intro-mark').remove();
    return;
  }

  lenis?.stop();
  const chars = splitChars(mark);
  mark.classList.add('is-split');
  gsap.set(navWord, { opacity: 0 });
  gsap.set(heroLines, { yPercent: 110 });
  gsap.set(heroFades, { opacity: 0, y: 24 });
  gsap.set(navBits, { opacity: 0, y: -10 });
  gsap.set(chars, { opacity: 0, yPercent: 40, filter: 'blur(10px)' });

  if (space) {
    // out of the dark: the planet starts as a black disc with a lit rim
    space.setPose({ ...sampleJourney(state.journey, 0), lightA: 2.75, planetScale: 1.3, bright: 0, sky: 0 });
    space.jump();
    space.setPose({ bright: 1, sky: 1 });
  }

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.add(() => root.classList.add('is-loaded'), 0.15)
    .to(chars, { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 1.6, stagger: 0.075 }, 0.35);

  if (space) {
    const light = { a: 2.75, s: 1.3 };
    tl.to(light, {
      a: -1.15, s: 1.5, duration: 5.2, ease: 'power2.inOut',
      onUpdate: () => space.setPose({ lightA: light.a, planetScale: light.s }),
    }, 0.6);
  }

  // the wordmark travels from the centre of the screen into the navigation
  tl.add(() => {
    const from = mark.getBoundingClientRect();
    const to = navWord.getBoundingClientRect();
    const scale = to.height / from.height;
    gsap.to(mark, {
      x: to.left + to.width / 2 - (from.left + from.width / 2),
      y: to.top + to.height / 2 - (from.top + from.height / 2),
      scale, duration: 1.5, ease: 'expo.inOut',
      onComplete: () => { gsap.set(navWord, { opacity: 1 }); $('.intro-mark').remove(); },
    });
  }, 2.2)
    .to(heroLines, { yPercent: 0, duration: 1.8, stagger: 0.12 }, 2.75)
    .to(heroFades, { opacity: 1, y: 0, duration: 1.4, stagger: 0.1 }, 3.2)
    .to(navBits, { opacity: 1, y: 0, duration: 1.2, stagger: 0.06 }, 3.3)
    .add(() => lenis?.start(), 3.0)
    .add(() => { state.intro = false; }, 5.9);

  // a visitor in a hurry can scroll the intro away
  const skip = () => {
    if (!state.intro) return;
    tl.progress(1);
    state.intro = false;
    lenis?.start();
  };
  addEventListener('wheel', () => tl.time() > 1.2 && skip(), { once: true, passive: true });
  addEventListener('keydown', (e) => ['ArrowDown', 'PageDown', ' ', 'Tab'].includes(e.key) && skip(), { once: true });
  addEventListener('touchstart', () => tl.time() > 1.2 && skip(), { once: true, passive: true });
}

/* ------------------------------------------------------------- reveals */
function reveals() {
  $$('[data-split]').forEach((el) => {
    const words = splitWords(el);
    if (reduced) return;
    gsap.set(words, { yPercent: 110 });
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.06 }),
    });
  });

  if (!reduced) {
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09, delay: 0.15 }),
    });

    // line masks inside titles that are not split by word
    $$('.immersion__title .line__in').forEach((el, i) => {
      gsap.fromTo(el, { yPercent: 110 }, {
        yPercent: 0, duration: 1.5, ease: 'expo.out', delay: i * 0.12,
        scrollTrigger: { trigger: '.immersion', start: 'top 40%', once: true },
      });
    });
  }

  // The title owns the screen until the first picture arrives, then steps back
  // into the dark so text and picture never sit on top of each other.
  gsap.fromTo('.immersion__title', { opacity: 1, scale: 1, yPercent: 0 }, {
    opacity: 0, scale: reduced ? 1 : 0.94, yPercent: reduced ? 0 : -8, ease: 'none',
    scrollTrigger: { trigger: '.immersion__reel', start: 'top 92%', end: 'top 52%', scrub: true },
  });
}

/* ------------------------------------------------------ scroll-linked moves */
function scrollMoves() {
  if (reduced) return;
  // the hero leaves at different speeds, as if each line sat at its own depth
  const lines = $$('[data-hero-line]');
  lines.forEach((l, i) => {
    gsap.to(l.parentElement, { yPercent: -60 - i * 45, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  });
  gsap.to('.hero__foot', { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '60% top', scrub: true } });

  // the title drifts as one piece, a little slower than the page
  gsap.fromTo('.universe__title', { y: 40 }, { y: -40, ease: 'none', scrollTrigger: { trigger: '.universe__title', start: 'top bottom', end: 'bottom top', scrub: true } });

  const pan = $('[data-pan]');
  gsap.fromTo('.panorama__frame', { clipPath: 'inset(10% 6% 10% 6%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: '.panorama', start: 'top 95%', end: 'top 30%', scrub: true } });
  gsap.fromTo(pan, { scale: 1.22 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.panorama', start: 'top bottom', end: 'bottom top', scrub: true } });

  $$('.moment').forEach((m) => {
    const frame = m.querySelector('.moment__frame');
    const img = frame.querySelector('img');
    gsap.fromTo(frame, { clipPath: 'inset(16% 12% 16% 12%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: m, start: 'top 98%', end: 'top 40%', scrub: true } });
    gsap.fromTo(img, { yPercent: -10, scale: 1.12 }, { yPercent: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from(m.querySelectorAll('h3, p'), { opacity: 0, y: 24, duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: m, start: 'top 55%', once: true } });
  });

  gsap.fromTo('[data-plate]', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.discover', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.discover__actions .cell', { y: 28, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.discover__actions', start: 'top 92%', once: true } });

  const letters = $$('.enter__word span');
  gsap.from(letters, { yPercent: 100, duration: 1.6, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: '.enter', start: 'top 70%', once: true } });
  gsap.fromTo('.footer__word', { xPercent: 8 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'top 30%', scrub: true } });
}

/* --------------------------------------------- the enter band leans toward you */
function enterBand() {
  if (reduced || coarse) return;
  const band = $('[data-enter]');
  const letters = $$('.enter__word span', band);
  const setters = letters.map((l) => gsap.quickTo(l, 'y', { duration: 0.9, ease: 'expo.out' }));
  band.addEventListener('pointermove', (e) => {
    const r = band.getBoundingClientRect();
    letters.forEach((l, i) => {
      const lr = l.getBoundingClientRect();
      const d = Math.abs(e.clientX - (lr.left + lr.width / 2)) / r.width;
      const lift = 1 - gsap.utils.clamp(0, 1, d / 0.32);
      setters[i](-lift * lift * lr.height * 0.12);
    });
  });
  band.addEventListener('pointerleave', () => setters.forEach((s) => s(0)));
}

/* ---------------------------------------------------- the atlas (live thing) */
/* ---------------------------------------- drag the planet to turn it */
function spinDrag() {
  const area = $('[data-spin]');
  if (!space || !area) return;
  let id = null, lastX = 0, lastT = 0, vel = 0;
  area.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    id = e.pointerId; lastX = e.clientX; lastT = performance.now(); vel = 0;
    area.setPointerCapture(id);
    area.classList.add('is-dragging');
  });
  area.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    const now = performance.now();
    const rad = ((e.clientX - lastX) / area.clientWidth) * Math.PI * 1.4;
    space.spinBy(rad);
    space.fling(0);
    vel = vel * 0.6 + (rad / Math.max((now - lastT) / 1000, 1 / 240)) * 0.4;
    lastX = e.clientX; lastT = now;
    if (Math.abs(rad) > 0.02) area.classList.add('has-dragged');
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    area.classList.remove('is-dragging');
    // a still release should not fling
    if (performance.now() - lastT < 80) space.fling(reduced ? 0 : vel);
  };
  area.addEventListener('pointerup', end);
  area.addEventListener('pointercancel', end);
  area.addEventListener('lostpointercapture', (e) => { if (e.pointerId === id) end(e); });
}

/* -------------------------------------------------------- phone menu */
function phoneMenu() {
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-menu]');
  const links = $$('a', menu);
  let open = false;
  const set = (v, { focus = true } = {}) => {
    open = v;
    clearTimeout(menu._t);
    if (v) {
      menu.hidden = false;
      void menu.offsetWidth; // let the closed state paint first so the fade runs
      menu.classList.add('is-open');
    } else {
      menu.classList.remove('is-open');
      menu._t = setTimeout(() => { menu.hidden = true; }, reduced ? 0 : 500);
    }
    toggle.setAttribute('aria-expanded', String(v));
    toggle.textContent = v ? 'Close' : 'Menu';
    $('main').inert = v;
    $('.footer').inert = v;
    if (v) { lenis?.stop(); if (focus) links[0].focus(); }
    else { lenis?.start(); if (focus) toggle.focus(); }
  };
  set(false, { focus: false });
  toggle.addEventListener('click', () => set(!open));
  links.forEach((a) => a.addEventListener('click', () => set(false, { focus: false })));
  addEventListener('keydown', (e) => { if (open && e.key === 'Escape') set(false); });
  matchMedia('(min-width: 721px)').addEventListener('change', (m) => { if (m.matches && open) set(false, { focus: false }); });
}

function atlas() {
  const tabs = $$('.atlas__tab');
  const panel = $('#atlas-facts');
  const select = (id, focus = false) => {
    if (id === state.selected) return;
    state.selected = id;
    const w = WORLDS[id];
    tabs.forEach((t) => {
      const on = t.dataset.world === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) {
        panel.setAttribute('aria-labelledby', t.id);
        if (focus) t.focus();
      }
    });
    $$('[data-fact]').forEach((el) => {
      const key = el.dataset.fact;
      const text = key === 'name' ? w.name : key === 'line' ? w.line : w.facts[key];
      if (el.closest('.atlas__facts') && !reduced) swapText(el, text);
      else el.textContent = text;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.world));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        select(tabs[e.key === 'Home' ? 0 : tabs.length - 1].dataset.world, true);
      } else if (k) {
        e.preventDefault();
        select(tabs[(i + k + tabs.length) % tabs.length].dataset.world, true);
      }
    });
  });
}

/* --------------------------------------------------------------- discover */
const TOPICS = {
  planets: 'From the rocky inner worlds to the ice giants at the very edge of the Sun’s light.',
  moons: 'Europa’s cracked ice shell, the methane lakes of Titan, the hundreds of volcanoes on Io.',
  stars: 'Red dwarfs, blue supergiants and the clouds of gas where new suns are still forming.',
};
function discover() {
  const tabs = $$('.discover__tabs [role="tab"]');
  const text = $('[data-topic-text]');
  const panel = $('#d-panel');
  const select = (t, focus) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', t.id);
    if (focus) t.focus();
    text.classList.add('is-swapping');
    setTimeout(() => { text.textContent = TOPICS[t.dataset.topic]; text.classList.remove('is-swapping'); }, reduced ? 0 : 260);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true); }
    });
  });

  // a small moon keeps its orbit around the plate
  const moon = $('.discover__moon');
  const tilt = (-18 * Math.PI) / 180;
  let a = 0.6;
  const place = () => {
    const x = 46 * Math.cos(a), yv = 17 * Math.sin(a);
    moon.setAttribute('cx', (50 + x * Math.cos(tilt) - yv * Math.sin(tilt)).toFixed(2));
    moon.setAttribute('cy', (50 + x * Math.sin(tilt) + yv * Math.cos(tilt)).toFixed(2));
    moon.style.opacity = Math.sin(a) < 0 && Math.abs(x) < 26 ? '0.25' : '1';
  };
  place();
  if (!reduced) gsap.ticker.add((t, d) => { a += (d / 1000) * 0.32; place(); });
}

/* ------------------------------------------------------------ navigation */
function navCurrent() {
  const map = [['#explore', ['.universe', '.worlds', '.atlas']], ['#experience', ['.approach', '.immersion']], ['#discover', ['.discover']]];
  map.forEach(([href, sections]) => {
    const link = $(`.nav__link[href="${href}"]`);
    sections.forEach((s) => ScrollTrigger.create({
      trigger: s, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => {
        if (self.isActive) $$('.nav__link').forEach((l) => l.classList.toggle('is-current', l === link));
        else if (!$$('.nav__link.is-current').length) link.classList.remove('is-current');
      },
    }));
  });
  ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom 50%', onEnter: () => $$('.nav__link').forEach((l) => l.classList.remove('is-current')), onEnterBack: () => $$('.nav__link').forEach((l) => l.classList.remove('is-current')) });
}

/* -------------------------------------- big words fill their measure */
function fitWords() {
  $$('.enter__word, .footer__word').forEach((el) => {
    const box = el.classList.contains('enter__word') ? el.parentElement.clientWidth : el.parentElement.clientWidth;
    const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--margin')) || 24;
    const target = box - pad * 2;
    el.style.fontSize = '100px';
    el.style.display = el.classList.contains('enter__word') ? 'flex' : 'block';
    el.style.width = 'max-content';
    const w = el.getBoundingClientRect().width;
    el.style.width = '';
    el.style.fontSize = `${Math.floor((100 * target) / w * 0.995)}px`;
  });
}

/* ------------------------------------------------------------------ boot */
fitWords();
rebuild();
reveals();
scrollMoves();
atlas();
discover();
enterBand();
navCurrent();
spinDrag();
phoneMenu();
if (!coarse && !reduced) magnetic($$('.magnetic'));
runIntro();
if (import.meta.env.DEV) window.__astrion = { lenis, space, state };

const refresh = () => { fitWords(); rebuild(); ScrollTrigger.refresh(); };
let rt;
new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(refresh, 120); }).observe(document.body);
document.fonts?.ready.then(refresh);
addEventListener('load', refresh);
