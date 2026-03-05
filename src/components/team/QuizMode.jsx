import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Eye, Target, Route, Trophy, Flame, Check, XIcon, RotateCcw, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlayRenderer from '@/components/field/PlayRenderer';
import useQuiz from '@/hooks/useQuiz';
import usePlayerStats from '@/hooks/usePlayerStats';
import { QUIZ_TYPES, DIFFICULTY_SETTINGS, STREAK_CELEBRATION } from '@/config/quizConfig';

const ICON_MAP = { Eye, Target, Route };

// ——— Sub-components defined at module level (no focus loss) ———

function QuizTypeCard({ type, isSelected, onClick }) {
  const Icon = ICON_MAP[type.icon] || Eye;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-xl border text-left transition-colors min-h-[44px] ${
        isSelected
          ? 'bg-amber-500/10 border-amber-500 text-white'
          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon className={`h-5 w-5 ${isSelected ? 'text-amber-500' : 'text-slate-400'}`} />
        <span className="font-semibold">{type.label}</span>
      </div>
      <p className="text-sm text-slate-400">{type.description}</p>
    </button>
  );
}

function DifficultyChip({ id, label, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
        isSelected
          ? 'bg-amber-500 text-black'
          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
      }`}
    >
      {label}
    </button>
  );
}

function TimerBar({ timeRemaining, timerSeconds }) {
  if (timerSeconds == null || timeRemaining == null) return null;
  const pct = Math.max(0, (timeRemaining / timerSeconds) * 100);
  const isLow = timeRemaining <= 5;
  return (
    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-linear ${
          isLow ? 'bg-red-500' : 'bg-amber-500'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StreakCelebration() {
  return (
    <div className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center">
      <div className="animate-bounce">
        <div className="bg-amber-500/20 border border-amber-500/50 rounded-2xl px-8 py-6 flex flex-col items-center gap-2">
          <Flame className="h-12 w-12 text-amber-500" />
          <span className="text-amber-500 text-xl font-bold">On Fire!</span>
          <span className="text-slate-400 text-sm">{STREAK_CELEBRATION} in a row!</span>
        </div>
      </div>
    </div>
  );
}

function ResultRow({ result }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${
      result.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'
    }`}>
      {result.isCorrect ? (
        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
      ) : (
        <XIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm font-medium truncate block">{result.playName}</span>
        {!result.isCorrect && (
          <span className="text-slate-400 text-xs">Correct: {formatRouteLabel(result.correctAnswer)}</span>
        )}
      </div>
    </div>
  );
}

/** Format route IDs into readable labels */
function formatRouteLabel(value) {
  if (!value) return '—';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ——— Main Component ———

export default function QuizMode({
  team,
  plays = [],
  assignmentsByPlayId = {},
  isCoach,
  currentUserId,
  playerPosition,
  onClose,
  initialQuizType,
  initialPlayFilter,
}) {
  const [phase, setPhase] = useState('start'); // 'start' | 'quiz' | 'results'
  const [selectedType, setSelectedType] = useState(initialQuizType || 'name_that_play');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [gameDayFilter, setGameDayFilter] = useState(false);

  // Filter plays if initial filter provided (e.g., single play quiz)
  const quizPlays = useMemo(() => {
    if (initialPlayFilter) {
      return plays.filter((p) => initialPlayFilter.includes(p.id));
    }
    return plays;
  }, [plays, initialPlayFilter]);

  const { stats, updateStats } = usePlayerStats({
    userId: currentUserId,
    teamId: team?.id,
  });

  const quiz = useQuiz({
    teamId: team?.id,
    userId: currentUserId,
    plays: quizPlays,
    assignmentsByPlayId,
    playerPosition,
    quizType: selectedType,
    difficulty: selectedDifficulty,
    gameDayOnly: gameDayFilter,
  });

  // Auto-advance after answering
  useEffect(() => {
    if (quiz.lastAnswerCorrect == null) return;
    const delay = quiz.lastAnswerCorrect ? 1500 : 3000;
    const timer = setTimeout(() => {
      quiz.nextQuestion();
    }, delay);
    return () => clearTimeout(timer);
  }, [quiz.lastAnswerCorrect]);

  // When quiz completes, update stats and switch to results
  useEffect(() => {
    if (quiz.isComplete && phase === 'quiz') {
      setPhase('results');
      const gameDayPlays = plays.filter((p) => p.game_day && p.side === 'offense');
      updateStats(
        { streak: quiz.score.streak, bestStreak: quiz.score.bestStreak },
        gameDayPlays
      );
    }
  }, [quiz.isComplete, phase]);

  const handleStart = useCallback(() => {
    quiz.startQuiz();
    setPhase('quiz');
  }, [quiz]);

  const handlePlayAgain = useCallback(() => {
    setPhase('start');
  }, []);

  // ——— START SCREEN ———
  if (phase === 'start') {
    const offensePlays = quizPlays.filter((p) => p.side === 'offense' && p.status === 'active');
    const availableCount = gameDayFilter
      ? offensePlays.filter((p) => p.game_day).length
      : offensePlays.length;

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Quiz Time!</h1>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Quiz type selector */}
          <div className="space-y-3">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Quiz Type</p>
            {Object.values(QUIZ_TYPES).map((type) => (
              <QuizTypeCard
                key={type.id}
                type={type}
                isSelected={selectedType === type.id}
                onClick={() => setSelectedType(type.id)}
              />
            ))}
          </div>

          {/* Difficulty */}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Difficulty</p>
            <div className="flex gap-2">
              {Object.entries(DIFFICULTY_SETTINGS).map(([id, { label }]) => (
                <DifficultyChip
                  key={id}
                  id={id}
                  label={label}
                  isSelected={selectedDifficulty === id}
                  onClick={() => setSelectedDifficulty(id)}
                />
              ))}
            </div>
          </div>

          {/* Game day filter */}
          <div
            onClick={() => setGameDayFilter(!gameDayFilter)}
            className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer"
          >
            <span className="text-slate-300 text-sm">Game Day plays only</span>
            <div className={`relative w-10 h-5 rounded-full transition-colors ${
              gameDayFilter ? 'bg-amber-500' : 'bg-slate-700'
            }`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-slate-100 transition-transform ${
                gameDayFilter ? 'left-5' : 'left-0.5'
              }`} />
            </div>
          </div>

          {/* Stats summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Your Stats</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-amber-500">{stats.plays_mastered}</div>
                <div className="text-xs text-slate-400">Mastered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.current_streak}</div>
                <div className="text-xs text-slate-400">Streak</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.best_streak}</div>
                <div className="text-xs text-slate-400">Best</div>
              </div>
            </div>
          </div>

          {/* Start button */}
          <Button
            type="button"
            onClick={handleStart}
            disabled={availableCount === 0}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg py-6 min-h-[56px]"
          >
            {availableCount === 0
              ? 'No plays available'
              : `Start Quiz (${availableCount} play${availableCount !== 1 ? 's' : ''})`}
          </Button>
        </div>
      </div>
    );
  }

  // ——— QUIZ SCREEN ———
  if (phase === 'quiz') {
    const q = quiz.currentQuestion;
    if (!q) {
      // Edge case: no questions generated
      return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6">
          <p className="text-slate-400 text-lg mb-4">No questions available for this quiz type.</p>
          <Button onClick={onClose} className="bg-amber-500 hover:bg-amber-400 text-black font-medium">
            Close
          </Button>
        </div>
      );
    }

    const progressPct = ((quiz.currentIdx + 1) / quiz.questions.length) * 100;

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
        {quiz.showCelebration && <StreakCelebration />}

        {/* Top bar */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2 space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="p-2 -ml-2 text-slate-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
            <span className="text-slate-400 text-sm">
              {quiz.currentIdx + 1} / {quiz.questions.length}
            </span>
            <div className="flex items-center gap-2">
              {quiz.score.streak > 0 && (
                <span className="flex items-center gap-1 text-amber-500 text-sm font-medium">
                  <Flame className="h-4 w-4" />
                  {quiz.score.streak}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Timer */}
          <TimerBar timeRemaining={quiz.timeRemaining} timerSeconds={quiz.timerSeconds} />
        </div>

        {/* Question area */}
        <div className="flex-1 overflow-y-auto flex flex-col p-4 min-h-0">
          {/* Visual area */}
          {selectedType === 'name_that_play' && q.play.use_renderer ? (
            <div className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700 mb-4" style={{ minHeight: '35vh' }}>
              <PlayRenderer
                play={q.play}
                assignments={q.assignments}
                mode="view"
              />
            </div>
          ) : selectedType === 'name_that_play' && q.play.diagram_image ? (
            <div className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700 mb-4">
              <img src={q.play.diagram_image} alt="" className="w-full aspect-video object-contain" />
            </div>
          ) : selectedType === 'identify_route' && q.play.use_renderer ? (
            <div className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700 mb-4" style={{ minHeight: '35vh' }}>
              <PlayRenderer
                play={q.play}
                assignments={q.assignments}
                highlightPosition={q.highlightPosition}
                mode="study"
              />
            </div>
          ) : selectedType === 'know_your_job' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-4 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">{q.play.name}</h2>
              <span className="bg-slate-800 text-slate-300 text-sm px-3 py-1 rounded">
                {q.play.formation || '—'}
              </span>
            </div>
          ) : null}

          {/* Question text */}
          <p className="text-white text-lg font-semibold mb-4 text-center">{q.questionText}</p>

          {/* Answer options */}
          <div className="space-y-3">
            {q.options.map((option, i) => {
              let btnClass = 'bg-slate-800 border-slate-700 text-white hover:border-slate-600';

              if (quiz.lastAnswerCorrect != null) {
                if (option === quiz.lastCorrectAnswer) {
                  btnClass = 'bg-green-500/20 border-green-500 text-green-400';
                } else if (option === quiz.lastAnswerCorrect === false && option !== quiz.lastCorrectAnswer) {
                  // Check if this was the selected wrong answer
                  const lastResult = quiz.results[quiz.results.length - 1];
                  if (lastResult?.answer === option && !lastResult?.isCorrect) {
                    btnClass = 'bg-red-500/20 border-red-500 text-red-400';
                  }
                }
              }

              return (
                <button
                  key={`${option}-${i}`}
                  type="button"
                  onClick={() => quiz.submitAnswer(option)}
                  disabled={quiz.lastAnswerCorrect != null}
                  className={`w-full p-4 rounded-xl border text-left font-medium transition-colors min-h-[56px] ${btnClass} disabled:cursor-default`}
                >
                  {formatRouteLabel(option)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ——— RESULTS SCREEN ———
  if (phase === 'results') {
    const pct = quiz.score.total > 0 ? Math.round((quiz.score.correct / quiz.score.total) * 100) : 0;
    const totalTime = quiz.totalTime;
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    const isNewBest = quiz.score.bestStreak > (stats.best_streak || 0);

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Results</h1>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Score card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
            {isNewBest && (
              <div className="flex items-center justify-center gap-2 mb-3 text-amber-500">
                <Trophy className="h-6 w-6" />
                <span className="font-bold">New Best Streak!</span>
              </div>
            )}
            <div className="text-5xl font-bold text-white mb-1">
              {quiz.score.correct} / {quiz.score.total}
            </div>
            <div className={`text-2xl font-semibold ${pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-amber-500' : 'text-red-400'}`}>
              {pct}%
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-white">
                {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
              </div>
              <div className="text-xs text-slate-400">Time</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-amber-500 flex items-center justify-center gap-1">
                <Flame className="h-4 w-4" />
                {quiz.score.bestStreak}
              </div>
              <div className="text-xs text-slate-400">Best streak</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-white">{stats.plays_mastered}</div>
              <div className="text-xs text-slate-400">Mastered</div>
            </div>
          </div>

          {/* Per-play breakdown */}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Breakdown</p>
            <div className="space-y-2">
              {quiz.results.map((result, i) => (
                <ResultRow key={i} result={result} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-transparent hover:border-amber-500 hover:text-amber-500 min-h-[48px]"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Playbook
            </Button>
            <Button
              type="button"
              onClick={handlePlayAgain}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[48px]"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Play Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
