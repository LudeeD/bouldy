import { Subtask, TodoItem } from "../../../types";

/**
 * Serialize todos to todo.txt format
 * Format: [x ]<text> due:<YYYY-MM-DD> id:<taskId>
 * Subtasks: [x ]└─ <text> sup:<parentId>
 */
export function serializeTodos(todos: TodoItem[]): string {
  const lines: string[] = [];

  for (const todo of todos) {
    // Parent task line
    const completionPrefix = todo.completed ? "x " : "";
    const dueDate = todo.dueDate ? ` due:${todo.dueDate}` : "";
    const parentLine = `${completionPrefix}${todo.text}${dueDate} id:${todo.id}`;
    lines.push(parentLine);

    // Subtask lines
    for (const subtask of todo.subtasks) {
      const subCompletionPrefix = subtask.completed ? "x " : "";
      const subtaskLine = `${subCompletionPrefix}└─ ${subtask.text} sup:${todo.id}`;
      lines.push(subtaskLine);
    }
  }

  return lines.join("\n");
}

/**
 * Parse todo.txt format back to TodoItem array
 */
export function parseTodos(content: string): TodoItem[] {
  if (!content.trim()) {
    return [];
  }

  const lines = content.split("\n");
  const parentTodos = new Map<string, TodoItem>();
  const subtasksByParent = new Map<string, Subtask[]>();

  for (const line of lines) {
    if (!line.trim()) continue;

    // Check if it's a subtask (has sup: tag)
    const supMatch = line.match(/sup:(\S+)/);

    if (supMatch) {
      // Parse subtask
      const parentId = supMatch[1];
      const completed = line.trim().startsWith("x ");
      const textMatch = line.match(/^x?\s*└─\s*(.+?)\s+sup:/);
      const text = textMatch ? textMatch[1].trim() : "";

      const subtask: Subtask = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text,
        completed,
      };

      if (!subtasksByParent.has(parentId)) {
        subtasksByParent.set(parentId, []);
      }
      subtasksByParent.get(parentId)!.push(subtask);
    } else {
      // Parse parent task
      const idMatch = line.match(/id:(\S+)/);
      if (!idMatch) continue; // Skip lines without id (malformed)

      const id = idMatch[1];
      const completed = line.trim().startsWith("x ");
      const dueDateMatch = line.match(/due:(\d{4}-\d{2}-\d{2})/);
      const dueDate = dueDateMatch ? dueDateMatch[1] : undefined;

      // Extract text (everything before the first metadata tag)
      let text = line.trim();
      if (completed) {
        text = text.substring(2); // Remove "x "
      }
      // Remove due date and id from text
      text = text
        .replace(/due:\S+/g, "")
        .replace(/id:\S+/g, "")
        .trim();

      const todo: TodoItem = {
        id,
        text,
        completed,
        dueDate,
        subtasks: [],
        isExpanded: false,
      };

      parentTodos.set(id, todo);
    }
  }

  // Attach subtasks to their parents
  for (const [parentId, subtasks] of subtasksByParent.entries()) {
    const parent = parentTodos.get(parentId);
    if (parent) {
      parent.subtasks = subtasks;
    }
    // If parent doesn't exist, subtasks are orphaned and ignored
  }

  return Array.from(parentTodos.values());
}
