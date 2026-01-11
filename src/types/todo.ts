export interface TodoItem {
  id: number;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority?: string;     // (A), (B), (C), etc.
  projects: string[];    // +ProjectName tags
  contexts: string[];    // @ContextName tags
  createdDate?: string;  // YYYY-MM-DD
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
}
