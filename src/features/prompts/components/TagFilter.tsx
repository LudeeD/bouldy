import { X } from "lucide-react";

interface TagFilterProps {
  allTags: string[];
  allCategories: string[];
  selectedTags: string[];
  selectedCategory: string | null;
  onToggleTag: (tag: string) => void;
  onSelectCategory: (category: string | null) => void;
  onClearFilters: () => void;
}

export default function TagFilter({
  allTags,
  allCategories,
  selectedTags,
  selectedCategory,
  onToggleTag,
  onSelectCategory,
  onClearFilters,
}: TagFilterProps) {
  const hasFilters = selectedTags.length > 0 || selectedCategory !== null;

  if (allTags.length === 0 && allCategories.length === 0) {
    return null;
  }

  return (
    <div className="px-3 py-2 border-b border-border-muted bg-bg space-y-2">
      {allCategories.length > 0 && (
        <div>
          <div className="text-xs text-text-muted mb-1.5">Category</div>
          <div className="flex flex-wrap gap-1">
            {allCategories.map((category) => (
              <button
                key={category}
                onClick={() =>
                  onSelectCategory(selectedCategory === category ? null : category)
                }
                className={`px-2 py-1 text-xs border transition-colors ${
                  selectedCategory === category
                    ? "bg-primary text-bg-light border-primary"
                    : "bg-bg-light text-text-muted border-border-muted hover:border-border"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {allTags.length > 0 && (
        <div>
          <div className="text-xs text-text-muted mb-1.5">Tags</div>
          <div className="flex flex-wrap gap-1">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                className={`px-2 py-1 text-xs border transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-primary text-bg-light border-primary"
                    : "bg-bg-light text-text-muted border-border-muted hover:border-border"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text border border-border-muted hover:border-border transition-colors"
        >
          <X size={12} />
          Clear filters
        </button>
      )}
    </div>
  );
}
