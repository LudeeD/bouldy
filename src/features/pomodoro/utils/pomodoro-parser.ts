import { PomodoroSession } from "../../../types/pomodoro";

export function parseSessions(content: string): PomodoroSession[] {
  const sessions: PomodoroSession[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Expected format: [id]|[type]|[duration]|[startTime]|[endTime]|[completed]
    const parts = trimmed.split("|");
    if (parts.length >= 5) {
      const [id, type, duration, startTime, endTime, completed] = parts;

      if (type === "work" || type === "short-break" || type === "long-break") {
        sessions.push({
          id,
          type,
          duration: parseInt(duration, 10),
          startTime,
          endTime: endTime || undefined,
          completed: completed === "true",
        });
      }
    }
  }

  return sessions;
}

export function serializeSessions(sessions: PomodoroSession[]): string {
  const lines = ["# Pomodoro Sessions", ""];

  for (const session of sessions) {
    const parts = [
      session.id,
      session.type,
      session.duration.toString(),
      session.startTime,
      session.endTime || "",
      session.completed.toString(),
    ];
    lines.push(parts.join("|"));
  }

  return lines.join("\n");
}
