import { useState } from "react";
import { Plus, Check, X } from "lucide-react";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export default function TodoSpace() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState("");

  const addTodo = () => {
    if (newTodoText.trim()) {
      setTodos([
        ...todos,
        {
          id: Date.now().toString(),
          text: newTodoText.trim(),
          completed: false,
        },
      ]);
      setNewTodoText("");
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-sm font-medium text-text mb-3">To-Do</h2>

        {/* Add todo input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a task..."
            className="flex-1 px-3 py-1.5 text-sm bg-bg border-2 border-border-muted focus:outline-none focus:border-primary text-text placeholder:text-text-muted"
          />
          <button
            onClick={addTodo}
            className="px-3 py-1.5 bg-primary text-bg-light hover:opacity-90 transition-opacity border-2 border-primary"
            aria-label="Add todo"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {todos.length === 0 ? (
          <div className="text-center text-sm text-text-muted mt-8">
            No tasks yet
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="bg-bg-light border-2 border-border-muted px-3 py-2 flex items-start gap-3 group transition-colors hover:border-border"
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className={`flex-shrink-0 w-5 h-5 mt-0.5 border-2 transition-colors ${
                  todo.completed
                    ? "bg-primary border-primary"
                    : "border-border hover:border-primary"
                }`}
                aria-label="Toggle todo"
              >
                {todo.completed && (
                  <Check size={14} className="text-bg-light" strokeWidth={3} />
                )}
              </button>

              <span
                className={`flex-1 text-sm transition-all ${
                  todo.completed ? "text-text-muted line-through" : "text-text"
                }`}
              >
                {todo.text}
              </span>

              <button
                onClick={() => deleteTodo(todo.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-bg text-text-muted hover:text-danger transition-all"
                aria-label="Delete todo"
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
