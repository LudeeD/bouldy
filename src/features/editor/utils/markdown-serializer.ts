import {
  MarkdownSerializer,
  defaultMarkdownSerializer,
} from "prosemirror-markdown";
import { EditorState } from "prosemirror-state";

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
  },
);

export function serializeToMarkdown(
  state: EditorState,
  title?: string,
): string {
  const markdown = markdownSerializer.serialize(state.doc);

  // If title is provided, add/update frontmatter
  if (title !== undefined) {
    // Check if frontmatter already exists
    const hasFrontmatter = markdown.startsWith("---\n");

    if (hasFrontmatter) {
      // Replace existing frontmatter
      return markdown.replace(
        /^---\n[\s\S]*?\n---\n/,
        `---\ntitle: ${title}\n---\n`,
      );
    } else {
      // Add new frontmatter
      return `---\ntitle: ${title}\n---\n\n${markdown}`;
    }
  }

  return markdown;
}

export function extractTitle(markdown: string): string {
  // Only extract title from YAML frontmatter
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const titleMatch = frontmatterMatch[1].match(/title:\s*["']?(.+?)["']?\n/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
  }

  // Default to "Untitled" if no frontmatter title found
  return "Untitled";
}
