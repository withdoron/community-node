import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { deriveMasteryLevel } from '@/config/quizConfig';

const DEFAULT_STATS = {
  plays_mastered: 0,
  total_attempts: 0,
  total_correct: 0,
  current_streak: 0,
  best_streak: 0,
  game_day_readiness: 0,
  last_quiz_date: null,
  high_score: 0,
};

/**
 * Approximate high score from QuizAttempt history.
 * Groups consecutive attempts within 5 minutes into sessions,
 * estimates points per session, returns the max.
 */
function approximateHighScore(attempts) {
  if (!attempts || attempts.length === 0) return 0;

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

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

  let best = 0;
  for (const s of sessions) {
    let total = 0;
    let streak = 0;
    for (const a of s) {
      if (a.is_correct) {
        streak++;
        let pts = 150;
        if (streak >= 10) pts *= 3;
        else if (streak >= 5) pts *= 2;
        total += pts;
      } else {
        streak = 0;
      }
    }
    best = Math.max(best, total);
  }
  return best;
}

/**
 * usePlayerStats — manages PlayerStats entity for a user + team.
 * Includes high score approximation from QuizAttempt history.
 */
export default function usePlayerStats({ userId, teamId }) {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [statsRecord, setStatsRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch existing stats
  useEffect(() => {
    const load = async () => {
      if (!userId || !teamId) {
        setStats(DEFAULT_STATS);
        setIsLoading(false);
        return;
      }
      try {
        const records = await base44.entities.PlayerStats.filter({
          user_id: userId,
          team_id: teamId,
        });
        const list = Array.isArray(records) ? records : [];
        if (list.length > 0) {
          const record = list[0];
          setStatsRecord(record);
          setStats({
            plays_mastered: record.plays_mastered || 0,
            total_attempts: record.total_attempts || 0,
            total_correct: record.total_correct || 0,
            current_streak: record.current_streak || 0,
            best_streak: record.best_streak || 0,
            game_day_readiness: record.game_day_readiness || 0,
            last_quiz_date: record.last_quiz_date || null,
            high_score: record.high_score || 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch PlayerStats:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId, teamId]);

  /**
   * Recalculate and save stats after a game session.
   * @param {Object} gameResults - { score, bestStreak, streak }
   * @param {Array} gameDayPlays - plays marked as game_day
   */
  const updateStats = useCallback(async (gameResults, gameDayPlays = []) => {
    if (!userId || !teamId) return;

    try {
      // Fetch all attempts for this user + team
      const raw = await base44.entities.QuizAttempt.filter({
        user_id: userId,
        team_id: teamId,
      });
      const attempts = Array.isArray(raw) ? raw : [];

      const totalAttempts = attempts.length;
      const totalCorrect = attempts.filter((a) => a.is_correct).length;

      // Plays mastered: derived from attempt history
      const byPlay = {};
      attempts.forEach((a) => {
        if (!a.play_id) return;
        if (!byPlay[a.play_id]) byPlay[a.play_id] = [];
        byPlay[a.play_id].push(a);
      });

      let playsMastered = 0;
      for (const playAttempts of Object.values(byPlay)) {
        if (deriveMasteryLevel(playAttempts) === 'mastered') {
          playsMastered++;
        }
      }

      // Game day readiness
      let gameDayReadiness = 0;
      if (gameDayPlays.length > 0) {
        const gameDayIds = new Set(gameDayPlays.map((p) => p.id));
        let masteredGD = 0;
        for (const pid of gameDayIds) {
          if (byPlay[pid] && deriveMasteryLevel(byPlay[pid]) === 'mastered') {
            masteredGD++;
          }
        }
        gameDayReadiness = Math.round((masteredGD / gameDayPlays.length) * 100);
      }

      // High score: max of current game score and historical approximation
      const approxHS = approximateHighScore(attempts);
      const currentHS = Math.max(
        gameResults?.score || 0,
        statsRecord?.high_score || 0,
        approxHS
      );

      // Best streak: max of session and historical
      const bestStreak = Math.max(
        gameResults?.bestStreak || 0,
        statsRecord?.best_streak || 0
      );

      const newStats = {
        user_id: userId,
        team_id: teamId,
        plays_mastered: playsMastered,
        total_attempts: totalAttempts,
        total_correct: totalCorrect,
        current_streak: gameResults?.streak || 0,
        best_streak: bestStreak,
        game_day_readiness: gameDayReadiness,
        last_quiz_date: new Date().toISOString(),
        high_score: currentHS,
      };

      // Upsert
      if (statsRecord?.id) {
        await base44.entities.PlayerStats.update(statsRecord.id, newStats);
      } else {
        const created = await base44.entities.PlayerStats.create(newStats);
        setStatsRecord(created);
      }

      setStats({
        plays_mastered: newStats.plays_mastered,
        total_attempts: newStats.total_attempts,
        total_correct: newStats.total_correct,
        current_streak: newStats.current_streak,
        best_streak: newStats.best_streak,
        game_day_readiness: newStats.game_day_readiness,
        last_quiz_date: newStats.last_quiz_date,
        high_score: newStats.high_score,
      });
    } catch (err) {
      console.error('Failed to update PlayerStats:', err);
    }
  }, [userId, teamId, statsRecord]);

  return { stats, isLoading, updateStats };
}
