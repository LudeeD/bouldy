import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { PomodoroSession } from "../../../types/pomodoro";
import { serializeSessions, parseSessions } from "../utils/pomodoro-parser";

interface PomodoroContextType {
  currentSession: PomodoroSession | null;
  sessions: PomodoroSession[];
  isRunning: boolean;
  timeRemaining: number;
  startSession: (type: "work" | "short-break" | "long-break") => void;
  pauseSession: () => void;
  resumeSession: () => void;
  skipSession: () => void;
  resetSession: () => void;
  loadSessions: () => Promise<void>;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(
  undefined,
);

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error("usePomodoro must be used within PomodoroProvider");
  }
  return context;
}

interface PomodoroProviderProps {
  children: ReactNode;
  vaultPath: string;
}

const WORK_DURATION = 25 * 60; // 25 minutes
const SHORT_BREAK_DURATION = 5 * 60; // 5 minutes
const LONG_BREAK_DURATION = 15 * 60; // 15 minutes

export function PomodoroProvider({
  children,
  vaultPath,
}: PomodoroProviderProps) {
  const [sessions, setSessionsState] = useState<PomodoroSession[]>([]);
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(
    null,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(WORK_DURATION);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const content = await invoke<string>("read_pomodoros", { vaultPath });
      const parsedSessions = parseSessions(content);
      setSessionsState(parsedSessions);
    } catch (err) {
      console.error("Error loading pomodoro sessions:", err);
    }
  }, [vaultPath]);

  const saveSessions = useCallback(
    async (sessionsToSave: PomodoroSession[]) => {
      try {
        const content = serializeSessions(sessionsToSave);
        await invoke("write_pomodoros", { vaultPath, content });
      } catch (err) {
        console.error("Error saving pomodoro sessions:", err);
      }
    },
    [vaultPath],
  );

  const updateSessions = useCallback(
    (newSessions: PomodoroSession[]) => {
      setSessionsState(newSessions);

      // Debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveSessions(newSessions);
      }, 500);
    },
    [saveSessions],
  );

  const getDurationForType = (
    type: "work" | "short-break" | "long-break",
  ): number => {
    switch (type) {
      case "work":
        return WORK_DURATION;
      case "short-break":
        return SHORT_BREAK_DURATION;
      case "long-break":
        return LONG_BREAK_DURATION;
    }
  };

  const startSession = useCallback(
    (type: "work" | "short-break" | "long-break") => {
      const duration = getDurationForType(type);
      const newSession: PomodoroSession = {
        id: Date.now().toString(),
        type,
        duration,
        startTime: new Date().toISOString(),
        completed: false,
      };

      setCurrentSession(newSession);
      setTimeRemaining(duration);
      setIsRunning(true);
    },
    [],
  );

  const pauseSession = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resumeSession = useCallback(() => {
    setIsRunning(true);
  }, []);

  const completeSession = useCallback(() => {
    if (!currentSession) return;

    const completedSession: PomodoroSession = {
      ...currentSession,
      endTime: new Date().toISOString(),
      completed: true,
      duration: currentSession.duration - timeRemaining, // Actual duration
    };

    updateSessions([...sessions, completedSession]);

    // Auto-start next session based on completed work sessions
    const todaysWorkSessions = sessions.filter((s) => {
      const today = new Date().toISOString().split("T")[0];
      const sessionDate = new Date(s.startTime).toISOString().split("T")[0];
      return sessionDate === today && s.type === "work" && s.completed;
    }).length;

    // If we just completed a work session, determine break type
    if (completedSession.type === "work") {
      const nextBreak =
        (todaysWorkSessions + 1) % 4 === 0 ? "long-break" : "short-break";
      startSession(nextBreak);
    } else {
      // After break, start work session
      startSession("work");
    }
  }, [currentSession, sessions, timeRemaining, updateSessions, startSession]);

  const skipSession = useCallback(() => {
    if (!currentSession) return;

    const skippedSession: PomodoroSession = {
      ...currentSession,
      endTime: new Date().toISOString(),
      completed: false,
    };

    updateSessions([...sessions, skippedSession]);
    setCurrentSession(null);
    setIsRunning(false);
    setTimeRemaining(WORK_DURATION);
  }, [currentSession, sessions, updateSessions]);

  const resetSession = useCallback(() => {
    if (!currentSession) return;
    setTimeRemaining(currentSession.duration);
    setIsRunning(false);
  }, [currentSession]);

  // Timer tick
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && currentSession) {
      completeSession();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isRunning, timeRemaining, currentSession, completeSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <PomodoroContext.Provider
      value={{
        currentSession,
        sessions,
        isRunning,
        timeRemaining,
        startSession,
        pauseSession,
        resumeSession,
        skipSession,
        resetSession,
        loadSessions,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}
