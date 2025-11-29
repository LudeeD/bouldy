import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";
import { usePomodoro } from "../context/PomodoroContext";

export default function PomodoroPanel() {
  const {
    currentSession,
    isRunning,
    timeRemaining,
    sessions,
    startSession,
    pauseSession,
    resumeSession,
    skipSession,
    resetSession,
  } = usePomodoro();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getSessionTypeLabel = (type: string): string => {
    switch (type) {
      case "work":
        return "Focus Time";
      case "short-break":
        return "Short Break";
      case "long-break":
        return "Long Break";
      default:
        return "";
    }
  };

  const getTodaysSessions = () => {
    const today = new Date().toISOString().split("T")[0];
    return sessions.filter((session) => {
      const sessionDate = new Date(session.startTime)
        .toISOString()
        .split("T")[0];
      return (
        sessionDate === today && session.type === "work" && session.completed
      );
    });
  };

  const todaysSessions = getTodaysSessions();
  const completedWorkSessions = todaysSessions.length;

  return (
    <div className="w-full h-full flex flex-col bg-bg-light border border-border-muted shadow-sm overflow-hidden relative z-10">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-light">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h1 className="text-sm font-medium text-text">Pomodoro</h1>
        </div>
        <div className="text-xs text-text-muted">
          {completedWorkSessions}{" "}
          {completedWorkSessions === 1 ? "session" : "sessions"} today
        </div>
      </div>

      {/* Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {currentSession ? (
          <>
            <div className="text-xs font-medium text-text-muted mb-2 tracking-wider uppercase">
              {getSessionTypeLabel(currentSession.type)}
            </div>
            <div className="text-7xl font-bold text-primary mb-8 tabular-nums">
              {formatTime(timeRemaining)}
            </div>
            <div className="flex items-center gap-3">
              {isRunning ? (
                <button
                  onClick={pauseSession}
                  className="w-16 h-16 bg-primary text-bg-light hover:opacity-90 transition-opacity border-2 border-primary flex items-center justify-center"
                  title="Pause"
                >
                  <Pause size={28} />
                </button>
              ) : (
                <button
                  onClick={resumeSession}
                  className="w-16 h-16 bg-primary text-bg-light hover:opacity-90 transition-opacity border-2 border-primary flex items-center justify-center"
                  title="Resume"
                >
                  <Play size={28} />
                </button>
              )}
              <button
                onClick={skipSession}
                className="w-12 h-12 bg-bg border-2 border-border hover:border-primary hover:text-primary text-text-muted transition-all flex items-center justify-center"
                title="Skip"
              >
                <SkipForward size={20} />
              </button>
              <button
                onClick={resetSession}
                className="w-12 h-12 bg-bg border-2 border-border hover:border-danger hover:text-danger text-text-muted transition-all flex items-center justify-center"
                title="Reset"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-7xl font-bold text-text-muted mb-8 tabular-nums">
              25:00
            </div>
            <button
              onClick={() => startSession("work")}
              className="w-16 h-16 bg-primary text-bg-light hover:opacity-90 transition-opacity border-2 border-primary flex items-center justify-center"
              title="Start Focus Session"
            >
              <Play size={28} />
            </button>
            <p className="text-xs text-text-muted mt-4">
              Start a focus session
            </p>
          </>
        )}
      </div>

      {/* Session History */}
      <div className="border-t border-border-muted p-4">
        <h2 className="text-xs font-medium text-text mb-3 uppercase tracking-wider">
          Today's Sessions
        </h2>
        {todaysSessions.length === 0 ? (
          <p className="text-xs text-text-muted">No completed sessions yet</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {todaysSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between bg-bg border border-border-muted px-3 py-2"
              >
                <span className="text-xs text-text">
                  {new Date(session.startTime).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
                <span className="text-xs text-text-muted">
                  {Math.round(session.duration / 60)} min
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
