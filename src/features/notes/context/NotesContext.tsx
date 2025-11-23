import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Note, NoteMetadata } from "../../../types";

interface NotesContextType {
  notes: Note[];
  currentNote: Note | null;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  vaultPath: string;
  loadNotes: () => Promise<void>;
  openNote: (path: string) => Promise<string>;
  createNote: (title: string) => Promise<void>;
  deleteNote: (path: string) => Promise<void>;
  saveCurrentNote: (content: string, title: string) => Promise<void>;
  updateNoteTitle: (newTitle: string) => void;
  setCurrentNote: (note: Note | null) => void;
  setIsDirty: (dirty: boolean) => void;
  clearError: () => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within NotesProvider");
  }
  return context;
}

interface NotesProviderProps {
  children: ReactNode;
  vaultPath: string;
}

export function NotesProvider({ children, vaultPath }: NotesProviderProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      const notesList = await invoke<Note[]>("list_vault_files", { vaultPath });
      setNotes(notesList);

      // Auto-select the most recent note if no note is currently selected
      if (!currentNote && notesList.length > 0) {
        const mostRecent = notesList.reduce((latest, note) =>
          note.modified > latest.modified ? note : latest
        );
        setCurrentNote(mostRecent);
      }
    } catch (err) {
      setError(err as string);
    }
  }, [vaultPath, currentNote]);

  const openNote = useCallback(
    async (path: string): Promise<string> => {
      try {
        const metadata = await invoke<NoteMetadata>("read_note", { path });
        const note = notes.find((n) => n.path === path);
        if (note) {
          setCurrentNote(note);
        }
        setIsDirty(false);
        return metadata.content;
      } catch (err) {
        setError(err as string);
        throw err;
      }
    },
    [notes],
  );

  const createNote = useCallback(
    async (title: string) => {
      try {
        const slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        const filename = `${slug}.md`;
        const path = `${vaultPath}/notes/${filename}`;

        const initialContent = `---\ntitle: ${title}\n---\n\n`;

        const note = await invoke<Note>("write_note", {
          path,
          content: initialContent,
          title,
        });

        setNotes((prev) => [note, ...prev]);
        setCurrentNote(note);
        setIsDirty(false);
      } catch (err) {
        setError(err as string);
      }
    },
    [vaultPath],
  );

  const deleteNote = useCallback(
    async (path: string) => {
      try {
        await invoke("delete_note", { vaultPath, path });
        setNotes((prev) => prev.filter((n) => n.path !== path));
        if (currentNote?.path === path) {
          setCurrentNote(null);
        }
      } catch (err) {
        setError(err as string);
      }
    },
    [vaultPath, currentNote],
  );

  const saveCurrentNote = useCallback(
    async (content: string, title: string) => {
      if (!currentNote) return;

      try {
        setIsSaving(true);
        const updatedNote = await invoke<Note>("write_note", {
          path: currentNote.path,
          content,
          title,
        });

        setNotes((prev) =>
          prev.map((n) => (n.path === updatedNote.path ? updatedNote : n)),
        );
        setCurrentNote(updatedNote);
        setIsDirty(false);
      } catch (err) {
        setError(err as string);
      } finally {
        setIsSaving(false);
      }
    },
    [currentNote],
  );

  const updateNoteTitle = useCallback(
    (newTitle: string) => {
      if (!currentNote) return;

      const updatedNote = { ...currentNote, title: newTitle };
      setCurrentNote(updatedNote);
      setNotes((prev) =>
        prev.map((n) => (n.path === updatedNote.path ? updatedNote : n)),
      );
      setIsDirty(true);
    },
    [currentNote],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <NotesContext.Provider
      value={{
        notes,
        currentNote,
        isDirty,
        isSaving,
        error,
        vaultPath,
        loadNotes,
        openNote,
        createNote,
        deleteNote,
        saveCurrentNote,
        updateNoteTitle,
        setCurrentNote,
        setIsDirty,
        clearError,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}
