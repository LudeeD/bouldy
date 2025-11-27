import { PromptMetadata } from "../../../types/prompt";

export function serializePromptToMarkdown(metadata: PromptMetadata): string {
  const frontmatter: string[] = [];

  frontmatter.push(`title: "${metadata.title}"`);

  if (metadata.tags.length > 0) {
    const tagsStr = metadata.tags.map((tag) => `"${tag}"`).join(", ");
    frontmatter.push(`tags: [${tagsStr}]`);
  }

  if (metadata.category) {
    frontmatter.push(`category: "${metadata.category}"`);
  }

  if (metadata.variables.length > 0) {
    const varsStr = metadata.variables.map((v) => `"${v}"`).join(", ");
    frontmatter.push(`variables: [${varsStr}]`);
  }

  if (metadata.lastUsed) {
    frontmatter.push(`lastUsed: ${metadata.lastUsed}`);
  }

  frontmatter.push(`useCount: ${metadata.useCount}`);

  return `---\n${frontmatter.join("\n")}\n---\n\n${metadata.content}`;
}
