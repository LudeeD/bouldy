import { useState, useRef, useEffect } from "react";
import { Save } from "lucide-react";

interface EditorHeaderProps {
    title: string;
    isSaving: boolean;
    isDirty: boolean;
    onManualSave: () => void;
    onTitleChange: (newTitle: string) => void;
    onDirty: () => void;
}

export default function EditorHeader({
    title,
    isSaving,
    isDirty,
    onManualSave,
    onTitleChange,
    onDirty,
}: EditorHeaderProps) {
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(title);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Sync local state when prop changes (e.g. switching notes)
    useEffect(() => {
        setTitleValue(title);
    }, [title]);

    const handleTitleClick = () => {
        setTitleValue(title);
        setEditingTitle(true);
        setTimeout(() => titleInputRef.current?.select(), 0);
    };

    const handleTitleBlur = () => {
        if (titleValue.trim() && titleValue !== title) {
            onTitleChange(titleValue.trim());
        } else if (!titleValue.trim()) {
            setTitleValue(title);
        }
        setEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            titleInputRef.current?.blur();
        } else if (e.key === "Escape") {
            setTitleValue(title);
            setEditingTitle(false);
        }
    };

    return (
        <div className="h-20 flex items-center justify-between px-4 py-2.5 border-b-2 border-border bg-bg-light">
            {/* Left: Title with save indicator */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {editingTitle ? (
                    <input
                        ref={titleInputRef}
                        type="text"
                        value={titleValue}
                        onChange={(e) => {
                            setTitleValue(e.target.value);
                            onDirty();
                        }}
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
                        {title}
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
                onClick={onManualSave}
                disabled={!isDirty || isSaving}
                className="flex items-center gap-2 px-3 py-2 border-2 border-border bg-bg hover:bg-highlight hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title={isDirty ? "Save now (Cmd+S)" : "No unsaved changes"}
            >
                <Save size={16} />
                <span className="text-sm font-medium">Save</span>
            </button>
        </div>
    );
}
