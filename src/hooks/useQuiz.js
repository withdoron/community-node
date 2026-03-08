import { useState, useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  MASTERY_LEVELS,
  deriveMasteryLevel,
  MASTERY_WEIGHTS,
  STARTING_LIVES,
  MAX_LIVES,
  calculatePoints,
  STREAK_CELEBRATIONS,
  SIMILAR_ROUTES,
  QUIZ_TYPES,
} from '@/config/quizConfig';
import { FLAG_FOOTBALL, getPositionsForFormat } from '@/config/flagFootball';

const { routeTemplates } = FLAG_FOOTBALL;

// ——— Utilities ———

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, n, excludeSet = new Set()) {
  const filtered = arr.filter((item) => !excludeSet.has(item));
  return shuffle(filtered).slice(0, n);
}

/** Format a movement_type slug into readable text: "curl_drag" → "Curl Drag" */
function formatMoveLabel(raw) {
  if (!raw) return '';
  return raw
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

/**
 * Build a combined assignment label from route + instruction text.
 * Returns e.g. "Curl: hike ball and sweep to RB" or just "Curl" or just the instruction.
 */
function buildAssignmentLabel(assignment) {
  if (!assignment) return '';
  const route = formatMoveLabel(assignment.movement_type || assignment.route);
  const text = assignment.assignment_text?.trim();
  if (route && text) return `${route}: ${text}`;
  return route || text || '';
}

// ——— High Score — approximate from QuizAttempt sessions ———

function calculateHighScore(attempts) {
  if (!attempts || attempts.length === 0) return 0;

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Group into sessions (consecutive within 5 minutes)
  const sessions = [];
  let session = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const gap = new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime();
    if (gap <= 5 * 60 * 1000) {
      session.push(sorted[i]);
    } else {
      sessions.push(session);
      session = [sorted[i]];
    }
  }
  sessions.push(session);

  // Estimate score per session
  let best = 0;
  for (const s of sessions) {
    let total = 0;
    let stk = 0;
    for (const a of s) {
      if (a.is_correct) {
        stk++;
        let pts = 150;
        if (stk >= 10) pts *= 3;
        else if (stk >= 5) pts *= 2;
        total += pts;
      } else {
        stk = 0;
      }
    }
    best = Math.max(best, total);
  }
  return best;
}

// ——— Question Generators (one per quiz type) ———

function genNameThatPlay({ play, playAssignments, mc, targetPlays }) {
  const hasRenderer = play.use_renderer === true || play.use_renderer === 'true';
  if (hasRenderer && playAssignments.length === 0 && !play.diagram_image) return null;

  const correct = play.name;

  // Build wrong-answer pool — mastered prefers same formation (harder)
  let pool;
  if (mc.useSimilarDistracters) {
    const same = targetPlays.filter((p) => p.id !== play.id && p.formation === play.formation).map((p) => p.name);
    const diff = targetPlays.filter((p) => p.id !== play.id && p.formation !== play.formation).map((p) => p.name);
    pool = [...same, ...diff];
  } else {
    const diff = targetPlays.filter((p) => p.id !== play.id && p.formation !== play.formation).map((p) => p.name);
    const same = targetPlays.filter((p) => p.id !== play.id && p.formation === play.formation).map((p) => p.name);
    pool = [...diff, ...same];
  }

  const uniq = [...new Set(pool)].filter((n) => n !== correct);
  if (uniq.length === 0) return null;

  const wrong = uniq.slice(0, mc.optionCount - 1);
  return {
    type: 'name_that_play',
    playId: play.id,
    play,
    assignments: playAssignments,
    questionText: 'What play is this?',
    correctAnswer: correct,
    options: shuffle([correct, ...wrong]),
    highlightPosition: null,
    mirrored: mc.useMirror && Math.random() > 0.5,
    showLabels: mc.showPositionLabels,
    showFormationHint: mc.showFormationHint,
    timerSeconds: mc.timerSeconds,
    basePoints: mc.basePoints,
  };
}

function genKnowYourJob({ play, playAssignments, mc, targetPlays, playerPosition, assignmentsByPlayId }) {
  if (!playerPosition) return null;

  const mine = playAssignments.find(
    (a) => a.position?.toLowerCase() === playerPosition?.toLowerCase()
  );
  const correct = buildAssignmentLabel(mine);
  if (!correct) return null;

  const pool = targetPlays
    .filter((p) => p.id !== play.id)
    .map((p) => {
      const as = assignmentsByPlayId[p.id] || [];
      const a = as.find((a2) => a2.position?.toLowerCase() === playerPosition?.toLowerCase());
      return buildAssignmentLabel(a);
    })
    .filter(Boolean)
    .filter((t) => t !== correct);

  const uniq = [...new Set(pool)];
  if (uniq.length === 0) return null;

  // Look up full position label (e.g. "Quarterback")
  const positions = getPositionsForFormat(play.format || '5v5');
  const posConfig = positions.find((p) => p.id.toLowerCase() === playerPosition?.toLowerCase());
  const posLabel = posConfig?.label || playerPosition;
  const posShort = posConfig?.shortLabel || playerPosition;
  const posColor = posConfig?.color || '#94a3b8';

  const wrong = pickRandom(uniq, mc.optionCount - 1);
  return {
    type: 'know_your_job',
    playId: play.id,
    play,
    assignments: playAssignments,
    questionText: `What does the ${posLabel} (${posShort}) do on ${play.name}?`,
    correctAnswer: correct,
    options: shuffle([correct, ...wrong]),
    highlightPosition: null,
    mirrored: false,
    showLabels: true,
    showFormationHint: mc.showFormationHint,
    timerSeconds: mc.timerSeconds,
    basePoints: mc.basePoints,
    positionId: posShort,
    positionLabel: posLabel,
    positionColor: posColor,
  };
}

function genIdentifyRoute({ play, playAssignments, mc, targetPlays, assignmentsByPlayId }) {
  const hasRenderer = play.use_renderer === true || play.use_renderer === 'true';
  if (!hasRenderer) return null;

  const routeAs = playAssignments.filter(
    (a) => a.movement_type && !['block', 'custom', 'snap_block'].includes(a.movement_type)
  );
  if (routeAs.length === 0) return null;

  const assignment = routeAs[Math.floor(Math.random() * routeAs.length)];
  const correct = assignment.movement_type;

  // Gather all routes in playbook for wrong answers
  const allRoutes = new Set();
  for (const p of targetPlays) {
    if (p.use_renderer !== true && p.use_renderer !== 'true') continue;
    for (const a of (assignmentsByPlayId[p.id] || [])) {
      if (a.movement_type && !['block', 'custom', 'snap_block'].includes(a.movement_type)) {
        allRoutes.add(a.movement_type);
      }
    }
  }

  // Mastered: prefer similar routes as distracters
  let wrongPool;
  if (mc.useSimilarDistracters) {
    let similar = [];
    for (const routes of Object.values(SIMILAR_ROUTES)) {
      if (routes.includes(correct)) {
        similar = routes.filter((r) => r !== correct);
        break;
      }
    }
    wrongPool = [...similar, ...[...allRoutes].filter((r) => r !== correct && !similar.includes(r))];
  } else {
    wrongPool = [...allRoutes].filter((r) => r !== correct);
  }

  if (wrongPool.length === 0) return null;

  const wrong = pickRandom(wrongPool, mc.optionCount - 1);
  const options = shuffle([correct, ...wrong]);

  // Build single-route visual
  const startX = assignment.start_x || 25;
  const startY = assignment.start_y || 55;
  const fieldSide = startX < 45 ? 'left' : startX > 55 ? 'right' : 'center';
  let routePath = null;
  if (routeTemplates[correct]) {
    routePath = routeTemplates[correct]({ startX, startY, fieldSide });
  } else if (assignment.route_path) {
    try {
      routePath = typeof assignment.route_path === 'string'
        ? JSON.parse(assignment.route_path)
        : assignment.route_path;
    } catch { routePath = null; }
  }

  // Look up position context for the route runner
  const posId = assignment.position || 'X';
  const positions = getPositionsForFormat(play.format || '5v5');
  const posConfig = positions.find((p) => p.id === posId);
  const posLabel = posConfig?.label || posId;
  const posColor = posConfig?.color || '#94a3b8';

  return {
    type: 'identify_route',
    playId: play.id,
    play: { name: correct, use_renderer: true, formation: 'spread', format: play.format || '5v5' },
    assignments: [],
    questionText: `What route is this? (${posLabel})`,
    correctAnswer: correct,
    options,
    highlightPosition: null,
    mirrored: mc.useMirror && Math.random() > 0.5,
    showLabels: mc.showRouteLabel,
    showFormationHint: false,
    showPositionContext: mc.showPositionLabels,
    timerSeconds: mc.timerSeconds,
    basePoints: mc.basePoints,
    routePath,
    fakePlay: { use_renderer: true, formation: 'spread', format: play.format || '5v5' },
    fakeAssignments: routePath
      ? [{ position: posId, start_x: startX, start_y: startY, route_path: routePath, movement_type: correct }]
      : [],
    positionId: posId,
    positionLabel: posLabel,
    positionColor: posColor,
  };
}

// ——— Weighted Pool Builder ———

function generateWeightedPool({ plays, assignmentsByPlayId, playerPosition, playMastery, gameDayOnly }) {
  let target = plays.filter((p) => p.side === 'offense' && p.status === 'active');
  if (gameDayOnly) target = target.filter((p) => p.game_day);
  if (target.length === 0) return [];

  // Weight plays by mastery — weaker plays appear more
  const weighted = [];
  for (const play of target) {
    const mastery = playMastery[play.id] || 'new';
    const w = MASTERY_WEIGHTS[mastery] || MASTERY_WEIGHTS.new;
    for (let i = 0; i < w; i++) weighted.push(play);
  }

  const pool = shuffle(weighted);
  const questions = [];
  const seen = new Set();

  for (const play of pool) {
    const mastery = playMastery[play.id] || 'new';
    const mc = MASTERY_LEVELS[mastery];
    const playAs = assignmentsByPlayId[play.id] || [];

    // Pick a random quiz type
    const qt = QUIZ_TYPES[Math.floor(Math.random() * QUIZ_TYPES.length)];

    let q = null;
    if (qt === 'name_that_play') {
      q = genNameThatPlay({ play, playAssignments: playAs, mc, targetPlays: target });
    } else if (qt === 'know_your_job') {
      q = genKnowYourJob({ play, playAssignments: playAs, mc, targetPlays: target, playerPosition, assignmentsByPlayId });
      if (!q) q = genNameThatPlay({ play, playAssignments: playAs, mc, targetPlays: target });
    } else if (qt === 'identify_route') {
      q = genIdentifyRoute({ play, playAssignments: playAs, mc, targetPlays: target, assignmentsByPlayId });
      if (!q) q = genNameThatPlay({ play, playAssignments: playAs, mc, targetPlays: target });
    }

    if (q) {
      const key = `${q.type}-${q.playId}-${q.correctAnswer}`;
      if (!seen.has(key)) {
        seen.add(key);
        questions.push(q);
      }
    }
  }

  return shuffle(questions);
}

// ——— Practice Mode — comprehensive drill for 1-2 plays ———

function generatePracticeQuestions({ play, assignmentsByPlayId, allPlays, playerPosition, playMastery }) {
  const mastery = playMastery[play.id] || 'new';
  const mc = MASTERY_LEVELS[mastery];
  const playAs = assignmentsByPlayId[play.id] || [];

  // Use ALL offense plays for distracter pools (not just the 1-2 practice plays)
  const allOffense = allPlays.filter((p) => p.side === 'offense' && p.status === 'active');

  const questions = [];

  // 1. Name that play — use allOffense for wrong-answer play names
  const nameQ = genNameThatPlay({ play, playAssignments: playAs, mc, targetPlays: allOffense });
  if (nameQ) questions.push(nameQ);

  // 2. Identify route — one per position with a route
  const hasRenderer = play.use_renderer === true || play.use_renderer === 'true';
  if (hasRenderer) {
    // Build full route pool from ALL plays + templates for distracters
    const allRoutes = new Set();
    for (const p of allOffense) {
      if (p.use_renderer !== true && p.use_renderer !== 'true') continue;
      for (const a of (assignmentsByPlayId[p.id] || [])) {
        if (a.movement_type && !['block', 'custom', 'snap_block'].includes(a.movement_type)) {
          allRoutes.add(a.movement_type);
        }
      }
    }
    // Fallback: add from route template keys so there are always enough distracters
    Object.keys(routeTemplates).forEach((r) => {
      if (!['block', 'custom', 'snap_block', 'handoff'].includes(r)) allRoutes.add(r);
    });

    const routeAs = playAs.filter(
      (a) => a.movement_type && !['block', 'custom', 'snap_block'].includes(a.movement_type)
    );

    for (const assignment of routeAs) {
      const correct = assignment.movement_type;
      const wrongPool = [...allRoutes].filter((r) => r !== correct);
      if (wrongPool.length === 0) continue;

      const wrong = pickRandom(wrongPool, mc.optionCount - 1);
      const startX = assignment.start_x || 25;
      const startY = assignment.start_y || 55;
      const fieldSide = startX < 45 ? 'left' : startX > 55 ? 'right' : 'center';
      let routePath = null;
      if (routeTemplates[correct]) {
        routePath = routeTemplates[correct]({ startX, startY, fieldSide });
      } else if (assignment.route_path) {
        try {
          routePath = typeof assignment.route_path === 'string'
            ? JSON.parse(assignment.route_path) : assignment.route_path;
        } catch { routePath = null; }
      }

      const posId = assignment.position || 'X';
      const positions = getPositionsForFormat(play.format || '5v5');
      const posConfig = positions.find((p) => p.id === posId);
      const posLabel = posConfig?.label || posId;
      const posColor = posConfig?.color || '#94a3b8';

      questions.push({
        type: 'identify_route',
        playId: play.id,
        play: { name: correct, use_renderer: true, formation: play.formation || 'spread', format: play.format || '5v5' },
        assignments: [],
        questionText: `What route is this? (${posLabel})`,
        correctAnswer: correct,
        options: shuffle([correct, ...wrong]),
        highlightPosition: null,
        mirrored: mc.useMirror && Math.random() > 0.5,
        showLabels: mc.showRouteLabel,
        showFormationHint: false,
        showPositionContext: mc.showPositionLabels,
        timerSeconds: mc.timerSeconds,
        basePoints: mc.basePoints,
        routePath,
        fakePlay: { use_renderer: true, formation: play.formation || 'spread', format: play.format || '5v5' },
        fakeAssignments: routePath
          ? [{ position: posId, start_x: startX, start_y: startY, route_path: routePath, movement_type: correct }]
          : [],
        positionId: posId,
        positionLabel: posLabel,
        positionColor: posColor,
      });
    }
  }

  // 3. Know your job — one question for the player's position
  const knowQ = genKnowYourJob({
    play, playAssignments: playAs, mc, targetPlays: allOffense,
    playerPosition, assignmentsByPlayId,
  });
  if (knowQ) questions.push(knowQ);

  return questions;
}

// ——— Main Hook ———

/**
 * useQuiz — Playbook Pro arcade game engine.
 * Manages lives, score, high score, adaptive mastery, weighted questions, and streaks.
 */
export default function useQuiz({
  teamId,
  userId,
  plays = [],
  allPlays = [],
  assignmentsByPlayId = {},
  playerPosition,
  gameDayOnly = false,
}) {
  // Game state
  const [gameState, setGameState] = useState('ready'); // 'ready' | 'playing' | 'gameover'
  const [lives, setLives] = useState(STARTING_LIVES);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [questionQueue, setQuestionQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playMastery, setPlayMastery] = useState({});
  const [celebration, setCelebration] = useState(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(null);
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState(null);
  const [lastPointsEarned, setLastPointsEarned] = useState(0);
  const [results, setResults] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const timerRef = useRef(null);
  const questionStartRef = useRef(Date.now());
  const gameStartRef = useRef(Date.now());
  // Refs for values needed inside callbacks without stale closures
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);

  const currentQuestion = questionQueue[currentIdx] || null;

  // ——— Initialize: fetch history, derive mastery, load high score ———
  useEffect(() => {
    const init = async () => {
      if (!userId || !teamId) {
        setIsInitialized(true);
        return;
      }
      try {
        const raw = await base44.entities.QuizAttempt.filter({ user_id: userId, team_id: teamId });
        const attempts = Array.isArray(raw) ? raw : [];

        // Derive per-play mastery
        const byPlay = {};
        attempts.forEach((a) => {
          if (!a.play_id) return;
          if (!byPlay[a.play_id]) byPlay[a.play_id] = [];
          byPlay[a.play_id].push(a);
        });
        const mMap = {};
        for (const [pid, pa] of Object.entries(byPlay)) {
          mMap[pid] = deriveMasteryLevel(pa);
        }
        setPlayMastery(mMap);

        // High score from session approximation
        const hs = calculateHighScore(attempts);
        setHighScore(hs);
        highScoreRef.current = hs;
      } catch (err) {
        console.error('Failed to init quiz data:', err);
      } finally {
        setIsInitialized(true);
      }
    };
    init();
  }, [userId, teamId]);

  // ——— Timer ———
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeRemaining == null || timeRemaining <= 0 || gameState !== 'playing' || lastAnswerCorrect != null) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev == null || prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeRemaining, gameState, lastAnswerCorrect]);

  // Auto-submit on timeout
  useEffect(() => {
    if (timeRemaining === 0 && lastAnswerCorrect == null && currentQuestion && gameState === 'playing') {
      submitAnswer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  // ——— Start Game ———
  const startGame = useCallback(() => {
    const offenseActive = plays.filter((p) => p.side === 'offense' && p.status === 'active');
    let qs;

    if (offenseActive.length > 0 && offenseActive.length <= 2) {
      // Practice mode — comprehensive drill per play (1x name_that_play + identify_route per position + know_your_job)
      qs = [];
      for (const play of offenseActive) {
        qs.push(...generatePracticeQuestions({
          play,
          assignmentsByPlayId,
          allPlays,
          playerPosition,
          playMastery,
        }));
      }
      qs = shuffle(qs);
    } else {
      qs = generateWeightedPool({
        plays,
        assignmentsByPlayId,
        playerPosition,
        playMastery,
        gameDayOnly,
      });
    }

    setQuestionQueue(qs);
    setCurrentIdx(0);
    setLives(STARTING_LIVES);
    setScore(0);
    scoreRef.current = 0;
    setStreak(0);
    setBestStreak(0);
    setQuestionsAnswered(0);
    setQuestionsCorrect(0);
    setCelebration(null);
    setIsNewHighScore(false);
    setLastAnswerCorrect(null);
    setLastCorrectAnswer(null);
    setLastPointsEarned(0);
    setResults([]);
    setGameState('playing');
    gameStartRef.current = Date.now();
    questionStartRef.current = Date.now();

    if (qs.length > 0 && qs[0].timerSeconds) {
      setTimeRemaining(qs[0].timerSeconds);
    } else {
      setTimeRemaining(null);
    }
  }, [plays, allPlays, assignmentsByPlayId, playerPosition, playMastery, gameDayOnly]);

  // ——— Submit Answer ———
  const submitAnswer = useCallback(
    async (answer) => {
      if (!currentQuestion || lastAnswerCorrect != null || gameState !== 'playing') return;

      const isCorrect = answer === currentQuestion.correctAnswer;
      const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);

      setLastAnswerCorrect(isCorrect);
      setLastCorrectAnswer(currentQuestion.correctAnswer);
      setQuestionsAnswered((p) => p + 1);

      let newStreak = 0;
      let pointsEarned = 0;

      if (isCorrect) {
        setQuestionsCorrect((p) => p + 1);
        newStreak = streak + 1;
        setStreak(newStreak);
        setBestStreak((p) => Math.max(p, newStreak));

        // Points
        pointsEarned = calculatePoints(
          currentQuestion.basePoints || 100,
          timeRemaining,
          currentQuestion.timerSeconds,
          newStreak
        );
        setScore((p) => p + pointsEarned);
        scoreRef.current = scoreRef.current + pointsEarned;
        setLastPointsEarned(pointsEarned);

        // Streak celebration check (exact match)
        const cel = [...STREAK_CELEBRATIONS].reverse().find((c) => newStreak === c.streak);
        if (cel) {
          setCelebration(cel);
          setTimeout(() => setCelebration(null), 2500);

          // Life recovery from celebration
          if (cel.recoversLife) {
            setLives((prev) => Math.min(prev + 1, MAX_LIVES));
          }
        }
      } else {
        setStreak(0);
        setLastPointsEarned(0);

        // Lose a life
        setLives((prev) => prev - 1);
      }

      // Result record
      setResults((prev) => [
        ...prev,
        {
          playId: currentQuestion.playId,
          playName: currentQuestion.play?.name || currentQuestion.correctAnswer,
          type: currentQuestion.type,
          questionText: currentQuestion.questionText,
          isCorrect,
          answer,
          correctAnswer: currentQuestion.correctAnswer,
          pointsEarned: isCorrect ? pointsEarned : 0,
        },
      ]);

      // Persist QuizAttempt
      try {
        await base44.entities.QuizAttempt.create({
          user_id: userId,
          team_id: teamId,
          play_id: currentQuestion.playId,
          quiz_type: currentQuestion.type,
          question_data: {
            question: currentQuestion.questionText,
            options: currentQuestion.options,
            correctAnswer: currentQuestion.correctAnswer,
          },
          answer: answer || '(timeout)',
          is_correct: isCorrect,
          time_seconds: elapsed,
          difficulty: 'adaptive',
        });
      } catch (err) {
        console.error('Failed to save QuizAttempt:', err);
      }
    },
    [currentQuestion, lastAnswerCorrect, gameState, streak, timeRemaining, userId, teamId]
  );

  // ——— Next Question (or Game Over) ———
  const nextQuestion = useCallback(() => {
    // Game over: no lives
    if (lives <= 0) {
      setGameState('gameover');
      setLastAnswerCorrect(null);
      setLastCorrectAnswer(null);
      if (scoreRef.current > highScoreRef.current) {
        setHighScore(scoreRef.current);
        highScoreRef.current = scoreRef.current;
        setIsNewHighScore(true);
      }
      return;
    }

    // Game over: no more questions
    if (currentIdx >= questionQueue.length - 1) {
      setGameState('gameover');
      setLastAnswerCorrect(null);
      setLastCorrectAnswer(null);
      if (scoreRef.current > highScoreRef.current) {
        setHighScore(scoreRef.current);
        highScoreRef.current = scoreRef.current;
        setIsNewHighScore(true);
      }
      return;
    }

    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    setLastAnswerCorrect(null);
    setLastCorrectAnswer(null);
    setLastPointsEarned(0);
    questionStartRef.current = Date.now();

    const nextQ = questionQueue[nextIdx];
    if (nextQ?.timerSeconds) {
      setTimeRemaining(nextQ.timerSeconds);
    } else {
      setTimeRemaining(null);
    }
  }, [currentIdx, questionQueue, lives]);

  // ——— Public API ———
  return {
    // State
    gameState,
    lives,
    score,
    highScore,
    streak,
    bestStreak,
    questionsAnswered,
    questionsCorrect,
    currentQuestion,
    questionQueue,
    currentIdx,
    celebration,
    isNewHighScore,
    timeRemaining,
    lastAnswerCorrect,
    lastCorrectAnswer,
    lastPointsEarned,
    results,
    isInitialized,
    playMastery,
    totalTime: Math.round((Date.now() - gameStartRef.current) / 1000),

    // Actions
    startGame,
    submitAnswer,
    nextQuestion,
  };
}
