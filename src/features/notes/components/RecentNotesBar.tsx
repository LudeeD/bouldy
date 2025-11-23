import { useNotes } from "../context/NotesContext";
import { Plus } from "lucide-react";

interface RecentNotesBarProps {
  activePath: string | undefined;
  onSelectNote: (path: string) => void;
}

export default function RecentNotesBar({
  activePath,
  onSelectNote,
}: RecentNotesBarProps) {
  const { notes, createNote } = useNotes();

  // Sort notes by modified timestamp (descending)
  const sortedNotes = [...notes].sort((a, b) => b.modified - a.modified);

  const handleCreateNewNote = async () => {
    // Create note with current date as title
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const title = `${year}-${month}-${day}`;

    await createNote(title);
  };

  return (
    <div className="h-15 w-full border-t-2 border-border flex items-center px-4 py-2.5">
      <button
        onClick={handleCreateNewNote}
        className="flex items-center gap-2 px-3 py-2 bg-primary text-bg-light hover:opacity-90 transition-opacity text-sm font-medium"
        title="New Note"
      >
        <Plus size={18} />
        <span>New</span>
      </button>

      <div className="h-6 w-px bg-border mx-3" />

      <div className="flex-1 overflow-x-auto flex items-center gap-2 no-scrollbar">
        {sortedNotes.map((note) => (
          <button
            key={note.path}
            onClick={() => onSelectNote(note.path)}
            className={`flex items-center px-3 py-2 text-sm whitespace-nowrap transition-all duration-200 max-w-[200px] ${
              activePath === note.path
                ? "bg-highlight text-primary font-medium"
                : "text-text-muted hover:bg-bg-light hover:text-text"
            }`}
            title={note.title}
          >
            <span className="truncate">{note.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
