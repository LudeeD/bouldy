import "./styles/App.css";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { Editor } from "./features/editor";
import { VaultSelector } from "./features/vault";
import { WindowControls, Home, Sidebar } from "./shared";
import { TodoSpace, TodosProvider, useTodos } from "./features/todos";
import { CalendarView } from "./features/calendar";
import { NotesProvider, useNotes } from "./features/notes";
import { SettingsPanel } from "./features/settings";
import { PanelType, PanelState } from "./types";

function AppContent({ onResetVault }: { onResetVault: () => void }) {
  const { loadNotes, vaultPath } = useNotes();
  const { loadTodos } = useTodos();
  const [currentTheme, setCurrentTheme] = useState<string>("midnight");
  const [store, setStore] = useState<Store | null>(null);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);

  // Initialize with editor on left, todos on right
  const [panels, setPanels] = useState<PanelState>({
    left: "editor",
    right: "todos",
  });

  // Track which side was last interacted with (default to left)
  const [mruSide, setMruSide] = useState<"left" | "right">("left");

  // Initialize store
  useEffect(() => {
    const initStore = async () => {
      const newStore = await Store.load("settings.json");
      setStore(newStore);

      // Load saved theme
      const savedTheme = await newStore.get<string>("theme");
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      }
    };
    initStore();
  }, []);

  // Apply theme and save to store
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

  useEffect(() => {
    loadNotes();
    loadTodos();
  }, [loadNotes, loadTodos]);

  const activatePanel = (type: PanelType, side?: "left" | "right") => {
    setPanels((prev) => {
      // If side is explicitly requested
      if (side) {
        // If panel is already open in the OTHER slot, clear it from there
        const otherSide = side === "left" ? "right" : "left";
        if (prev[otherSide] === type) {
          return { ...prev, [otherSide]: null, [side]: type };
        }
        return { ...prev, [side]: type };
      }

      // If panel is already open, just ensure it's focused (update MRU side externally)
      if (prev.left === type) {
        setMruSide("left");
        return prev;
      }
      if (prev.right === type) {
        setMruSide("right");
        return prev;
      }

      // If there's an empty slot, use it
      if (!prev.left) return { ...prev, left: type };
      if (!prev.right) return { ...prev, right: type };

      // Both full: replace the LEAST recently used side
      // If MRU is left, replace right. If MRU is right, replace left.
      const targetSide = mruSide === "left" ? "right" : "left";
      return { ...prev, [targetSide]: type };
    });

    // If we opened a new panel, update MRU to that side
    if (side) {
      setMruSide(side);
    } else {
      // If auto-placed, we need to know where it went.
      // This is a bit tricky with React state updates being async.
      // For simplicity, we'll assume if we are replacing, we update MRU to the replaced side.
      // But actually, let's just let the user interaction update MRU later,
      // or infer it. For now, let's force MRU update if we know where it's going.
      // To keep it simple, we won't setMruSide here for the auto-case unless we are sure.
      // Actually, if we replace the non-MRU side, that side BECOMES the MRU side because the user just asked for it.
      setMruSide((prev) => {
        // If panel is already open (checked above, but logic here is for new opens)
        // We can't easily access the 'prev' state from inside this setter correctly if we depend on the *result* of the previous setter.
        // So we'll rely on the effect or just simple logic:
        // If we are just switching panels, the new panel becomes active.
        return prev === "left" ? "right" : "left";
        // Wait, if MRU is left, we replace right. So right becomes MRU. Correct.
      });
    }
  };

  const closePanel = (side: "left" | "right") => {
    setPanels((prev) => ({ ...prev, [side]: null }));
  };

  const handlePanelFocus = (side: "left" | "right") => {
    setMruSide(side);
  };

  // Track which panel types have been opened (to keep them mounted)
  const [mountedPanels, setMountedPanels] = useState<Set<PanelType>>(
    new Set(["editor", "todos"]),
  );

  // Update mounted panels whenever a panel is activated
  useEffect(() => {
    const newMounted = new Set(mountedPanels);
    if (panels.left) newMounted.add(panels.left);
    if (panels.right) newMounted.add(panels.right);
    if (newMounted.size !== mountedPanels.size) {
      setMountedPanels(newMounted);
    }
  }, [panels.left, panels.right]);

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
        <div className="flex-1 overflow-auto p-4 relative group">
          {/* Close button for the slot - optional but good for UX */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closePanel(side);
            }}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-bg-light rounded-full hover:bg-danger hover:text-white transition-all z-20 flex items-center justify-center"
            title="Close Panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
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

          {/* Render all mounted components but hide inactive ones */}
          {mountedPanels.has("editor") && (
            <div
              className={
                type === "editor"
                  ? "w-full h-full"
                  : "absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none"
              }
            >
              <Editor />
            </div>
          )}
          {mountedPanels.has("todos") && (
            <div
              className={
                type === "todos"
                  ? "w-full h-full"
                  : "absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none"
              }
            >
              <TodoSpace />
            </div>
          )}
          {mountedPanels.has("calendar") && (
            <div
              className={
                type === "calendar"
                  ? "w-full h-full"
                  : "absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none"
              }
            >
              <CalendarView />
            </div>
          )}
          {mountedPanels.has("settings") && (
            <div
              className={
                type === "settings"
                  ? "w-full h-full"
                  : "absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none"
              }
            >
              <SettingsPanel
                currentTheme={currentTheme}
                onThemeChange={setCurrentTheme}
                vaultPath={vaultPath}
                onChangeVault={onResetVault}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Calculate visible panels based on narrow screen mode
  const visiblePanels = isNarrowScreen
    ? {
        left: mruSide === "left" ? panels.left : null,
        right: mruSide === "right" ? panels.right : null,
      }
    : panels;

  return (
    <div className="h-screen flex bg-bg">
      {/* Left icon sidebar */}
      <Sidebar
        activePanels={visiblePanels}
        onOpenPanel={activatePanel}
        disableSplitView={isNarrowScreen}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar - smaller, cleaner */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-2 cursor-move bg-bg-dark border-border"
        >
          <div className="text-xs text-primary font-mono">{vaultPath}</div>
          <WindowControls />
        </div>

        {/* Content: Two slots */}
        <div className="flex-1 flex overflow-hidden bg-dots">
          {!panels.left && !panels.right && <Home />}

          {/* On narrow screens, show only the MRU panel */}
          {isNarrowScreen ? (
            <>
              {mruSide === "left" && panels.left && renderSlot("left")}
              {mruSide === "right" && panels.right && renderSlot("right")}
            </>
          ) : (
            <>
              {/* Left panel with min-width */}
              {panels.left && (
                <div className="flex-1 min-w-[600px] flex flex-col overflow-hidden">
                  {renderSlot("left")}
                </div>
              )}

              {/* Right panel with min-width */}
              {panels.right && (
                <div className="flex-1 min-w-[600px] flex flex-col overflow-hidden">
                  {renderSlot("right")}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!vaultPath) {
    return <VaultSelector onVaultSelected={handleVaultSelected} />;
  }

  return (
    <NotesProvider vaultPath={vaultPath}>
      <TodosProvider vaultPath={vaultPath}>
        <AppContent onResetVault={() => setVaultPath(null)} />
      </TodosProvider>
    </NotesProvider>
  );
}

export default App;
