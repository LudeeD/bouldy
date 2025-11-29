export interface PomodoroSession {
  id: string;
  type: "work" | "short-break" | "long-break";
  duration: number; // in seconds
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp (undefined if session incomplete)
  completed: boolean;
}

export interface PomodoroState {
  currentSession: PomodoroSession | null;
  sessions: PomodoroSession[]; // History of all sessions
  isRunning: boolean;
  timeRemaining: number; // in seconds
  workDuration: number; // default 25 minutes
  shortBreakDuration: number; // default 5 minutes
  longBreakDuration: number; // default 15 minutes
  sessionsUntilLongBreak: number; // default 4
}
