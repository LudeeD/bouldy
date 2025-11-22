import { useState } from 'react';

interface NewNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}

export default function NewNoteDialog({ isOpen, onClose, onCreate }: NewNoteDialogProps) {
  const [title, setTitle] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onCreate(title.trim());
      setTitle('');
      onClose();
    }
  };

  const handleCancel = () => {
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 border-2 border-blue-900 dark:border-blue-500 p-6 w-full max-w-md">
        <h2 className="text-xl font-medium text-blue-900 dark:text-blue-400 mb-4">
          New Note
        </h2>

        <form onSubmit={handleSubmit}>
          <label className="block mb-4">
            <span className="text-sm text-slate-700 dark:text-slate-300 mb-2 block">
              Title
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              className="w-full px-3 py-2 border-2 border-blue-900 dark:border-blue-500 bg-white dark:bg-slate-950 text-blue-900 dark:text-blue-100 placeholder:text-blue-600 dark:placeholder:text-blue-700 focus:outline-none focus:border-blue-700 dark:focus:border-blue-400"
              autoFocus
            />
          </label>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border-2 border-blue-900 dark:border-blue-500 text-blue-900 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-amber-950 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 border-2 border-blue-900 dark:border-blue-500 bg-blue-900 dark:bg-blue-500 text-blue-50 dark:text-slate-950 hover:bg-blue-800 dark:hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
