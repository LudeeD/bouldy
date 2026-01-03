export type PanelType =
  | "notes"
  | "todos"
  | "calendar"
  | "settings"
  | "prompts"
  | "pomodoro";

export interface PanelState {
  left: PanelType | null;
  right: PanelType | null;
}

export interface PinnedState {
  left: boolean;
  right: boolean;
}
