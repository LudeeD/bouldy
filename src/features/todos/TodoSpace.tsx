import { useState, useEffect } from "react";
import { Plus, Check, X, Scissors, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { TodoItem } from "../../types/todo";

interface TodoSpaceProps {
  vaultPath: string;
}

// Query key for todos
const TODOS_QUERY_KEY = ["todos"];

// Hook to use todos with TanStack Query
function useTodosQuery(vaultPath: string) {
  const queryClient = useQueryClient();

  // Main query for fetching todos
  const todosQuery = useQuery({
    queryKey: [...TODOS_QUERY_KEY, vaultPath],
    queryFn: async () => invoke<TodoItem[]>("load_todos", { vaultPath }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // Listen for external changes
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen("todos_changed", () => {
        queryClient.invalidateQueries({
          queryKey: [...TODOS_QUERY_KEY, vaultPath],
        });
      });
      return unlisten;
    };

    let unlistenFn: (() => void) | null = null;
    setupListener().then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [vaultPath, queryClient]);

  const createTodoMutation = useMutation({
    mutationFn: async ({ title, dueDate }: { title: string; dueDate?: string }) => {
      return invoke<TodoItem>("create_todo", { vaultPath, title, dueDate: dueDate || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TODOS_QUERY_KEY, vaultPath] });
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async (id: number) => {
      return invoke<TodoItem>("toggle_todo", { vaultPath, id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TODOS_QUERY_KEY, vaultPath] });
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: number) => {
      return invoke("delete_todo", { vaultPath, id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TODOS_QUERY_KEY, vaultPath] });
    },
  });

  const updateDueDateMutation = useMutation({
    mutationFn: async ({ id, dueDate }: { id: number; dueDate?: string }) => {
      return invoke<TodoItem>("update_todo_due_date", { vaultPath, id, dueDate: dueDate || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TODOS_QUERY_KEY, vaultPath] });
    },
  });

  const addSubtaskMutation = useMutation({
    mutationFn: async ({ parentId, title }: { parentId: number; title: string }) => {
      return invoke<TodoItem>("add_subtask", { vaultPath, parentId, title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TODOS_QUERY_KEY, vaultPath] });
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async ({ parentId, subtaskIndex }: { parentId: number; subtaskIndex: number }) => {
      return invoke<TodoItem>("delete_subtask", { vaultPath, parentId, subtaskIndex });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TODOS_QUERY_KEY, vaultPath] });
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: async ({ parentId, subtaskIndex }: { parentId: number; subtaskIndex: number }) => {
      return invoke<TodoItem>("toggle_subtask", { vaultPath, parentId, subtaskIndex });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TODOS_QUERY_KEY, vaultPath] });
    },
  });

  return {
    todos: todosQuery.data ?? [],
    isLoading: todosQuery.isLoading,
    error: todosQuery.error,
    createTodo: createTodoMutation.mutate,
    toggleTodo: toggleTodoMutation.mutate,
    deleteTodo: deleteTodoMutation.mutate,
    updateDueDate: updateDueDateMutation.mutate,
    addSubtask: addSubtaskMutation.mutate,
    deleteSubtask: deleteSubtaskMutation.mutate,
    toggleSubtask: toggleSubtaskMutation.mutate,
  };
}

// Main component
export default function TodoSpace({ vaultPath }: TodoSpaceProps) {
  const {
    todos,
    isLoading,
    createTodo,
    toggleTodo,
    deleteTodo,
    updateDueDate,
    addSubtask,
    deleteSubtask,
    toggleSubtask,
  } = useTodosQuery(vaultPath);

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

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      const dueDate = activeTab === "today" ? getTodayString() : newTodoDate || undefined;
      createTodo({ title: newTodoText.trim(), dueDate });
      setNewTodoText("");
      setNewTodoDate("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTodo();
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-light">
        <div className="text-sm text-text-muted">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-bg-light border border-border-muted shadow-sm overflow-hidden relative z-10">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-light">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h1 className="text-sm font-medium text-text">Tasks</h1>
        </div>

        <div className="flex-shrink-0">
          <div className="flex items-center gap-0.5 bg-bg p-0.5 inline-flex border border-border-muted">
            <button
              onClick={() => setActiveTab("today")}
              className={`px-2 py-0.5 text-xs font-medium transition-all duration-200 ${
                activeTab === "today"
                  ? "bg-highlight text-primary"
                  : "text-text-muted hover:bg-highlight hover:text-primary"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`px-2 py-0.5 text-xs font-medium transition-all duration-200 ${
                activeTab === "upcoming"
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
            onClick={handleAddTodo}
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
                  className={`flex-shrink-0 w-5 h-5 border rounded transition-colors flex items-center justify-center ${
                    todo.completed
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
                  className={`flex-1 text-sm transition-all ${
                    todo.completed ? "text-text-muted line-through" : "text-text"
                  }`}
                >
                  {todo.title}
                </span>

                {/* Date Display */}
                {todo.dueDate && todo.dueDate !== getTodayString() && (
                  <div className="relative flex-shrink-0 flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-bg transition-colors cursor-pointer">
                    <span
                      className={`text-xs ${
                        isPast(todo.dueDate) ? "text-danger font-medium" : "text-text-muted"
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
                      onChange={(e) => updateDueDate({ id: todo.id, dueDate: e.target.value })}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => addSubtask({ parentId: todo.id, title: "" })}
                    className="flex-shrink-0 p-1 hover:bg-bg text-text-muted hover:text-primary transition-all"
                    title="Add subtask"
                  >
                    <Scissors size={14} />
                  </button>

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
                  {todo.subtasks.map((subtask, index) => (
                    <div
                      key={index}
                      className="group/sub flex items-center gap-3 bg-bg border border-border-muted px-3 py-1.5 hover:border-border transition-colors"
                    >
                      <button
                        onClick={() =>
                          toggleSubtask({
                            parentId: todo.id,
                            subtaskIndex: index,
                          })
                        }
                        className={`flex-shrink-0 w-4 h-4 border rounded transition-colors flex items-center justify-center ${
                          subtask.completed
                            ? "bg-primary border-primary"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        {subtask.completed && (
                          <Check size={10} className="text-bg-light" strokeWidth={3} />
                        )}
                      </button>

                      {editingSubtaskId === `${todo.id}-${index}` ? (
                        <input
                          type="text"
                          value={subtask.title}
                          onChange={() => {}}
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
                          onClick={() => setEditingSubtaskId(`${todo.id}-${index}`)}
                          className={`flex-1 text-xs transition-all cursor-text ${
                            subtask.completed
                              ? "text-text-muted line-through"
                              : "text-text-muted"
                          }`}
                        >
                          {subtask.title || "Type here..."}
                        </span>
                      )}

                      <button
                        onClick={() =>
                          deleteSubtask({
                            parentId: todo.id,
                            subtaskIndex: index,
                          })
                        }
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
