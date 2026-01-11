import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { X } from "lucide-react";

interface FilterBarProps {
  vaultPath: string;
  selectedProject: string;
  selectedContext: string;
  selectedPriority: string;
  onProjectChange: (project: string) => void;
  onContextChange: (context: string) => void;
  onPriorityChange: (priority: string) => void;
}

export default function FilterBar({
  vaultPath,
  selectedProject,
  selectedContext,
  selectedPriority,
  onProjectChange,
  onContextChange,
  onPriorityChange,
}: FilterBarProps) {
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", vaultPath],
    queryFn: async () => invoke<string[]>("list_projects", { vaultPath }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: contexts = [] } = useQuery({
    queryKey: ["contexts", vaultPath],
    queryFn: async () => invoke<string[]>("list_contexts", { vaultPath }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: priorities = [] } = useQuery({
    queryKey: ["priorities", vaultPath],
    queryFn: async () => invoke<string[]>("list_priorities", { vaultPath }),
    staleTime: 1000 * 60 * 5,
  });

  const hasActiveFilters = selectedProject !== "All" || selectedContext !== "All" || selectedPriority !== "All";
  const hasAnyFilters = projects.length > 0 || contexts.length > 0 || priorities.length > 0;

  const clearAllFilters = () => {
    onProjectChange("All");
    onContextChange("All");
    onPriorityChange("All");
  };

  // Don't render anything if there are no filters
  if (!hasAnyFilters) {
    return null;
  }

  const FilterChip = ({
    label,
    isActive,
    onClick,
    variant = "default",
  }: {
    label: string;
    isActive: boolean;
    onClick: () => void;
    variant?: "project" | "context" | "priority" | "default";
  }) => {
    const variantStyles = {
      project: isActive
        ? "bg-primary text-bg-light border-primary"
        : "bg-transparent text-primary/70 border-primary/20 hover:border-primary/40 hover:text-primary",
      context: isActive
        ? "bg-text text-bg-light border-text"
        : "bg-transparent text-text-muted border-border-muted hover:border-text/40 hover:text-text",
      priority: isActive
        ? "bg-primary text-bg-light border-primary"
        : "bg-transparent text-primary/70 border-primary/20 hover:border-primary/40 hover:text-primary",
      default: isActive
        ? "bg-primary text-bg-light border-primary"
        : "bg-transparent text-text-muted border-border-muted hover:border-border hover:text-text",
    };

    return (
      <button
        onClick={onClick}
        className={`px-2 py-0.5 text-xs font-medium border transition-colors ${variantStyles[variant]}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Projects */}
      {projects.length > 0 && (
        <>
          {projects.map((project) => (
            <FilterChip
              key={project}
              label={`+${project}`}
              isActive={selectedProject === project}
              onClick={() => onProjectChange(selectedProject === project ? "All" : project)}
              variant="project"
            />
          ))}
        </>
      )}

      {/* Contexts */}
      {contexts.length > 0 && (
        <>
          {contexts.map((context) => (
            <FilterChip
              key={context}
              label={`@${context}`}
              isActive={selectedContext === context}
              onClick={() => onContextChange(selectedContext === context ? "All" : context)}
              variant="context"
            />
          ))}
        </>
      )}

      {/* Priorities */}
      {priorities.length > 0 && (
        <>
          {priorities.map((priority) => (
            <FilterChip
              key={priority}
              label={`(${priority})`}
              isActive={selectedPriority === priority}
              onClick={() => onPriorityChange(selectedPriority === priority ? "All" : priority)}
              variant="priority"
            />
          ))}
        </>
      )}

      {/* Clear all - only show when filters are active */}
      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="px-2 py-0.5 text-xs font-medium text-text-muted border border-border-muted hover:border-danger hover:text-danger transition-colors flex items-center gap-1 ml-1"
        >
          <X size={10} />
          Clear
        </button>
      )}
    </div>
  );
}
