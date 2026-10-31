# Astrion — Explore Beyond

Landing page for Astrion, an immersive space exploration experience. The page is itself the first journey: one continuous scene rendered in WebGL behind the content. The camera drifts past a ringed giant, travels through the star field and lets you pick a world. Then it dives into that world's atmosphere.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the build
```

## How it is built

| Part | Where |
| --- | --- |
| Renderer (Three.js, custom shaders): instanced star field with warp streaks, procedural planets, rings with shadows, limb-hugging atmospheres, atmosphere-entry pass, a star | `src/space/` |
| The worlds and their real figures (NASA fact sheets) | `src/space/worlds.js` |
| Camera path: scroll positions measured from the layout, eased between keyframes | `src/journey.js` |
| Page motion: Lenis smooth scroll, GSAP ScrollTrigger reveals, magnetic controls | `src/main.js`, `src/ui/` |
| Styles (one family, TikTok Sans variable, self-hosted) | `src/styles.css` |

Every picture on the page is rendered by the same engine. `npm run stills` re-photographs them into `public/stills/` from the compositions in `src/stills/shots.js`, using a headless browser through `still.html`, which is dev-only. `scripts/shoot.mjs` photographs the whole scroll journey at any viewport, for review.

## Performance and accessibility

- A quality tier is picked per device: star count, sphere detail, noise octaves and pixel-ratio cap. Resolution drops automatically if the frame rate falls below about 45 fps.
- Rendering pauses when the tab is hidden. Without WebGL, the page shows a rendered still instead.
- With `prefers-reduced-motion`, smooth scrolling, the intro, warp streaks and the dive are turned off. The atmosphere crossfades instead, and all content shows immediately.
- The world selector and the Discover tabs are real tablists, operable with the arrow keys.

## Before launch

- **Enter Astrion button:** "Enter Astrion" and the ENTER band point at `#enter` and need the real product URL.
