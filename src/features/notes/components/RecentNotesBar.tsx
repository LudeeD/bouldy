import { useNotes } from "../context/NotesContext";
import { Plus } from "lucide-react";
import { useRef, useEffect, useState, useMemo } from "react";

interface RecentNotesBarProps {
  activePath: string | undefined;
  onSelectNote: (path: string) => void;
}

export default function RecentNotesBar({
  activePath,
  onSelectNote,
}: RecentNotesBarProps) {
  const { notes, createNote } = useNotes();
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Sort notes by modified timestamp (descending) - memoized
  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.modified - a.modified),
    [notes]
  );

  // Update indicator position when active note changes
  useEffect(() => {
    if (!activePath || !containerRef.current) return;

    const activeButton = containerRef.current.querySelector(
      `[data-path="${activePath}"]`
    ) as HTMLElement;

    if (activeButton) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [activePath, notes]);

  const handleCreateNewNote = async () => {
    // Create note with current date and time as title
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const title = `${year}-${month}-${day}-${hours}${minutes}${seconds}`;

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

      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto no-scrollbar relative"
      >
        <div className="flex items-center gap-2 relative">
          {/* Active background highlight - positioned absolutely behind buttons */}
          {activePath && indicatorStyle.width > 0 && (
            <div
              className="absolute top-0 bottom-0 bg-highlight transition-all duration-300 ease-out"
              style={{
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
                zIndex: 0,
              }}
            />
          )}

          {sortedNotes.map((note) => (
            <button
              key={note.path}
              data-path={note.path}
              onClick={() => onSelectNote(note.path)}
              style={{ zIndex: 1, position: 'relative' }}
              className={`flex items-center px-3 py-2 text-sm whitespace-nowrap transition-all duration-200 max-w-[200px] ${
                activePath === note.path
                  ? "text-primary"
                  : "text-text-muted hover:text-text hover:bg-primary/10"
              }`}
              title={note.title}
            >
              <span className="truncate">{note.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
