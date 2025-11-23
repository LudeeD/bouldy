import { useState } from "react";

interface NewNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}

export default function NewNoteDialog({
  isOpen,
  onClose,
  onCreate,
}: NewNoteDialogProps) {
  const [title, setTitle] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onCreate(title.trim());
      setTitle("");
      onClose();
    }
  };

  const handleCancel = () => {
    setTitle("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-light border-2 border-border p-6 w-full max-w-md">
        <h2 className="text-xl font-medium text-text mb-4">New Note</h2>

        <form onSubmit={handleSubmit}>
          <label className="block mb-4">
            <span className="text-sm text-text-muted mb-2 block">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              className="w-full px-3 py-2 border-2 border-border bg-bg text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
              autoFocus
            />
          </label>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border-2 border-border text-text hover:bg-highlight transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 border-2 border-primary bg-primary text-bg-light hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
