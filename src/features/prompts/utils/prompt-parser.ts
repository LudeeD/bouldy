import { PromptMetadata } from "../../../types/prompt";

export function parsePromptMarkdown(markdown: string): PromptMetadata {
  const parts = markdown.split("---");

  if (parts.length < 3 || parts[0].trim() !== "") {
    return {
      title: "Untitled",
      content: markdown,
      tags: [],
      category: undefined,
      variables: [],
      lastUsed: undefined,
      useCount: 0,
    };
  }

  const frontmatter = parts[1].trim();
  const content = parts.slice(2).join("---").trim();

  try {
    const lines = frontmatter.split("\n");
    const metadata: Partial<PromptMetadata> = {
      content,
      tags: [],
      variables: [],
      useCount: 0,
    };

    for (const line of lines) {
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      switch (key) {
        case "title":
          metadata.title = value.replace(/^["']|["']$/g, "");
          break;
        case "category":
          metadata.category = value.replace(/^["']|["']$/g, "");
          break;
        case "lastUsed":
          metadata.lastUsed = parseInt(value);
          break;
        case "useCount":
          metadata.useCount = parseInt(value);
          break;
        case "tags":
        case "variables":
          const arrayMatch = value.match(/\[(.*)\]/);
          if (arrayMatch) {
            const items = arrayMatch[1]
              .split(",")
              .map((item) => item.trim().replace(/^["']|["']$/g, ""))
              .filter((item) => item.length > 0);
            if (key === "tags") {
              metadata.tags = items;
            } else {
              metadata.variables = items;
            }
          }
          break;
      }
    }

    return metadata as PromptMetadata;
  } catch (error) {
    console.error("Failed to parse frontmatter:", error);
    return {
      title: "Untitled",
      content,
      tags: [],
      category: undefined,
      variables: [],
      lastUsed: undefined,
      useCount: 0,
    };
  }
}
