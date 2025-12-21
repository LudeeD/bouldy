use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_store::StoreExt;

mod todos;
mod watcher;

#[derive(Serialize, Deserialize)]
struct Note {
    path: String,
    name: String,
    title: String,
    modified: u64,
}

#[derive(Serialize, Deserialize)]
struct NoteMetadata {
    title: String,
    content: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct Prompt {
    id: String,
    title: String,
    content: String,
    tags: Vec<String>,
    category: Option<String>,
    variables: Vec<String>,
    last_used: Option<u64>,
    use_count: u64,
    created: u64,
    modified: u64,
    path: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct PromptMetadata {
    title: String,
    content: String,
    tags: Vec<String>,
    category: Option<String>,
    variables: Vec<String>,
    #[serde(rename = "lastUsed")]
    last_used: Option<u64>,
    #[serde(rename = "useCount")]
    use_count: u64,
}

#[tauri::command]
async fn select_vault_folder(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder = app.dialog().file().blocking_pick_folder();

    match folder {
        Some(path) => Ok(path.to_string()),
        None => Err("No folder selected".to_string()),
    }
}

#[tauri::command]
async fn save_vault_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;

    store.set("vaultPath", path);
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_vault_path(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;

    Ok(store
        .get("vaultPath")
        .and_then(|v| v.as_str().map(String::from)))
}

#[tauri::command]
async fn check_vault_exists(path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&path).exists())
}

fn validate_path_in_vault(vault_path: &str, file_path: &str) -> Result<PathBuf, String> {
    let vault = Path::new(vault_path)
        .canonicalize()
        .map_err(|e| format!("Invalid vault path: {}", e))?;
    let file = Path::new(file_path)
        .canonicalize()
        .map_err(|e| format!("Invalid file path: {}", e))?;

    if !file.starts_with(&vault) {
        return Err("Path is outside vault".to_string());
    }

    Ok(file)
}

fn extract_title_from_filename(path: &Path) -> String {
    // Extract title from filename (without .md extension)
    path.file_stem()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "Untitled".to_string())
}

#[tauri::command]
async fn list_vault_files(vault_path: String) -> Result<Vec<Note>, String> {
    let vault = Path::new(&vault_path);
    let notes_dir = vault.join("notes");

    // Use notes/ folder if it exists, otherwise fall back to vault root
    let read_dir = if notes_dir.exists() {
        &notes_dir
    } else {
        vault
    };

    if !read_dir.exists() {
        return Err("Notes directory does not exist".to_string());
    }

    let mut notes = Vec::new();

    let entries =
        fs::read_dir(read_dir).map_err(|e| format!("Failed to read notes directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) == Some("md") {
            let metadata =
                fs::metadata(&path).map_err(|e| format!("Failed to read metadata: {}", e))?;

            let modified = metadata
                .modified()
                .map_err(|e| format!("Failed to get modified time: {}", e))?
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();

            let title = extract_title_from_filename(&path);

            notes.push(Note {
                path: path.to_string_lossy().to_string(),
                name: path.file_name().unwrap().to_string_lossy().to_string(),
                title,
                modified,
            });
        }
    }

    // Sort by modified time (newest first)
    notes.sort_by(|a, b| b.modified.cmp(&a.modified));

    Ok(notes)
}

#[tauri::command]
async fn read_note(path: String) -> Result<NoteMetadata, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read note: {}", e))?;

    let path_obj = Path::new(&path);
    let title = extract_title_from_filename(path_obj);

    Ok(NoteMetadata { title, content })
}

#[tauri::command]
async fn write_note(
    app: AppHandle,
    path: String,
    content: String,
    title: String,
) -> Result<Note, String> {
    fs::write(&path, &content).map_err(|e| format!("Failed to write note: {}", e))?;

    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to read metadata: {}", e))?;

    let modified = metadata
        .modified()
        .map_err(|e| format!("Failed to get modified time: {}", e))?
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let path_obj = Path::new(&path);

    let note = Note {
        path: path.clone(),
        name: path_obj.file_name().unwrap().to_string_lossy().to_string(),
        title: title.clone(),
        modified,
    };

    // Emit event after successful save
    let _ = app.emit(
        "note:saved",
        watcher::NoteEventPayload {
            path: path.clone(),
            name: note.name.clone(),
            title: Some(title),
            modified: Some(modified),
        },
    );

    Ok(note)
}

#[tauri::command]
async fn delete_note(app: AppHandle, vault_path: String, path: String) -> Result<(), String> {
    // Validate path is within vault
    validate_path_in_vault(&vault_path, &path)?;

    let path_obj = Path::new(&path);
    let name = path_obj
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    fs::remove_file(&path).map_err(|e| format!("Failed to delete note: {}", e))?;

    // Emit event after successful deletion
    let _ = app.emit(
        "note:deleted",
        watcher::NoteEventPayload {
            path: path.clone(),
            name,
            title: None,
            modified: None,
        },
    );

    Ok(())
}

#[tauri::command]
async fn load_todos(vault_path: String) -> Result<Vec<todos::TodoItem>, String> {
    todos::load_todos(&vault_path)
}

#[tauri::command]
async fn create_todo(
    app: AppHandle,
    vault_path: String,
    title: String,
    due_date: Option<String>,
) -> Result<todos::TodoItem, String> {
    let mut todos_list = todos::load_todos(&vault_path)?;

    let new_todo = todos::TodoItem {
        id: todos_list.len() + 1, // Use line number as ID
        title,
        completed: false,
        due_date,
        subtasks: Vec::new(),
    };

    todos_list.push(new_todo.clone());
    todos::save_todos(&vault_path, &todos_list)?;

    // Emit event for external change detection
    let _ = app.emit("todos_changed", ());

    Ok(new_todo)
}

#[tauri::command]
async fn update_todo(
    app: AppHandle,
    vault_path: String,
    id: usize,
    title: String,
) -> Result<todos::TodoItem, String> {
    let mut todos_list = todos::load_todos(&vault_path)?;

    let todo = todos::find_todo_mut(&mut todos_list, id)
        .ok_or_else(|| format!("Todo not found: {}", id))?;

    todo.title = title;
    let result = todo.clone();

    todos::save_todos(&vault_path, &todos_list)?;
    let _ = app.emit("todos_changed", ());

    Ok(result)
}

#[tauri::command]
async fn delete_todo(app: AppHandle, vault_path: String, id: usize) -> Result<(), String> {
    let mut todos_list = todos::load_todos(&vault_path)?;

    todos_list.retain(|t| t.id != id);

    todos::save_todos(&vault_path, &todos_list)?;
    let _ = app.emit("todos_changed", ());

    Ok(())
}

#[tauri::command]
async fn toggle_todo(
    app: AppHandle,
    vault_path: String,
    id: usize,
) -> Result<todos::TodoItem, String> {
    let mut todos_list = todos::load_todos(&vault_path)?;

    let todo = todos::find_todo_mut(&mut todos_list, id)
        .ok_or_else(|| format!("Todo not found: {}", id))?;

    todo.completed = !todo.completed;
    let result = todo.clone();

    todos::save_todos(&vault_path, &todos_list)?;
    let _ = app.emit("todos_changed", ());

    Ok(result)
}

#[tauri::command]
async fn update_todo_due_date(
    app: AppHandle,
    vault_path: String,
    id: usize,
    due_date: Option<String>,
) -> Result<todos::TodoItem, String> {
    let mut todos_list = todos::load_todos(&vault_path)?;

    let todo = todos::find_todo_mut(&mut todos_list, id)
        .ok_or_else(|| format!("Todo not found: {}", id))?;

    todo.due_date = due_date;
    let result = todo.clone();

    todos::save_todos(&vault_path, &todos_list)?;
    let _ = app.emit("todos_changed", ());

    Ok(result)
}

#[tauri::command]
async fn add_subtask(
    app: AppHandle,
    vault_path: String,
    parent_id: usize,
    title: String,
) -> Result<todos::TodoItem, String> {
    let mut todos_list = todos::load_todos(&vault_path)?;

    let todo = todos::find_todo_mut(&mut todos_list, parent_id)
        .ok_or_else(|| format!("Todo not found: {}", parent_id))?;

    let subtask = todos::Subtask {
        title,
        completed: false,
    };

    todo.subtasks.push(subtask);
    let result = todo.clone();

    todos::save_todos(&vault_path, &todos_list)?;
    let _ = app.emit("todos_changed", ());

    Ok(result)
}

#[tauri::command]
async fn delete_subtask(
    app: AppHandle,
    vault_path: String,
    parent_id: usize,
    subtask_index: usize,
) -> Result<todos::TodoItem, String> {
    let mut todos_list = todos::load_todos(&vault_path)?;

    let todo = todos::find_todo_mut(&mut todos_list, parent_id)
        .ok_or_else(|| format!("Todo not found: {}", parent_id))?;

    if subtask_index < todo.subtasks.len() {
        todo.subtasks.remove(subtask_index);
    }
    let result = todo.clone();

    todos::save_todos(&vault_path, &todos_list)?;
    let _ = app.emit("todos_changed", ());

    Ok(result)
}

#[tauri::command]
async fn toggle_subtask(
    app: AppHandle,
    vault_path: String,
    parent_id: usize,
    subtask_index: usize,
) -> Result<todos::TodoItem, String> {
    let mut todos_list = todos::load_todos(&vault_path)?;

    let todo = todos::find_todo_mut(&mut todos_list, parent_id)
        .ok_or_else(|| format!("Todo not found: {}", parent_id))?;

    if let Some(subtask) = todos::find_subtask_mut(todo, subtask_index) {
        subtask.completed = !subtask.completed;
    }
    let result = todo.clone();

    todos::save_todos(&vault_path, &todos_list)?;
    let _ = app.emit("todos_changed", ());

    Ok(result)
}

#[tauri::command]
async fn read_pomodoros(vault_path: String) -> Result<String, String> {
    let pomodoro_path = Path::new(&vault_path).join(".pomodoros.md");

    if !pomodoro_path.exists() {
        // Return empty string if file doesn't exist yet
        return Ok(String::new());
    }

    fs::read_to_string(&pomodoro_path).map_err(|e| format!("Failed to read pomodoros: {}", e))
}

#[tauri::command]
async fn write_pomodoros(vault_path: String, content: String) -> Result<(), String> {
    let pomodoro_path = Path::new(&vault_path).join(".pomodoros.md");

    fs::write(&pomodoro_path, content).map_err(|e| format!("Failed to write pomodoros: {}", e))
}

#[tauri::command]
async fn migrate_vault_structure(vault_path: String) -> Result<(), String> {
    let vault = Path::new(&vault_path);
    let notes_dir = vault.join("notes");

    // Create notes directory if it doesn't exist
    if !notes_dir.exists() {
        fs::create_dir(&notes_dir)
            .map_err(|e| format!("Failed to create notes directory: {}", e))?;

        // Move all .md files from vault root to notes/
        let entries =
            fs::read_dir(vault).map_err(|e| format!("Failed to read vault directory: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();

            // Only move .md files
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("md") {
                let file_name = path
                    .file_name()
                    .ok_or_else(|| "Failed to get file name".to_string())?;
                let dest_path = notes_dir.join(file_name);

                fs::rename(&path, &dest_path).map_err(|e| format!("Failed to move file: {}", e))?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
async fn start_vault_watcher(app: AppHandle, vault_path: String) -> Result<(), String> {
    // Set up file watcher
    let debouncer = watcher::setup_watcher(app.clone(), vault_path)?;

    // Store the debouncer in app state to keep it alive
    app.manage(Mutex::new(Some(debouncer)));

    Ok(())
}

// Prompt helper functions
fn parse_prompt_frontmatter(content: &str) -> Result<(PromptMetadata, String), String> {
    // Split frontmatter from content
    let parts: Vec<&str> = content.splitn(3, "---").collect();

    if parts.len() < 3 || !parts[0].trim().is_empty() {
        // No valid frontmatter, return defaults
        return Ok((
            PromptMetadata {
                title: "Untitled".to_string(),
                content: content.to_string(),
                tags: vec![],
                category: None,
                variables: vec![],
                last_used: None,
                use_count: 0,
            },
            content.to_string(),
        ));
    }

    let frontmatter = parts[1].trim();
    let body = parts[2].trim();

    let metadata: PromptMetadata = serde_yaml::from_str(frontmatter)
        .map_err(|e| format!("Failed to parse frontmatter: {}", e))?;

    Ok((metadata, body.to_string()))
}

fn serialize_prompt(metadata: &PromptMetadata) -> Result<String, String> {
    let frontmatter = serde_yaml::to_string(metadata)
        .map_err(|e| format!("Failed to serialize frontmatter: {}", e))?;

    Ok(format!("---\n{}---\n\n{}", frontmatter, metadata.content))
}

fn extract_prompt_metadata(path: &Path) -> Result<Prompt, String> {
    let content = fs::read_to_string(path).map_err(|e| format!("Failed to read prompt: {}", e))?;

    let (mut metadata, body) = parse_prompt_frontmatter(&content)?;
    metadata.content = body;

    let file_metadata =
        fs::metadata(path).map_err(|e| format!("Failed to read file metadata: {}", e))?;

    let modified = file_metadata
        .modified()
        .map_err(|e| format!("Failed to get modified time: {}", e))?
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let created = file_metadata
        .created()
        .unwrap_or_else(|_| file_metadata.modified().unwrap())
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let id = path
        .file_stem()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "untitled".to_string());

    Ok(Prompt {
        id,
        title: metadata.title,
        content: metadata.content,
        tags: metadata.tags,
        category: metadata.category,
        variables: metadata.variables,
        last_used: metadata.last_used,
        use_count: metadata.use_count,
        created,
        modified,
        path: path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
async fn list_prompts(vault_path: String) -> Result<Vec<Prompt>, String> {
    let vault = Path::new(&vault_path);
    let prompts_dir = vault.join("prompts");

    // Create prompts directory if it doesn't exist
    if !prompts_dir.exists() {
        fs::create_dir(&prompts_dir)
            .map_err(|e| format!("Failed to create prompts directory: {}", e))?;
        return Ok(vec![]);
    }

    let mut prompts = Vec::new();

    let entries = fs::read_dir(&prompts_dir)
        .map_err(|e| format!("Failed to read prompts directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) == Some("md") {
            match extract_prompt_metadata(&path) {
                Ok(prompt) => prompts.push(prompt),
                Err(_) => {
                    // Skip invalid prompts silently
                }
            }
        }
    }

    // Sort by lastUsed (recent first), then by title
    prompts.sort_by(|a, b| match (a.last_used, b.last_used) {
        (Some(a_used), Some(b_used)) => b_used.cmp(&a_used),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => a.title.cmp(&b.title),
    });

    Ok(prompts)
}

#[tauri::command]
async fn read_prompt(path: String) -> Result<PromptMetadata, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read prompt: {}", e))?;

    let (metadata, _body) = parse_prompt_frontmatter(&content)?;

    Ok(metadata)
}

#[tauri::command]
async fn write_prompt(
    app: AppHandle,
    vault_path: String,
    id: String,
    metadata: PromptMetadata,
) -> Result<Prompt, String> {
    let vault = Path::new(&vault_path);
    let prompts_dir = vault.join("prompts");

    // Create prompts directory if it doesn't exist
    if !prompts_dir.exists() {
        fs::create_dir(&prompts_dir)
            .map_err(|e| format!("Failed to create prompts directory: {}", e))?;
    }

    let file_path = prompts_dir.join(format!("{}.md", id));
    let serialized = serialize_prompt(&metadata)?;

    fs::write(&file_path, serialized).map_err(|e| format!("Failed to write prompt: {}", e))?;

    let prompt = extract_prompt_metadata(&file_path)?;

    // Emit event after successful save
    let _ = app.emit("prompt:saved", prompt.clone());

    Ok(prompt)
}

#[tauri::command]
async fn delete_prompt(app: AppHandle, path: String) -> Result<(), String> {
    let path_obj = Path::new(&path);
    let id = path_obj
        .file_stem()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string())
        .unwrap_or_default();

    fs::remove_file(&path).map_err(|e| format!("Failed to delete prompt: {}", e))?;

    // Emit event after successful deletion
    #[derive(Clone, Serialize)]
    struct PromptDeletedPayload {
        path: String,
        id: String,
    }

    let _ = app.emit(
        "prompt:deleted",
        PromptDeletedPayload {
            path: path.clone(),
            id,
        },
    );

    Ok(())
}

#[tauri::command]
async fn track_prompt_usage(_app: AppHandle, vault_path: String, id: String) -> Result<(), String> {
    let vault = Path::new(&vault_path);
    let prompts_dir = vault.join("prompts");
    let file_path = prompts_dir.join(format!("{}.md", id));

    // Read current prompt
    let content =
        fs::read_to_string(&file_path).map_err(|e| format!("Failed to read prompt: {}", e))?;

    let (mut metadata, _body) = parse_prompt_frontmatter(&content)?;

    // Update usage tracking
    metadata.use_count += 1;
    metadata.last_used = Some(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    );

    // Write back
    let serialized = serialize_prompt(&metadata)?;
    fs::write(&file_path, serialized).map_err(|e| format!("Failed to write prompt: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn get_saved_theme(app: tauri::AppHandle) -> Result<String, String> {
    match app.store("settings.json") {
        Ok(store) => {
            match store.get("theme") {
                Some(v) => {
                    if let Some(theme_str) = v.as_str() {
                        Ok(theme_str.to_string())
                    } else {
                        Ok("midnight".to_string())
                    }
                }
                None => {
                    Ok("midnight".to_string())
                }
            }
        }
        Err(_) => {
            Ok("midnight".to_string())
        }
    }
}

#[tauri::command]
async fn log_startup_metrics(
    _theme_init_ms: f64,
    _react_mount_ms: f64,
    _total_ms: f64,
    _first_paint_ms: Option<f64>,
) -> Result<(), String> {
    // Metrics logging disabled in production
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_autostart::ManagerExt;

                // Get the autostart manager
                let autostart_manager = app.autolaunch();
                // Enable autostart
                let _ = autostart_manager.enable();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            select_vault_folder,
            save_vault_path,
            get_vault_path,
            check_vault_exists,
            list_vault_files,
            read_note,
            write_note,
            delete_note,
            load_todos,
            create_todo,
            update_todo,
            delete_todo,
            toggle_todo,
            update_todo_due_date,
            add_subtask,
            delete_subtask,
            toggle_subtask,
            read_pomodoros,
            write_pomodoros,
            migrate_vault_structure,
            start_vault_watcher,
            list_prompts,
            read_prompt,
            write_prompt,
            delete_prompt,
            track_prompt_usage,
            get_saved_theme,
            log_startup_metrics
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
