export type PanelType = "editor" | "todos" | "calendar" | "settings" | "prompts";

export interface PanelState {
  left: PanelType | null;
  right: PanelType | null;
}
