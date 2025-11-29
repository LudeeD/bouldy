import { useState, useRef, useEffect } from "react";
import "@mdxeditor/editor/style.css";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import RecentNotesBar from "./RecentNotesBar";
import EditorHeader from "./EditorHeader";
import EditorContent, { type EditorContentHandle } from "./EditorContent";

interface Note {
  path: string;
  name: string;
  title: string;
  modified: number;
}

export default function Editor() {
  const editorContentRef = useRef<EditorContentHandle>(null);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = async () => {
    await editorContentRef.current?.save();
  };

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
            console.log("Last opened note no longer exists");
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
    <div className="w-full h-full flex flex-col bg-bg-light border border-border-muted shadow-sm overflow-hidden relative z-10">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {!currentNote ? (
          <div className="flex-1 flex items-center justify-center bg-bg">
            <div className="text-center space-y-3 px-6 py-8">
              <div className="w-16 h-16 mx-auto border-2 border-border bg-bg-light flex items-center justify-center mb-2">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <p className="text-base font-medium text-text">
                No note selected
              </p>
              <p className="text-sm text-text-muted">
                Select or create a note to start writing
              </p>
            </div>
          </div>
        ) : (
          <>
            <EditorHeader
              note={currentNote}
              onRename={handleRename}
              onSave={handleSave}
              isDirty={isDirty}
            />

            {/* MDXEditor Content Area */}
            <EditorContent
              ref={editorContentRef}
              notePath={currentNote.path}
              noteTitle={currentNote.title}
              initialContent={noteContent}
              onDirtyChange={setIsDirty}
            />
          </>
        )}
      </div>

      {/* Bottom Bar: Recent Notes */}
      <RecentNotesBar activePath={currentNote?.path} onSelectNote={loadNote} />
    </div>
  );
}
