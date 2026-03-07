import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Heart, Trophy, Flame, Check, XIcon, RotateCcw, BookOpen, Zap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlayRenderer from '@/components/field/PlayRenderer';
import useQuiz from '@/hooks/useQuiz';
import usePlayerStats from '@/hooks/usePlayerStats';
import { STARTING_LIVES, MAX_LIVES } from '@/config/quizConfig';
import { ROUTE_GLOSSARY } from '@/config/flagFootball';

// ——— Utilities at module level ———

/**
 * Compute a viewBox that frames ALL routes in a play with padding.
 * Returns a viewBox string like "10 -20 380 220".
 * The viewBox may extend beyond the 0-0-400-200 field to improve aspect ratio.
 */
function computePlayViewBox(assignments, mirrored) {
  const pts = [];
  (assignments || []).forEach((a) => {
    if (a.start_x == null || a.start_y == null) return;
    const sx = mirrored ? 100 - a.start_x : a.start_x;
    pts.push({ x: sx, y: a.start_y });

    let rp = a.route_path;
    if (rp) {
      try {
        if (typeof rp === 'string') rp = JSON.parse(rp);
        if (Array.isArray(rp)) {
          rp.forEach((pt) =>
            pts.push({ x: mirrored ? 100 - pt.x : pt.x, y: pt.y })
          );
        }
      } catch {
        /* ignore parse errors */
      }
    }
  });

  if (pts.length === 0) return null; // fallback to default

  // Bounding box in SVG coords (field is 400×200)
  const xs = pts.map((p) => (p.x / 100) * 400);
  const ys = pts.map((p) => (p.y / 100) * 200);
  let x1 = Math.min(...xs);
  let x2 = Math.max(...xs);
  let y1 = Math.min(...ys);
  let y2 = Math.max(...ys);

  // Generous padding (30 SVG units ≈ 15% of field height)
  const pad = 30;
  x1 = Math.max(0, x1 - pad);
  x2 = Math.min(400, x2 + pad);
  y1 = Math.max(0, y1 - pad);
  y2 = Math.min(200, y2 + pad);

  let w = x2 - x1;
  let h = y2 - y1;

  // Ensure minimum dimensions
  if (w < 200) {
    const diff = 200 - w;
    x1 = Math.max(0, x1 - diff / 2);
    w = 200;
    if (x1 + w > 400) x1 = 400 - w;
  }
  if (h < 100) {
    const diff = 100 - h;
    y1 = Math.max(0, y1 - diff / 2);
    h = 100;
    if (y1 + h > 200) y1 = 200 - h;
  }

  // Improve aspect ratio for vertical display.
  // If too wide & short, extend viewBox BEYOND field to add breathing room.
  // Target max ratio: 2.2:1 — anything wider gets padded vertically.
  const maxRatio = 2.2;
  if (h > 0 && w / h > maxRatio) {
    const targetH = w / maxRatio;
    const extra = targetH - h;
    y1 -= extra / 2; // extend above and below (can go negative)
    h = targetH;
  }

  return `${Math.round(x1)} ${Math.round(y1)} ${Math.round(w)} ${Math.round(h)}`;
}

/**
 * Scale a single route's percentage points into a 300×300 SVG space.
 * Start anchored at (150, 200) with the route filling available space.
 * Returns array of {x, y} in SVG coords, or null if no valid route.
 */
function scaleRouteToSvg(routePath, mirrored) {
  if (!routePath || routePath.length < 2) return null;

  // Apply mirror in percentage space
  const pctPts = routePath.map((p) => ({
    x: mirrored ? 100 - p.x : p.x,
    y: p.y,
  }));

  const startX = pctPts[0].x;
  const startY = pctPts[0].y;
  const deltas = pctPts.map((p) => ({ dx: p.x - startX, dy: p.y - startY }));

  // Find extremes
  const dxMin = Math.min(0, ...deltas.map((d) => d.dx));
  const dxMax = Math.max(0, ...deltas.map((d) => d.dx));
  const dyMin = Math.min(0, ...deltas.map((d) => d.dy)); // negative = upfield
  const dyMax = Math.max(0, ...deltas.map((d) => d.dy)); // positive = downfield

  // Available space from anchor (150, 200) with 30px padding on all sides
  // Left: 120   Right: 120   Up: 170   Down: 70
  const scales = [12]; // max cap prevents tiny routes from exploding
  if (dxMin < 0) scales.push(120 / Math.abs(dxMin));
  if (dxMax > 0) scales.push(120 / dxMax);
  if (dyMin < 0) scales.push(170 / Math.abs(dyMin));
  if (dyMax > 0) scales.push(70 / dyMax);

  const scale = Math.min(...scales);

  return deltas.map((d) => ({
    x: 150 + d.dx * scale,
    y: 200 + d.dy * scale,
  }));
}

/**
 * Standalone SVG for identify_route questions.
 * Bypasses PlayRenderer/FlagFootballField entirely — simple, guaranteed visible.
 */
function RouteVisual({ routePath, positionColor, mirrored }) {
  const pts = scaleRouteToSvg(routePath, mirrored);
  if (!pts) return null;

  const startPt = pts[0];
  const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(' ');

  // Arrowhead at route end
  const lastPt = pts[pts.length - 1];
  const prevPt = pts[pts.length - 2];
  const dx = lastPt.x - prevPt.x;
  const dy = lastPt.y - prevPt.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  let arrowPts = null;
  if (len > 0) {
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const as = 10;
    const bx = lastPt.x - ux * as;
    const by = lastPt.y - uy * as;
    arrowPts = `${lastPt.x},${lastPt.y} ${bx + px * as * 0.5},${by + py * as * 0.5} ${bx - px * as * 0.5},${by - py * as * 0.5}`;
  }

  // Subtle yard lines for field context
  const yardLineYs = [60, 100, 140, 180, 220, 260];

  return (
    <div className="flex justify-center mb-4">
      <svg
        viewBox="0 0 300 300"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        className="rounded-xl border border-amber-500/30"
        style={{ minHeight: 220, maxHeight: 320 }}
      >
        {/* Field background */}
        <rect x="0" y="0" width="300" height="300" fill="#2d5a27" rx="12" />

        {/* Subtle yard lines */}
        {yardLineYs.map((yy) => (
          <line
            key={yy}
            x1="20" y1={yy} x2="280" y2={yy}
            stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"
          />
        ))}

        {/* Scrimmage line at the start y */}
        <line
          x1="20" y1={startPt.y} x2="280" y2={startPt.y}
          stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="6 4"
        />

        {/* Route outline (white glow for pop) */}
        <polyline
          points={pointsStr}
          fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6"
          strokeLinejoin="round" strokeLinecap="round"
        />

        {/* Route line */}
        <polyline
          points={pointsStr}
          fill="none" stroke="#d4a046" strokeWidth="3"
          strokeLinejoin="round" strokeLinecap="round"
        />

        {/* Arrowhead */}
        {arrowPts && <polygon points={arrowPts} fill="#d4a046" />}

        {/* Position marker */}
        <circle
          cx={startPt.x} cy={startPt.y} r="15"
          fill={positionColor || '#94a3b8'}
          stroke="rgba(0,0,0,0.4)" strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

// ——— Sub-components at module level (no focus loss) ———

function Hearts({ lives, maxLives = MAX_LIVES, lostLife }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxLives }).map((_, i) => (
        <Heart
          key={i}
          className={`h-5 w-5 transition-all duration-300 ${
            i < lives
              ? 'text-red-500 fill-red-500'
              : 'text-slate-700 fill-slate-700'
          } ${lostLife && i === lives ? 'animate-heartLose' : ''}`}
        />
      ))}
    </div>
  );
}

function ScoreDisplay({ score, lastPoints }) {
  return (
    <div className="relative flex items-center gap-1.5">
      <Zap className="h-4 w-4 text-amber-500" />
      <span className="text-amber-500 font-bold text-lg tabular-nums">{score.toLocaleString()}</span>
      {lastPoints > 0 && (
        <span
          key={`pts-${score}`}
          className="absolute -top-5 right-0 text-green-400 text-sm font-bold animate-scoreUp pointer-events-none"
        >
          +{lastPoints}
        </span>
      )}
    </div>
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

function CelebrationOverlay({ celebration }) {
  if (!celebration) return null;
  return (
    <div className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center">
      <div className="animate-bounce">
        <div className="bg-amber-500/20 border border-amber-500/50 rounded-2xl px-8 py-6 flex flex-col items-center gap-2 backdrop-blur-sm">
          <span className="text-4xl">{celebration.emoji}</span>
          <span className="text-amber-500 text-xl font-bold">{celebration.message}</span>
          {celebration.recoversLife && (
            <span className="text-green-400 text-sm font-medium flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 fill-green-400" /> +1 Life
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({ result }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg ${
        result.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'
      }`}
    >
      {result.isCorrect ? (
        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
      ) : (
        <XIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm font-medium truncate block">
          {formatRouteLabel(result.playName)}
        </span>
        {!result.isCorrect && (
          <span className="text-slate-400 text-xs">
            Correct: {formatRouteLabel(result.correctAnswer)}
          </span>
        )}
      </div>
      {result.isCorrect && result.pointsEarned > 0 && (
        <span className="text-amber-500 text-sm font-medium">+{result.pointsEarned}</span>
      )}
    </div>
  );
}

/** Format route IDs into readable labels */
function formatRouteLabel(value) {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function PositionBadge({ positionLabel, positionColor }) {
  if (!positionLabel) return null;
  return (
    <div className="flex items-center justify-center gap-2 mb-2">
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: positionColor || '#94a3b8' }}
      />
      <span className="text-slate-300 text-sm font-medium">{positionLabel}</span>
    </div>
  );
}

function WrongAnswerCard({ question }) {
  if (!question) return null;

  let heading = '';
  let description = '';

  if (question.type === 'identify_route') {
    const glossary = ROUTE_GLOSSARY[question.correctAnswer];
    heading = glossary?.name || formatRouteLabel(question.correctAnswer);
    description = glossary?.description || '';
  } else if (question.type === 'name_that_play') {
    heading = question.play?.name || '';
    const formation = question.play?.formation;
    description = formation ? `Formation: ${formatRouteLabel(formation)}` : '';
  } else if (question.type === 'know_your_job') {
    heading = question.positionLabel
      ? `${question.positionLabel} assignment`
      : 'Your assignment';
    description = question.correctAnswer || '';
  }

  if (!heading) return null;

  return (
    <div className="mt-3 bg-slate-800/50 rounded-xl p-4">
      <p className="text-amber-500 font-semibold text-sm">{heading}</p>
      {description && (
        <p className="text-slate-400 text-sm mt-1">{description}</p>
      )}
    </div>
  );
}

// ——— Inline keyframe styles (injected once) ———
const ANIM_STYLES = `
@keyframes heartLose {
  0% { transform: scale(1); }
  30% { transform: scale(1.4); }
  60% { transform: scale(0.6); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes scoreUp {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}
.animate-heartLose { animation: heartLose 0.5s ease-out; }
.animate-scoreUp { animation: scoreUp 0.8s ease-out forwards; }
`;

// ——— Main Component ———

export default function QuizMode({
  team,
  plays = [],
  assignmentsByPlayId = {},
  isCoach,
  currentUserId,
  playerPosition,
  onClose,
  initialPlayFilter,
}) {
  // Filter plays if initial filter provided (e.g., single play practice)
  const quizPlays = useMemo(() => {
    if (initialPlayFilter) {
      return plays.filter((p) => initialPlayFilter.includes(p.id));
    }
    return plays;
  }, [plays, initialPlayFilter]);

  const [gameDayFilter, setGameDayFilter] = useState(false);
  const [lostLife, setLostLife] = useState(false);

  const { stats, updateStats } = usePlayerStats({
    userId: currentUserId,
    teamId: team?.id,
  });

  const game = useQuiz({
    teamId: team?.id,
    userId: currentUserId,
    plays: quizPlays,
    assignmentsByPlayId,
    playerPosition,
    gameDayOnly: gameDayFilter,
  });

  // Auto-advance after answering
  useEffect(() => {
    if (game.lastAnswerCorrect == null) return;
    const delay = game.lastAnswerCorrect ? 1500 : 3000;
    const timer = setTimeout(() => {
      game.nextQuestion();
    }, delay);
    return () => clearTimeout(timer);
  }, [game.lastAnswerCorrect]);

  // Trigger lost-life animation
  useEffect(() => {
    if (game.lastAnswerCorrect === false) {
      setLostLife(true);
      setTimeout(() => setLostLife(false), 600);
    }
  }, [game.lastAnswerCorrect]);

  // When game ends, update stats
  useEffect(() => {
    if (game.gameState === 'gameover') {
      const gameDayPlays = plays.filter((p) => p.game_day && p.side === 'offense');
      updateStats(
        { score: game.score, streak: game.streak, bestStreak: game.bestStreak },
        gameDayPlays
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.gameState]);

  const handleStart = useCallback(() => {
    game.startGame();
  }, [game]);

  const handlePlayAgain = useCallback(() => {
    game.startGame();
  }, [game]);

  // Inject animation styles
  useEffect(() => {
    const id = 'playbook-pro-anims';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = ANIM_STYLES;
      document.head.appendChild(style);
    }
  }, []);

  // ——— START SCREEN ———
  if (game.gameState === 'ready') {
    const offensePlays = quizPlays.filter((p) => p.side === 'offense' && p.status === 'active');
    const availableCount = gameDayFilter
      ? offensePlays.filter((p) => p.game_day).length
      : offensePlays.length;

    // Count mastery levels
    const masteryBreakdown = { new: 0, learning: 0, familiar: 0, mastered: 0 };
    offensePlays.forEach((p) => {
      const m = game.playMastery[p.id] || 'new';
      masteryBreakdown[m]++;
    });

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Playbook Pro</h1>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Lives + High Score */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <Hearts lives={STARTING_LIVES} />
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="font-medium">Best: {game.highScore.toLocaleString()}</span>
              </div>
            </div>

            {/* Mastery breakdown */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-slate-400">{masteryBreakdown.new}</div>
                <div className="text-xs text-slate-500">New</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-400">{masteryBreakdown.learning}</div>
                <div className="text-xs text-slate-500">Learning</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-400">{masteryBreakdown.familiar}</div>
                <div className="text-xs text-slate-500">Familiar</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-500">{masteryBreakdown.mastered}</div>
                <div className="text-xs text-slate-500">Mastered</div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-sm text-slate-300 font-medium">How it works</p>
            <ul className="text-sm text-slate-400 space-y-1">
              <li className="flex items-center gap-2">
                <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500 flex-shrink-0" />
                3 lives — wrong answers cost a life
              </li>
              <li className="flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                Streaks multiply your score
              </li>
              <li className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                Weaker plays appear more often
              </li>
            </ul>
          </div>

          {/* Game day filter */}
          <div
            onClick={() => setGameDayFilter(!gameDayFilter)}
            className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer min-h-[44px]"
          >
            <span className="text-slate-300 text-sm">Game Day plays only</span>
            <div
              className={`relative w-10 h-5 rounded-full transition-colors ${
                gameDayFilter ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-slate-100 transition-transform ${
                  gameDayFilter ? 'left-5' : 'left-0.5'
                }`}
              />
            </div>
          </div>

          {/* Start button */}
          <Button
            type="button"
            onClick={handleStart}
            disabled={availableCount === 0 || !game.isInitialized}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg py-6 min-h-[56px]"
          >
            {!game.isInitialized
              ? 'Loading…'
              : availableCount === 0
                ? 'No plays available'
                : `Play (${availableCount} play${availableCount !== 1 ? 's' : ''})`}
          </Button>
        </div>
      </div>
    );
  }

  // ——— GAME SCREEN ———
  if (game.gameState === 'playing') {
    const q = game.currentQuestion;
    if (!q) {
      return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6">
          <p className="text-slate-400 text-lg mb-4">No questions available.</p>
          <Button
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-400 text-black font-medium"
          >
            Close
          </Button>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
        <CelebrationOverlay celebration={game.celebration} />

        {/* Top bar: hearts, score, streak */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2 space-y-2">
          <div className="flex items-center justify-between">
            <Hearts lives={game.lives} lostLife={lostLife} />
            <ScoreDisplay score={game.score} lastPoints={game.lastPointsEarned} />
            <div className="flex items-center gap-2">
              {game.streak > 0 && (
                <span className="flex items-center gap-1 text-amber-500 text-sm font-medium">
                  <Flame className="h-4 w-4" />
                  {game.streak}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-2 text-slate-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Timer */}
          <TimerBar timeRemaining={game.timeRemaining} timerSeconds={q.timerSeconds} />
        </div>

        {/* Question area */}
        <div className="flex-1 overflow-y-auto flex flex-col p-4 min-h-0">
          {/* Formation hint */}
          {q.showFormationHint && q.play?.formation && (
            <div className="text-center mb-2">
              <span className="bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full">
                Formation: {formatRouteLabel(q.play.formation)}
              </span>
            </div>
          )}

          {/* Visual area */}
          {q.type === 'name_that_play' && (q.play.use_renderer === true || q.play.use_renderer === 'true') ? (
            <div
              className="rounded-xl overflow-hidden bg-slate-900 border border-slate-700 mb-4 flex items-center justify-center"
              style={{ minHeight: 250 }}
            >
              <PlayRenderer
                play={q.play}
                assignments={q.assignments}
                mode="view"
                mirrored={q.mirrored}
                showLabels={q.showLabels}
                viewBoxOverride={computePlayViewBox(q.assignments, q.mirrored)}
                gameMode
              />
            </div>
          ) : q.type === 'name_that_play' && q.play.diagram_image ? (
            <div className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700 mb-4">
              <img src={q.play.diagram_image} alt="" className="w-full aspect-video object-contain" />
            </div>
          ) : q.type === 'identify_route' && q.routePath ? (
            <RouteVisual
              routePath={q.routePath}
              positionColor={q.positionColor}
              mirrored={q.mirrored}
            />
          ) : q.type === 'know_your_job' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-4 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">{q.play.name}</h2>
              {q.showFormationHint && q.play.formation && (
                <span className="bg-slate-800 text-slate-300 text-sm px-3 py-1 rounded">
                  {formatRouteLabel(q.play.formation)}
                </span>
              )}
            </div>
          ) : null}

          {/* Position context below field (identify_route at new/learning only) */}
          {q.type === 'identify_route' && q.showPositionContext && q.positionLabel && (
            <div className="flex items-center justify-center gap-2 mb-2 -mt-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: q.positionColor || '#94a3b8' }}
              />
              <span className="text-slate-500 text-xs">{q.positionLabel}</span>
            </div>
          )}

          {/* Position badge (know_your_job always) */}
          {q.type === 'know_your_job' && (
            <PositionBadge positionLabel={q.positionLabel} positionColor={q.positionColor} />
          )}

          {/* Question text */}
          <p className="text-white text-lg font-semibold mb-4 text-center">{q.questionText}</p>

          {/* Answer options */}
          <div className="space-y-3">
            {q.options.map((option, i) => {
              let btnClass = 'bg-slate-800 border-slate-700 text-white hover:border-slate-600';

              if (game.lastAnswerCorrect != null) {
                if (option === game.lastCorrectAnswer) {
                  btnClass = 'bg-green-500/20 border-green-500 text-green-400';
                } else {
                  const lastResult = game.results[game.results.length - 1];
                  if (lastResult?.answer === option && !lastResult?.isCorrect) {
                    btnClass = 'bg-red-500/20 border-red-500 text-red-400';
                  }
                }
              }

              return (
                <button
                  key={`${option}-${i}`}
                  type="button"
                  onClick={() => game.submitAnswer(option)}
                  disabled={game.lastAnswerCorrect != null}
                  className={`w-full p-4 rounded-xl border text-left font-medium transition-colors min-h-[56px] ${btnClass} disabled:cursor-default`}
                >
                  {formatRouteLabel(option)}
                </button>
              );
            })}
          </div>

          {/* Wrong-answer learning card */}
          {game.lastAnswerCorrect === false && (
            <WrongAnswerCard question={q} />
          )}
        </div>
      </div>
    );
  }

  // ——— GAME OVER SCREEN ———
  if (game.gameState === 'gameover') {
    const totalTime = game.totalTime;
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    const pct =
      game.questionsAnswered > 0
        ? Math.round((game.questionsCorrect / game.questionsAnswered) * 100)
        : 0;

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Game Over</h1>
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
            {game.isNewHighScore && (
              <div className="flex items-center justify-center gap-2 mb-3 text-amber-500 animate-bounce">
                <Trophy className="h-6 w-6" />
                <span className="font-bold text-lg">New High Score!</span>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="h-8 w-8 text-amber-500" />
              <span className="text-5xl font-bold text-white">{game.score.toLocaleString()}</span>
            </div>
            <div className="text-slate-400 text-sm">
              {game.questionsCorrect} / {game.questionsAnswered} correct ({pct}%)
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
                {game.bestStreak}
              </div>
              <div className="text-xs text-slate-400">Best streak</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-white flex items-center justify-center gap-1">
                <Trophy className="h-4 w-4 text-amber-500" />
                {game.highScore.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400">High score</div>
            </div>
          </div>

          {/* Per-question breakdown */}
          {game.results.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Breakdown</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {game.results.map((result, i) => (
                  <ResultRow key={i} result={result} />
                ))}
              </div>
            </div>
          )}

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
