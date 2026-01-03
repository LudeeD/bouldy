import { useEffect, useRef } from "react";
import { Command } from "../types/command";
import { Search } from "lucide-react";

interface CommandMenuProps {
  isOpen: boolean;
  commands: Command[];
  searchQuery: string;
  selectedIndex: number;
  onClose: () => void;
  onSearchChange: (query: string) => void;
  onSelectNext: () => void;
  onSelectPrevious: () => void;
  onExecuteSelected: () => void;
}

export default function CommandMenu({
  isOpen,
  commands,
  searchQuery,
  selectedIndex,
  onClose,
  onSearchChange,
  onSelectNext,
  onSelectPrevious,
  onExecuteSelected,
}: CommandMenuProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when menu opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view only if it's out of view
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedItemRef.current || !scrollContainerRef.current) return;

    const item = selectedItemRef.current;
    const container = scrollContainerRef.current;

    const itemRect = item.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Only scroll if item is out of view
    const isAbove = itemRect.top < containerRect.top;
    const isBelow = itemRect.bottom > containerRect.bottom;

    if (isAbove || isBelow) {
      item.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
    }
  }, [selectedIndex]);

  // Handle keyboard events directly
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        onSelectNext();
        break;
      case "ArrowUp":
        e.preventDefault();
        onSelectPrevious();
        break;
      case "Enter":
        e.preventDefault();
        onExecuteSelected();
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      {/* Backdrop - clicking closes menu */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative bg-bg border-2 border-border max-w-2xl w-full shadow-lg flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="relative border-b-2 border-border">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
            <Search size={16} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full pl-12 pr-4 py-3 bg-bg-light text-text placeholder:text-text-muted focus:outline-none focus:bg-bg text-sm"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-xs font-mono">
            ESC to close
          </div>
        </div>

        {/* Command List */}
        <div ref={scrollContainerRef} className="overflow-y-auto h-96">
          {commands.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-muted text-sm">
              No commands found
            </div>
          ) : (
            <div className="py-2">
              {commands.map((command, index) => (
                <div
                  key={command.id}
                  ref={index === selectedIndex ? selectedItemRef : null}
                  className={`px-4 py-2 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? "bg-highlight text-primary border-l-2 border-primary"
                      : "text-text hover:bg-highlight hover:text-primary"
                  }`}
                  onClick={() => {
                    command.action();
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{command.title}</div>
                      {command.description && (
                        <div className="text-xs text-text-muted mt-0.5">
                          {command.description}
                        </div>
                      )}
                    </div>
                    {command.category && (
                      <div className="flex-shrink-0 text-xs text-text-muted font-mono px-2 py-0.5 bg-bg-dark border border-border-muted">
                        {command.category}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t-2 border-border px-4 py-2 bg-bg-dark">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <div className="flex items-center gap-4">
              <span className="font-mono">↑↓ navigate</span>
              <span className="font-mono">↵ select</span>
              <span className="font-mono">esc close</span>
            </div>
            <div className="text-text-muted">
              {commands.length} {commands.length === 1 ? "command" : "commands"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
