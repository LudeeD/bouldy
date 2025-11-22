import { Note } from '../types';

interface NoteItemProps {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export default function NoteItem({ note, isActive, onClick, onDelete }: NoteItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-all cursor-pointer ${
        isActive
          ? 'bg-white dark:bg-slate-800 shadow-sm'
          : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 truncate">
            {note.title}
          </h3>
          <p className="text-xs text-blue-600 dark:text-blue-700 mt-0.5">
            {formatDate(note.modified)}
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950 text-blue-600 dark:text-blue-700 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
          aria-label="Delete note"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M7 7v5M9 7v5M3 4h10l-1 9a1 1 0 01-1 1H5a1 1 0 01-1-1L3 4z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
