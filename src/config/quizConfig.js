/**
 * Playbook Pro — Game Configuration
 * Adaptive mastery system, scoring, lives, and celebrations.
 */

// Mastery levels — invisible to player, drives question difficulty
export const MASTERY_LEVELS = {
  new: {
    level: 0,
    label: 'New',
    optionCount: 2,
    timerSeconds: null,
    showPositionLabels: true,
    showFormationHint: true,
    showRouteLabel: true,
    useMirror: false,
    useSimilarDistracters: false,
    askOtherPositions: false,
    basePoints: 100,
    promotesAfter: 3,
  },
  learning: {
    level: 1,
    label: 'Learning',
    optionCount: 3,
    timerSeconds: null,
    showPositionLabels: true,
    showFormationHint: false,
    showRouteLabel: false,
    useMirror: false,
    useSimilarDistracters: false,
    askOtherPositions: false,
    basePoints: 150,
    promotesAfter: 3,
  },
  familiar: {
    level: 2,
    label: 'Familiar',
    optionCount: 4,
    timerSeconds: 15,
    showPositionLabels: false,
    showFormationHint: false,
    showRouteLabel: false,
    useMirror: false,
    useSimilarDistracters: false,
    askOtherPositions: false,
    basePoints: 200,
    promotesAfter: 3,
  },
  mastered: {
    level: 3,
    label: 'Mastered',
    optionCount: 4,
    timerSeconds: 10,
    showPositionLabels: false,
    showFormationHint: false,
    showRouteLabel: false,
    useMirror: true,
    useSimilarDistracters: true,
    askOtherPositions: true,
    basePoints: 300,
    promotesAfter: null, // max level
  },
};

// Mastery level keys in order
export const MASTERY_ORDER = ['new', 'learning', 'familiar', 'mastered'];

// How mastery is derived from QuizAttempt history (no new entity fields needed)
export function deriveMasteryLevel(attempts) {
  if (!attempts || attempts.length === 0) return 'new';
  const recent = attempts.slice(-10);
  const correct = recent.filter((a) => a.is_correct).length;
  const accuracy = correct / recent.length;
  const total = attempts.length;
  if (accuracy >= 0.8 && total >= 6) return 'mastered';
  if (accuracy >= 0.8 && total >= 3) return 'familiar';
  if (total >= 1) return 'learning';
  return 'new';
}

// Question weighting — weaker plays appear more often
export const MASTERY_WEIGHTS = {
  new: 4,
  learning: 3,
  familiar: 2,
  mastered: 1,
};

// Lives
export const STARTING_LIVES = 3;
export const MAX_LIVES = 3;
export const LIVES_RECOVERY_STREAK = 5;

// Scoring
export const SPEED_BONUS_FAST = 50;
export const SPEED_BONUS_MEDIUM = 25;
export const STREAK_MULTIPLIER_5 = 2;
export const STREAK_MULTIPLIER_10 = 3;

export function calculatePoints(basePoints, timeRemaining, timerSeconds, streak) {
  let points = basePoints;

  // Speed bonus (only if timed)
  if (timerSeconds && timeRemaining) {
    const percentLeft = timeRemaining / timerSeconds;
    if (percentLeft >= 0.75) points += SPEED_BONUS_FAST;
    else if (percentLeft >= 0.5) points += SPEED_BONUS_MEDIUM;
  }

  // Streak multiplier
  if (streak >= 10) points *= STREAK_MULTIPLIER_10;
  else if (streak >= 5) points *= STREAK_MULTIPLIER_5;

  return Math.round(points);
}

// Streak celebrations
export const STREAK_CELEBRATIONS = [
  { streak: 3, message: 'Nice!', emoji: '\uD83D\uDD25', recoversLife: false },
  { streak: 5, message: 'On fire!', emoji: '\uD83D\uDD25\uD83D\uDD25', recoversLife: true },
  { streak: 10, message: 'UNSTOPPABLE!', emoji: '\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25', recoversLife: true },
  { streak: 15, message: 'LEGENDARY!', emoji: '\u2B50', recoversLife: true },
  { streak: 20, message: 'GOAT!', emoji: '\uD83D\uDC10', recoversLife: true },
];

// Similar routes for mastered-level distracters
export const SIMILAR_ROUTES = {
  angled_cuts: ['slant', 'post', 'corner'],
  short_routes: ['out', 'flat', 'hitch'],
  straight_runs: ['fly', 'dive', 'keeper'],
  cross_field: ['curl', 'drag'],
  qb_moves: ['rollout_left', 'rollout_right', 'pitch_left', 'pitch_right', 'scramble'],
  rb_runs: ['sweep_left', 'sweep_right', 'dive', 'screen'],
};

// Quiz types — mixed automatically, player doesn't choose
export const QUIZ_TYPES = ['name_that_play', 'know_your_job', 'identify_route'];

// Progressive difficulty phases — layered on top of mastery system
// Controls presentation during a game session (option count, timer, mirrors)
export const DIFFICULTY_PHASES = [
  { name: 'warm_up', label: 'Warm Up', upTo: 3, optionCount: 2, timerSeconds: null, useMirror: false, showLabels: true },
  { name: 'building', label: 'Building', upTo: 7, optionCount: 3, timerSeconds: null, useMirror: false, showLabels: false },
  { name: 'challenging', label: 'Challenging', upTo: 12, optionCount: 4, timerSeconds: 15, useMirror: false, showLabels: false },
  { name: 'hard', label: 'Hard', upTo: Infinity, optionCount: 4, timerSeconds: 10, useMirror: true, showLabels: false },
];

export function getDifficultyPhase(questionNumber) {
  return DIFFICULTY_PHASES.find((p) => questionNumber <= p.upTo) || DIFFICULTY_PHASES[DIFFICULTY_PHASES.length - 1];
}
