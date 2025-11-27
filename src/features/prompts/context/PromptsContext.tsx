import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Prompt, PromptMetadata } from "../../../types/prompt";
import { extractVariables } from "../utils/variable-extractor";

interface PromptsContextType {
  prompts: Prompt[];
  selectedPrompt: Prompt | null;
  isLoading: boolean;
  error: string | null;
  loadPrompts: () => Promise<void>;
  selectPrompt: (id: string) => void;
  createPrompt: (metadata: Omit<PromptMetadata, "useCount" | "lastUsed">) => Promise<Prompt>;
  updatePrompt: (id: string, metadata: Omit<PromptMetadata, "useCount" | "lastUsed">) => Promise<Prompt>;
  deletePrompt: (id: string, path: string) => Promise<void>;
  trackUsage: (id: string) => Promise<void>;
  clearError: () => void;
}

const PromptsContext = createContext<PromptsContextType | undefined>(undefined);

interface PromptsProviderProps {
  children: ReactNode;
  vaultPath: string;
}

export function PromptsProvider({ children, vaultPath }: PromptsProviderProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrompts = useCallback(async () => {
    if (!vaultPath) return;

    setIsLoading(true);
    setError(null);

    try {
      const promptsList = await invoke<Prompt[]>("list_prompts", { vaultPath });
      setPrompts(promptsList);
    } catch (err) {
      console.error("Failed to load prompts:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [vaultPath]);

  const selectPrompt = useCallback((id: string) => {
    setSelectedPrompt((prev) => {
      const prompt = prompts.find((p) => p.id === id);
      return prompt || prev;
    });
  }, [prompts]);

  const createPrompt = useCallback(async (
    metadata: Omit<PromptMetadata, "useCount" | "lastUsed">
  ): Promise<Prompt> => {
    if (!vaultPath) throw new Error("No vault selected");

    const id = Date.now().toString();
    const variables = extractVariables(metadata.content);

    const fullMetadata: PromptMetadata = {
      ...metadata,
      variables,
      useCount: 0,
      lastUsed: undefined,
    };

    try {
      const prompt = await invoke<Prompt>("write_prompt", {
        vaultPath,
        id,
        metadata: fullMetadata,
      });

      return prompt;
    } catch (err) {
      console.error("Failed to create prompt:", err);
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, [vaultPath]);

  const updatePrompt = useCallback(async (
    id: string,
    metadata: Omit<PromptMetadata, "useCount" | "lastUsed">
  ): Promise<Prompt> => {
    if (!vaultPath) throw new Error("No vault selected");

    const existingPrompt = prompts.find((p) => p.id === id);
    if (!existingPrompt) throw new Error("Prompt not found");

    const variables = extractVariables(metadata.content);

    const fullMetadata: PromptMetadata = {
      ...metadata,
      variables,
      useCount: existingPrompt.useCount,
      lastUsed: existingPrompt.lastUsed,
    };

    try {
      const prompt = await invoke<Prompt>("write_prompt", {
        vaultPath,
        id,
        metadata: fullMetadata,
      });

      return prompt;
    } catch (err) {
      console.error("Failed to update prompt:", err);
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, [vaultPath, prompts]);

  const deletePrompt = useCallback(async (_id: string, path: string) => {
    try {
      await invoke("delete_prompt", { path });
    } catch (err) {
      console.error("Failed to delete prompt:", err);
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, []);

  const trackUsage = useCallback(async (id: string) => {
    if (!vaultPath) return;

    try {
      await invoke("track_prompt_usage", { vaultPath, id });
    } catch (err) {
      console.error("Failed to track usage:", err);
    }
  }, [vaultPath]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  useEffect(() => {
    const unlistenPromises: Promise<() => void>[] = [];

    unlistenPromises.push(
      listen<Prompt>("prompt:saved", (event) => {
        const savedPrompt = event.payload;
        setPrompts((prev) => {
          const index = prev.findIndex((p) => p.id === savedPrompt.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = savedPrompt;
            return updated;
          }
          return [...prev, savedPrompt];
        });

        if (selectedPrompt?.id === savedPrompt.id) {
          setSelectedPrompt(savedPrompt);
        }
      })
    );

    unlistenPromises.push(
      listen<{ path: string; id: string }>("prompt:deleted", (event) => {
        const deletedId = event.payload.id;
        setPrompts((prev) => prev.filter((p) => p.id !== deletedId));

        if (selectedPrompt?.id === deletedId) {
          setSelectedPrompt(null);
        }
      })
    );

    const cleanup = async () => {
      const unlisteners = await Promise.all(unlistenPromises);
      unlisteners.forEach((unlisten) => unlisten());
    };

    return () => {
      cleanup();
    };
  }, [selectedPrompt]);

  return (
    <PromptsContext.Provider
      value={{
        prompts,
        selectedPrompt,
        isLoading,
        error,
        loadPrompts,
        selectPrompt,
        createPrompt,
        updatePrompt,
        deletePrompt,
        trackUsage,
        clearError,
      }}
    >
      {children}
    </PromptsContext.Provider>
  );
}

export function usePrompts() {
  const context = useContext(PromptsContext);
  if (!context) {
    throw new Error("usePrompts must be used within a PromptsProvider");
  }
  return context;
}
