import { MarkdownParser } from "prosemirror-markdown";
import { Plugin } from "prosemirror-state";
import MarkdownIt from "markdown-it";
import { mySchema } from "./editorSchema";

// Create a markdown parser that works with our schema
export const markdownParser = new MarkdownParser(mySchema, new MarkdownIt(), {
  blockquote: { block: "blockquote" },
  paragraph: { block: "paragraph" },
  list_item: { block: "list_item" },
  bullet_list: { block: "bullet_list" },
  ordered_list: {
    block: "ordered_list",
    getAttrs: (tok: any) => ({ order: +(tok.attrGet("start") || 1) }),
  },
  heading: {
    block: "heading",
    getAttrs: (tok: any) => ({ level: +tok.tag.slice(1) }),
  },
  code_block: { block: "code_block", noCloseToken: true },
  fence: {
    block: "code_block",
    getAttrs: (tok: any) => ({ params: tok.info || "" }),
    noCloseToken: true,
  },
  hr: { node: "horizontal_rule" },
  image: {
    node: "image",
    getAttrs: (tok: any) => ({
      src: tok.attrGet("src"),
      title: tok.attrGet("title") || null,
      alt: (tok.children && tok.children[0] && tok.children[0].content) || null,
    }),
  },
  hardbreak: { node: "hard_break" },
  em: { mark: "em" },
  strong: { mark: "strong" },
  link: {
    mark: "link",
    getAttrs: (tok: any) => ({
      href: tok.attrGet("href"),
      title: tok.attrGet("title") || null,
    }),
  },
  code_inline: { mark: "code", noCloseToken: true },
});

export function parseMarkdown(markdown: string, plugins: Plugin[] = []) {
  const doc = markdownParser.parse(markdown);
  if (!doc) {
    throw new Error("Failed to parse markdown");
  }
  return { doc, plugins };
}

export function stripFrontmatter(markdown: string): string {
  // Remove YAML frontmatter if present
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, "");
}
