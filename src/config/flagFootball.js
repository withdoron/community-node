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
};

// ——— Route Templates ———
// fieldSide: 'left' (x < 50), 'right' (x > 50), 'center' (x === 50)
// "toward center" = right from left side, left from right side
// "toward sideline" = left from left side, right from right side
// Y axis: lower Y = further upfield (offense faces up). ~1.5 units per yard.
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

const routeTemplates = {
  slant: ({ startX, startY, fieldSide }) => {
    const cd = centerDir(fieldSide);
    return [
      { x: startX, y: startY },
      { x: startX, y: startY - 3 },
      { x: startX + 8 * cd, y: startY - 11 },
    ];
  },
  out: ({ startX, startY, fieldSide }) => {
    const sd = sidelineDir(fieldSide);
    return [
      { x: startX, y: startY },
      { x: startX, y: startY - 12 },
      { x: startX + 10 * sd, y: startY - 12 },
    ];
  },
  post: ({ startX, startY, fieldSide }) => {
    const cd = centerDir(fieldSide);
    return [
      { x: startX, y: startY },
      { x: startX, y: startY - 15 },
      { x: startX + 10 * cd, y: startY - 25 },
    ];
  },
  fly: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      { x: startX, y: startY - 25 },
    ];
  },
  curl: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      { x: startX, y: startY - 12 },
      { x: startX, y: startY - 10 },
    ];
  },
  drag: ({ startX, startY, fieldSide }) => {
    const cd = centerDir(fieldSide);
    return [
      { x: startX, y: startY },
      { x: startX, y: startY - 3 },
      { x: startX + 20 * cd, y: startY - 3 },
    ];
  },
  flat: ({ startX, startY, fieldSide }) => {
    const sd = sidelineDir(fieldSide);
    return [
      { x: startX, y: startY },
      { x: startX + 10 * sd, y: startY - 7 },
    ];
  },
  corner: ({ startX, startY, fieldSide }) => {
    const sd = sidelineDir(fieldSide);
    return [
      { x: startX, y: startY },
      { x: startX, y: startY - 15 },
      { x: startX + 10 * sd, y: startY - 25 },
    ];
  },
  hitch: ({ startX, startY }) => {
    return [
      { x: startX, y: startY },
      { x: startX, y: startY - 8 },
      { x: startX, y: startY - 7 },
    ];
  },
  block: ({ startX, startY }) => {
    return [{ x: startX, y: startY }];
  },
  custom: () => {
    return [];
  },
};

// ——— Offense Route Options ———
const OFFENSE_ROUTES = [
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

const DEFAULT_FORMAT = '5v5';

// ——— Helpers ———
function getPositionsForFormat(formatId) {
  return formats[formatId]?.positions ?? formats[DEFAULT_FORMAT].positions;
}

function getFormationDefaults(formationId, formatId) {
  const formation = formations.offense[formationId];
  if (!formation) return {};
  const positionIds = getPositionsForFormat(formatId).map((p) => p.id);
  const result = {};
  for (const id of positionIds) {
    if (formation.defaults[id]) result[id] = formation.defaults[id];
  }
  return result;
}

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
  DEFAULT_FORMAT,
  CUSTOM_POSITION_COLORS,
  getPositionsForFormat,
  getFormationDefaults,
};
