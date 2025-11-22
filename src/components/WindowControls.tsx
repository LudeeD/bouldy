import { getCurrentWindow } from '@tauri-apps/api/window';

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
        className="w-8 h-8 flex items-center justify-center hover:bg-highlight transition-colors text-primary"
        aria-label="Minimize"
      >
        <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
          <rect width="10" height="2" fill="currentColor" />
        </svg>
      </button>

      <button
        onClick={handleMaximize}
        className="w-8 h-8 flex items-center justify-center hover:bg-highlight transition-colors text-primary"
        aria-label="Maximize"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <button
        onClick={handleClose}
        className="w-8 h-8 flex items-center justify-center hover:bg-danger hover:text-white transition-colors text-primary"
        aria-label="Close"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  );
}
