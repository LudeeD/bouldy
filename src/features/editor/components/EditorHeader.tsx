import { useRef, useState } from "react";
import { Save } from "lucide-react";

interface Note {
  path: string;
  name: string;
  title: string;
  modified: number;
}

interface EditorHeaderProps {
  note: Note;
  onRename: (newTitle: string) => Promise<void>;
  onSave: () => Promise<void>;
  isDirty: boolean;
}

export default function EditorHeader({ note, onRename, onSave, isDirty }: EditorHeaderProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(note.title);
  const [isSaving, setIsSaving] = useState(false);

  const handleTitleClick = () => {
    setTitleValue(note.title);
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const handleTitleBlur = async () => {
    setIsEditingTitle(false);

    const newTitle = titleValue.trim();
    if (!newTitle || newTitle === note.title) {
      setTitleValue(note.title);
      return;
    }

    await onRename(newTitle);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      titleInputRef.current?.blur();
    } else if (e.key === "Escape") {
      setTitleValue(note.title);
      setIsEditingTitle(false);
    }
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-20 flex items-center justify-between px-4 py-2.5 border-b-2 border-border bg-bg-light">
      {isEditingTitle ? (
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
          {note.title}
        </h1>
      )}

      {isDirty && (
        <button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 border-2 border-border bg-bg hover:bg-primary hover:text-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save note (Cmd/Ctrl+S)"
        >
          <Save className="w-4 h-4" />
          <span className="text-sm font-medium">{isSaving ? "Saving..." : "Save"}</span>
        </button>
      )}
    </div>
  );
}
