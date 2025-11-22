import { EditorView } from 'prosemirror-view';
import { toggleMark, setBlockType, wrapIn } from 'prosemirror-commands';
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote } from 'lucide-react';

import { mySchema } from '../utils/editorSchema';


interface EditorToolbarProps {
  view: EditorView | null;
}

export default function EditorToolbar({ view }: EditorToolbarProps) {
  if (!view) return null;

  const runCommand = (command: any) => {
    return () => {
      const result = command(view.state, view.dispatch);
      view.focus();
      return result;
    };
  };

  const setHeading = (level: number) => {
    return () => {
      const command = setBlockType(mySchema.nodes.heading, { level });
      command(view.state, view.dispatch);
      view.focus();
    };
  };

  const isActive = (markType: string) => {
    const { from, to } = view.state.selection;
    const mark = mySchema.marks[markType];
    if (!mark) return false;
    return view.state.doc.rangeHasMark(from, to, mark);
  };

  const isBlockActive = (nodeType: string) => {
    const { $from } = view.state.selection;
    const node = mySchema.nodes[nodeType];
    if (!node) return false;

    return view.state.doc.resolve($from.pos).parent.type === node;
  };

  const isHeadingLevel = (level: number) => {
    const { $from } = view.state.selection;
    const parent = $from.parent;
    return parent.type === mySchema.nodes.heading && parent.attrs.level === level;
  };

  return (
    <div className="flex items-center gap-0.5 bg-bg p-1 rounded-lg inline-flex border border-border-muted">
      {/* Bold */}
      <button
        onClick={runCommand(toggleMark(mySchema.marks.strong))}
        className={`p-2 rounded-md transition-all duration-200 flex items-center justify-center ${isActive('strong')
          ? 'bg-highlight text-primary'
          : 'text-text-muted hover:bg-highlight hover:text-primary'
          }`}
        title="Bold (⌘B)"
      >
        <Bold size={18} strokeWidth={isActive('strong') ? 2.5 : 2} />
      </button>

      {/* Italic */}
      <button
        onClick={runCommand(toggleMark(mySchema.marks.em))}
        className={`p-2 rounded-md transition-all duration-200 flex items-center justify-center ${isActive('em')
          ? 'bg-highlight text-primary'
          : 'text-text-muted hover:bg-highlight hover:text-primary'
          }`}
        title="Italic (⌘I)"
      >
        <Italic size={18} strokeWidth={isActive('em') ? 2.5 : 2} />
      </button>

      {/* Code */}
      <button
        onClick={runCommand(toggleMark(mySchema.marks.code))}
        className={`p-2 rounded-md transition-all duration-200 flex items-center justify-center ${isActive('code')
          ? 'bg-highlight text-primary'
          : 'text-text-muted hover:bg-highlight hover:text-primary'
          }`}
        title="Code (⌘`)"
      >
        <span className="text-xs font-mono font-bold">&lt;/&gt;</span>
      </button>

      <div className="w-px h-6 bg-border-muted mx-1.5" />

      {/* Heading 1 */}
      <button
        onClick={setHeading(1)}
        className={`p-2 rounded-md transition-all duration-200 flex items-center justify-center ${isHeadingLevel(1)
          ? 'bg-highlight text-primary'
          : 'text-text-muted hover:bg-highlight hover:text-primary'
          }`}
        title="Heading 1 (⌘⌥1)"
      >
        <Heading1 size={18} strokeWidth={isHeadingLevel(1) ? 2.5 : 2} />
      </button>

      {/* Heading 2 */}
      <button
        onClick={setHeading(2)}
        className={`p-2 rounded-md transition-all duration-200 flex items-center justify-center ${isHeadingLevel(2)
          ? 'bg-highlight text-primary'
          : 'text-text-muted hover:bg-highlight hover:text-primary'
          }`}
        title="Heading 2 (⌘⌥2)"
      >
        <Heading2 size={18} strokeWidth={isHeadingLevel(2) ? 2.5 : 2} />
      </button>

      {/* Heading 3 */}
      <button
        onClick={setHeading(3)}
        className={`p-2 rounded-md transition-all duration-200 flex items-center justify-center ${isHeadingLevel(3)
          ? 'bg-highlight text-primary'
          : 'text-text-muted hover:bg-highlight hover:text-primary'
          }`}
        title="Heading 3 (⌘⌥3)"
      >
        <Heading3 size={18} strokeWidth={isHeadingLevel(3) ? 2.5 : 2} />
      </button>

      <div className="w-px h-6 bg-border-muted mx-1.5" />

      {/* Bullet List */}
      <button
        onClick={runCommand(wrapIn(mySchema.nodes.bullet_list))}
        className={`p-2 rounded-md transition-all duration-200 flex items-center justify-center ${isBlockActive('bullet_list')
          ? 'bg-highlight text-primary'
          : 'text-text-muted hover:bg-highlight hover:text-primary'
          }`}
        title="Bullet List"
      >
        <List size={18} strokeWidth={isBlockActive('bullet_list') ? 2.5 : 2} />
      </button>

      {/* Ordered List */}
      <button
        onClick={runCommand(wrapIn(mySchema.nodes.ordered_list))}
        className={`p-2 rounded-md transition-all duration-200 flex items-center justify-center ${isBlockActive('ordered_list')
          ? 'bg-highlight text-primary'
          : 'text-text-muted hover:bg-highlight hover:text-primary'
          }`}
        title="Ordered List"
      >
        <ListOrdered size={18} strokeWidth={isBlockActive('ordered_list') ? 2.5 : 2} />
      </button>

      {/* Blockquote */}
      <button
        onClick={runCommand(wrapIn(mySchema.nodes.blockquote))}
        className={`p-2 rounded-md transition-all duration-200 flex items-center justify-center ${isBlockActive('blockquote')
          ? 'bg-highlight text-primary'
          : 'text-text-muted hover:bg-highlight hover:text-primary'
          }`}
        title="Quote"
      >
        <Quote size={18} strokeWidth={isBlockActive('blockquote') ? 2.5 : 2} />
      </button>
    </div>
  );
}
