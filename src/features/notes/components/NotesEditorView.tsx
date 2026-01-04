import { useRef, useState } from "react";
import NotesEditorHeader from "./NotesEditorHeader";
import NotesEditorContent, { type EditorContentHandle } from "./NotesEditorContent";
import RecentNotesBar from "./RecentNotesBar";

interface Note {
  path: string;
  name: string;
  title: string;
  modified: number;
  is_symlink: boolean;
}

interface NotesEditorViewProps {
  currentNote: Note | null;
  noteContent: string;
  onRename: (newTitle: string) => Promise<void>;
  onSelectNote: (note: Note) => Promise<void>;
  activePath?: string;
  onSwitchToBrowser: () => void;
}

export default function NotesEditorView({
  currentNote,
  noteContent,
  onRename,
  onSelectNote,
  activePath,
  onSwitchToBrowser,
}: NotesEditorViewProps) {
  const editorContentRef = useRef<EditorContentHandle>(null);
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = async () => {
    await editorContentRef.current?.save();
  };

  return (
    <div className="w-full h-full flex flex-col bg-bg-light border border-border-muted shadow-sm overflow-hidden relative z-10 min-w-0 min-h-0">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
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
            <NotesEditorHeader
              note={currentNote}
              onRename={onRename}
              onSave={handleSave}
              isDirty={isDirty}
            />

            {/* MDXEditor Content Area */}
            <NotesEditorContent
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
      <RecentNotesBar
        activePath={activePath}
        onSelectNote={onSelectNote}
        onBrowseAll={onSwitchToBrowser}
      />
    </div>
  );
}
