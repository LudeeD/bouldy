import { useState, useEffect } from "react";
import "@mdxeditor/editor/style.css";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import NotesEditorView from "./NotesEditorView";
import NotesBrowserView from "./NotesBrowserView";

interface Note {
  path: string;
  name: string;
  title: string;
  modified: number;
}

type ViewMode = "browser" | "editor";

export default function NotesEditor() {
  const [viewMode, setViewMode] = useState<ViewMode>("editor");
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState<string>("");

  const loadNote = async (note: Note) => {
    try {
      const metadata = await invoke<{ title: string; content: string }>(
        "read_note",
        { path: note.path },
      );

      setCurrentNote(note);
      setNoteContent(metadata.content);

      // Save last opened note path to store
      try {
        const store = await Store.load("settings.json");
        await store.set("lastOpenedNotePath", note.path);
        await store.save();
      } catch (error) {
        console.error("Failed to save last opened note path:", error);
      }
    } catch (error) {
      console.error("Failed to load note:", error);
    }
  };

  // Load last opened note on mount
  useEffect(() => {
    const loadLastNote = async () => {
      try {
        const store = await Store.load("settings.json");
        const lastNotePath = await store.get<string>("lastOpenedNotePath");

        if (lastNotePath) {
          // Verify the note still exists by trying to read it
          try {
            const metadata = await invoke<{ title: string; content: string }>(
              "read_note",
              { path: lastNotePath },
            );

            // Get file stats for modified time
            const vaultPath = await invoke<string | null>("get_vault_path");
            if (vaultPath) {
              const notes = await invoke<Note[]>("list_vault_files", {
                vaultPath,
              });
              const note = notes.find((n) => n.path === lastNotePath);

              if (note) {
                setCurrentNote(note);
                setNoteContent(metadata.content);
              }
            }
           } catch (error) {
             // Note doesn't exist anymore, clear the stored path
             await store.delete("lastOpenedNotePath");
            await store.save();
          }
        }
      } catch (error) {
        console.error("Failed to load last opened note:", error);
      }
    };

    loadLastNote();
  }, []);

  const handleRename = async (newTitle: string) => {
    if (!currentNote) return;

    try {
      const vaultPath = await invoke<string | null>("get_vault_path");
      if (!vaultPath) return;

      const newFileName = `${newTitle}.md`;
      const newPath = `${vaultPath}/notes/${newFileName}`;

      // Read current content (no frontmatter to manipulate)
      const metadata = await invoke<{ title: string; content: string }>(
        "read_note",
        { path: currentNote.path },
      );

      // Write to new path with same content
      await invoke("write_note", {
        path: newPath,
        content: metadata.content,
        title: newTitle,
      });

      // Delete old file
      await invoke("delete_note", {
        vaultPath,
        path: currentNote.path,
      });

      // Update current note
      const updatedNote = {
        ...currentNote,
        path: newPath,
        title: newTitle,
        name: newFileName,
      };
      setCurrentNote(updatedNote);

      // Update noteContent to match new path
      setNoteContent(metadata.content);

      // Update stored last opened note path
      try {
        const store = await Store.load("settings.json");
        await store.set("lastOpenedNotePath", newPath);
        await store.save();
      } catch (error) {
        console.error("Failed to update last opened note path:", error);
      }
    } catch (error) {
      console.error("Failed to rename note:", error);
      throw error;
    }
  };

  return (
    <div className="w-full h-full">
      {viewMode === "browser" ? (
        <NotesBrowserView
          onSelectNote={(note) => {
            loadNote(note);
            setViewMode("editor");
          }}
          onSwitchToEditor={() => setViewMode("editor")}
        />
      ) : (
        <NotesEditorView
          currentNote={currentNote}
          noteContent={noteContent}
          onRename={handleRename}
          onSelectNote={loadNote}
          activePath={currentNote?.path}
          onSwitchToBrowser={() => setViewMode("browser")}
        />
      )}
    </div>
  );
}
