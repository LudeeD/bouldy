import {
  FileText,
  CheckSquare,
  Calendar,
  Settings,
  MessageSquare,
  LayoutPanelLeft,
  LayoutPanelTop,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

type PanelType = "editor" | "todos" | "calendar" | "settings" | "prompts";

interface SidebarProps {
  activePanels: {
    left: PanelType | null;
    right: PanelType | null;
  };
  onOpenPanel: (type: PanelType, side?: "left" | "right") => void;
  disableSplitView?: boolean;
}

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  activeSide: "left" | "right" | "both" | null;
  onClick: () => void;
  onOpenLeft: (e: React.MouseEvent) => void;
  onOpenRight: (e: React.MouseEvent) => void;
  disableSplitView?: boolean;
}

function SidebarButton({
  icon,
  label,
  activeSide,
  onClick,
  onOpenLeft,
  onOpenRight,
  disableSplitView = false,
}: SidebarButtonProps) {
  const [showSplit, setShowSplit] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    // Don't show split buttons if split view is disabled
    if (disableSplitView) return;

    // Clear any existing timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Set new timeout to show split buttons after delay
    timeoutRef.current = window.setTimeout(() => {
      setShowSplit(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    // Clear timeout and reset state immediately
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowSplit(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative w-10 h-10 flex items-center justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Default State: Single Icon */}
      <button
        onClick={onClick}
        className={`absolute inset-0 rounded flex items-center justify-center transition-all duration-200 ${
          showSplit
            ? "opacity-0 scale-90 pointer-events-none"
            : "opacity-100 scale-100"
        } ${
          activeSide
            ? "text-primary bg-highlight"
            : "text-text-muted hover:bg-highlight hover:text-primary"
        }`}
        aria-label={label}
        title={label}
      >
        {icon}
      </button>

      {/* Hover State: Split Buttons */}
      <div
        className={`absolute inset-0 flex gap-1 transition-all duration-200 ${
          showSplit
            ? "opacity-100 scale-100"
            : "opacity-0 scale-110 pointer-events-none"
        }`}
      >
        {/* Left Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenLeft(e);
          }}
          className={`flex-1 rounded flex items-center justify-center hover:bg-highlight transition-colors ${
            activeSide === "left" || activeSide === "both"
              ? "text-primary bg-highlight"
              : "text-text-muted"
          }`}
          title="Open on Left"
        >
          <LayoutPanelLeft size={14} />
        </button>

        {/* Right Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenRight(e);
          }}
          className={`flex-1 rounded flex items-center justify-center hover:bg-highlight transition-colors ${
            activeSide === "right" || activeSide === "both"
              ? "text-primary bg-highlight"
              : "text-text-muted"
          }`}
          title="Open on Right"
        >
          <LayoutPanelTop size={14} className="rotate-90" />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({
  activePanels,
  onOpenPanel,
  disableSplitView = false,
}: SidebarProps) {
  const getActiveSide = (type: PanelType): "left" | "right" | "both" | null => {
    if (activePanels.left === type && activePanels.right === type)
      return "both";
    if (activePanels.left === type) return "left";
    if (activePanels.right === type) return "right";
    return null;
  };

  return (
    <div className="w-12 bg-bg-dark flex flex-col items-center py-3 border-r border-border z-20">
      {/* Icon buttons */}
      <div className="flex flex-col gap-2">
        <SidebarButton
          icon={<FileText size={16} />}
          label="Editor"
          activeSide={getActiveSide("editor")}
          onClick={() => onOpenPanel("editor")}
          onOpenLeft={() => onOpenPanel("editor", "left")}
          onOpenRight={() => onOpenPanel("editor", "right")}
          disableSplitView={disableSplitView}
        />

        <SidebarButton
          icon={<CheckSquare size={16} />}
          label="Todos"
          activeSide={getActiveSide("todos")}
          onClick={() => onOpenPanel("todos")}
          onOpenLeft={() => onOpenPanel("todos", "left")}
          onOpenRight={() => onOpenPanel("todos", "right")}
          disableSplitView={disableSplitView}
        />

        <SidebarButton
          icon={<Calendar size={16} />}
          label="Calendar"
          activeSide={getActiveSide("calendar")}
          onClick={() => onOpenPanel("calendar")}
          onOpenLeft={() => onOpenPanel("calendar", "left")}
          onOpenRight={() => onOpenPanel("calendar", "right")}
          disableSplitView={disableSplitView}
        />

        <SidebarButton
          icon={<MessageSquare size={16} />}
          label="Prompts"
          activeSide={getActiveSide("prompts")}
          onClick={() => onOpenPanel("prompts")}
          onOpenLeft={() => onOpenPanel("prompts", "left")}
          onOpenRight={() => onOpenPanel("prompts", "right")}
          disableSplitView={disableSplitView}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings Button - Now a Panel */}
      <div className="mb-2">
        <SidebarButton
          icon={<Settings size={16} />}
          label="Settings"
          activeSide={getActiveSide("settings")}
          onClick={() => onOpenPanel("settings")}
          onOpenLeft={() => onOpenPanel("settings", "left")}
          onOpenRight={() => onOpenPanel("settings", "right")}
          disableSplitView={disableSplitView}
        />
      </div>

      <div className="writing-mode-vertical text-text-muted font-medium text-xs tracking-wider">
        <span className="rotate-180 inline-block">Bouldy</span>
      </div>
    </div>
  );
}
