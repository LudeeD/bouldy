import { useState, useEffect } from "react";
import {
  Plus,
  Check,
  X,
  Calendar,
  GripVertical,
  Archive,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { TodoItem, TodoMetadata } from "../../types/todo";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import StatsView from "./components/StatsView";
import FilterBar from "./components/FilterBar";

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
    mutationFn: async ({
      title,
      dueDate,
      priority,
      projects,
      contexts,
    }: {
      title: string;
      dueDate?: string;
      priority?: string;
      projects: string[];
      contexts: string[];
    }) => {
      return invoke<TodoItem>("create_todo", {
        vaultPath,
        title,
        dueDate: dueDate || null,
        priority: priority || null,
        projects,
        contexts,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...TODOS_QUERY_KEY, vaultPath],
      });
      queryClient.invalidateQueries({ queryKey: ["projects", vaultPath] });
      queryClient.invalidateQueries({ queryKey: ["contexts", vaultPath] });
      queryClient.invalidateQueries({ queryKey: ["priorities", vaultPath] });
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async (id: number) => {
      return invoke<TodoItem>("toggle_todo", { vaultPath, id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...TODOS_QUERY_KEY, vaultPath],
      });
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: number) => {
      return invoke("delete_todo", { vaultPath, id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...TODOS_QUERY_KEY, vaultPath],
      });
      queryClient.invalidateQueries({ queryKey: ["projects", vaultPath] });
      queryClient.invalidateQueries({ queryKey: ["contexts", vaultPath] });
      queryClient.invalidateQueries({ queryKey: ["priorities", vaultPath] });
    },
  });

  const updateDueDateMutation = useMutation({
    mutationFn: async ({ id, dueDate }: { id: number; dueDate?: string }) => {
      return invoke<TodoItem>("update_todo_due_date", {
        vaultPath,
        id,
        dueDate: dueDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...TODOS_QUERY_KEY, vaultPath],
      });
    },
  });

  const updateMetadataMutation = useMutation({
    mutationFn: async ({
      id,
      priority,
      projects,
      contexts,
    }: {
      id: number;
      priority?: string;
      projects: string[];
      contexts: string[];
    }) => {
      return invoke<TodoItem>("update_todo_metadata", {
        vaultPath,
        id,
        priority: priority || null,
        projects,
        contexts,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...TODOS_QUERY_KEY, vaultPath],
      });
      queryClient.invalidateQueries({ queryKey: ["projects", vaultPath] });
      queryClient.invalidateQueries({ queryKey: ["contexts", vaultPath] });
      queryClient.invalidateQueries({ queryKey: ["priorities", vaultPath] });
    },
  });

  const reorderTodoMutation = useMutation({
    mutationFn: async ({
      oldIndex,
      newIndex,
    }: {
      oldIndex: number;
      newIndex: number;
    }) => {
      return invoke("reorder_todo", { vaultPath, oldIndex, newIndex });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...TODOS_QUERY_KEY, vaultPath],
      });
    },
  });

  const archiveTodosMutation = useMutation({
    mutationFn: async () => {
      return invoke<number>("archive_completed_todos", { vaultPath });
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({
        queryKey: [...TODOS_QUERY_KEY, vaultPath],
      });
      queryClient.invalidateQueries({ queryKey: ["todo-stats", vaultPath] });
      queryClient.invalidateQueries({ queryKey: ["projects", vaultPath] });
      queryClient.invalidateQueries({ queryKey: ["contexts", vaultPath] });
      queryClient.invalidateQueries({ queryKey: ["priorities", vaultPath] });
      if (count > 0) {
        console.log(`Archived ${count} completed tasks`);
      }
    },
  });

  const bulkUpdateDueDatesMutation = useMutation({
    mutationFn: async (updates: Array<[number, string | null]>) => {
      return invoke("bulk_update_due_dates", { vaultPath, updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...TODOS_QUERY_KEY, vaultPath],
      });
    },
  });

  // Fetch metadata for daily limit
  const metadataQuery = useQuery({
    queryKey: ["todo-metadata", vaultPath],
    queryFn: async () =>
      invoke<TodoMetadata>("get_todo_metadata", { vaultPath }),
  });

  return {
    todos: todosQuery.data ?? [],
    isLoading: todosQuery.isLoading,
    error: todosQuery.error,
    dailyLimit: metadataQuery.data?.dailyLimit ?? 5,
    createTodo: createTodoMutation.mutate,
    toggleTodo: toggleTodoMutation.mutate,
    deleteTodo: deleteTodoMutation.mutate,
    updateDueDate: updateDueDateMutation.mutate,
    updateMetadata: updateMetadataMutation.mutate,
    reorderTodo: reorderTodoMutation.mutate,
    archiveTodos: archiveTodosMutation.mutate,
    bulkUpdateDueDates: bulkUpdateDueDatesMutation.mutate,
  };
}

// Sortable Todo Item Component
interface SortableTodoItemProps {
  todo: TodoItem;
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => void;
  updateDueDate: (params: { id: number; dueDate?: string }) => void;
  getTodayString: () => string;
  isPast: (dateString: string) => boolean;
}

function SortableTodoItem({
  todo,
  toggleTodo,
  deleteTodo,
  updateDueDate,
  getTodayString,
  isPast,
}: SortableTodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-1 group/item">
      <div className="flex items-center gap-2 bg-bg-light border border-border-muted px-3 py-2 group-hover/item:border-border transition-colors">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-text-muted hover:text-primary transition-colors p-0.5"
        >
          <GripVertical size={14} />
        </button>

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

        {/* Priority Badge */}
        {todo.priority && (
          <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 flex-shrink-0 font-mono">
            ({todo.priority})
          </span>
        )}

        {/* Project Badges */}
        {todo.projects.map((project) => (
          <span
            key={project}
            className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 flex-shrink-0"
          >
            +{project}
          </span>
        ))}

        {/* Context Badges */}
        {todo.contexts.map((context) => (
          <span
            key={context}
            className="text-xs px-1.5 py-0.5 bg-bg-dark text-text-muted border border-border-muted flex-shrink-0"
          >
            @{context}
          </span>
        ))}

        {/* Date Display */}
        {todo.dueDate && todo.dueDate !== getTodayString() && (
          <div className="relative flex-shrink-0 flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-bg transition-colors cursor-pointer">
            <span
              className={`text-xs ${
                isPast(todo.dueDate)
                  ? "text-danger font-medium"
                  : "text-text-muted"
              }`}
            >
              {new Date(todo.dueDate + "T00:00:00").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" },
              )}
            </span>
            <input
              type="date"
              value={todo.dueDate || ""}
              onChange={(e) =>
                updateDueDate({ id: todo.id, dueDate: e.target.value })
              }
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <button
            onClick={() => deleteTodo(todo.id)}
            className="flex-shrink-0 p-1 hover:bg-bg text-text-muted hover:text-danger transition-all"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Main component
export default function TodoSpace({ vaultPath }: TodoSpaceProps) {
  const {
    todos,
    isLoading,
    dailyLimit,
    createTodo,
    toggleTodo,
    deleteTodo,
    updateDueDate,
    updateMetadata: _updateMetadata,
    reorderTodo,
    archiveTodos,
    bulkUpdateDueDates,
  } = useTodosQuery(vaultPath);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoDate, setNewTodoDate] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "upcoming">("today");
  const [viewMode, setViewMode] = useState<"tasks" | "stats">("tasks");
  const [planningMode, setPlanningMode] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("All");
  const [selectedContext, setSelectedContext] = useState<string>("All");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");

  const hasCompletedTodos = todos.some((t) => t.completed);

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const getTomorrowString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const isPast = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString + "T00:00:00");
    return date < today;
  };

  const filteredTodos = todos.filter((todo) => {
    const today = getTodayString();

    // Date filter
    const dateMatch =
      activeTab === "today"
        ? !todo.dueDate || todo.dueDate <= today
        : todo.dueDate && todo.dueDate > today;

    // Project filter
    const projectMatch =
      selectedProject === "All" || todo.projects.includes(selectedProject);

    // Context filter
    const contextMatch =
      selectedContext === "All" || todo.contexts.includes(selectedContext);

    // Priority filter
    const priorityMatch =
      selectedPriority === "All" || todo.priority === selectedPriority;

    return dateMatch && projectMatch && contextMatch && priorityMatch;
  });

  // Planning mode helpers
  const todayTodos = todos.filter((t) => {
    const today = getTodayString();
    return !t.dueDate || t.dueDate <= today;
  });
  const availableTodos = todos.filter((t) => {
    const today = getTodayString();
    return t.dueDate && t.dueDate > today;
  });

  const moveToToday = (todoId: number) => {
    const today = getTodayString();
    bulkUpdateDueDates([[todoId, today]]);
  };

  const moveToTomorrow = (todoId: number) => {
    const tomorrow = getTomorrowString();
    bulkUpdateDueDates([[todoId, tomorrow]]);
  };

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      const dueDate =
        activeTab === "today" ? getTodayString() : newTodoDate || undefined;
      createTodo({
        title: newTodoText.trim(),
        dueDate,
        priority: selectedPriority !== "All" ? selectedPriority : undefined,
        projects: selectedProject !== "All" ? [selectedProject] : [],
        contexts: selectedContext !== "All" ? [selectedContext] : [],
      });
      setNewTodoText("");
      setNewTodoDate("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTodo();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = filteredTodos.findIndex((t) => t.id === active.id);
    const newIndex = filteredTodos.findIndex((t) => t.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Need to map back to original indices in the full todos array
      const oldGlobalIndex = todos.findIndex(
        (t) => t.id === filteredTodos[oldIndex].id,
      );
      const newGlobalIndex = todos.findIndex(
        (t) => t.id === filteredTodos[newIndex].id,
      );

      reorderTodo({ oldIndex: oldGlobalIndex, newIndex: newGlobalIndex });
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
        <div className="flex items-center gap-2">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-0.5 bg-bg p-0.5 border border-border-muted">
            <button
              onClick={() => setViewMode("tasks")}
              className={`px-2 py-0.5 text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                viewMode === "tasks"
                  ? "bg-highlight text-primary"
                  : "text-text-muted hover:bg-highlight hover:text-primary"
              }`}
            >
              <Check size={12} />
              Tasks
            </button>
            <button
              onClick={() => setViewMode("stats")}
              className={`px-2 py-0.5 text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                viewMode === "stats"
                  ? "bg-highlight text-primary"
                  : "text-text-muted hover:bg-highlight hover:text-primary"
              }`}
            >
              <BarChart3 size={12} />
              Stats
            </button>
          </div>

          {/* Archive Button */}
          {viewMode === "tasks" && hasCompletedTodos && !planningMode && (
            <button
              onClick={() => archiveTodos()}
              className="px-2 py-0.5 text-xs font-medium bg-bg border border-border-muted hover:border-border hover:text-primary transition-colors flex items-center gap-1 text-text-muted"
              title="Archive completed tasks"
            >
              <Archive size={12} />
              Archive
            </button>
          )}

          {/* Plan Day Button */}
          {viewMode === "tasks" && activeTab === "today" && !planningMode && (
            <button
              onClick={() => setPlanningMode(true)}
              className="px-2 py-0.5 text-xs font-medium bg-primary border border-primary hover:opacity-90 transition-opacity flex items-center gap-1 text-bg-light"
              title="Plan your day"
            >
              <Lightbulb size={12} />
              Plan Day
            </button>
          )}

          {/* Exit Planning Button */}
          {planningMode && (
            <button
              onClick={() => setPlanningMode(false)}
              className="px-2 py-0.5 text-xs font-medium bg-bg border border-border-muted hover:border-border hover:text-primary transition-colors text-text"
            >
              Done Planning
            </button>
          )}
        </div>

        {/* Today/Not Today Tabs (only in tasks view) */}
        {viewMode === "tasks" && (
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
        )}
      </div>

      {/* Stats View */}
      {viewMode === "stats" && <StatsView vaultPath={vaultPath} />}

      {/* Tasks View */}
      {viewMode === "tasks" && (
        <>
          {/* Planning Mode UI */}
          {planningMode && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Capacity Indicator */}
              <div className="bg-primary border-2 border-primary p-3 text-center">
                <div className="text-2xl font-semibold text-bg-light">
                  {todayTodos.length} / {dailyLimit}
                </div>
                <div className="text-xs text-bg-light mt-1">
                  tasks selected for today
                </div>
              </div>

              {/* Today's Tasks */}
              <div>
                <h3 className="text-xs font-medium uppercase text-text-muted mb-2">
                  Today's Tasks ({todayTodos.length})
                </h3>
                <div className="space-y-2">
                  {todayTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center gap-2 bg-bg border border-border-muted px-3 py-2"
                    >
                      <span className="flex-1 text-sm text-text">
                        {todo.title}
                      </span>
                    </div>
                  ))}
                  {todayTodos.length === 0 && (
                    <div className="text-sm text-text-muted text-center py-4">
                      No tasks selected for today
                    </div>
                  )}
                </div>
              </div>

              {/* Available Tasks */}
              {availableTodos.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium uppercase text-text-muted mb-2">
                    Available Tasks ({availableTodos.length})
                  </h3>
                  <div className="space-y-2">
                    {availableTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-center gap-2 bg-bg border border-border-muted px-3 py-2"
                      >
                        <span className="flex-1 text-sm text-text">
                          {todo.title}
                        </span>
                        <button
                          onClick={() => moveToToday(todo.id)}
                          disabled={todayTodos.length >= dailyLimit}
                          className={`px-2 py-1 text-xs border transition-colors ${
                            todayTodos.length >= dailyLimit
                              ? "border-border-muted text-text-muted opacity-50 cursor-not-allowed"
                              : "border-primary text-primary hover:bg-primary hover:text-bg-light"
                          }`}
                        >
                          → Today
                        </button>
                        <button
                          onClick={() => moveToTomorrow(todo.id)}
                          className="px-2 py-1 text-xs border border-border-muted text-text-muted hover:border-border hover:text-text transition-colors"
                        >
                          Tomorrow
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {availableTodos.length === 0 && (
                <div className="text-sm text-text-muted text-center py-4">
                  All tasks are already scheduled for today!
                </div>
              )}
            </div>
          )}

          {/* Normal Mode UI */}
          {!planningMode && (
            <>
              {/* Add Task Input */}
              <div className="px-3 py-2 border-b border-border-muted">
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
                            {new Date(
                              newTodoDate + "T00:00:00",
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
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

              {/* Filter Bar - Always visible when filters exist */}
              <div className="px-3 py-2 border-b border-border-muted bg-bg-light">
                <FilterBar
                  vaultPath={vaultPath}
                  selectedProject={selectedProject}
                  selectedContext={selectedContext}
                  selectedPriority={selectedPriority}
                  onProjectChange={setSelectedProject}
                  onContextChange={setSelectedContext}
                  onPriorityChange={setSelectedPriority}
                />
              </div>

              {/* Todo List */}
              <div className="flex-1 overflow-y-auto p-2">
                {filteredTodos.length === 0 ? (
                  <div className="text-center text-sm text-text-muted mt-8">
                    No tasks for {activeTab === "today" ? "today" : "upcoming"}
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={filteredTodos.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {filteredTodos.map((todo) => (
                          <SortableTodoItem
                            key={todo.id}
                            todo={todo}
                            toggleTodo={toggleTodo}
                            deleteTodo={deleteTodo}
                            updateDueDate={updateDueDate}
                            getTodayString={getTodayString}
                            isPast={isPast}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
