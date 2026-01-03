import "./styles/App.css";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotesEditor } from "./features/notes";
import { VaultSelector } from "./features/vault";
import { WindowControls, Home, Sidebar } from "./shared";
import TodoSpace from "./features/todos/TodoSpace";
import { CalendarView } from "./features/calendar";
import { SettingsPanel } from "./features/settings";
import { PromptsPanel } from "./features/prompts";
import {
  PomodoroPanel,
  PomodoroProvider,
  usePomodoro,
} from "./features/pomodoro";
import { CommandMenu, useCommandMenu, Command } from "./features/command-menu";
import { PanelType, PanelState, PinnedState } from "./types";

interface AppContentProps {
  onResetVault: () => void;
  vaultPath: string;
}

function AppContent({ onResetVault, vaultPath }: AppContentProps) {
  const { loadSessions } = usePomodoro();
  // Get initial theme from DOM (pre-initialized in index.html)
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    return document.documentElement.getAttribute("data-theme") || "midnight";
  });
  const [store, setStore] = useState<Store | null>(null);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);

  // Initialize with notes on left, todos on right
  const [panels, setPanels] = useState<PanelState>({
    left: "notes",
    right: "todos",
  });

  // Track which panels are pinned
  const [pinnedPanels, setPinnedPanels] = useState<PinnedState>({
    left: false,
    right: false,
  });

  // Track which side was last interacted with (default to left)
  const [mruSide, setMruSide] = useState<"left" | "right">("left");

  // Initialize store and load saved theme
  useEffect(() => {
    const initStore = async () => {
      const newStore = await Store.load("settings.json");
      setStore(newStore);

       // Load saved theme - always apply it if it exists
       const savedTheme = await newStore.get<string>("theme");

       if (savedTheme) {
         setCurrentTheme(savedTheme);
       }
    };
    initStore();
  }, [currentTheme]);

  // Apply theme and save to store when it changes
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-theme", currentTheme);

    // Save theme to store
    if (store) {
      store.set("theme", currentTheme);
      store.save();
    }
  }, [currentTheme, store]);

  // Track screen width for responsive layout
  // Only enable single-panel mode if BOTH panels are open AND screen is narrow
  useEffect(() => {
    const handleResize = () => {
      const hasBothPanels = !!(panels.left && panels.right);
      // 1200px = minimum space for two 600px panels
      setIsNarrowScreen(hasBothPanels && window.innerWidth < 1200);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [panels.left, panels.right]);

  // Initialize vault watcher
  useEffect(() => {
    const initVault = async () => {
      try {
        // Start file watcher for notes
        await invoke("start_vault_watcher", { vaultPath });
      } catch (error) {
        console.error("Failed to start vault watcher:", error);
      }
    };

    initVault();
    loadSessions();
  }, [vaultPath, loadSessions]);

  const activatePanel = (type: PanelType) => {
    setPanels((prev) => {
      // If panel is already open, just update MRU
      if (prev.left === type) {
        setMruSide("left");
        return prev;
      }
      if (prev.right === type) {
        setMruSide("right");
        return prev;
      }

      // If there's an empty slot, use it
      if (!prev.left) {
        setMruSide("left");
        return { ...prev, left: type };
      }
      if (!prev.right) {
        setMruSide("right");
        return { ...prev, right: type };
      }

      // Both slots full: replace based on pinned state
      // If left is pinned, replace right. If right is pinned, replace left.
      // If neither pinned, replace the LEAST recently used side.
      // If both pinned, replace the LEAST recently used side.
      let targetSide: "left" | "right";

      if (pinnedPanels.left && !pinnedPanels.right) {
        targetSide = "right";
      } else if (pinnedPanels.right && !pinnedPanels.left) {
        targetSide = "left";
      } else {
        // Neither pinned or both pinned: use MRU logic
        targetSide = mruSide === "left" ? "right" : "left";
      }

      setMruSide(targetSide);
      return { ...prev, [targetSide]: type };
    });
  };

  const closePanel = (side: "left" | "right") => {
    setPanels((prev) => ({ ...prev, [side]: null }));
    // Clear pinned state when closing
    setPinnedPanels((prev) => ({ ...prev, [side]: false }));
  };

  const togglePinPanel = (side: "left" | "right") => {
    setPinnedPanels((prev) => ({ ...prev, [side]: !prev[side] }));
  };

  const handlePanelFocus = (side: "left" | "right") => {
    setMruSide(side);
  };

  // Command Menu - Define all available commands
  const commands: Command[] = [
    // Panel Navigation Commands
    {
      id: "panel:notes",
      title: "Open Notes",
      description: "Open the markdown notes panel",
      category: "panel",
      keywords: ["notes", "write", "markdown", "editor"],
      action: () => activatePanel("notes"),
    },
    {
      id: "panel:todos",
      title: "Open Todos",
      description: "Open the tasks and todos panel",
      category: "panel",
      keywords: ["todos", "tasks", "checklist"],
      action: () => activatePanel("todos"),
    },
    {
      id: "panel:calendar",
      title: "Open Calendar",
      description: "Open the calendar view",
      category: "panel",
      keywords: ["calendar", "schedule", "dates"],
      action: () => activatePanel("calendar"),
    },
    {
      id: "panel:settings",
      title: "Open Settings",
      description: "Open application settings",
      category: "panel",
      keywords: ["settings", "preferences", "config"],
      action: () => activatePanel("settings"),
    },
    {
      id: "panel:prompts",
      title: "Open Prompts",
      description: "Open the prompts library",
      category: "panel",
      keywords: ["prompts", "templates", "snippets"],
      action: () => activatePanel("prompts"),
    },
    {
      id: "panel:pomodoro",
      title: "Open Pomodoro",
      description: "Open the pomodoro timer",
      category: "panel",
      keywords: ["pomodoro", "timer", "focus"],
      action: () => activatePanel("pomodoro"),
    },
    {
      id: "panel:close-left",
      title: "Close Left Panel",
      description: "Close the left panel",
      category: "panel",
      keywords: ["close", "left"],
      action: () => closePanel("left"),
    },
    {
      id: "panel:close-right",
      title: "Close Right Panel",
      description: "Close the right panel",
      category: "panel",
      keywords: ["close", "right"],
      action: () => closePanel("right"),
    },
    // Theme Commands
    {
      id: "theme:midnight",
      title: "Switch to Midnight Theme",
      description: "Dark blue theme",
      category: "theme",
      keywords: ["theme", "midnight", "dark", "blue"],
      action: () => setCurrentTheme("midnight"),
    },
    {
      id: "theme:dawn",
      title: "Switch to Dawn Theme",
      description: "Light theme",
      category: "theme",
      keywords: ["theme", "dawn", "light"],
      action: () => setCurrentTheme("dawn"),
    },
    {
      id: "theme:forest",
      title: "Switch to Forest Theme",
      description: "Green theme",
      category: "theme",
      keywords: ["theme", "forest", "green"],
      action: () => setCurrentTheme("forest"),
    },
    {
      id: "theme:sunset",
      title: "Switch to Sunset Theme",
      description: "Orange and pink theme",
      category: "theme",
      keywords: ["theme", "sunset", "orange", "pink"],
      action: () => setCurrentTheme("sunset"),
    },
    {
      id: "theme:clean",
      title: "Switch to Clean Theme",
      description: "Pure white theme",
      category: "theme",
      keywords: ["theme", "clean", "white", "light"],
      action: () => setCurrentTheme("clean"),
    },
    // App Commands
    {
      id: "app:change-vault",
      title: "Change Vault",
      description: "Switch to a different vault",
      category: "app",
      keywords: ["vault", "folder", "change", "switch"],
      action: () => onResetVault(),
    },
  ];

  // Initialize command menu
  const {
    isOpen: isCommandMenuOpen,
    searchQuery: commandSearchQuery,
    selectedIndex: commandSelectedIndex,
    filteredCommands,
    openMenu,
    closeMenu,
    setSearchQuery: setCommandSearchQuery,
    selectNext,
    selectPrevious,
    executeSelected,
  } = useCommandMenu(commands);

  // Keyboard listener for Cmd/Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openMenu]);

  const renderPanel = (type: PanelType) => {
    switch (type) {
      case "notes":
        return <NotesEditor />;
      case "todos":
        return <TodoSpace vaultPath={vaultPath} />;
      case "calendar":
        return <CalendarView />;
      case "settings":
        return (
          <SettingsPanel
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            vaultPath={vaultPath}
            onChangeVault={onResetVault}
          />
        );
      case "prompts":
        return <PromptsPanel vaultPath={vaultPath} />;
      case "pomodoro":
        return <PomodoroPanel />;
    }
  };

  const renderSlot = (side: "left" | "right") => {
    const type = panels[side];
    if (!type) return null;

    const isSinglePanel = !panels.left || !panels.right;

    return (
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all ${isSinglePanel ? "max-w-6xl mx-auto w-full" : ""}`}
        onClick={() => handlePanelFocus(side)}
        onFocus={() => handlePanelFocus(side)}
      >
        <div className="flex-1 overflow-auto p-2 relative group">
          {/* Control buttons for the slot */}
          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
            {/* Pin button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePinPanel(side);
              }}
              className={`p-0.5 transition-all flex items-center justify-center ${
                pinnedPanels[side]
                  ? "bg-primary text-white"
                  : "bg-bg-light hover:bg-primary hover:text-white"
              }`}
              title={pinnedPanels[side] ? "Unpin Panel" : "Pin Panel"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill={pinnedPanels[side] ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
              </svg>
            </button>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closePanel(side);
              }}
              className="p-0.5 bg-bg-light hover:bg-danger hover:text-white transition-all flex items-center justify-center"
              title="Close Panel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Render only the active panel for this slot */}
          <div className="w-full h-full">{renderPanel(type)}</div>
        </div>
      </div>
    );
  };

  // Calculate visible panels based on narrow screen mode
  // Prioritize pinned panel, then fall back to MRU side
  const visiblePanels = isNarrowScreen
    ? {
        left:
          pinnedPanels.left && panels.left
            ? panels.left
            : mruSide === "left"
              ? panels.left
              : null,
        right:
          pinnedPanels.right && panels.right
            ? panels.right
            : mruSide === "right"
              ? panels.right
              : null,
      }
    : panels;

  return (
    <div className="h-screen flex bg-bg-dark">
      {/* Left icon sidebar */}
      <Sidebar activePanels={visiblePanels} onOpenPanel={activatePanel} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
       {/* Top bar - smaller, cleaner */}
         <div
           data-tauri-drag-region
            className="flex items-center justify-between px-4 h-9 cursor-move bg-bg-dark relative"
          >
           <div className="text-xs text-primary font-mono min-w-0 truncate">
             {vaultPath}
           </div>
           <div className="flex-shrink-0">
             <WindowControls />
           </div>
         </div>

        {/* Content: Two slots */}
        <div className="flex-1 flex overflow-hidden bg-dots  rounded-tl-lg">
          {!panels.left && !panels.right && <Home />}

          {/* Left panel - always mounted, visibility controlled by CSS */}
          {panels.left && (
            <div
              className={`flex-1 min-w-0 flex flex-col overflow-hidden ${
                isNarrowScreen && mruSide !== "left" ? "hidden" : ""
              }`}
            >
              {renderSlot("left")}
            </div>
          )}

          {/* Right panel - always mounted, visibility controlled by CSS */}
          {panels.right && (
            <div
              className={`flex-1 min-w-0 flex flex-col overflow-hidden ${
                isNarrowScreen && mruSide !== "right" ? "hidden" : ""
              }`}
            >
              {renderSlot("right")}
            </div>
          )}
        </div>
      </div>

      {/* Command Menu */}
      <CommandMenu
        isOpen={isCommandMenuOpen}
        commands={filteredCommands}
        searchQuery={commandSearchQuery}
        selectedIndex={commandSelectedIndex}
        onClose={closeMenu}
        onSearchChange={setCommandSearchQuery}
        onSelectNext={selectNext}
        onSelectPrevious={selectPrevious}
        onExecuteSelected={executeSelected}
      />
    </div>
  );
}

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    // Check if a vault is already configured
    const checkVault = async () => {
      try {
        const path = await invoke<string | null>("get_vault_path");

        if (path) {
          // Verify the vault folder still exists
          const exists = await invoke<boolean>("check_vault_exists", { path });
          if (exists) {
            // Run vault migration to create notes/ folder and move files
            await invoke("migrate_vault_structure", { vaultPath: path });
            setVaultPath(path);
          }
        }
      } catch (error) {
        console.error("Error checking vault:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkVault();
  }, []);

  const handleVaultSelected = (path: string) => {
    setVaultPath(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!vaultPath) {
    return <VaultSelector onVaultSelected={handleVaultSelected} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PomodoroProvider vaultPath={vaultPath}>
        <AppContent
          onResetVault={() => setVaultPath(null)}
          vaultPath={vaultPath}
        />
      </PomodoroProvider>
    </QueryClientProvider>
  );
}

export default App;
