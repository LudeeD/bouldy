import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { TrendingUp, Target, Award, Calendar } from "lucide-react";
import type { TodoStats } from "../../../types/todo";

interface StatsViewProps {
  vaultPath: string;
}

export default function StatsView({ vaultPath }: StatsViewProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["todo-stats", vaultPath],
    queryFn: async () => invoke<TodoStats>("get_todo_stats", { vaultPath }),
  });

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-light">
        <div className="text-sm text-text-muted">Loading stats...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-light">
        <div className="text-sm text-text-muted">No stats available</div>
      </div>
    );
  }

  const monthEntries = Object.entries(stats.completionsByMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6);

  return (
    <div className="w-full h-full flex flex-col bg-bg-light overflow-y-auto p-4 space-y-4">
      {/* Big Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg border-2 border-border p-4">
          <div className="flex items-center gap-2 text-text-muted mb-2">
            <Target size={16} />
            <span className="text-xs font-medium uppercase">Total</span>
          </div>
          <div className="text-3xl font-semibold text-text">
            {stats.totalCompleted}
          </div>
          <div className="text-xs text-text-muted mt-1">
            tasks completed
          </div>
        </div>

        <div className="bg-bg border-2 border-border p-4">
          <div className="flex items-center gap-2 text-text-muted mb-2">
            <TrendingUp size={16} />
            <span className="text-xs font-medium uppercase">Streak</span>
          </div>
          <div className="text-3xl font-semibold text-primary">
            {stats.currentStreak}
          </div>
          <div className="text-xs text-text-muted mt-1">
            days in a row
          </div>
        </div>

        <div className="bg-bg border-2 border-border p-4">
          <div className="flex items-center gap-2 text-text-muted mb-2">
            <Award size={16} />
            <span className="text-xs font-medium uppercase">Best</span>
          </div>
          <div className="text-3xl font-semibold text-text">
            {stats.longestStreak}
          </div>
          <div className="text-xs text-text-muted mt-1">
            longest streak
          </div>
        </div>

        <div className="bg-bg border-2 border-border p-4">
          <div className="flex items-center gap-2 text-text-muted mb-2">
            <Calendar size={16} />
            <span className="text-xs font-medium uppercase">This Month</span>
          </div>
          <div className="text-3xl font-semibold text-text">
            {monthEntries[0]?.[1] || 0}
          </div>
          <div className="text-xs text-text-muted mt-1">
            tasks done
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      {monthEntries.length > 0 && (
        <div className="bg-bg border-2 border-border p-4">
          <h3 className="text-xs font-medium uppercase text-text-muted mb-3">
            Monthly Breakdown
          </h3>
          <div className="space-y-2">
            {monthEntries.map(([month, count]) => {
              const maxCount = Math.max(...monthEntries.map(([, c]) => c));
              const percentage = (count / maxCount) * 100;

              return (
                <div key={month} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text">{month}</span>
                    <span className="font-medium text-text">{count}</span>
                  </div>
                  <div className="w-full h-2 bg-bg-dark">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Motivational Message */}
      {stats.currentStreak > 0 && (
        <div className="bg-primary border-2 border-primary p-4 text-center">
          <div className="text-bg-light font-medium">
            {stats.currentStreak >= 7
              ? "Amazing streak! Keep it going!"
              : stats.currentStreak >= 3
              ? "Great momentum!"
              : "You're on a roll!"}
          </div>
        </div>
      )}

      {stats.totalCompleted === 0 && (
        <div className="text-center text-sm text-text-muted mt-8">
          Complete some tasks to see your stats!
        </div>
      )}
    </div>
  );
}
