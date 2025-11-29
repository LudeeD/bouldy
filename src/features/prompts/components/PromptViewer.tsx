import { useState } from "react";
import { Copy, Edit, ExternalLink, Check, ArrowLeft } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Prompt } from "../../../types/prompt";
import { replaceVariables } from "../utils/variable-extractor";
import VariableForm from "./VariableForm";

interface PromptViewerProps {
  prompt: Prompt;
  onEdit: () => void;
  onCopy: (content: string) => void;
  onTrackUsage: () => void;
  onBack: () => void;
}

export default function PromptViewer({
  prompt,
  onEdit,
  onCopy,
  onTrackUsage,
  onBack,
}: PromptViewerProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );
  const [copied, setCopied] = useState(false);

  const hasVariables = prompt.variables.length > 0;
  const allVariablesFilled = hasVariables
    ? prompt.variables.every((v) => variableValues[v]?.trim())
    : true;

  const finalContent = hasVariables
    ? replaceVariables(prompt.content, variableValues)
    : prompt.content;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(finalContent);
    onCopy(finalContent);
    onTrackUsage();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChatGPT = async () => {
    const encoded = encodeURIComponent(finalContent);
    await openUrl(`https://chat.openai.com/?q=${encoded}`);
    onTrackUsage();
  };

  const handleOpenClaude = async () => {
    const encoded = encodeURIComponent(finalContent);
    await openUrl(`https://claude.ai/new?q=${encoded}`);
    onTrackUsage();
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Never";
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-light">
      <div className="h-12 flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-light">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="p-1 text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="text-sm font-medium text-text truncate">
            {prompt.title}
          </h2>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-2.5 py-1 border border-border text-xs text-text-muted hover:text-text hover:border-border transition-colors flex-shrink-0"
        >
          <Edit size={12} />
          Edit
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasVariables && (
          <VariableForm
            variables={prompt.variables}
            onValuesChange={setVariableValues}
          />
        )}

        <div>
          <div className="text-xs text-text-muted mb-1.5">Preview</div>
          <div className="p-3 bg-bg border border-border-muted text-sm text-text whitespace-pre-wrap font-mono">
            {finalContent}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopy}
            disabled={!allVariablesFilled}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-bg-light hover:opacity-90 transition-opacity border border-primary text-xs disabled:opacity-50"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleOpenChatGPT}
            disabled={!allVariablesFilled}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs text-text hover:bg-bg transition-colors disabled:opacity-50"
          >
            <ExternalLink size={14} />
            ChatGPT
          </button>
          <button
            onClick={handleOpenClaude}
            disabled={!allVariablesFilled}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs text-text hover:bg-bg transition-colors disabled:opacity-50"
          >
            <ExternalLink size={14} />
            Claude
          </button>
        </div>

        {prompt.tags.length > 0 && (
          <div>
            <div className="text-xs text-text-muted mb-1.5">Tags</div>
            <div className="flex flex-wrap gap-1">
              {prompt.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-xs bg-bg border border-border-muted text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-border-muted flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
          {prompt.category && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Category:</span>
              <span className="capitalize">{prompt.category}</span>
            </div>
          )}

          {(prompt.useCount || 0) > 0 ? (
            <>
              <div>Used {prompt.useCount} times</div>
              <div>Last used {formatDate(prompt.lastUsed)}</div>
            </>
          ) : (
            <div>Never used</div>
          )}
        </div>
      </div>
    </div>
  );
}
