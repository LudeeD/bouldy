import { useState, useEffect } from "react";
import { Save, X as XIcon } from "lucide-react";
import { PromptMetadata } from "../../../types/prompt";
import { extractVariables } from "../utils/variable-extractor";

interface PromptEditorProps {
  initialData?: PromptMetadata;
  onSave: (
    metadata: Omit<PromptMetadata, "useCount" | "lastUsed">,
  ) => Promise<void>;
  onCancel: () => void;
}

export default function PromptEditor({
  initialData,
  onSave,
  onCancel,
}: PromptEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setCategory(initialData.category || "");
      setTags(initialData.tags);
    }
  }, [initialData]);

  const detectedVariables = extractVariables(content);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;

    setIsSaving(true);

    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        category: category.trim() || undefined,
        tags,
        variables: detectedVariables,
      });
    } catch (error) {
      console.error("Failed to save prompt:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-light">
      <div className="h-12 flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-light">
        <h2 className="text-sm font-medium text-text">
          {initialData ? "Edit Prompt" : "New Prompt"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-2.5 py-1 border border-border text-xs text-text-muted hover:text-text hover:border-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !content.trim() || isSaving}
            className="px-2.5 py-1 bg-primary text-bg-light hover:opacity-90 transition-opacity border border-primary text-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save size={12} />
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">
            Title <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter prompt title"
            className="w-full px-2 py-1.5 text-sm bg-bg border border-border-muted focus:outline-none focus:border-primary text-text placeholder:text-text-muted"
          />
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Enter category (optional)"
            className="w-full px-2 py-1.5 text-sm bg-bg border border-border-muted focus:outline-none focus:border-primary text-text placeholder:text-text-muted"
          />
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">Tags</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add tags"
              className="flex-1 px-2 py-1.5 text-sm bg-bg border border-border-muted focus:outline-none focus:border-primary text-text placeholder:text-text-muted"
            />
            <button
              onClick={addTag}
              className="px-3 py-1.5 border border-border text-xs text-text-muted hover:text-text hover:border-border transition-colors"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs bg-bg border border-border-muted text-text"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-text-muted hover:text-danger transition-colors"
                  >
                    <XIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">
            Content <span className="text-danger">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your prompt. Use {{variableName}} for variables."
            className="w-full px-2 py-1.5 text-sm bg-bg border border-border-muted focus:outline-none focus:border-primary text-text placeholder:text-text-muted font-mono resize-none"
            rows={12}
          />
        </div>

        {detectedVariables.length > 0 && (
          <div className="p-2 bg-highlight border border-border-muted">
            <div className="text-xs text-text-muted mb-1">
              Detected Variables
            </div>
            <div className="flex flex-wrap gap-1">
              {detectedVariables.map((variable) => (
                <span
                  key={variable}
                  className="px-1.5 py-0.5 text-xs bg-bg border border-border-muted text-primary font-mono"
                >
                  {"{{"}
                  {variable}
                  {"}}"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
