// The worlds Astrion renders, with their real figures.
// Colours are art-directed approximations of each planet's true appearance.
// Figures: NASA planetary fact sheets (mean values).

export const WORLDS = {
  earth: {
    name: 'Earth',
    look: {
      gas: 0, band: 0, ocean: 0.04, cloud: 0.8, caps: 1, storm: 0, seed: 3.1,
      colA: '#4f5f34', colB: '#9a8458', colC: '#c9c1ad', colD: '#08254a',
      atmo: '#4e8cff', atmoStr: 1.0, tilt: 0.41, rings: 0, spin: 0.05,
    },
    facts: {
      distance: '1.00 AU', diameter: '12,742 km', day: '23 h 56 min',
      gravity: '1.00 g', light: '8 min 19 s',
    },
    line: 'Home: seventy-one percent ocean, under an atmosphere that is, by comparison, thinner than the skin of an apple.',
  },
  mars: {
    name: 'Mars',
    look: {
      gas: 0, band: 0, ocean: -2, cloud: 0.05, caps: 0.7, storm: 0, seed: 7.4,
      colA: '#5e2716', colB: '#a9552f', colC: '#d39465', colD: '#5e2716',
      atmo: '#e0915f', atmoStr: 0.45, tilt: 0.44, rings: 0, spin: 0.045,
    },
    facts: {
      distance: '1.52 AU', diameter: '6,779 km', day: '24 h 37 min',
      gravity: '0.38 g', light: '12 min 40 s',
    },
    line: 'Rust plains, a canyon as long as a continent and a volcano two and a half times the height of Everest.',
  },
  jupiter: {
    name: 'Jupiter',
    look: {
      gas: 1, band: 15, ocean: -2, cloud: 0, caps: 0, storm: 1, seed: 1.3,
      colA: '#a8754c', colB: '#ede0c4', colC: '#9c4a2a', colD: '#000000',
      atmo: '#e9c99b', atmoStr: 0.35, tilt: 0.06, rings: 0, spin: 0.12,
    },
    facts: {
      distance: '5.20 AU', diameter: '139,820 km', day: '9 h 56 min',
      gravity: '2.53 g', light: '43 min',
    },
    line: 'A storm wider than Earth has turned in its southern clouds for at least 190 years.',
  },
  saturn: {
    name: 'Saturn',
    look: {
      gas: 1, band: 9, ocean: -2, cloud: 0, caps: 0, storm: 0, seed: 5.7,
      colA: '#bb955f', colB: '#ead8b0', colC: '#8f7148', colD: '#000000',
      atmo: '#f0d6a3', atmoStr: 0.3, tilt: 0.47, rings: 1, spin: 0.1,
    },
    facts: {
      distance: '9.58 AU', diameter: '116,460 km', day: '10 h 34 min',
      gravity: '1.07 g', light: '1 h 20 min',
    },
    line: 'Rings 270,000 km across and, in most places, no thicker than a ten-storey building.',
  },
  neptune: {
    name: 'Neptune',
    look: {
      gas: 1, band: 6, ocean: -2, cloud: 0.12, caps: 0, storm: 0, seed: 9.2,
      colA: '#1a3a95', colB: '#3a6fd4', colC: '#9fc0ff', colD: '#000000',
      atmo: '#5f9bff', atmoStr: 0.95, tilt: 0.49, rings: 0, spin: 0.08,
    },
    facts: {
      distance: '30.07 AU', diameter: '49,244 km', day: '16 h 6 min',
      gravity: '1.14 g', light: '4 h 10 min',
    },
    line: 'The windiest world we know: frozen methane clouds driven at over 2,000 km/h.',
  },
};

// Not in the atlas: a small grey moon for the stills.
export const MOON = {
  name: 'Phobos',
  look: {
    gas: 0, band: 0, ocean: -2, cloud: 0, caps: 0, storm: 0, seed: 4.4, tilt: 0,
    colA: '#3f3a36', colB: '#77706a', colC: '#9c958d', colD: '#3f3a36',
    atmo: '#000000', atmoStr: 0, rings: 0, spin: 0.02,
  },
};

export const WORLD_ORDER = ['earth', 'mars', 'jupiter', 'saturn', 'neptune'];
