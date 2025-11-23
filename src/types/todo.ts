export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  subtasks: Subtask[];
  isExpanded: boolean;
}
