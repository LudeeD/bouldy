import { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export default function TodoSpace() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState('');

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
      setNewTodoText('');
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-3">
          To-Do
        </h2>

        {/* Add todo input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a task..."
            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-slate-700 focus:outline-none focus:border-blue-600 dark:focus:border-blue-600 text-black dark:text-blue-100 placeholder:text-blue-700 dark:placeholder:text-blue-700"
          />
          <button
            onClick={addTodo}
            className="px-3 py-1.5 bg-blue-900 dark:bg-blue-700 text-blue-50 hover:bg-blue-800 dark:hover:bg-blue-600 transition-colors border-2 border-blue-900 dark:border-blue-700"
            aria-label="Add todo"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {todos.length === 0 ? (
          <div className="text-center text-sm text-blue-700 dark:text-blue-700 mt-8">
            No tasks yet
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="bg-white dark:bg-slate-800 border-2 border-blue-100 dark:border-slate-700 px-3 py-2 flex items-start gap-3 group transition-colors hover:border-blue-300 dark:hover:border-slate-600"
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className={`flex-shrink-0 w-5 h-5 mt-0.5 border-2 transition-colors ${
                  todo.completed
                    ? 'bg-blue-900 dark:bg-blue-700 border-blue-900 dark:border-blue-700'
                    : 'border-blue-300 dark:border-slate-600 hover:border-blue-600 dark:hover:border-blue-500'
                }`}
                aria-label="Toggle todo"
              >
                {todo.completed && (
                  <Check size={14} className="text-blue-50" strokeWidth={3} />
                )}
              </button>

              <span
                className={`flex-1 text-sm transition-all ${
                  todo.completed
                    ? 'text-slate-500 dark:text-slate-600 line-through'
                    : 'text-black dark:text-blue-100'
                }`}
              >
                {todo.text}
              </span>

              <button
                onClick={() => deleteTodo(todo.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-950 text-slate-400 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 transition-all"
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
