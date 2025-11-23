export type PanelType = "editor" | "todos" | "calendar" | "settings";

export interface PanelState {
  left: PanelType | null;
  right: PanelType | null;
}
