import { listen, emit, type UnlistenFn } from "@tauri-apps/api/event";

export interface NoteEventPayload {
  path: string;
  name: string;
  title?: string;
  modified?: number;
}

export interface NoteListPayload {
  notes: NoteEventPayload[];
}

export interface NoteSelectionPayload {
  path: string;
  title: string;
  name: string;
  modified: number;
}

export type NoteEventType =
  | "note:created"
  | "note:updated"
  | "note:deleted"
  | "note:saved"
  | "note:list-updated"
  | "note:selected";

/**
 * Listen for note-related events from the Tauri backend
 */
export async function listenToNoteEvent(
  event: "note:created" | "note:updated" | "note:deleted" | "note:saved",
  handler: (payload: NoteEventPayload) => void,
): Promise<UnlistenFn> {
  return listen<NoteEventPayload>(event, (event) => {
    handler(event.payload);
  });
}

/**
 * Listen for note list updates from the Tauri backend
 */
export async function listenToNoteListUpdated(
  handler: (payload: NoteListPayload) => void,
): Promise<UnlistenFn> {
  return listen<NoteListPayload>("note:list-updated", (event) => {
    handler(event.payload);
  });
}

/**
 * Listen for note selection events (frontend-only events)
 */
export async function listenToNoteSelected(
  handler: (payload: NoteSelectionPayload) => void,
): Promise<UnlistenFn> {
  return listen<NoteSelectionPayload>("note:selected", (event) => {
    handler(event.payload);
  });
}

/**
 * Emit a note selection event (frontend-only)
 */
export async function emitNoteSelected(
  payload: NoteSelectionPayload,
): Promise<void> {
  await emit("note:selected", payload);
}

/**
 * Convenience function to listen to multiple note events at once
 */
export async function listenToNoteEvents(handlers: {
  onCreated?: (payload: NoteEventPayload) => void;
  onUpdated?: (payload: NoteEventPayload) => void;
  onDeleted?: (payload: NoteEventPayload) => void;
  onSaved?: (payload: NoteEventPayload) => void;
  onListUpdated?: (payload: NoteListPayload) => void;
  onSelected?: (payload: NoteSelectionPayload) => void;
}): Promise<UnlistenFn[]> {
  const unlisteners: Promise<UnlistenFn>[] = [];

  if (handlers.onCreated) {
    unlisteners.push(listenToNoteEvent("note:created", handlers.onCreated));
  }
  if (handlers.onUpdated) {
    unlisteners.push(listenToNoteEvent("note:updated", handlers.onUpdated));
  }
  if (handlers.onDeleted) {
    unlisteners.push(listenToNoteEvent("note:deleted", handlers.onDeleted));
  }
  if (handlers.onSaved) {
    unlisteners.push(listenToNoteEvent("note:saved", handlers.onSaved));
  }
  if (handlers.onListUpdated) {
    unlisteners.push(listenToNoteListUpdated(handlers.onListUpdated));
  }
  if (handlers.onSelected) {
    unlisteners.push(listenToNoteSelected(handlers.onSelected));
  }

  return Promise.all(unlisteners);
}
