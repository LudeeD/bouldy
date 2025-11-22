import { useState } from "react";
import { Plus, Check, X, Scissors, Calendar } from "lucide-react";

interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  subtasks: Subtask[];
  isExpanded: boolean;
}

export default function TodoSpace() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoDate, setNewTodoDate] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "upcoming">("today");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const isPast = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString + "T00:00:00");
    return date < today;
  };

  const filteredTodos = todos.filter((todo) => {
    const today = getTodayString();
    if (activeTab === "today") {
      return !todo.dueDate || todo.dueDate <= today;
    } else {
      return todo.dueDate && todo.dueDate > today;
    }
  });

  const addTodo = () => {
    if (newTodoText.trim()) {
      const dueDate = activeTab === "today"
        ? getTodayString()
        : (newTodoDate || undefined);

      setTodos([
        ...todos,
        {
          id: Date.now().toString(),
          text: newTodoText.trim(),
          completed: false,
          dueDate,
          subtasks: [],
          isExpanded: false,
        },
      ]);
      setNewTodoText("");
      setNewTodoDate("");
    }
  };

  const addSubtask = (todoId: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === todoId
          ? {
            ...todo,
            subtasks: [
              ...todo.subtasks,
              { id: Date.now().toString(), text: "", completed: false },
            ],
            isExpanded: true,
          }
          : todo,
      ),
    );
  };

  const updateSubtaskText = (todoId: string, subtaskId: string, text: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === todoId
          ? {
            ...todo,
            subtasks: todo.subtasks.map((st) =>
              st.id === subtaskId ? { ...st, text } : st,
            ),
          }
          : todo,
      ),
    );
  };

  const toggleSubtask = (todoId: string, subtaskId: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === todoId
          ? {
            ...todo,
            subtasks: todo.subtasks.map((st) =>
              st.id === subtaskId ? { ...st, completed: !st.completed } : st,
            ),
          }
          : todo,
      ),
    );
  };

  const deleteSubtask = (todoId: string, subtaskId: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === todoId
          ? {
            ...todo,
            subtasks: todo.subtasks.filter((st) => st.id !== subtaskId),
          }
          : todo,
      ),
    );
  };

  const toggleExpand = (todoId: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === todoId ? { ...todo, isExpanded: !todo.isExpanded } : todo,
      ),
    );
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

  const updateTodoDate = (id: string, date: string) => {
    setTodos(
      todos.map((todo) => (todo.id === id ? { ...todo, dueDate: date } : todo)),
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-bg-light border border-border-muted shadow-sm overflow-hidden relative z-10">
      {/* Header */}
      <div className="h-20 flex items-center justify-between px-4 py-2.5 border-b-2 border-border bg-bg-light">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h1 className="text-2xl font-normal text-text tracking-tight">
            Tasks
          </h1>
        </div>

        <div className="flex-shrink-0 ml-6">
          <div className="flex items-center gap-0.5 bg-bg p-1 rounded-lg inline-flex border border-border-muted">
            <button
              onClick={() => setActiveTab("today")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === "today"
                ? "bg-highlight text-primary"
                : "text-text-muted hover:bg-highlight hover:text-primary"
                }`}
            >
              Today
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === "upcoming"
                ? "bg-highlight text-primary"
                : "text-text-muted hover:bg-highlight hover:text-primary"
                }`}
            >
              Not Today
            </button>
          </div>
        </div>
      </div>

      {/* Add Task Input */}
      <div className="px-4 py-3 border-b border-border-muted">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a task..."
            className="flex-1 h-9 px-3 text-sm bg-bg border border-border-muted focus:outline-none focus:border-primary text-text placeholder:text-text-muted"
          />
          {activeTab === "upcoming" && (
            <div className="relative">
              <button
                type="button"
                className="h-9 px-3 border border-border-muted bg-bg text-text-muted hover:text-primary hover:border-border transition-colors flex items-center gap-2 pointer-events-none text-sm"
              >
                <Calendar size={16} />
                {newTodoDate && (
                  <span className="text-xs">
                    {new Date(newTodoDate + "T00:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </span>
                )}
              </button>
              <input
                type="date"
                value={newTodoDate}
                onChange={(e) => {
                  setNewTodoDate(e.target.value);
                  e.target.blur();
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
                title="Pick a date"
              />
            </div>
          )}
          <button
            onClick={addTodo}
            className="h-9 px-3 bg-primary text-bg-light hover:opacity-90 transition-opacity border border-primary flex items-center justify-center"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Todo List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredTodos.length === 0 ? (
          <div className="text-center text-sm text-text-muted mt-8">
            No tasks for {activeTab === "today" ? "today" : "upcoming"}
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <div key={todo.id} className="space-y-1">
              <div className="group flex items-center gap-3 bg-bg-light border border-border-muted px-3 py-2 hover:border-border transition-colors">
                {/* Checkbox */}
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`flex-shrink-0 w-5 h-5 border rounded transition-colors flex items-center justify-center ${todo.completed
                    ? "bg-primary border-primary"
                    : "border-border hover:border-primary"
                    }`}
                >
                  {todo.completed && (
                    <Check size={12} className="text-bg-light" strokeWidth={3} />
                  )}
                </button>

                {/* Task Text */}
                <span
                  className={`flex-1 text-sm transition-all ${todo.completed ? "text-text-muted line-through" : "text-text"
                    }`}
                >
                  {todo.text}
                </span>

                {/* Date Display - visible if date exists and is not today */}
                {todo.dueDate && todo.dueDate !== getTodayString() && (
                  <div className="relative flex-shrink-0 flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-bg transition-colors cursor-pointer group/date">
                    <span
                      className={`text-xs ${isPast(todo.dueDate) ? "text-danger font-medium" : "text-text-muted"
                        }`}
                    >
                      {new Date(todo.dueDate + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )}
                    </span>
                    <input
                      type="date"
                      value={todo.dueDate || ""}
                      onChange={(e) => updateTodoDate(todo.id, e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Split/Add Subtask Button */}
                  <button
                    onClick={() => addSubtask(todo.id)}
                    className="flex-shrink-0 p-1 hover:bg-bg text-text-muted hover:text-primary transition-all"
                    title="Add subtask"
                  >
                    <Scissors size={14} />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="flex-shrink-0 p-1 hover:bg-bg text-text-muted hover:text-danger transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Subtasks */}
              {todo.subtasks.length > 0 && (
                <div className="ml-8 space-y-1">
                  {todo.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="group/sub flex items-center gap-3 bg-bg border border-border-muted px-3 py-1.5 hover:border-border transition-colors"
                    >
                      <button
                        onClick={() => toggleSubtask(todo.id, subtask.id)}
                        className={`flex-shrink-0 w-4 h-4 border rounded transition-colors flex items-center justify-center ${subtask.completed
                          ? "bg-primary border-primary"
                          : "border-border hover:border-primary"
                          }`}
                      >
                        {subtask.completed && (
                          <Check size={10} className="text-bg-light" strokeWidth={3} />
                        )}
                      </button>

                      {editingSubtaskId === subtask.id ? (
                        <input
                          type="text"
                          value={subtask.text}
                          onChange={(e) =>
                            updateSubtaskText(todo.id, subtask.id, e.target.value)
                          }
                          onBlur={() => setEditingSubtaskId(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setEditingSubtaskId(null);
                            if (e.key === "Escape") setEditingSubtaskId(null);
                          }}
                          className="flex-1 text-xs bg-bg border border-primary px-1 focus:outline-none text-text"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => setEditingSubtaskId(subtask.id)}
                          className={`flex-1 text-xs transition-all cursor-text ${subtask.completed
                            ? "text-text-muted line-through"
                            : "text-text-muted"
                            }`}
                        >
                          {subtask.text || "Type here..."}
                        </span>
                      )}

                      <button
                        onClick={() => deleteSubtask(todo.id, subtask.id)}
                        className="flex-shrink-0 opacity-0 group-hover/sub:opacity-100 p-1 hover:bg-bg text-text-muted hover:text-danger transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
