import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";

interface VaultSelectorProps {
  onVaultSelected: (path: string) => void;
}

export default function VaultSelector({ onVaultSelected }: VaultSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFolder = async () => {
    setIsSelecting(true);
    setError(null);

    try {
      const path = await invoke<string>("select_vault_folder");

      // Save the vault path
      await invoke("save_vault_path", { path });

      // Notify parent component
      onVaultSelected(path);
    } catch (err) {
      setError(err as string);
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-8">
      <div className="max-w-md w-full border-2 border-primary p-8 bg-bg">
        <h1 className="text-3xl font-medium text-primary mb-2">Bouldy</h1>
        <p className="text-text-muted text-sm mb-8">
          A place for your thoughts
        </p>

        <p className="text-text mb-8 leading-relaxed">
          Select a folder where your notes will be stored. You can choose an
          existing folder or create a new one.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleSelectFolder}
            disabled={isSelecting}
            className="w-full border-2 border-primary bg-primary text-bg hover:bg-highlight disabled:opacity-30 disabled:cursor-not-allowed font-medium py-3 px-4 transition-colors"
          >
            {isSelecting ? "Selecting..." : "Select Vault Folder"}
          </button>

          {error && (
            <div className="border-2 border-danger bg-danger/10 p-4">
              <p className="text-sm text-danger">
                {error === "No folder selected"
                  ? "You need to select a folder to continue."
                  : `Error: ${error}`}
              </p>
            </div>
          )}

          <div className="border-l-4 border-primary bg-highlight/20 pl-4 py-3">
            <p className="text-sm text-text">
              Your notes will be stored as markdown files that you can edit with
              any text editor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
