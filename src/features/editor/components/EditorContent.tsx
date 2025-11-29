import {
  useRef,
  useState,
  useMemo,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import { invoke } from "@tauri-apps/api/core";
import { useAutoSave } from "../hooks/useAutoSave";

interface EditorContentProps {
  notePath: string;
  noteTitle: string;
  initialContent: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

export interface EditorContentHandle {
  save: () => Promise<void>;
}

const EditorContent = forwardRef<EditorContentHandle, EditorContentProps>(
  ({ notePath, noteTitle, initialContent, onDirtyChange }, ref) => {
    const editorRef = useRef<MDXEditorMethods>(null);
    const [markdown, setMarkdown] = useState(initialContent);

    const plugins = useMemo(
      () => [
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
      ],
      [],
    );

    // Update editor content when note changes
    useEffect(() => {
      setMarkdown(initialContent);
      editorRef.current?.setMarkdown(initialContent);

      // Focus the editor after content is loaded
      setTimeout(() => {
        editorRef.current?.focus();
      }, 0);
    }, [notePath, initialContent]);

    // Save function used by both auto-save and manual save
    const saveNote = async (content: string, title: string) => {
      try {
        await invoke("write_note", {
          path: notePath,
          content,
          title,
        });
      } catch (error) {
        console.error("Failed to save note:", error);
        throw error;
      }
    };

    // Auto-save hook (3 second debounce)
    const { isDirty } = useAutoSave({
      markdown,
      onSave: saveNote,
      enabled: true,
      delay: 3000,
      title: noteTitle,
    });

    // Notify parent of dirty state changes
    useEffect(() => {
      onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    // Expose save function to parent for manual save button
    useImperativeHandle(ref, () => ({
      save: async () => {
        await saveNote(markdown, noteTitle);
      },
    }));

    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <MDXEditor
          key={notePath}
          ref={editorRef}
          markdown={initialContent}
          onChange={(newMarkdown) => setMarkdown(newMarkdown)}
          contentEditableClassName="prose max-w-none prose-p:leading-relaxed prose-headings:leading-tight"
          plugins={plugins}
          className="mdxeditor-custom"
        />
      </div>
    );
  },
);

EditorContent.displayName = "EditorContent";

export default EditorContent;
