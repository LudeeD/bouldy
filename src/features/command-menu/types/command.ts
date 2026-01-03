export type CommandCategory = "panel" | "note" | "todo" | "app" | "theme";

export interface Command {
  id: string;
  title: string;
  description?: string;
  category: CommandCategory;
  keywords?: string[];
  action: () => void | Promise<void>;
}
