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
  imagePlugin,
  codeBlockPlugin,
  useCodeBlockEditorContext,
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

const PlainTextCodeEditorDescriptor = {
  match: () => true,
  priority: 0,
  Editor: (props: { code: string; language: string }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const cb = useCodeBlockEditorContext();

    useEffect(() => {
      const adjustHeight = () => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      };

      adjustHeight();

      if (textareaRef.current) {
        textareaRef.current.addEventListener("input", adjustHeight);
      }

      return () => {
        if (textareaRef.current) {
          textareaRef.current.removeEventListener("input", adjustHeight);
        }
      };
    }, []);

    return (
      <div onKeyDown={(e) => e.nativeEvent.stopImmediatePropagation()}>
        <textarea
          ref={textareaRef}
          className="w-full p-3 font-mono text-sm bg-bg border-2 border-border text-text resize-none outline-none focus:border-primary"
          rows={3}
          defaultValue={props.code}
          onChange={(e) => cb.setCode(e.target.value)}
        />
      </div>
    );
  },
};

const NotesEditorContent = forwardRef<EditorContentHandle, EditorContentProps>(
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
        imagePlugin({
          // Simple pass-through handler - we're just viewing/editing, not uploading
          imageUploadHandler: async (file: File) => {
            // For local files, we'd need to handle them differently
            // For now, just return a placeholder or URL as-is
            return URL.createObjectURL(file);
          },
        }),
        codeBlockPlugin({
          defaultCodeBlockLanguage: "txt",
          codeBlockEditorDescriptors: [PlainTextCodeEditorDescriptor],
        }),
      ],
      [],
    );

    // Update editor content when note changes
    useEffect(() => {
      console.log(`[EditorContent] Content updated - Path: ${notePath}, Length: ${initialContent.length}`);
      console.log("[EditorContent] First 200 chars:", initialContent.substring(0, 200));
      setMarkdown(initialContent);
      if (editorRef.current) {
        editorRef.current.setMarkdown(initialContent);
        console.log("[EditorContent] Editor markdown set successfully");
        // Check what the editor actually has
        setTimeout(() => {
          const currentContent = editorRef.current?.getMarkdown();
          console.log("[EditorContent] Editor now contains:", currentContent?.substring(0, 200));
        }, 100);
      } else {
        console.warn("[EditorContent] Editor ref is null!");
      }

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

NotesEditorContent.displayName = "NotesEditorContent";

export default NotesEditorContent;
