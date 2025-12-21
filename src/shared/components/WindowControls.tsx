import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, PictureInPicture2, X } from "lucide-react";

export default function WindowControls() {
  const handleMinimize = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  };

  const handleMaximize = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.toggleMaximize();
  };

  const handleClose = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleMinimize}
        className="w-10 h-10 rounded flex items-center justify-center transition-colors text-text-muted hover:bg-highlight hover:text-primary"
        aria-label="Minimize"
      >
        <Minus size={16} />
      </button>

      <button
        onClick={handleMaximize}
        className="w-10 h-10 rounded flex items-center justify-center transition-colors text-text-muted hover:bg-highlight hover:text-primary"
        aria-label="Maximize"
      >
        <PictureInPicture2 size={16} style={{ transform: "scaleX(-1)" }} />
      </button>

      <button
        onClick={handleClose}
        className="w-10 h-10 rounded flex items-center justify-center transition-colors text-text-muted hover:bg-danger hover:text-white"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}
