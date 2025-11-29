import {
  FileText,
  CheckSquare,
  Calendar,
  Settings,
  MessageSquare,
  Timer,
} from "lucide-react";

type PanelType =
  | "editor"
  | "todos"
  | "calendar"
  | "settings"
  | "prompts"
  | "pomodoro";

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
  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
        isActive
          ? "text-primary bg-highlight"
          : "text-text-muted hover:bg-highlight hover:text-primary"
      }`}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

export default function Sidebar({ activePanels, onOpenPanel }: SidebarProps) {
  const isActive = (type: PanelType): boolean => {
    return activePanels.left === type || activePanels.right === type;
  };

  return (
    <div className="w-12 bg-bg-dark flex flex-col items-center z-20">
      {/* Boulder emoji at top */}
      <div className="h-12 flex items-center justify-center text-lg">🪨</div>

      {/* Icon buttons */}
      <div className="flex flex-col gap-2">
        <SidebarButton
          icon={<FileText size={16} />}
          label="Editor"
          isActive={isActive("editor")}
          onClick={() => onOpenPanel("editor")}
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
