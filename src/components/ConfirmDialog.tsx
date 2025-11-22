interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 border-2 border-blue-900 dark:border-blue-500 p-6 w-full max-w-md">
        <h2 className="text-xl font-medium text-blue-900 dark:text-blue-400 mb-4">
          {title}
        </h2>

        <p className="text-slate-700 dark:text-slate-300 mb-6">
          {message}
        </p>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border-2 border-blue-900 dark:border-blue-500 text-blue-900 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-amber-950 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 border-2 transition-colors ${
              isDangerous
                ? 'border-red-700 dark:border-red-500 bg-red-700 dark:bg-red-600 text-white hover:bg-red-800 dark:hover:bg-red-700'
                : 'border-blue-900 dark:border-blue-500 bg-blue-900 dark:bg-blue-500 text-blue-50 dark:text-slate-950 hover:bg-blue-800 dark:hover:bg-blue-400'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
