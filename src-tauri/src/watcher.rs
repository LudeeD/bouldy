use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, RecommendedCache};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize, Deserialize)]
pub struct NoteEventPayload {
    pub path: String,
    pub name: String,
    pub title: Option<String>,
    pub modified: Option<u64>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct NoteListPayload {
    pub notes: Vec<NoteEventPayload>,
}

fn extract_title_from_filename(path: &Path) -> String {
    // Extract title from filename (without .md extension)
    path.file_stem()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "Untitled".to_string())
}

fn get_note_metadata(path: &Path) -> Option<NoteEventPayload> {
    if path.extension().and_then(|s| s.to_str()) != Some("md") {
        return None;
    }

    let metadata = fs::metadata(path).ok()?;
    let modified = metadata
        .modified()
        .ok()?
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();

    let title = extract_title_from_filename(path);

    Some(NoteEventPayload {
        path: path.to_string_lossy().to_string(),
        name: path.file_name()?.to_string_lossy().to_string(),
        title: Some(title),
        modified: Some(modified),
    })
}

fn emit_note_list_updated(app: &AppHandle, notes_dir: &Path) {
    if let Ok(entries) = fs::read_dir(notes_dir) {
        let mut notes = Vec::new();

        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if let Some(note_payload) = get_note_metadata(&path) {
                notes.push(note_payload);
            }
        }

        // Sort by modified time (newest first)
        notes.sort_by(|a, b| b.modified.unwrap_or(0).cmp(&a.modified.unwrap_or(0)));

        let _ = app.emit("note:list-updated", NoteListPayload { notes });
    }
}

pub fn setup_watcher(
    app: AppHandle,
    vault_path: String,
) -> Result<Debouncer<RecommendedWatcher, RecommendedCache>, String> {
    let vault = PathBuf::from(&vault_path);
    let notes_dir = vault.join("notes");
    let prompts_dir = vault.join("prompts");
    let todo_file = vault.join("todo.txt");

    if !notes_dir.exists() {
        return Err("Notes directory does not exist".to_string());
    }

    // Create prompts directory if it doesn't exist
    if !prompts_dir.exists() {
        fs::create_dir(&prompts_dir)
            .map_err(|e| format!("Failed to create prompts directory: {}", e))?;
    }

    let app_clone = Arc::new(app);
    let notes_dir_clone = notes_dir.clone();
    let prompts_dir_clone = prompts_dir.clone();
    let todo_file_clone = todo_file.clone();

    let mut debouncer = new_debouncer(
        Duration::from_millis(500),
        None,
        move |result: DebounceEventResult| {
            match result {
                Ok(events) => {
                    let mut should_update_note_list = false;
                    let mut should_update_todos = false;

                    for event in events {
                        for path in &event.paths {
                            // Check if this is the todo.txt file
                            if path == &todo_file_clone {
                                match event.kind {
                                    notify::EventKind::Modify(_) => {
                                        should_update_todos = true;
                                    }
                                    notify::EventKind::Create(_) => {
                                        should_update_todos = true;
                                    }
                                    _ => {}
                                }
                                continue;
                            }

                            // Only process .md files
                            if path.extension().and_then(|s| s.to_str()) != Some("md") {
                                continue;
                            }

                            // Check if this is a notes file
                            if path.starts_with(&notes_dir_clone) {
                                match event.kind {
                                    notify::EventKind::Create(_) => {
                                        if let Some(payload) = get_note_metadata(path) {
                                            let _ = app_clone.emit("note:created", payload);
                                            should_update_note_list = true;
                                        }
                                    }
                                    notify::EventKind::Modify(_) => {
                                        if let Some(payload) = get_note_metadata(path) {
                                            let _ = app_clone.emit("note:updated", payload);
                                            should_update_note_list = true;
                                        }
                                    }
                                    notify::EventKind::Remove(_) => {
                                        let payload = NoteEventPayload {
                                            path: path.to_string_lossy().to_string(),
                                            name: path
                                                .file_name()
                                                .unwrap_or_default()
                                                .to_string_lossy()
                                                .to_string(),
                                            title: None,
                                            modified: None,
                                        };
                                        let _ = app_clone.emit("note:deleted", payload);
                                        should_update_note_list = true;
                                    }
                                    _ => {}
                                }
                            }
                            // Check if this is a prompts file
                            else if path.starts_with(&prompts_dir_clone) {
                                // Prompts are handled by write_prompt, delete_prompt commands
                                // which already emit events, so we don't need to emit here
                            }
                        }
                    }

                    // Emit full list update if any notes changed
                    if should_update_note_list {
                        emit_note_list_updated(&app_clone, &notes_dir_clone);
                    }

                    // Emit todos changed event if todo.txt was modified
                    if should_update_todos {
                        let _ = app_clone.emit("todos_changed", ());
                    }
                }
                Err(_errors) => {
                    // File watcher errors are silently ignored in production
                }
            }
        },
    )
    .map_err(|e| format!("Failed to create debouncer: {}", e))?;

    // Watch all directories and vault root for todo.txt
    debouncer
        .watch(&vault, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch vault directory: {}", e))?;
    debouncer
        .watch(&notes_dir, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch notes directory: {}", e))?;
    debouncer
        .watch(&prompts_dir, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch prompts directory: {}", e))?;

    Ok(debouncer)
}
