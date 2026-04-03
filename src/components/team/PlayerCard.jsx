import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Trophy, Flame, BookOpen, Star, Zap } from 'lucide-react';

const MASTERY_BADGES = {
  mastered: { label: 'Mastered', color: 'bg-primary text-primary-foreground' },
  familiar: { label: 'Familiar', color: 'bg-primary/20 text-primary' },
  learning: { label: 'Learning', color: 'bg-secondary text-foreground-soft' },
  new: { label: 'New', color: 'bg-secondary text-muted-foreground' },
};

function getMasteryLevel(stats) {
  if (!stats) return 'new';
  const accuracy = stats.total_attempts > 0 ? stats.total_correct / stats.total_attempts : 0;
  if (accuracy >= 0.8 && stats.total_attempts >= 6) return 'mastered';
  if (accuracy >= 0.8 && stats.total_attempts >= 3) return 'familiar';
  if (stats.total_attempts >= 1) return 'learning';
  return 'new';
}

/**
 * PlayerCard — trading card style display for a team member.
 * Shows identity (name, number, position) and earned stats.
 */
export default function PlayerCard({ open, onOpenChange, member, stats }) {
  if (!member) return null;

  const mastery = getMasteryLevel(stats);
  const badge = MASTERY_BADGES[mastery];
  const hasStats = stats && (stats.high_score > 0 || stats.total_attempts > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-transparent border-none shadow-none max-w-xs p-0">
        <div className="bg-card border-2 border-primary/30 rounded-2xl overflow-hidden">
          {/* Card top — identity stripe */}
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 px-5 pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground leading-tight">
                  {member.jersey_name || 'Player'}
                </p>
                {member.position && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold bg-primary text-primary-foreground uppercase tracking-wider">
                    {member.position}
                  </span>
                )}
              </div>
              {member.jersey_number && (
                <div className="text-right">
                  <p className="text-4xl font-black text-primary leading-none" style={{ fontFamily: 'Georgia, serif' }}>
                    {member.jersey_number}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Avatar placeholder — jersey number as large visual */}
          <div className="flex items-center justify-center py-6 bg-secondary/30">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
              {member.jersey_number ? (
                <span className="text-3xl font-black text-primary" style={{ fontFamily: 'Georgia, serif' }}>
                  {member.jersey_number}
                </span>
              ) : (
                <Star className="h-8 w-8 text-primary/50" />
              )}
            </div>
          </div>

          {/* Stats section — earned through play, not decoration */}
          <div className="px-5 pb-5 pt-3 space-y-3">
            {/* Mastery badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Mastery</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.color}`}>
                {badge.label}
              </span>
            </div>

            {hasStats ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Trophy className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    {(stats.high_score || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">High Score</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    {stats.plays_mastered || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Mastered</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Flame className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    {stats.best_streak || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Best Streak</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <Zap className="h-5 w-5 text-muted-foreground/50 mx-auto mb-1" />
                <p className="text-sm text-muted-foreground">No quiz stats yet</p>
                <p className="text-xs text-muted-foreground/70">Play Playbook Pro to earn your stats</p>
              </div>
            )}

            {/* Accuracy bar (if they've played) */}
            {stats && stats.total_attempts > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Accuracy</span>
                  <span className="text-xs font-medium text-foreground tabular-nums">
                    {Math.round((stats.total_correct / stats.total_attempts) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.round((stats.total_correct / stats.total_attempts) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
