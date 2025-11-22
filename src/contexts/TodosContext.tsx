import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { serializeTodos, parseTodos } from "../utils/todoTxtParser";

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

interface TodosContextType {
  todos: TodoItem[];
  isLoading: boolean;
  error: string | null;
  setTodos: (todos: TodoItem[]) => void;
  loadTodos: () => Promise<void>;
  clearError: () => void;
}

const TodosContext = createContext<TodosContextType | undefined>(undefined);

export function useTodos() {
  const context = useContext(TodosContext);
  if (!context) {
    throw new Error("useTodos must be used within TodosProvider");
  }
  return context;
}

interface TodosProviderProps {
  children: ReactNode;
  vaultPath: string;
}

export function TodosProvider({ children, vaultPath }: TodosProviderProps) {
  const [todos, setTodosState] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const loadTodos = useCallback(async () => {
    try {
      setIsLoading(true);
      const content = await invoke<string>("read_todos", { vaultPath });
      const parsedTodos = parseTodos(content);
      setTodosState(parsedTodos);
    } catch (err) {
      setError(err as string);
      console.error("Error loading todos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [vaultPath]);

  const saveTodos = useCallback(
    async (todosToSave: TodoItem[]) => {
      try {
        const content = serializeTodos(todosToSave);
        await invoke("write_todos", { vaultPath, content });
      } catch (err) {
        setError(err as string);
        console.error("Error saving todos:", err);
      }
    },
    [vaultPath],
  );

  // Auto-save with debounce when todos change
  const setTodos = useCallback(
    (newTodos: TodoItem[]) => {
      setTodosState(newTodos);

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for auto-save (500ms debounce)
      saveTimeoutRef.current = setTimeout(() => {
        saveTodos(newTodos);
      }, 500);
    },
    [saveTodos],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <TodosContext.Provider
      value={{
        todos,
        isLoading,
        error,
        setTodos,
        loadTodos,
        clearError,
      }}
    >
      {children}
    </TodosContext.Provider>
  );
}
