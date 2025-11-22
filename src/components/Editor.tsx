import { useEffect, useRef, useState } from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema } from 'prosemirror-model';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';
import { baseKeymap, toggleMark, setBlockType } from 'prosemirror-commands';
import { inputRules, wrappingInputRule, textblockTypeInputRule, smartQuotes, emDash, ellipsis } from 'prosemirror-inputrules';
import { parseMarkdown, stripFrontmatter } from '../utils/markdownParser';
import { useNotes } from '../contexts/NotesContext';
import { useAutoSave } from '../hooks/useAutoSave';
import EditorToolbar from './EditorToolbar';
import { mySchema } from '../utils/editorSchema';

// Create markdown input rules
function buildInputRules(schema: Schema) {
  const rules = [
    // Headings: # H1, ## H2, ### H3 (supports up to level 6)
    textblockTypeInputRule(
      /^(#{1,6})\s$/,
      schema.nodes.heading,
      match => ({ level: match[1].length })
    ),

    // Bullet list: * or -
    wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bullet_list),

    // Ordered list: 1.
    wrappingInputRule(/^(\d+)\.\s$/, schema.nodes.ordered_list),

    // Blockquote: >
    wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote),

    // Smart quotes and other typographic rules
    ...smartQuotes,
    emDash,
    ellipsis,
  ];

  return inputRules({ rules });
}

import RecentNotesBar from './RecentNotesBar';

// ... existing imports ...

export default function Editor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const { currentNote, openNote, saveCurrentNote, setIsDirty, isSaving } = useNotes();

  const { saveNow } = useAutoSave({
    editorState,
    onSave: saveCurrentNote,
    enabled: currentNote !== null,
    delay: 3000,
  });

  // Store saveNow in a ref so plugins can access latest version
  const saveNowRef = useRef(saveNow);
  useEffect(() => {
    saveNowRef.current = saveNow;
  }, [saveNow]);

  // Create plugins array (using ref to get latest saveNow)
  const createPlugins = () => [
    buildInputRules(mySchema),
    history(),
    keymap({
      'Mod-b': toggleMark(mySchema.marks.strong),
      'Mod-i': toggleMark(mySchema.marks.em),
      'Mod-`': toggleMark(mySchema.marks.code),
      'Mod-Alt-1': setBlockType(mySchema.nodes.heading, { level: 1 }),
      'Mod-Alt-2': setBlockType(mySchema.nodes.heading, { level: 2 }),
      'Mod-Alt-3': setBlockType(mySchema.nodes.heading, { level: 3 }),
      'Mod-Alt-0': setBlockType(mySchema.nodes.paragraph),
      'Mod-z': undo,
      'Mod-y': redo,
      'Mod-Shift-z': redo,
      'Mod-s': () => {
        saveNowRef.current();
        return true;
      },
    }),
    keymap(baseKeymap),
  ];

  // Initialize editor view when a note is selected and editorRef is available
  useEffect(() => {
    if (!currentNote || !editorRef.current) return;

    // Create initial empty document
    const doc = mySchema.node('doc', null, [mySchema.node('paragraph')]);

    const state = EditorState.create({
      doc,
      schema: mySchema,
      plugins: createPlugins(),
    });

    // Create editor view that persists for the component lifetime
    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction(transaction: Transaction) {
        const newState = view.state.apply(transaction);
        view.updateState(newState);
        setEditorState(newState);

        if (transaction.docChanged) {
          setIsDirty(true);
        }
      },
    });

    viewRef.current = view;
    setEditorState(state);

    // Cleanup when note is deselected (or component unmounts)
    return () => {
      view.destroy();
      viewRef.current = null;
      setEditorState(null);
    };
  }, [!!currentNote]); // Run when we switch between "no note" and "has note"

  // Update content when currentNote changes (without recreating view)
  useEffect(() => {
    if (!viewRef.current || !currentNote) return;

    const loadContent = async () => {
      try {
        const content = await openNote(currentNote.path);
        const cleanContent = stripFrontmatter(content);

        // Parse markdown to get new document
        const { doc } = parseMarkdown(cleanContent, mySchema, createPlugins());

        // Create new state with updated content but KEEP the same view
        const newState = EditorState.create({
          doc,
          schema: mySchema,
          plugins: createPlugins(),
        });

        // Update the existing view with new state
        viewRef.current.updateState(newState);
        setEditorState(newState);
      } catch (error) {
        console.error('Failed to load note:', error);
      }
    };

    loadContent();
  }, [currentNote?.path]);

  const handleSelectNote = (path: string) => {
    openNote(path);
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-bg-light rounded-xl border border-border-muted shadow-sm overflow-hidden relative z-10"
    >
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {!currentNote ? (
          <div className="flex-1 flex items-center justify-center bg-bg-dark">
            <div className="text-center space-y-3 px-6 py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-highlight flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-base font-medium text-text">No note selected</p>
              <p className="text-sm text-text-muted">Select or create a note to start writing</p>
            </div>
          </div>
        ) : (
          <>
            {/* Editor Surface - Single unified surface */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Combined Header: Title + Toolbar */}
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b-2 border-border bg-bg-light"
              >
                {/* Left: Title with save indicator */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <h1 className="text-2xl font-normal text-text tracking-tight truncate">
                    {currentNote.title}
                  </h1>
                  {isSaving && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" title="Saving..." />
                    </div>
                  )}
                </div>

                {/* Right: Toolbar */}
                <div className="flex-shrink-0 ml-6">
                  <EditorToolbar view={viewRef.current} />
                </div>
              </div>

              {/* Editor Content Area */}
              <div
                className="flex-1 overflow-auto cursor-text scroll-smooth"
                onClick={() => {
                  if (viewRef.current && !viewRef.current.hasFocus()) {
                    viewRef.current.focus();
                  }
                }}
              >
                <div className="max-w-4xl mx-auto px-8 py-6">
                  <div
                    ref={editorRef}
                    className="prose prose-lg dark:prose-invert max-w-none outline-none"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Bar: Recent Notes */}
      <RecentNotesBar
        activePath={currentNote?.path}
        onSelectNote={handleSelectNote}
      />
    </div>
  );
}
