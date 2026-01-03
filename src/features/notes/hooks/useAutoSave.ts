import { useEffect, useRef, useState } from "react";

interface UseAutoSaveProps {
  markdown: string;
  onSave: (content: string, title: string) => Promise<void>;
  enabled: boolean;
  delay?: number;
  title: string;
}

export function useAutoSave({
  markdown,
  onSave,
  enabled,
  delay = 3000,
  title,
}: UseAutoSaveProps) {
  const timeoutRef = useRef<number>(0);
  const lastSavedMarkdownRef = useRef<string>("");
  const onSaveRef = useRef(onSave);
  const titleRef = useRef(title);
  const [isDirty, setIsDirty] = useState(false);

  // Update refs when callbacks/values change (doesn't trigger main effect)
  useEffect(() => {
    onSaveRef.current = onSave;
    titleRef.current = title;
  }, [onSave, title]);

  useEffect(() => {
    if (!enabled || !markdown) {
      return;
    }

    // Check if content has changed
    const hasChanged = lastSavedMarkdownRef.current !== markdown;
    setIsDirty(hasChanged);

    // Skip if content hasn't changed
    if (!hasChanged) {
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = window.setTimeout(async () => {
      try {
        await onSaveRef.current(markdown, titleRef.current);
        lastSavedMarkdownRef.current = markdown;
        setIsDirty(false);
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, delay);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [markdown, enabled, delay]);

  // Manual save function
  const saveNow = async () => {
    if (!markdown) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      await onSaveRef.current(markdown, titleRef.current);
      lastSavedMarkdownRef.current = markdown;
      setIsDirty(false);
    } catch (error) {
      console.error("Manual save failed:", error);
    }
  };

  const setBaseline = (content: string) => {
    lastSavedMarkdownRef.current = content;
    setIsDirty(false);
  };

  return { saveNow, setBaseline, isDirty };
}
