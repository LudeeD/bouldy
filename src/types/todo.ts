export interface Subtask {
  title: string;
  completed: boolean;
}

export interface TodoItem {
  id: number;
  title: string;
  completed: boolean;
  dueDate?: string;
  subtasks: Subtask[];
}

export interface TodoStats {
  totalCompleted: number;
  currentStreak: number;
  longestStreak: number;
  completionsByMonth: Record<string, number>;
  completionsByDay: Record<string, number>;
}

export interface TodoMetadata {
  dailyLimit: number;
  stats: TodoStats;
}

export interface ArchivedTodo {
  title: string;
  completedDate: string;
  subtasks: Subtask[];
}
