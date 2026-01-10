import { useState } from "react";
import {
  FileText,
  CheckSquare,
  Calendar,
  Settings,
  MessageSquare,
  Timer,
} from "lucide-react";
import { PanelType } from "../../types/panel";

interface SidebarProps {
  activePanels: {
    left: PanelType | null;
    right: PanelType | null;
  };
  onOpenPanel: (type: PanelType) => void;
}

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function SidebarButton({ icon, label, isActive, onClick }: SidebarButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
          isActive
            ? "text-primary bg-highlight"
            : "text-text-muted hover:bg-highlight hover:text-primary"
        }`}
        aria-label={label}
      >
        {icon}
      </button>

      {showTooltip && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-bg-light text-primary px-2 py-1 rounded text-sm whitespace-nowrap z-50 pointer-events-none">
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-bg-light" />
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ activePanels, onOpenPanel }: SidebarProps) {
  const isActive = (type: PanelType): boolean => {
    return activePanels.left === type || activePanels.right === type;
  };

  return (
    <div className="window-chrome w-12 bg-bg-dark flex flex-col items-center z-20">
      {/* Boulder emoji at top */}
      <div className="h-12 flex items-center justify-center text-lg cursor-pointer">
        <span className="inline-block boulder-emoji">
          🪨
        </span>
      </div>

      {/* Icon buttons */}
      <div className="flex flex-col gap-2">
        <SidebarButton
          icon={<FileText size={16} />}
          label="Notes"
          isActive={isActive("notes")}
          onClick={() => onOpenPanel("notes")}
        />

        <SidebarButton
          icon={<CheckSquare size={16} />}
          label="Todos"
          isActive={isActive("todos")}
          onClick={() => onOpenPanel("todos")}
        />

        <SidebarButton
          icon={<Calendar size={16} />}
          label="Calendar"
          isActive={isActive("calendar")}
          onClick={() => onOpenPanel("calendar")}
        />

        <SidebarButton
          icon={<MessageSquare size={16} />}
          label="Prompts"
          isActive={isActive("prompts")}
          onClick={() => onOpenPanel("prompts")}
        />

        <SidebarButton
          icon={<Timer size={16} />}
          label="Pomodoro"
          isActive={isActive("pomodoro")}
          onClick={() => onOpenPanel("pomodoro")}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings Button - Now a Panel */}
      <div className="mb-2">
        <SidebarButton
          icon={<Settings size={16} />}
          label="Settings"
          isActive={isActive("settings")}
          onClick={() => onOpenPanel("settings")}
        />
      </div>

      <div className="writing-mode-vertical text-text-muted font-medium text-xs tracking-wider mb-3">
        <span className="rotate-180 inline-block">Bouldy</span>
      </div>
    </div>
  );
}
