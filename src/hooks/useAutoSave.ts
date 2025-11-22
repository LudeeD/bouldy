import { useEffect, useRef } from 'react';
import { EditorState } from 'prosemirror-state';
import { serializeToMarkdown, extractTitle } from '../utils/markdownSerializer';

interface UseAutoSaveProps {
  editorState: EditorState | null;
  onSave: (content: string, title: string) => Promise<void>;
  enabled: boolean;
  delay?: number;
}

export function useAutoSave({
  editorState,
  onSave,
  enabled,
  delay = 3000,
}: UseAutoSaveProps) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedStateRef = useRef<EditorState | null>(null);

  useEffect(() => {
    if (!enabled || !editorState) {
      return;
    }

    // Skip if state hasn't changed
    if (lastSavedStateRef.current === editorState) {
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      try {
        const content = serializeToMarkdown(editorState);
        const title = extractTitle(content);
        await onSave(content, title);
        lastSavedStateRef.current = editorState;
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, delay);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [editorState, onSave, enabled, delay]);

  // Manual save function
  const saveNow = async () => {
    if (!editorState) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      const content = serializeToMarkdown(editorState);
      const title = extractTitle(content);
      await onSave(content, title);
      lastSavedStateRef.current = editorState;
    } catch (error) {
      console.error('Manual save failed:', error);
    }
  };

  return { saveNow };
}
