import { FileText, Copy, Link } from "lucide-react";

interface ImportDialogProps {
  isOpen: boolean;
  filePath: string;
  fileName: string;
  onImport: (importType: "copy" | "symlink") => void;
  onCancel: () => void;
}

export default function ImportDialog({
  isOpen,
  filePath,
  fileName,
  onImport,
  onCancel,
}: ImportDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-bg/80 flex items-center justify-center z-50">
      <div className="bg-bg-light border-2 border-border p-6 max-w-md w-full">
        <h2 className="text-lg font-semibold text-text mb-4">Import Note</h2>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-text-muted" />
            <span className="text-sm font-medium text-text">{fileName}</span>
          </div>
          <p className="text-xs text-text-muted break-all">{filePath}</p>
        </div>

        <p className="text-sm text-text mb-4">How do you want to import this note?</p>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => onImport("copy")}
            className="w-full p-3 border-2 border-border hover:border-primary hover:bg-highlight transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <Copy size={20} className="text-primary mt-0.5" />
              <div>
                <div className="font-medium text-text mb-1">Copy to Vault</div>
                <div className="text-xs text-text-muted">
                  Creates a copy of the file in your vault. Changes to the original won't affect the copy.
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onImport("symlink")}
            className="w-full p-3 border-2 border-border hover:border-primary hover:bg-highlight transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <Link size={20} className="text-primary mt-0.5" />
              <div>
                <div className="font-medium text-text mb-1">Link to File</div>
                <div className="text-xs text-text-muted">
                  Creates a symlink to the external file. Edits will affect the original file.
                </div>
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="w-full px-4 py-2 border border-border text-text-muted hover:text-text hover:border-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
