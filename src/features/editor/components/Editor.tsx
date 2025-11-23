import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CodeToggle,
  CreateLink,
  ListsToggle,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { Save } from "lucide-react";
import { useNotes } from "../../notes/context/NotesContext";
import { useAutoSave } from "../hooks/useAutoSave";
import RecentNotesBar from "../../notes/components/RecentNotesBar";

export default function Editor() {
  const editorRef = useRef<MDXEditorMethods>(null);
  const [markdown, setMarkdown] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const {
    currentNote,
    openNote,
    saveCurrentNote,
    setIsDirty,
    isSaving,
    isDirty,
    updateNoteTitle,
  } = useNotes();

  const { saveNow } = useAutoSave({
    markdown,
    onSave: saveCurrentNote,
    enabled: currentNote !== null,
    delay: 3000,
    title: currentNote?.title || "Untitled",
  });

  const handleManualSave = async () => {
    if (isDirty && currentNote) {
      await saveNow();
    }
  };

  // Memoize plugins array to prevent recreation on every render
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      markdownShortcutPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      toolbarPlugin({
        toolbarContents: () => (
          <>
            <UndoRedo />
            <BoldItalicUnderlineToggles />
            <CodeToggle />
            <BlockTypeSelect />
            <CreateLink />
            <ListsToggle />
          </>
        ),
      }),
    ],
    [],
  );

  // Load note content when currentNote PATH changes (not the object)
  useEffect(() => {
    if (!currentNote) {
      editorRef.current?.setMarkdown("");
      return;
    }

    const loadContent = async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const metadata = await invoke<{ title: string; content: string }>(
          "read_note",
          {
            path: currentNote.path,
          },
        );
        // Strip YAML frontmatter
        const cleanContent = metadata.content.replace(
          /^---\n[\s\S]*?\n---\n/,
          "",
        );
        // Use ref method to update editor content
        editorRef.current?.setMarkdown(cleanContent);
        // Update state for auto-save
        setMarkdown(cleanContent);
      } catch (error) {
        console.error("Failed to load note:", error);
      }
    };

    loadContent();
  }, [currentNote?.path]);

  const handleSelectNote = async (path: string) => {
    await openNote(path);
  };

  const handleTitleClick = () => {
    if (currentNote) {
      setTitleValue(currentNote.title);
      setEditingTitle(true);
      setTimeout(() => titleInputRef.current?.select(), 0);
    }
  };

  const handleTitleBlur = () => {
    if (titleValue.trim() && titleValue !== currentNote?.title) {
      updateNoteTitle(titleValue.trim());
    } else if (!titleValue.trim() && currentNote) {
      setTitleValue(currentNote.title);
    }
    setEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      titleInputRef.current?.blur();
    } else if (e.key === "Escape") {
      setTitleValue(currentNote?.title || "");
      setEditingTitle(false);
    }
  };

  const handleMarkdownChange = useCallback(
    (newMarkdown: string) => {
      setMarkdown(newMarkdown);
      setIsDirty(true);
    },
    [setIsDirty],
  );

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
            {/* Editor Surface */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header: Title */}
              <div className="h-20 flex items-center justify-between px-4 py-2.5 border-b-2 border-border bg-bg-light">
                {/* Left: Title with save indicator */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {editingTitle ? (
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onBlur={handleTitleBlur}
                      onKeyDown={handleTitleKeyDown}
                      className="text-2xl font-normal text-text tracking-tight bg-transparent border-none outline-none focus:outline-none min-w-0 flex-1"
                      autoFocus
                    />
                  ) : (
                    <h1
                      className="text-2xl font-normal text-text tracking-tight truncate cursor-text hover:text-primary transition-colors"
                      onClick={handleTitleClick}
                      title="Click to edit title"
                    >
                      {currentNote.title}
                    </h1>
                  )}
                  {isSaving && (
                    <div className="flex-shrink-0">
                      <div
                        className="w-2 h-2 bg-primary rounded-full animate-pulse"
                        title="Saving..."
                      />
                    </div>
                  )}
                </div>

                {/* Right: Manual save button */}
                <button
                  onClick={handleManualSave}
                  disabled={!isDirty || isSaving}
                  className="flex items-center gap-2 px-3 py-2 border-2 border-border bg-bg hover:bg-highlight hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title={isDirty ? "Save now (Cmd+S)" : "No unsaved changes"}
                >
                  <Save size={16} />
                  <span className="text-sm font-medium">Save</span>
                </button>
              </div>

              {/* MDXEditor Content Area */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <MDXEditor
                  key={currentNote?.path || "empty"}
                  ref={editorRef}
                  markdown=""
                  onChange={handleMarkdownChange}
                  contentEditableClassName="prose max-w-none prose-p:leading-relaxed prose-headings:leading-tight"
                  plugins={plugins}
                  className="mdxeditor-custom"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Bar: Recent Notes */}
      <RecentNotesBar
        activePath={currentNote?.path}
        onSelectNote={handleSelectNote}
      />
    </div>
  );
}
