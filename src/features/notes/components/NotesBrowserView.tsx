import { useState, useMemo, useEffect } from "react";
import { Search, ArrowLeft, Trash2, FolderOpen } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listenToNoteEvents } from "../../../utils/events";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import ImportDialog from "./ImportDialog";

interface Note {
  path: string;
  name: string;
  title: string;
  modified: number;
}

interface NotesBrowserViewProps {
  onSelectNote: (note: Note) => void;
  onSwitchToEditor: () => void;
}

export default function NotesBrowserView({
  onSelectNote,
  onSwitchToEditor,
}: NotesBrowserViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"modified" | "title">("modified");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    note: Note | null;
  }>({ isOpen: false, note: null });
  const [importDialog, setImportDialog] = useState<{
    isOpen: boolean;
    filePath: string;
    fileName: string;
  }>({ isOpen: false, filePath: "", fileName: "" });

  // Load notes and listen to events
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const vaultPath = await invoke<string | null>("get_vault_path");
        if (vaultPath) {
          const notesList = await invoke<Note[]>("list_vault_files", {
            vaultPath,
          });
          setNotes(notesList);
        }
      } catch (error) {
        console.error("Failed to load notes:", error);
      }
    };

    loadNotes();

    // Listen to events
    const unlisteners: (() => void)[] = [];

    listenToNoteEvents({
      onListUpdated: () => loadNotes(),
      onDeleted: (payload) => {
        setNotes((prev) => prev.filter((n) => n.path !== payload.path));
      },
      onCreated: () => loadNotes(),
      onSaved: () => loadNotes(),
    }).then((listeners) => {
      unlisteners.push(...listeners);
    });

    return () => {
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);

  // Delete note handler
  const handleDeleteNote = async (note: Note) => {
    try {
      const vaultPath = await invoke<string | null>("get_vault_path");
      if (!vaultPath) return;

      await invoke("delete_note", { vaultPath, path: note.path });

      // Remove from local state
      setNotes((prev) => prev.filter((n) => n.path !== note.path));

      setDeleteConfirm({ isOpen: false, note: null });
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  // Import note handlers
  const handleOpenFile = async () => {
    try {
      const filePath = await invoke<string | null>("pick_markdown_file");
      if (!filePath) return; // User cancelled

      const fileName = filePath.split(/[\\/]/).pop() || "unknown.md";
      setImportDialog({ isOpen: true, filePath, fileName });
    } catch (error) {
      console.error("Failed to pick file:", error);
    }
  };

  const handleImport = async (importType: "copy" | "symlink") => {
    try {
      const vaultPath = await invoke<string | null>("get_vault_path");
      if (!vaultPath) return;

      await invoke("import_note", {
        vaultPath,
        sourcePath: importDialog.filePath,
        importType,
      });

      // Close dialog
      setImportDialog({ isOpen: false, filePath: "", fileName: "" });

      // Notes will auto-refresh via event listener
    } catch (error) {
      console.error("Failed to import note:", error);
      alert(`Failed to import: ${error}`);
    }
  };

  // Calculate date ranges for filtering
  const filterNotesByDateRange = (notes: Note[], range: string | null): Note[] => {
    if (!range) return notes;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return notes.filter((note) => {
      const noteTime = note.modified * 1000;
      const diffDays = (now - noteTime) / dayMs;

      if (range === "today") return diffDays < 1;
      if (range === "week") return diffDays < 7;
      if (range === "month") return diffDays < 30;
      if (range === "older") return diffDays >= 30;
      return true;
    });
  };

  // Format timestamp to human-readable date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Search and filter logic
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.name.toLowerCase().includes(query)
      );
    }

    // Date range filter
    result = filterNotesByDateRange(result, selectedDateRange);

    // Sort
    if (sortBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      result.sort((a, b) => b.modified - a.modified);
    }

    return result;
  }, [notes, searchQuery, selectedDateRange, sortBy]);

  return (
    <div className="w-full h-full flex flex-col bg-bg-light border border-border-muted shadow-sm overflow-hidden">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-light">
        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchToEditor}
            className="p-1 hover:bg-bg text-text-muted hover:text-primary transition-colors"
            title="Back to editor"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-sm font-medium text-text">Browse Notes</h1>
        </div>
        <span className="text-xs text-text-muted">
          {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
        </span>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border-muted">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full h-9 pl-8 pr-2 text-sm bg-bg border border-border-muted focus:outline-none focus:border-primary text-text placeholder:text-text-muted"
            />
          </div>
          <button
            onClick={handleOpenFile}
            className="h-9 px-3 bg-primary text-bg-light hover:opacity-90 transition-opacity border border-primary flex items-center justify-center"
            title="Import external note"
          >
            <FolderOpen size={16} />
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="px-3 py-2 border-b border-border-muted bg-bg space-y-2">
        <div className="text-xs text-text-muted mb-1.5">Modified</div>
        <div className="flex flex-wrap gap-1">
          {[
            { id: "today", label: "Today" },
            { id: "week", label: "This Week" },
            { id: "month", label: "This Month" },
            { id: "older", label: "Older" },
          ].map((range) => (
            <button
              key={range.id}
              onClick={() =>
                setSelectedDateRange(
                  selectedDateRange === range.id ? null : range.id
                )
              }
              className={`px-2 py-1 text-xs border transition-colors ${
                selectedDateRange === range.id
                  ? "bg-primary text-bg-light border-primary"
                  : "bg-bg-light text-text-muted border-border-muted hover:border-border"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="px-3 py-2 border-b border-border-muted bg-bg flex items-center gap-2">
        <span className="text-xs text-text-muted">Sort:</span>
        <button
          onClick={() => setSortBy("modified")}
          className={`text-xs px-2 py-1 border transition-colors ${
            sortBy === "modified"
              ? "bg-primary text-bg-light border-primary"
              : "bg-bg-light text-text-muted border-border-muted hover:border-border"
          }`}
        >
          Recent
        </button>
        <button
          onClick={() => setSortBy("title")}
          className={`text-xs px-2 py-1 border transition-colors ${
            sortBy === "title"
              ? "bg-primary text-bg-light border-primary"
              : "bg-bg-light text-text-muted border-border-muted hover:border-border"
          }`}
        >
          Title
        </button>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredNotes.length === 0 ? (
          <div className="text-center text-sm text-text-muted mt-8">
            {notes.length === 0
              ? "No notes yet. Create your first one!"
              : "No notes match your search."}
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div
              key={note.path}
              onClick={() => onSelectNote(note)}
              className="group px-3 py-2 border border-border-muted hover:border-border transition-colors cursor-pointer bg-bg-light hover:bg-highlight"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-sm font-medium text-text group-hover:text-primary transition-colors flex-1">
                  {note.title}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm({ isOpen: true, note });
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-danger transition-opacity"
                  title="Delete note"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs text-text-muted">{formatDate(note.modified)}</p>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Note?"
        message={`Are you sure you want to delete "${deleteConfirm.note?.title}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={() => deleteConfirm.note && handleDeleteNote(deleteConfirm.note)}
        onCancel={() => setDeleteConfirm({ isOpen: false, note: null })}
      />

      {/* Import Dialog */}
      <ImportDialog
        isOpen={importDialog.isOpen}
        filePath={importDialog.filePath}
        fileName={importDialog.fileName}
        onImport={handleImport}
        onCancel={() => setImportDialog({ isOpen: false, filePath: "", fileName: "" })}
      />
    </div>
  );
}
