import { useState, useMemo } from "react";
import { Plus, ArrowLeft, Search } from "lucide-react";
import { usePrompts } from "../context/PromptsContext";
import PromptItem from "./PromptItem";
import PromptEditor from "./PromptEditor";
import PromptViewer from "./PromptViewer";
import TagFilter from "./TagFilter";
import { PromptMetadata } from "../../../types/prompt";

type ViewMode = "list" | "create" | "edit" | "view";

export default function PromptsPanel() {
  const {
    prompts,
    selectedPrompt,
    isLoading,
    selectPrompt,
    createPrompt,
    updatePrompt,
    trackUsage,
  } = usePrompts();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    prompts.forEach((p) => p.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [prompts]);

  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    prompts.forEach((p) => {
      if (p.category) categories.add(p.category);
    });
    return Array.from(categories).sort();
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    return prompts.filter((prompt) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          prompt.title.toLowerCase().includes(query) ||
          prompt.content.toLowerCase().includes(query) ||
          prompt.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      if (selectedCategory && prompt.category !== selectedCategory) {
        return false;
      }

      if (selectedTags.length > 0) {
        const hasAllTags = selectedTags.every((tag) =>
          prompt.tags.includes(tag),
        );
        if (!hasAllTags) return false;
      }

      return true;
    });
  }, [prompts, searchQuery, selectedTags, selectedCategory]);

  const handleCreateNew = () => {
    setViewMode("create");
  };

  const handleSelectPrompt = (id: string) => {
    selectPrompt(id);
    setViewMode("view");
  };

  const handleEdit = () => {
    setViewMode("edit");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSearchQuery("");
  };

  const handleSaveNew = async (
    metadata: Omit<PromptMetadata, "useCount" | "lastUsed">,
  ) => {
    const prompt = await createPrompt(metadata);
    selectPrompt(prompt.id);
    setViewMode("view");
  };

  const handleSaveEdit = async (
    metadata: Omit<PromptMetadata, "useCount" | "lastUsed">,
  ) => {
    if (!selectedPrompt) return;
    const prompt = await updatePrompt(selectedPrompt.id, metadata);
    selectPrompt(prompt.id);
    setViewMode("view");
  };

   const handleCopy = () => {
     // Copy action handled by PromptViewer component
   };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedCategory(null);
    setSearchQuery("");
  };

  if (viewMode === "create") {
    return (
      <div className="w-full h-full flex flex-col bg-bg-light border border-border-muted shadow-sm overflow-hidden">
        <PromptEditor onSave={handleSaveNew} onCancel={handleBackToList} />
      </div>
    );
  }

  if (viewMode === "edit" && selectedPrompt) {
    return (
      <div className="w-full h-full flex flex-col bg-bg-light border border-border-muted shadow-sm overflow-hidden">
        <PromptEditor
          initialData={{
            title: selectedPrompt.title,
            content: selectedPrompt.content,
            tags: selectedPrompt.tags,
            category: selectedPrompt.category,
            variables: selectedPrompt.variables,
            lastUsed: selectedPrompt.lastUsed,
            useCount: selectedPrompt.useCount,
          }}
          onSave={handleSaveEdit}
          onCancel={handleBackToList}
        />
      </div>
    );
  }

  if (viewMode === "view" && selectedPrompt) {
    return (
      <div className="w-full h-full flex flex-col bg-bg-light border border-border-muted shadow-sm overflow-hidden">
        <PromptViewer
          prompt={selectedPrompt}
          onEdit={handleEdit}
          onCopy={handleCopy}
          onTrackUsage={() => trackUsage(selectedPrompt.id)}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-bg-light border border-border-muted shadow-sm overflow-hidden">
      <div className="h-12 flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-light">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {viewMode !== "list" && (
            <button
              onClick={handleBackToList}
              className="p-1 text-text-muted hover:text-text transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <h1 className="text-sm font-medium text-text">Prompts</h1>
        </div>
        {viewMode === "list" && (
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-primary text-bg-light hover:opacity-90 transition-opacity border border-primary text-xs"
          >
            <Plus size={14} />
            New
          </button>
        )}
      </div>

      {viewMode === "list" && (
        <>
          <div className="px-3 py-2 border-b border-border-muted">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts..."
                className="w-full pl-8 pr-2 py-1.5 text-sm bg-bg border border-border-muted focus:outline-none focus:border-primary text-text placeholder:text-text-muted"
              />
            </div>
          </div>

          <TagFilter
            allTags={allTags}
            allCategories={allCategories}
            selectedTags={selectedTags}
            selectedCategory={selectedCategory}
            onToggleTag={toggleTag}
            onSelectCategory={setSelectedCategory}
            onClearFilters={clearFilters}
          />

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoading ? (
              <div className="text-center text-sm text-text-muted mt-8">
                Loading...
              </div>
            ) : filteredPrompts.length === 0 ? (
              <div className="text-center text-sm text-text-muted mt-8">
                {prompts.length === 0
                  ? "No prompts yet. Create your first one!"
                  : "No prompts match your filters."}
              </div>
            ) : (
              filteredPrompts.map((prompt) => (
                <PromptItem
                  key={prompt.id}
                  prompt={prompt}
                  isSelected={selectedPrompt?.id === prompt.id}
                  onClick={() => handleSelectPrompt(prompt.id)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
