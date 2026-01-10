export type PanelType =
  | "notes"
  | "todos"
  | "calendar"
  | "prompts"
  | "pomodoro"
  | "settings";

export interface PanelState {
  left: PanelType | null;
  right: PanelType | null;
}

export interface PinnedState {
  left: boolean;
  right: boolean;
}
