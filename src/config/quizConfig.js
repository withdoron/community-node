/**
 * Quiz Engine — Configuration
 * Drives quiz types, difficulty settings, and mastery thresholds.
 */

export const QUIZ_TYPES = {
  name_that_play: {
    id: 'name_that_play',
    label: 'Name That Play',
    description: 'See the diagram, pick the play name',
    icon: 'Eye',
  },
  know_your_job: {
    id: 'know_your_job',
    label: 'Know Your Job',
    description: 'See the play name, describe your assignment',
    icon: 'Target',
  },
  identify_route: {
    id: 'identify_route',
    label: 'Identify the Route',
    description: 'See a route on the field, name it',
    icon: 'Route',
  },
};

export const DIFFICULTY_SETTINGS = {
  easy: { optionCount: 2, timerSeconds: null, label: 'Easy' },
  medium: { optionCount: 4, timerSeconds: 15, label: 'Medium' },
  hard: { optionCount: 4, timerSeconds: 10, label: 'Hard' },
};

/** Percentage correct to count as "mastered" */
export const MASTERY_THRESHOLD = 80;

/** Show celebration every N correct in a row */
export const STREAK_CELEBRATION = 5;
