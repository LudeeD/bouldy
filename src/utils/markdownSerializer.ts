import { MarkdownSerializer, defaultMarkdownSerializer } from 'prosemirror-markdown';
import { EditorState } from 'prosemirror-state';

// Use the default markdown serializer from prosemirror-markdown
export const markdownSerializer = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
    // Customize nodes if needed
    paragraph(state, node) {
      state.renderInline(node);
      state.closeBlock(node);
    },
  },
  {
    ...defaultMarkdownSerializer.marks,
    // Customize marks if needed
  }
);

export function serializeToMarkdown(state: EditorState): string {
  return markdownSerializer.serialize(state.doc);
}

export function extractTitle(markdown: string): string {
  // Try to extract title from YAML frontmatter
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const titleMatch = frontmatterMatch[1].match(/title:\s*["']?(.+?)["']?\n/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
  }

  // Fall back to first H1 heading
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Fall back to first line (max 50 chars)
  const firstLine = markdown.split('\n')[0].trim();
  return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine || 'Untitled';
}
