// The scene as data: what is said, when, and where things are on the Earth.
// The same for every look. Looks change how it is drawn, never what happens.

export const DURATION = 20;

// Captions. *stars* mark the words a lesson would stress.
export const LINES = [
  { id: 'L01', at: 0.25, text: '*Warm water* is the fuel.' },
  { id: 'L02', at: 4.3, text: 'Above about *26 degrees*, the air over the ocean starts to rise.' },
  { id: 'L03', at: 8.7, tag: 'Your turn', text: 'Drag the storm to where you think it will form.' },
  { id: 'L04', at: 13.3, text: 'Not on the equator, though. There’s *no spin* there to start it turning.' },
];

// Beats, in seconds.
export const T = {
  spinEnd: 2.6,       // the globe settles with the Atlantic facing us
  sstIn: 1.3,         // sea temperature starts to bloom
  legendIn: 2.5,
  markIn: 5.0,        // the 26 degree marker lands
  updraft: [5.9, 8.5],
  zoom: [8.5, 10.1],  // push in on the tropical Atlantic
  dockIn: 9.0,        // the storm to drag appears
  fingerIn: 9.6,
  press: 10.3,
  dragEnd: 11.45,
  release: 11.6,
  fizzle: 12.5,       // the storm on the equator gives up
  slide: [14.3, 15.3],
  spinUp: [15.3, 16.6],
  travel: [16.4, 19.5],
  done: 19.0,         // Continue wakes up
};

// Where the camera rests: [longitude, latitude] at the centre of the disc.
export const VIEW = {
  start: [28, 6],
  globe: [-44, 14],
  close: [-46, 22],
  end: [-51, 27],
};

// The learner's wrong answer, and the right one.
export const GUESS = [-29, 0];
export const BIRTH = [-25, 12];

// A classic Cape Verde track: west across the Atlantic, then curving north.
export const TRACK = [
  [-25, 12], [-34, 13], [-44, 14.5], [-54, 16.5], [-62, 19.5], [-69, 23.5],
  [-73.5, 28], [-75, 32.5], [-73, 36.5], [-68, 40],
];

// Rising air shows up at these spots in the warm band.
export const UPDRAFTS = [
  [-38, 9], [-50, 14], [-23, 6], [-31, 16], [-59, 11], [-43, 2],
  [-66, 17], [-27, -5], [-15, -1], [-52, 5], [-36, -9], [-74, 14],
];

// Sea temperature, simplified to four nested bands for a northern late summer.
// Each band is the water warmer than `over`. Edges are latitudes at the base case,
// then pushed about by longitude: warm western sides, cool eastern sides.
export const BANDS = [
  { over: 20, north: 37, south: -33, pull: 0.6 },
  { over: 23, north: 29, south: -25, pull: 0.8 },
  { over: 26, north: 21, south: -17, pull: 1 },
  { over: 28, north: 13, south: null, pull: 0.5 },
];
// longitude, shift of the north edge, shift of the south edge, south edge of the hottest band
export const BAND_SHAPE = [
  [-180, 2, 0, -8], [-150, 0, 0, 2], [-120, -2, 8, 4], [-100, 2, 14, 5], [-85, 8, 12, 4],
  [-70, 9, 4, 3], [-55, 7, 0, 3], [-40, 3, -2, 3], [-25, -3, 4, 4], [-15, -5, 9, 5],
  [0, -4, 12, 6], [12, 0, 13, 6], [40, 0, 2, -6], [60, 3, 0, -8], [90, 2, -2, -9],
  [120, 4, -3, -10], [150, 3, -3, -10], [180, 2, 0, -8],
];
