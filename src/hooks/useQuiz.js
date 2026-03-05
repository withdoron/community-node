import { useState, useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { DIFFICULTY_SETTINGS, STREAK_CELEBRATION } from '@/config/quizConfig';
import { getRoutesForPosition } from '@/config/flagFootball';

/**
 * Shuffle an array in place (Fisher-Yates).
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick N random items from arr, excluding items in excludeSet.
 */
function pickRandom(arr, n, excludeSet = new Set()) {
  const filtered = arr.filter((item) => !excludeSet.has(item));
  return shuffle(filtered).slice(0, n);
}

/**
 * Generate questions for a quiz session.
 */
function generateQuestions({ quizType, plays, assignmentsByPlayId, playerPosition, difficulty, gameDayOnly }) {
  const diffSettings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
  let targetPlays = plays.filter((p) => p.side === 'offense' && p.status === 'active');
  if (gameDayOnly) targetPlays = targetPlays.filter((p) => p.game_day);

  const questions = [];

  if (quizType === 'name_that_play') {
    const allPlayNames = targetPlays.map((p) => p.name);

    for (const play of targetPlays) {
      const playAssignments = assignmentsByPlayId[play.id] || [];
      if (play.use_renderer && playAssignments.length === 0) continue;

      const correctAnswer = play.name;
      const wrongCount = Math.min(diffSettings.optionCount - 1, allPlayNames.length - 1);

      // Prefer plays with different formations for wrong answers (easier to distinguish)
      const differentFormation = targetPlays
        .filter((p) => p.id !== play.id && p.formation !== play.formation)
        .map((p) => p.name);
      const sameFormation = targetPlays
        .filter((p) => p.id !== play.id && p.formation === play.formation)
        .map((p) => p.name);

      let wrongAnswers;
      if (difficulty === 'hard') {
        // Hard: prefer same formation (harder to distinguish)
        wrongAnswers = pickRandom(sameFormation, wrongCount);
        if (wrongAnswers.length < wrongCount) {
          wrongAnswers = [
            ...wrongAnswers,
            ...pickRandom(differentFormation, wrongCount - wrongAnswers.length, new Set(wrongAnswers)),
          ];
        }
      } else {
        // Easy/Medium: prefer different formations
        wrongAnswers = pickRandom(differentFormation, wrongCount);
        if (wrongAnswers.length < wrongCount) {
          wrongAnswers = [
            ...wrongAnswers,
            ...pickRandom(sameFormation, wrongCount - wrongAnswers.length, new Set(wrongAnswers)),
          ];
        }
      }

      // Ensure no duplicates
      const uniqueWrong = [...new Set(wrongAnswers)].filter((n) => n !== correctAnswer);
      const options = shuffle([correctAnswer, ...uniqueWrong.slice(0, Math.max(1, diffSettings.optionCount - 1))]);

      questions.push({
        playId: play.id,
        play,
        assignments: playAssignments,
        questionText: 'What play is this?',
        correctAnswer,
        options,
        highlightPosition: null,
      });
    }
  }

  if (quizType === 'know_your_job') {
    if (!playerPosition) return [];

    for (const play of targetPlays) {
      const playAssignments = assignmentsByPlayId[play.id] || [];
      const myAssignment = playAssignments.find(
        (a) => a.position?.toLowerCase() === playerPosition?.toLowerCase()
      );
      if (!myAssignment?.assignment_text) continue;

      const correctAnswer = myAssignment.assignment_text;

      // Wrong answers: same position from other plays
      const otherAssignmentTexts = targetPlays
        .filter((p) => p.id !== play.id)
        .map((p) => {
          const assignments = assignmentsByPlayId[p.id] || [];
          const a = assignments.find(
            (a2) => a2.position?.toLowerCase() === playerPosition?.toLowerCase()
          );
          return a?.assignment_text;
        })
        .filter(Boolean)
        .filter((t) => t !== correctAnswer);

      const wrongCount = Math.min(diffSettings.optionCount - 1, otherAssignmentTexts.length);
      const wrongAnswers = pickRandom([...new Set(otherAssignmentTexts)], wrongCount);

      if (wrongAnswers.length === 0) continue; // Need at least 1 wrong answer

      const options = shuffle([correctAnswer, ...wrongAnswers]);

      questions.push({
        playId: play.id,
        play,
        assignments: playAssignments,
        questionText: `What's your assignment on ${play.name}?`,
        correctAnswer,
        options,
        highlightPosition: null,
      });
    }
  }

  if (quizType === 'identify_route') {
    const pos = playerPosition || 'X';

    for (const play of targetPlays) {
      if (!play.use_renderer) continue; // Only visual builder plays

      const playAssignments = assignmentsByPlayId[play.id] || [];
      const myAssignment = playAssignments.find(
        (a) => a.position?.toLowerCase() === pos?.toLowerCase()
      );
      if (!myAssignment?.movement_type) continue;

      const correctAnswer = myAssignment.movement_type;

      // Wrong answers: other route names from this position's route menu
      const routeMenu = getRoutesForPosition(pos.toUpperCase());
      const allRouteIds = routeMenu
        .filter((r) => r.id !== 'custom' && r.id !== 'block')
        .map((r) => r.id);

      const wrongCount = Math.min(diffSettings.optionCount - 1, allRouteIds.length - 1);
      const wrongAnswers = pickRandom(allRouteIds, wrongCount, new Set([correctAnswer]));

      if (wrongAnswers.length === 0) continue;

      const options = shuffle([correctAnswer, ...wrongAnswers]);

      questions.push({
        playId: play.id,
        play,
        assignments: playAssignments,
        questionText: `What route does ${pos.toUpperCase()} run?`,
        correctAnswer,
        options,
        highlightPosition: pos.toUpperCase(),
      });
    }
  }

  return shuffle(questions);
}

/**
 * useQuiz — manages quiz state, scoring, timer, and Base44 persistence.
 */
export default function useQuiz({
  teamId,
  userId,
  plays = [],
  assignmentsByPlayId = {},
  playerPosition,
  quizType = 'name_that_play',
  difficulty = 'medium',
  gameDayOnly = false,
}) {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(null); // null | true | false
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [results, setResults] = useState([]); // per-play results
  const [quizStartTime] = useState(() => Date.now());
  const timerRef = useRef(null);
  const questionStartRef = useRef(Date.now());

  const diffSettings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
  const currentQuestion = questions[currentIdx] || null;

  // Initialize questions
  const startQuiz = useCallback(() => {
    const qs = generateQuestions({
      quizType,
      plays,
      assignmentsByPlayId,
      playerPosition,
      difficulty,
      gameDayOnly,
    });
    setQuestions(qs);
    setCurrentIdx(0);
    setScore({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
    setIsComplete(false);
    setLastAnswerCorrect(null);
    setLastCorrectAnswer(null);
    setShowCelebration(false);
    setResults([]);
    questionStartRef.current = Date.now();

    if (diffSettings.timerSeconds) {
      setTimeRemaining(diffSettings.timerSeconds);
    } else {
      setTimeRemaining(null);
    }
  }, [quizType, plays, assignmentsByPlayId, playerPosition, difficulty, gameDayOnly, diffSettings.timerSeconds]);

  // Timer countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeRemaining == null || timeRemaining <= 0 || isComplete || lastAnswerCorrect != null) return;

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
  }, [timeRemaining, isComplete, lastAnswerCorrect]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timeRemaining === 0 && lastAnswerCorrect == null && currentQuestion) {
      submitAnswer(null); // timeout = incorrect
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  const submitAnswer = useCallback(async (answer) => {
    if (!currentQuestion || lastAnswerCorrect != null) return;

    const isCorrect = answer === currentQuestion.correctAnswer;
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);

    setLastAnswerCorrect(isCorrect);
    setLastCorrectAnswer(currentQuestion.correctAnswer);

    setScore((prev) => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const newBest = Math.max(prev.bestStreak, newStreak);
      return {
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
        streak: newStreak,
        bestStreak: newBest,
      };
    });

    setResults((prev) => [
      ...prev,
      {
        playId: currentQuestion.playId,
        playName: currentQuestion.play.name,
        isCorrect,
        answer,
        correctAnswer: currentQuestion.correctAnswer,
      },
    ]);

    // Check celebration
    if (isCorrect) {
      setScore((prev) => {
        if (prev.streak > 0 && prev.streak % STREAK_CELEBRATION === 0) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 2000);
        }
        return prev;
      });
    }

    // Save QuizAttempt to Base44
    try {
      await base44.entities.QuizAttempt.create({
        user_id: userId,
        team_id: teamId,
        play_id: currentQuestion.playId,
        quiz_type: quizType,
        question_data: {
          question: currentQuestion.questionText,
          options: currentQuestion.options,
          correctAnswer: currentQuestion.correctAnswer,
        },
        answer: answer || '(timeout)',
        is_correct: isCorrect,
        time_seconds: elapsed,
        difficulty,
      });
    } catch (err) {
      console.error('Failed to save QuizAttempt:', err);
    }
  }, [currentQuestion, lastAnswerCorrect, userId, teamId, quizType, difficulty]);

  const nextQuestion = useCallback(() => {
    if (currentIdx >= questions.length - 1) {
      setIsComplete(true);
      setLastAnswerCorrect(null);
      setLastCorrectAnswer(null);
      return;
    }

    setCurrentIdx((prev) => prev + 1);
    setLastAnswerCorrect(null);
    setLastCorrectAnswer(null);
    questionStartRef.current = Date.now();

    if (diffSettings.timerSeconds) {
      setTimeRemaining(diffSettings.timerSeconds);
    }
  }, [currentIdx, questions.length, diffSettings.timerSeconds]);

  const resetQuiz = useCallback(() => {
    startQuiz();
  }, [startQuiz]);

  return {
    currentQuestion,
    questions,
    currentIdx,
    score,
    isComplete,
    timeRemaining,
    timerSeconds: diffSettings.timerSeconds,
    lastAnswerCorrect,
    lastCorrectAnswer,
    showCelebration,
    results,
    totalTime: Math.round((Date.now() - quizStartTime) / 1000),
    startQuiz,
    submitAnswer,
    nextQuestion,
    resetQuiz,
  };
}
