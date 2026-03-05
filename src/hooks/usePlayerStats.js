import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { MASTERY_THRESHOLD } from '@/config/quizConfig';

const DEFAULT_STATS = {
  plays_mastered: 0,
  total_attempts: 0,
  total_correct: 0,
  current_streak: 0,
  best_streak: 0,
  game_day_readiness: 0,
  last_quiz_date: null,
};

/**
 * usePlayerStats — manages PlayerStats entity for a user + team.
 */
export default function usePlayerStats({ userId, teamId }) {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [statsRecord, setStatsRecord] = useState(null); // the full Base44 record
  const [isLoading, setIsLoading] = useState(true);

  // Fetch existing stats
  useEffect(() => {
    const fetch = async () => {
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
          });
        }
      } catch (err) {
        console.error('Failed to fetch PlayerStats:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [userId, teamId]);

  /**
   * Recalculate and save stats after a quiz session.
   * @param {Object} quizResults - { streak, bestStreak }
   * @param {Array} gameDayPlays - plays marked as game_day
   */
  const updateStats = useCallback(async (quizResults, gameDayPlays = []) => {
    if (!userId || !teamId) return;

    try {
      // Fetch all attempts for this user + team
      const allAttempts = await base44.entities.QuizAttempt.filter({
        user_id: userId,
        team_id: teamId,
      });
      const attempts = Array.isArray(allAttempts) ? allAttempts : [];

      const totalAttempts = attempts.length;
      const totalCorrect = attempts.filter((a) => a.is_correct).length;

      // Calculate plays mastered: plays with >80% correct rate
      const attemptsByPlay = {};
      attempts.forEach((a) => {
        if (!attemptsByPlay[a.play_id]) attemptsByPlay[a.play_id] = { correct: 0, total: 0 };
        attemptsByPlay[a.play_id].total++;
        if (a.is_correct) attemptsByPlay[a.play_id].correct++;
      });

      let playsMastered = 0;
      for (const playId of Object.keys(attemptsByPlay)) {
        const { correct, total } = attemptsByPlay[playId];
        if (total >= 2 && (correct / total) * 100 >= MASTERY_THRESHOLD) {
          playsMastered++;
        }
      }

      // Game day readiness
      let gameDayReadiness = 0;
      if (gameDayPlays.length > 0) {
        const gameDayPlayIds = new Set(gameDayPlays.map((p) => p.id));
        let masteredGameDay = 0;
        for (const playId of gameDayPlayIds) {
          const stats = attemptsByPlay[playId];
          if (stats && stats.total >= 2 && (stats.correct / stats.total) * 100 >= MASTERY_THRESHOLD) {
            masteredGameDay++;
          }
        }
        gameDayReadiness = Math.round((masteredGameDay / gameDayPlays.length) * 100);
      }

      // Best streak: max across session and historical
      const bestStreak = Math.max(
        quizResults?.bestStreak || 0,
        statsRecord?.best_streak || 0
      );

      const newStats = {
        user_id: userId,
        team_id: teamId,
        plays_mastered: playsMastered,
        total_attempts: totalAttempts,
        total_correct: totalCorrect,
        current_streak: quizResults?.streak || 0,
        best_streak: bestStreak,
        game_day_readiness: gameDayReadiness,
        last_quiz_date: new Date().toISOString(),
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
      });
    } catch (err) {
      console.error('Failed to update PlayerStats:', err);
    }
  }, [userId, teamId, statsRecord]);

  return { stats, isLoading, updateStats };
}
