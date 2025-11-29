import { Prompt } from "../../../types/prompt";
import { Code2 } from "lucide-react";

interface PromptItemProps {
  prompt: Prompt;
  isSelected: boolean;
  onClick: () => void;
}

export default function PromptItem({
  prompt,
  isSelected,
  onClick,
}: PromptItemProps) {
  const formatLastUsed = (timestamp?: number) => {
    if (!timestamp) return "Never used";

    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const displayTags = prompt.tags.slice(0, 3);
  const remainingTags = prompt.tags.length - 3;

  return (
    <div
      onClick={onClick}
      className={`group px-3 py-2 border border-border-muted hover:border-border transition-colors cursor-pointer ${
        isSelected ? "bg-highlight border-border" : "bg-bg-light"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3
          className={`text-sm font-medium ${isSelected ? "text-primary" : "text-text"}`}
        >
          {prompt.title}
        </h3>
        {prompt.variables.length > 0 && (
          <div className="flex-shrink-0 flex items-center gap-1 text-text-muted">
            <Code2 size={12} />
            <span className="text-xs">{prompt.variables.length}</span>
          </div>
        )}
      </div>

      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {displayTags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-xs bg-bg border border-border-muted text-text-muted"
            >
              {tag}
            </span>
          ))}
          {remainingTags > 0 && (
            <span className="px-1.5 py-0.5 text-xs text-text-muted">
              +{remainingTags}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span>{formatLastUsed(prompt.lastUsed)}</span>
        <span>•</span>
        <span>Used {prompt.useCount} times</span>
      </div>
    </div>
  );
}
