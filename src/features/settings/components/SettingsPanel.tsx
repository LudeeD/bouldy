import { FolderOpen, Download, Target } from "lucide-react";
import { themes } from "../../../styles/themes";
import { useState, useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import type { TodoMetadata } from "../../../types/todo";

interface SettingsPanelProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  vaultPath: string | null;
  onChangeVault: () => void;
}

export default function SettingsPanel({
  currentTheme,
  onThemeChange,
  vaultPath,
  onChangeVault,
}: SettingsPanelProps) {
  const [updateStatus, setUpdateStatus] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [dailyLimit, setDailyLimit] = useState<number>(5);
  const [isSavingLimit, setIsSavingLimit] = useState(false);

  const checkForUpdates = async () => {
    setIsChecking(true);
    setUpdateStatus("Checking for updates...");

    try {
      const update = await check();

      if (update?.available) {
        setUpdateStatus(`Update available: v${update.version}`);
        setIsDownloading(true);

        await update.downloadAndInstall();

        setUpdateStatus("Update downloaded! Restarting...");
        await relaunch();
      } else {
        setUpdateStatus("You're running the latest version!");
      }
    } catch (error) {
      setUpdateStatus(`Error: ${error}`);
    } finally {
      setIsChecking(false);
      setIsDownloading(false);
    }
  };

  // Load current version on mount
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const version = await getVersion();
        setCurrentVersion(version);
      } catch (error) {
        console.error("Failed to get version:", error);
      }
    };

    loadVersion();
  }, []);

  // Auto-check for updates on mount
  useEffect(() => {
    const autoCheckUpdates = async () => {
      try {
        const update = await check();
        if (update?.available) {
          setUpdateStatus(`Update available: v${update.version}`);
        } else {
          setUpdateStatus(""); // Clear status if up to date
        }
      } catch (error) {
        console.error("Auto-update check failed:", error);
        setUpdateStatus(""); // Clear status on error
      }
    };

    autoCheckUpdates();
  }, []);

  // Load daily limit
  useEffect(() => {
    const loadDailyLimit = async () => {
      if (!vaultPath) return;
      try {
        const metadata = await invoke<TodoMetadata>("get_todo_metadata", { vaultPath });
        setDailyLimit(metadata.dailyLimit);
      } catch (error) {
        console.error("Failed to load daily limit:", error);
      }
    };

    loadDailyLimit();
  }, [vaultPath]);

  const handleSaveDailyLimit = async () => {
    if (!vaultPath) return;
    setIsSavingLimit(true);
    try {
      await invoke("set_daily_limit", { vaultPath, limit: dailyLimit });
    } catch (error) {
      console.error("Failed to save daily limit:", error);
    } finally {
      setIsSavingLimit(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-8 text-text">Settings</h1>

      {/* Theme Section */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-text">Appearance</h2>
        <div className="bg-bg rounded-lg border border-border p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => onThemeChange(key)}
                className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  currentTheme === key
                    ? "border-primary bg-highlight text-primary"
                    : "border-transparent hover:bg-bg-light text-text-muted"
                }`}
              >
                <div
                  className="w-12 h-12 rounded-full border border-border-muted shadow-sm"
                  style={{
                    background: theme.previewColors.bg,
                    backgroundImage: `linear-gradient(135deg, ${theme.previewColors.primary} 0%, ${theme.previewColors.bg} 50%)`,
                  }}
                />
                <span className="font-medium">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Todos Section */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-text">Todos</h2>
        <div className="bg-bg border-2 border-border p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-bg-light border-2 border-border text-primary">
              <Target size={24} />
            </div>
            <div className="flex-1">
              <div className="text-sm text-text-muted mb-1">Daily Task Limit</div>
              <div className="text-sm text-text mb-3">
                Maximum number of tasks to focus on each day
              </div>
              <input
                type="number"
                min="1"
                max="20"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseInt(e.target.value) || 1)}
                className="w-24 px-3 py-2 bg-bg-dark border-2 border-border text-text text-sm font-medium focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveDailyLimit}
              disabled={isSavingLimit}
              className="px-4 py-2 bg-primary text-bg-light border-2 border-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
            >
              {isSavingLimit ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </section>

      {/* Vault Section */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-text">Vault</h2>
        <div className="bg-bg border-2 border-border p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-bg-light border-2 border-border text-primary">
              <FolderOpen size={24} />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm text-text-muted mb-1">Current Vault</div>
              <div className="font-mono text-sm truncate text-text bg-bg-dark px-3 py-2 border-2 border-border">
                {vaultPath}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onChangeVault}
              className="px-4 py-2 bg-bg-light border-2 border-border hover:bg-highlight hover:text-primary text-text text-sm font-medium transition-colors"
            >
              Change Vault...
            </button>
          </div>
        </div>
      </section>

      {/* Updates Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-text">Updates</h2>
        <div className="bg-bg border-2 border-border p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-bg-light border-2 border-border text-primary">
              <Download size={24} />
            </div>
            <div className="flex-1">
              <div className="text-sm text-text-muted mb-1">
                App Updates
                {currentVersion && (
                  <span className="ml-2 font-mono text-xs text-text">
                    v{currentVersion}
                  </span>
                )}
              </div>
              <div className="text-sm text-text">
                {updateStatus || "Up to date"}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={checkForUpdates}
              disabled={isChecking || isDownloading}
              className="px-4 py-2 bg-primary text-bg-light border-2 border-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
            >
              {isChecking
                ? "Checking..."
                : isDownloading
                  ? "Downloading..."
                  : "Check for Updates"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
