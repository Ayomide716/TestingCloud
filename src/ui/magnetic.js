import { gsap } from 'gsap';

// Controls lean toward the pointer once it comes near, the label a little
// further than the body (a hint of depth), and spring back when it leaves.
// A soft light follows the pointer across the surface (--mx / --my).
export function magnetic(els) {
  const items = els.map((el) => ({
    el,
    label: el.querySelector('.btn__label'),
    near: false,
    strength: el.classList.contains('cell') ? 0.12 : 0.32,
  }));
  let px = -1e4, py = -1e4, queued = false;

  const frame = () => {
    queued = false;
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = px - cx, dy = py - cy;
      const reach = Math.max(r.width, r.height) * 0.5 + 56;
      const inside = Math.abs(dx) < reach && Math.abs(dy) < r.height / 2 + 48;
      if (inside) {
        it.near = true;
        const falloff = 1 - Math.min(1, Math.hypot(dx / reach, dy / (r.height / 2 + 48)) * 0.6);
        gsap.to(it.el, { x: dx * it.strength * falloff, y: dy * it.strength * falloff, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
        if (it.label) gsap.to(it.label, { x: dx * 0.12 * falloff, y: dy * 0.12 * falloff, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
        it.el.style.setProperty('--mx', `${px - r.left}px`);
        it.el.style.setProperty('--my', `${py - r.top}px`);
      } else if (it.near) {
        it.near = false;
        gsap.to(it.el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
        if (it.label) gsap.to(it.label, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
      }
    }
  };

  addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    if (!queued) { queued = true; requestAnimationFrame(frame); }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { px = py = -1e4; frame(); });
}
