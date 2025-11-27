import { Plus } from "lucide-react";
import { useRef, useEffect, useState, useMemo, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listenToNoteEvents } from "../../../utils/events";

interface Note {
  path: string;
  name: string;
  title: string;
  modified: number;
}

interface RecentNotesBarProps {
  activePath: string | undefined;
  onSelectNote: (note: Note) => void;
}

const RecentNotesBar = memo(function RecentNotesBar({
  activePath,
  onSelectNote,
}: RecentNotesBarProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [vaultPath, setVaultPath] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Load vault path and initial notes list on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get vault path
        const path = await invoke<string | null>("get_vault_path");
        if (path) {
          setVaultPath(path);
          // Load notes
          const notesList = await invoke<Note[]>("list_vault_files", { vaultPath: path });
          setNotes(notesList);
        }
      } catch (error) {
        console.error("Failed to load notes:", error);
      }
    };

    loadData();
  }, []);

  // Listen to note events for real-time updates
  useEffect(() => {
    const setupListeners = async () => {
      const unlisteners = await listenToNoteEvents({
        onListUpdated: (payload) => {
          setNotes(payload.notes.map(n => ({
            path: n.path,
            name: n.name,
            title: n.title || "Untitled",
            modified: n.modified || 0,
          })));
        },
        onDeleted: (payload) => {
          // Remove deleted note from the list
          setNotes(prev => prev.filter(note => note.path !== payload.path));
        },
        onCreated: (payload) => {
          // Add newly created note to the list
          setNotes(prev => [...prev, {
            path: payload.path,
            name: payload.name,
            title: payload.title || "Untitled",
            modified: payload.modified || 0,
          }]);
        },
        onSaved: (payload) => {
          // Update note in the list when saved (updates title and modified time)
          setNotes(prev => prev.map(note =>
            note.path === payload.path
              ? {
                  ...note,
                  title: payload.title || "Untitled",
                  modified: payload.modified || note.modified,
                }
              : note
          ));
        },
      });

      return unlisteners;
    };

    let unlisteners: Array<() => void> = [];
    setupListeners().then(listeners => {
      unlisteners = listeners;
    });

    return () => {
      unlisteners.forEach(unlisten => unlisten());
    };
  }, []);

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
    if (!vaultPath) return;

    // Create note with current date and time as filename
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const filename = `${year}-${month}-${day}-${hours}${minutes}${seconds}`;

    try {
      const notePath = `${vaultPath}/notes/${filename}.md`;
      const content = "";

      const newNote = await invoke<Note>("write_note", {
        path: notePath,
        content,
        title: filename,
      });

      // Call the callback to load the note
      onSelectNote(newNote);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  return (
    <div className="h-10 w-full border-t border-border flex items-center px-2 py-1">
      <button
        onClick={handleCreateNewNote}
        className="flex items-center gap-1.5 px-2 py-1 bg-primary text-bg-light hover:opacity-90 transition-opacity text-xs font-medium"
        title="New Note"
      >
        <Plus size={14} />
        <span>New</span>
      </button>

      <div className="h-4 w-px bg-border mx-2" />

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
              onClick={() => onSelectNote(note)}
              style={{ zIndex: 1, position: 'relative' }}
              className={`flex items-center px-2 py-1 text-xs whitespace-nowrap transition-all duration-200 max-w-[180px] ${
                activePath === note.path
                  ? "text-primary font-medium"
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
});

export default RecentNotesBar;
