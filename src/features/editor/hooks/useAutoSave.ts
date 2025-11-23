import { useEffect, useRef } from "react";

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

  useEffect(() => {
    if (!enabled || !markdown) {
      return;
    }

    // Skip if content hasn't changed
    if (lastSavedMarkdownRef.current === markdown) {
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      try {
        // Add YAML frontmatter back
        const contentWithFrontmatter = `---\ntitle: ${title}\n---\n\n${markdown}`;
        await onSave(contentWithFrontmatter, title);
        lastSavedMarkdownRef.current = markdown;
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
  }, [markdown, onSave, enabled, delay, title]);

  // Manual save function
  const saveNow = async () => {
    if (!markdown) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      // Add YAML frontmatter back
      const contentWithFrontmatter = `---\ntitle: ${title}\n---\n\n${markdown}`;
      await onSave(contentWithFrontmatter, title);
      lastSavedMarkdownRef.current = markdown;
    } catch (error) {
      console.error("Manual save failed:", error);
    }
  };

  return { saveNow };
}
