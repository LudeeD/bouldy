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
