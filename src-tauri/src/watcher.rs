use notify::{RecursiveMode, Watcher};
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, NoCache};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use std::fs;
use tauri::{AppHandle, Emitter};
use serde::{Serialize, Deserialize};

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
    let modified = metadata.modified().ok()?
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
        notes.sort_by(|a, b| {
            b.modified.unwrap_or(0).cmp(&a.modified.unwrap_or(0))
        });

        let _ = app.emit("note:list-updated", NoteListPayload { notes });
    }
}

pub fn setup_watcher(app: AppHandle, vault_path: String) -> Result<Debouncer<impl Watcher, NoCache>, String> {
    let notes_dir = PathBuf::from(&vault_path).join("notes");

    if !notes_dir.exists() {
        return Err("Notes directory does not exist".to_string());
    }

    let app_clone = Arc::new(app);
    let notes_dir_clone = notes_dir.clone();

    let mut debouncer = new_debouncer(
        Duration::from_millis(500),
        None,
        move |result: DebounceEventResult| {
            match result {
                Ok(events) => {
                    let mut should_update_list = false;

                    for event in events {
                        for path in &event.paths {
                            // Only process .md files in the notes directory
                            if path.extension().and_then(|s| s.to_str()) != Some("md") {
                                continue;
                            }

                            if !path.starts_with(&notes_dir_clone) {
                                continue;
                            }

                            match event.kind {
                                notify::EventKind::Create(_) => {
                                    if let Some(payload) = get_note_metadata(path) {
                                        let _ = app_clone.emit("note:created", payload);
                                        should_update_list = true;
                                    }
                                }
                                notify::EventKind::Modify(_) => {
                                    if let Some(payload) = get_note_metadata(path) {
                                        let _ = app_clone.emit("note:updated", payload);
                                        should_update_list = true;
                                    }
                                }
                                notify::EventKind::Remove(_) => {
                                    let payload = NoteEventPayload {
                                        path: path.to_string_lossy().to_string(),
                                        name: path.file_name()
                                            .unwrap_or_default()
                                            .to_string_lossy()
                                            .to_string(),
                                        title: None,
                                        modified: None,
                                    };
                                    let _ = app_clone.emit("note:deleted", payload);
                                    should_update_list = true;
                                }
                                _ => {}
                            }
                        }
                    }

                    // Emit full list update if any changes occurred
                    if should_update_list {
                        emit_note_list_updated(&app_clone, &notes_dir_clone);
                    }
                }
                Err(errors) => {
                    for error in errors {
                        eprintln!("File watcher error: {:?}", error);
                    }
                }
            }
        },
    ).map_err(|e| format!("Failed to create debouncer: {}", e))?;

    debouncer.watch(&notes_dir, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch directory: {}", e))?;

    Ok(debouncer)
}
