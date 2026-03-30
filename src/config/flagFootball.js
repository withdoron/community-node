/**
 * Flag Football — Sport Config
 * Drives the Play Builder, renderer, and all team sport logic.
 * Never hardcode football terms in components — read from this config.
 */

// ——— Field ———
const field = {
  svgTemplate: 'flag_football',
  aspectRatio: '2:1',
  viewBox: '0 0 400 200',
  colors: {
    field: '#2d5a27',
    endZone: '#1e4620',
    lines: '#ffffff',
    scrimmage: '#d4a046',
  },
  yardLines: 6,
  fieldLength: 60,
};

// ——— Formats & Positions ———
const formats = {
  '5v5': {
    playerCount: 5,
    positions: [
      { id: 'C', label: 'Center', shortLabel: 'C', color: '#94a3b8' },
      { id: 'QB', label: 'Quarterback', shortLabel: 'QB', color: '#d4a046' },
      { id: 'RB', label: 'Running Back', shortLabel: 'RB', color: '#22c55e' },
      { id: 'X', label: 'Left Receiver', shortLabel: 'X', color: '#3b82f6' },
      { id: 'Z', label: 'Right Receiver', shortLabel: 'Z', color: '#ef4444' },
    ],
    defense_positions: [
      { id: 'CB1', label: 'Cornerback 1', shortLabel: 'CB1', color: '#ef4444' },
      { id: 'CB2', label: 'Cornerback 2', shortLabel: 'CB2', color: '#f97316' },
      { id: 'S',   label: 'Safety',       shortLabel: 'S',   color: '#eab308' },
      { id: 'LB',  label: 'Linebacker',   shortLabel: 'LB',  color: '#22c55e' },
      { id: 'R',   label: 'Rusher',       shortLabel: 'R',   color: '#3b82f6' },
    ],
  },
  '7v7': {
    playerCount: 7,
    positions: [
      { id: 'C', label: 'Center', shortLabel: 'C', color: '#94a3b8' },
      { id: 'QB', label: 'Quarterback', shortLabel: 'QB', color: '#d4a046' },
      { id: 'RB', label: 'Running Back', shortLabel: 'RB', color: '#22c55e' },
      { id: 'X', label: 'Left Receiver', shortLabel: 'X', color: '#3b82f6' },
      { id: 'Z', label: 'Right Receiver', shortLabel: 'Z', color: '#ef4444' },
      { id: 'Y', label: 'Slot Receiver', shortLabel: 'Y', color: '#a855f7' },
      { id: 'TE', label: 'Tight End', shortLabel: 'TE', color: '#f97316' },
    ],
    defense_positions: [
      { id: 'CB1', label: 'Cornerback 1', shortLabel: 'CB1', color: '#ef4444' },
      { id: 'CB2', label: 'Cornerback 2', shortLabel: 'CB2', color: '#f97316' },
      { id: 'S',   label: 'Safety',       shortLabel: 'S',   color: '#eab308' },
      { id: 'LB',  label: 'Linebacker',   shortLabel: 'LB',  color: '#22c55e' },
      { id: 'R',   label: 'Rusher',       shortLabel: 'R',   color: '#3b82f6' },
      { id: 'NB',  label: 'Nickelback',   shortLabel: 'NB',  color: '#a855f7' },
      { id: 'DE',  label: 'Defensive End', shortLabel: 'DE', color: '#ec4899' },
    ],
  },
};

// ——— Formations ———
const formations = {
  offense: {
    spread: {
      label: 'Spread',
      description: 'Receivers split wide, RB behind QB',
      defaults: {
        C:  { x: 50, y: 55 },
        QB: { x: 50, y: 62 },
        RB: { x: 50, y: 70 },
        X:  { x: 10, y: 55 },
        Z:  { x: 90, y: 55 },
        Y:  { x: 30, y: 55 },
        TE: { x: 70, y: 55 },
      },
    },
    trips: {
      label: 'Trips',
      description: 'Three receivers stacked on one side',
      defaults: {
        C:  { x: 50, y: 55 },
        QB: { x: 50, y: 62 },
        RB: { x: 35, y: 70 },
        X:  { x: 10, y: 55 },
        Z:  { x: 75, y: 55 },
        Y:  { x: 80, y: 52 },
        TE: { x: 85, y: 55 },
      },
    },
    twins: {
      label: 'Twins',
      description: 'Two receivers paired on each side',
      defaults: {
        C:  { x: 50, y: 55 },
        QB: { x: 50, y: 62 },
        RB: { x: 50, y: 70 },
        X:  { x: 15, y: 55 },
        Z:  { x: 85, y: 55 },
        Y:  { x: 25, y: 52 },
        TE: { x: 75, y: 52 },
      },
    },
    bunch: {
      label: 'Bunch',
      description: 'Receivers clustered tight on one side',
      defaults: {
        C:  { x: 50, y: 55 },
        QB: { x: 50, y: 62 },
        RB: { x: 35, y: 70 },
        X:  { x: 10, y: 55 },
        Z:  { x: 72, y: 55 },
        Y:  { x: 75, y: 52 },
        TE: { x: 78, y: 55 },
      },
    },
  },
  defense: {
    man_to_man: {
      label: 'Man-to-Man',
      description: 'Each defender covers one offensive player, one rusher',
      coverage: 'man',
      defaults: {
        CB1: { x: 20, y: 45 },
        CB2: { x: 80, y: 45 },
        S:   { x: 50, y: 35 },
        LB:  { x: 40, y: 42 },
        R:   { x: 55, y: 48 },
      },
    },
    cover_1: {
      label: 'Cover 1',
      description: 'Three man-coverage, one deep safety, one rusher',
      coverage: 'man',
      defaults: {
        CB1: { x: 15, y: 45 },
        CB2: { x: 85, y: 45 },
        S:   { x: 50, y: 25 },
        LB:  { x: 50, y: 42 },
        R:   { x: 55, y: 48 },
      },
    },
    cover_2: {
      label: 'Cover 2',
      description: 'Two cornerbacks wide, two safeties deep, one rusher',
      coverage: 'zone',
      defaults: {
        CB1: { x: 15, y: 40 },
        CB2: { x: 85, y: 40 },
        S:   { x: 35, y: 25 },
        LB:  { x: 65, y: 25 },
        R:   { x: 50, y: 48 },
      },
    },
    cover_3: {
      label: 'Cover 3',
      description: 'Five zones — two mid, three deep thirds. No rusher.',
      coverage: 'zone',
      defaults: {
        CB1: { x: 25, y: 38 },
        CB2: { x: 75, y: 38 },
        S:   { x: 50, y: 20 },
        LB:  { x: 20, y: 20 },
        R:   { x: 80, y: 20 },
      },
    },
    blitz: {
      label: 'Blitz',
      description: 'Two rushers, three man-coverage defenders',
      coverage: 'man',
      defaults: {
        CB1: { x: 20, y: 45 },
        CB2: { x: 80, y: 45 },
        S:   { x: 50, y: 35 },
        LB:  { x: 40, y: 48 },
        R:   { x: 55, y: 48 },
      },
    },
  },
};

// ——— Route Templates ———
// fieldSide: 'left' (x < 50), 'right' (x > 50), 'center' (x === 50)
// "toward center" = right from left side, left from right side
// "toward sideline" = left from left side, right from right side
// Y axis: lower Y = further upfield (offense faces up). ~2.5 units per yard.
function getFieldSide(startX) {
  if (startX < 45) return 'left';
  if (startX > 55) return 'right';
  return 'center';
}

function centerDir(fieldSide) {
  if (fieldSide === 'left') return 1;   // positive X = toward center
  if (fieldSide === 'right') return -1; // negative X = toward center
  return 1; // center default: cut right
}

function sidelineDir(fieldSide) {
  return -centerDir(fieldSide);
}

// Clamp coordinates to stay within field bounds
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
function clampPt(x, y) {
  return { x: clamp(x, 5, 95), y: clamp(y, 5, 95) };
}

const routeTemplates = {
  // ——— Receiver routes ———
  slant: ({ startX, startY, fieldSide }) => {
    const cd = centerDir(fieldSide);
    return [
      { x: startX, y: startY },
      clampPt(startX, startY - 5),
      clampPt(startX + 12 * cd, startY - 17),
    ];
  },
  out: ({ startX, startY, fieldSide }) => {
    const sd = sidelineDir(fieldSide);
    return [
      { x: startX, y: startY },
      clampPt(startX, startY - 12),
      clampPt(startX + 15 * sd, startY - 12),
    ];
  },
  post: ({ startX, startY, fieldSide }) => {
    const cd = centerDir(fieldSide);
    return [
      { x: startX, y: startY },
      clampPt(startX, startY - 20),
      clampPt(startX + 12 * cd, startY - 32),
    ];
  },
  fly: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX, startY - 35),
    ];
  },
  curl: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX, startY - 18),
      clampPt(startX, startY - 15),
    ];
  },
  drag: ({ startX, startY, fieldSide }) => {
    const cd = centerDir(fieldSide);
    return [
      { x: startX, y: startY },
      clampPt(startX, startY - 5),
      clampPt(startX + 30 * cd, startY - 5),
    ];
  },
  flat: ({ startX, startY, fieldSide }) => {
    const sd = sidelineDir(fieldSide);
    return [
      { x: startX, y: startY },
      clampPt(startX + 15 * sd, startY - 15),
    ];
  },
  corner: ({ startX, startY, fieldSide }) => {
    const sd = sidelineDir(fieldSide);
    return [
      { x: startX, y: startY },
      clampPt(startX, startY - 20),
      clampPt(startX + 12 * sd, startY - 32),
    ];
  },
  hitch: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX, startY - 12),
      clampPt(startX, startY - 10),
    ];
  },
  block: ({ startX, startY }) => {
    return [{ x: startX, y: startY }];
  },

  // ——— QB routes ———
  drop_back: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX, startY + 8),
    ];
  },
  rollout_left: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX, startY + 5),
      clampPt(startX - 15, startY + 5),
    ];
  },
  rollout_right: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX, startY + 5),
      clampPt(startX + 15, startY + 5),
    ];
  },
  pitch_left: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX - 10, startY + 3),
    ];
  },
  pitch_right: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX + 10, startY + 3),
    ];
  },
  keeper: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX, startY - 15),
    ];
  },
  scramble: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX + 10, startY),
      clampPt(startX + 10, startY - 10),
    ];
  },
  handoff: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX, startY - 2),
    ];
  },

  // ——— Center routes ———
  snap_block: ({ startX, startY }) => {
    return [{ x: startX, y: startY }];
  },
  pull_left: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX - 20, startY),
      clampPt(startX - 20, startY - 8),
    ];
  },
  pull_right: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX + 20, startY),
      clampPt(startX + 20, startY - 8),
    ];
  },

  // ——— RB routes ———
  sweep_left: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX - 25, startY),
      clampPt(startX - 25, startY - 15),
    ];
  },
  sweep_right: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX + 25, startY),
      clampPt(startX + 25, startY - 15),
    ];
  },
  dive: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      clampPt(startX, startY - 15),
    ];
  },
  screen: ({ startX, startY, fieldSide }) => {
    const sd = sidelineDir(fieldSide);
    return [
      { x: startX, y: startY },
      clampPt(startX + 15 * sd, startY),
      clampPt(startX + 15 * sd, startY - 10),
    ];
  },
  delay: ({ startX, startY, fieldSide }) => {
    const sd = sidelineDir(fieldSide);
    return [
      { x: startX, y: startY },
      clampPt(startX, startY - 2),
      clampPt(startX, startY - 10),
      clampPt(startX + 10 * sd, startY - 10),
    ];
  },

  // ——— Custom freehand ———
  custom: () => {
    return [];
  },
};

// ——— Position-Specific Route Menus ———
const RECEIVER_ROUTES = [
  { id: 'slant', label: 'Slant' },
  { id: 'out', label: 'Out' },
  { id: 'post', label: 'Post' },
  { id: 'fly', label: 'Fly' },
  { id: 'curl', label: 'Curl' },
  { id: 'drag', label: 'Drag' },
  { id: 'flat', label: 'Flat' },
  { id: 'corner', label: 'Corner' },
  { id: 'hitch', label: 'Hitch' },
  { id: 'block', label: 'Block' },
  { id: 'custom', label: 'Custom' },
];

const POSITION_ROUTES = {
  QB: [
    { id: 'drop_back', label: 'Drop Back' },
    { id: 'rollout_left', label: 'Rollout Left' },
    { id: 'rollout_right', label: 'Rollout Right' },
    { id: 'pitch_left', label: 'Pitch Left' },
    { id: 'pitch_right', label: 'Pitch Right' },
    { id: 'keeper', label: 'Keeper' },
    { id: 'scramble', label: 'Scramble' },
    { id: 'handoff', label: 'Handoff' },
    { id: 'custom', label: 'Custom' },
  ],
  C: [
    { id: 'snap_block', label: 'Snap & Block' },
    { id: 'pull_left', label: 'Pull Left' },
    { id: 'pull_right', label: 'Pull Right' },
    { id: 'block', label: 'Block' },
    { id: 'custom', label: 'Custom' },
  ],
  RB: [
    { id: 'sweep_left', label: 'Sweep Left' },
    { id: 'sweep_right', label: 'Sweep Right' },
    { id: 'dive', label: 'Dive' },
    { id: 'screen', label: 'Screen' },
    { id: 'flat', label: 'Flat' },
    { id: 'delay', label: 'Delay' },
    { id: 'block', label: 'Block' },
    { id: 'custom', label: 'Custom' },
  ],
  X: RECEIVER_ROUTES,
  Z: RECEIVER_ROUTES,
  // 7v7 positions
  Y: RECEIVER_ROUTES,
  TE: RECEIVER_ROUTES,
};

// Legacy export — full receiver route list (kept for backward compat)
const OFFENSE_ROUTES = RECEIVER_ROUTES;

// ——— Defense Routes ———
const DEFENSE_ROUTES = [
  { id: 'man_coverage', label: 'Man Coverage' },
  { id: 'zone_coverage', label: 'Zone Coverage' },
  { id: 'blitz_rush', label: 'Blitz' },
  { id: 'spy', label: 'Spy' },
  { id: 'custom', label: 'Custom' },
];

const DEFENSE_POSITION_ROUTES = {
  CB1: DEFENSE_ROUTES,
  CB2: DEFENSE_ROUTES,
  S:   DEFENSE_ROUTES,
  LB:  DEFENSE_ROUTES,
  R:   [
    { id: 'blitz_rush', label: 'Blitz' },
    { id: 'spy', label: 'Spy' },
    { id: 'custom', label: 'Custom' },
  ],
  NB: DEFENSE_ROUTES,
  DE: [
    { id: 'blitz_rush', label: 'Blitz' },
    { id: 'spy', label: 'Spy' },
    { id: 'custom', label: 'Custom' },
  ],
};

const DEFAULT_FORMAT = '5v5';

// ——— Helpers ———
function getPositionsForFormat(formatId, side = 'offense') {
  const fmt = formats[formatId] ?? formats[DEFAULT_FORMAT];
  if (side === 'defense') return fmt.defense_positions ?? [];
  return fmt.positions ?? [];
}

function getFormationDefaults(formationId, formatId, side = 'offense') {
  const sideFormations = formations[side];
  if (!sideFormations) return {};
  const formation = sideFormations[formationId];
  if (!formation) return {};
  const positionIds = getPositionsForFormat(formatId, side).map((p) => p.id);
  const result = {};
  for (const id of positionIds) {
    if (formation.defaults[id]) result[id] = formation.defaults[id];
  }
  return result;
}

/**
 * Get the route menu for a given position ID.
 * Falls back to receiver routes for offense, defense routes for defense positions.
 */
function getRoutesForPosition(positionId) {
  if (DEFENSE_POSITION_ROUTES[positionId]) return DEFENSE_POSITION_ROUTES[positionId];
  return POSITION_ROUTES[positionId] || RECEIVER_ROUTES;
}

// ——— Route Glossary (kid-friendly descriptions for vocabulary learning) ———
export const ROUTE_GLOSSARY = {
  // Receiver routes
  slant:        { name: 'Slant',        description: 'Cut 45° toward the middle of the field' },
  out:          { name: 'Out',          description: 'Run upfield then cut 90° toward the sideline' },
  post:         { name: 'Post',         description: 'Run deep then angle toward the goalpost' },
  fly:          { name: 'Fly',          description: 'Sprint straight upfield as fast as you can' },
  curl:         { name: 'Curl',         description: 'Run upfield then turn back toward the QB' },
  drag:         { name: 'Drag',         description: 'Short route across the middle of the field' },
  flat:         { name: 'Flat',         description: 'Quick angle toward the sideline' },
  corner:       { name: 'Corner',       description: 'Run deep then cut toward the corner of the end zone' },
  hitch:        { name: 'Hitch',        description: 'Run a few yards upfield then stop and turn around' },
  block:        { name: 'Block',        description: 'Stay and protect — block the defender in front of you' },

  // QB routes
  drop_back:    { name: 'Drop Back',    description: 'Step backward from center to set up a pass' },
  rollout_left: { name: 'Rollout Left', description: 'Move left behind the line before throwing' },
  rollout_right:{ name: 'Rollout Right',description: 'Move right behind the line before throwing' },
  pitch_left:   { name: 'Pitch Left',   description: 'Toss the ball to a teammate on the left' },
  pitch_right:  { name: 'Pitch Right',  description: 'Toss the ball to a teammate on the right' },
  keeper:       { name: 'Keeper',       description: 'QB keeps the ball and runs upfield' },
  scramble:     { name: 'Scramble',     description: 'QB escapes the pocket and improvises' },
  handoff:      { name: 'Handoff',      description: 'Hand the ball to the running back' },

  // Center routes
  snap_block:   { name: 'Snap & Block', description: 'Snap the ball then block the closest defender' },
  pull_left:    { name: 'Pull Left',    description: 'Move left along the line to lead block' },
  pull_right:   { name: 'Pull Right',   description: 'Move right along the line to lead block' },

  // RB routes
  sweep_left:   { name: 'Sweep Left',   description: 'Run wide to the left before turning upfield' },
  sweep_right:  { name: 'Sweep Right',  description: 'Run wide to the right before turning upfield' },
  dive:         { name: 'Dive',         description: 'Run straight ahead through the middle' },
  screen:       { name: 'Screen',       description: 'Slip out to the side for a short catch behind blockers' },
  delay:        { name: 'Delay',        description: 'Wait a beat, then sneak out as a receiver' },
};

// ——— Route Chaining (compound routes) ———
const YARDS_TO_PCT = 70 / 60; // ≈ 1.167 pct units per yard (70 pct playing field / 60 yards)

const ROUTE_SEGMENT_DEFAULTS = {
  // Receiver
  slant: 10, out: 10, post: 15, fly: 15, curl: 10,
  drag: 10, flat: 8, corner: 15, hitch: 8,
  // QB
  drop_back: 5, rollout_left: 8, rollout_right: 8,
  keeper: 10, scramble: 8,
  // RB
  sweep_left: 10, sweep_right: 10, dive: 10, screen: 8, delay: 8,
  // Center
  pull_left: 8, pull_right: 8,
};

const NON_CHAINABLE_ROUTES = new Set(['block', 'snap_block', 'custom', 'handoff']);

function isChainableRoute(routeId) {
  return !NON_CHAINABLE_ROUTES.has(routeId);
}

/**
 * Generate points for a single route segment, scaled by yards.
 * Returns [{x,y}] in percentage coordinates. First point = start.
 * Shape proportions match the existing route templates.
 */
function generateSegmentPoints(routeId, startX, startY, fieldSide, yards) {
  const d = yards * YARDS_TO_PCT;
  const cd = centerDir(fieldSide);
  const sd = sidelineDir(fieldSide);

  switch (routeId) {
    // ——— Receiver ———
    case 'slant':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY - d * 0.3),
        clampPt(startX + d * 0.7 * cd, startY - d),
      ];
    case 'out':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY - d * 0.7),
        clampPt(startX + d * 0.7 * sd, startY - d * 0.7),
      ];
    case 'post':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY - d * 0.6),
        clampPt(startX + d * 0.5 * cd, startY - d),
      ];
    case 'fly':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY - d),
      ];
    case 'curl':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY - d),
        clampPt(startX, startY - d * 0.85),
      ];
    case 'drag':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY - d * 0.15),
        clampPt(startX + d * 0.85 * cd, startY - d * 0.15),
      ];
    case 'flat':
      return [
        { x: startX, y: startY },
        clampPt(startX + d * 0.7 * sd, startY - d * 0.7),
      ];
    case 'corner':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY - d * 0.6),
        clampPt(startX + d * 0.5 * sd, startY - d),
      ];
    case 'hitch':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY - d),
        clampPt(startX, startY - d * 0.85),
      ];
    // ——— QB ———
    case 'drop_back':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY + d),
      ];
    case 'rollout_left':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY + d * 0.4),
        clampPt(startX - d, startY + d * 0.4),
      ];
    case 'rollout_right':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY + d * 0.4),
        clampPt(startX + d, startY + d * 0.4),
      ];
    case 'keeper':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY - d),
      ];
    case 'scramble':
      return [
        { x: startX, y: startY },
        clampPt(startX + d * 0.6, startY),
        clampPt(startX + d * 0.6, startY - d * 0.6),
      ];
    // ——— RB ———
    case 'sweep_left':
      return [
        { x: startX, y: startY },
        clampPt(startX - d, startY),
        clampPt(startX - d, startY - d * 0.6),
      ];
    case 'sweep_right':
      return [
        { x: startX, y: startY },
        clampPt(startX + d, startY),
        clampPt(startX + d, startY - d * 0.6),
      ];
    case 'dive':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY - d),
      ];
    case 'screen':
      return [
        { x: startX, y: startY },
        clampPt(startX + d * 0.7 * sd, startY),
        clampPt(startX + d * 0.7 * sd, startY - d * 0.5),
      ];
    case 'delay':
      return [
        { x: startX, y: startY },
        clampPt(startX, startY - d * 0.15),
        clampPt(startX, startY - d * 0.7),
        clampPt(startX + d * 0.5 * sd, startY - d * 0.7),
      ];
    // ——— Center ———
    case 'pull_left':
      return [
        { x: startX, y: startY },
        clampPt(startX - d, startY),
        clampPt(startX - d, startY - d * 0.4),
      ];
    case 'pull_right':
      return [
        { x: startX, y: startY },
        clampPt(startX + d, startY),
        clampPt(startX + d, startY - d * 0.4),
      ];
    // QB pitch routes
    case 'pitch_left':
      return [
        { x: startX, y: startY },
        clampPt(startX - d * 0.7, startY + d * 0.3),
      ];
    case 'pitch_right':
      return [
        { x: startX, y: startY },
        clampPt(startX + d * 0.7, startY + d * 0.3),
      ];
    default:
      // Fallback: straight upfield
      return [
        { x: startX, y: startY },
        clampPt(startX, startY - d),
      ];
  }
}

/**
 * Build a chained route path from an array of segments.
 * Each segment: { routeId, yards }
 * Returns flat [{x,y}] array — backwards compatible with route_path.
 */
function buildChainedRoutePath(segments, startX, startY, fieldSide) {
  if (!segments || segments.length === 0) return [];

  let allPoints = [];
  let curX = startX;
  let curY = startY;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const points = generateSegmentPoints(seg.routeId, curX, curY, fieldSide, seg.yards);

    if (i === 0) {
      allPoints = [...points];
    } else if (points.length > 0) {
      // Skip first point (it's the junction = last point of previous segment)
      allPoints = allPoints.concat(points.slice(1));
    }

    // Next segment starts where this one ends
    if (points.length > 0) {
      const last = points[points.length - 1];
      curX = last.x;
      curY = last.y;
    }
  }

  return allPoints;
}

// ——— Tag Options (single source of truth for both creation modes) ———
const TAG_OPTIONS = [
  { value: 'red_zone', label: 'Red Zone' },
  { value: 'goal_line', label: 'Goal Line' },
  { value: '3rd_down', label: '3rd Down' },
  { value: 'trick_play', label: 'Trick Play' },
  { value: 'screen', label: 'Screen' },
  { value: 'blitz', label: 'Blitz' },
];

// ——— Formation options for photo mode ———
const FORMATION_OPTIONS = ['Spread', 'Trips', 'Twins', 'Bunch/Stack', 'Custom'];
const DEFENSE_FORMATION_OPTIONS = ['Man-to-Man', 'Cover 1', 'Cover 2', 'Cover 3', 'Blitz', 'Custom'];

// ——— Route options for photo mode (broader than visual builder) ———
const PHOTO_MODE_ROUTES = [
  'Fly', 'Slant', 'Out', 'In', 'Curl', 'Post', 'Corner', 'Flat', 'Fade',
  'Block', 'Snap', 'Handoff',
  'Custom',
];
const PHOTO_MODE_DEFENSE_ROUTES = [
  'Man Coverage', 'Zone Coverage', 'Blitz', 'Spy', 'Custom',
];

// ——— Supported team formats ———
const FORMAT_OPTIONS = [
  { value: '5v5', label: '5v5' },
  { value: '7v7', label: '7v7' },
];

// ——— Custom Position Colors ———
const CUSTOM_POSITION_COLORS = [
  '#94a3b8', '#d4a046', '#22c55e', '#3b82f6',
  '#ef4444', '#a855f7', '#f97316', '#ec4899',
];

// ——— Main Export ———
export const FLAG_FOOTBALL = {
  field,
  formats,
  formations,
  routeTemplates,
  getFieldSide,
};

export {
  OFFENSE_ROUTES,
  POSITION_ROUTES,
  RECEIVER_ROUTES,
  DEFENSE_ROUTES,
  DEFENSE_POSITION_ROUTES,
  DEFAULT_FORMAT,
  CUSTOM_POSITION_COLORS,
  getPositionsForFormat,
  getFormationDefaults,
  getRoutesForPosition,
  // Route chaining
  YARDS_TO_PCT,
  ROUTE_SEGMENT_DEFAULTS,
  NON_CHAINABLE_ROUTES,
  isChainableRoute,
  generateSegmentPoints,
  buildChainedRoutePath,
  // Shared constants (single source of truth)
  TAG_OPTIONS,
  FORMATION_OPTIONS,
  DEFENSE_FORMATION_OPTIONS,
  PHOTO_MODE_ROUTES,
  PHOTO_MODE_DEFENSE_ROUTES,
  FORMAT_OPTIONS,
};
