use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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
    is_symlink: bool,
}

#[derive(Serialize, Deserialize)]
struct NoteMetadata {
    title: String,
    content: String,
}

// The content of a prompt file - clean and pure
#[derive(Serialize, Deserialize, Clone)]
struct PromptContent {
    title: String,
    content: String,
}

// Metadata stored in .bouldy/prompt-metadata.json - app-specific data
#[derive(Serialize, Deserialize, Clone, Default)]
struct PromptStats {
    #[serde(skip_serializing_if = "Option::is_none")]
    tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    variables: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "lastUsed")]
    last_used: Option<u64>,
    #[serde(rename = "useCount")]
    use_count: u64,
}

// What React sends when creating/updating a prompt
#[derive(Serialize, Deserialize, Clone)]
struct PromptInput {
    title: String,
    content: String,
    #[serde(default)]
    tags: Vec<String>,
    category: Option<String>,
    #[serde(default)]
    variables: Vec<String>,
}

// What React sees - combined view
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

    let file_path_buf = Path::new(file_path);

    // Check if the path is a symlink
    // For symlinks, validate the symlink location itself, not where it points
    let file = if file_path_buf.is_symlink() {
        // For symlinks, check that the symlink itself is within the vault
        let parent = file_path_buf
            .parent()
            .ok_or("Invalid file path")?
            .canonicalize()
            .map_err(|e| format!("Invalid parent path: {}", e))?;

        if !parent.starts_with(&vault) {
            return Err("Path is outside vault".to_string());
        }

        // Return the original path (the symlink), not the resolved target
        file_path_buf.to_path_buf()
    } else {
        // For regular files, canonicalize as before
        file_path_buf
            .canonicalize()
            .map_err(|e| format!("Invalid file path: {}", e))?
    };

    if !file.is_symlink() && !file.starts_with(&vault) {
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
            // Try to get metadata - if it fails (broken symlink), skip this file
            let metadata = match fs::metadata(&path) {
                Ok(m) => m,
                Err(e) => {
                    eprintln!("Warning: Skipping {} - {}", path.display(), e);
                    continue;
                }
            };

            let modified = match metadata.modified() {
                Ok(m) => m.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(),
                Err(e) => {
                    eprintln!("Warning: Skipping {} - {}", path.display(), e);
                    continue;
                }
            };

            let title = extract_title_from_filename(&path);
            let is_symlink = path.is_symlink();

            notes.push(Note {
                path: path.to_string_lossy().to_string(),
                name: path.file_name().unwrap().to_string_lossy().to_string(),
                title,
                modified,
                is_symlink,
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
    let is_symlink = path_obj.is_symlink();

    let note = Note {
        path: path.clone(),
        name: path_obj.file_name().unwrap().to_string_lossy().to_string(),
        title: title.clone(),
        modified,
        is_symlink,
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
async fn pick_markdown_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let file_path = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .blocking_pick_file();

    match file_path {
        Some(path) => {
            if let Some(path_ref) = path.as_path() {
                Ok(Some(path_ref.to_string_lossy().to_string()))
            } else {
                Err("Failed to get file path".to_string())
            }
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn import_note(
    vault_path: String,
    source_path: String,
    import_type: String,
    app: tauri::AppHandle,
) -> Result<String, String> {
    use std::path::Path;
    use std::fs;

    let source = Path::new(&source_path);
    if !source.exists() {
        return Err("Source file does not exist".to_string());
    }

    // Get filename from source
    let filename = source
        .file_name()
        .ok_or("Invalid filename")?
        .to_str()
        .ok_or("Invalid UTF-8 in filename")?;

    let dest_path = Path::new(&vault_path).join("notes").join(filename);

    // Check if file already exists
    if dest_path.exists() {
        return Err(format!("Note '{}' already exists in vault", filename));
    }

    match import_type.as_str() {
        "copy" => {
            fs::copy(&source, &dest_path)
                .map_err(|e| format!("Failed to copy file: {}", e))?;
        }
        "symlink" => {
            #[cfg(unix)]
            {
                std::os::unix::fs::symlink(&source, &dest_path)
                    .map_err(|e| format!("Failed to create symlink: {}", e))?;
            }
            #[cfg(windows)]
            {
                std::os::windows::fs::symlink_file(&source, &dest_path)
                    .map_err(|e| {
                        format!(
                            "Failed to create symlink: {}. Try running as administrator.",
                            e
                        )
                    })?;
            }
        }
        _ => return Err("Invalid import type. Use 'copy' or 'symlink'".to_string()),
    }

    // Emit event to refresh notes list
    app.emit("note:list-updated", ()).ok();

    Ok(dest_path.to_string_lossy().to_string())
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
    priority: Option<String>,
    projects: Vec<String>,
    contexts: Vec<String>,
) -> Result<todos::TodoItem, String> {
    let mut todos_list = todos::load_todos(&vault_path)?;

    let new_todo = todos::TodoItem {
        id: todos_list.len() + 1, // Use line number as ID
        title,
        completed: false,
        due_date,
        priority,
        projects,
        contexts,
        created_date: Some(chrono::Local::now().format("%Y-%m-%d").to_string()),
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
async fn update_todo_metadata(
    app: AppHandle,
    vault_path: String,
    id: usize,
    priority: Option<String>,
    projects: Vec<String>,
    contexts: Vec<String>,
) -> Result<todos::TodoItem, String> {
    let mut todos_list = todos::load_todos(&vault_path)?;

    let todo = todos::find_todo_mut(&mut todos_list, id)
        .ok_or_else(|| format!("Todo not found: {}", id))?;

    todo.priority = priority;
    todo.projects = projects;
    todo.contexts = contexts;
    let result = todo.clone();

    todos::save_todos(&vault_path, &todos_list)?;
    let _ = app.emit("todos_changed", ());

    Ok(result)
}

#[tauri::command]
async fn reorder_todo(
    app: AppHandle,
    vault_path: String,
    old_index: usize,
    new_index: usize,
) -> Result<(), String> {
    todos::reorder_todo(&vault_path, old_index, new_index)?;
    let _ = app.emit("todos_changed", ());
    Ok(())
}

#[tauri::command]
async fn get_todo_stats(vault_path: String) -> Result<todos::TodoStats, String> {
    let metadata = todos::load_metadata(&vault_path)?;
    Ok(metadata.stats)
}

#[tauri::command]
async fn get_todo_metadata(vault_path: String) -> Result<todos::TodoMetadata, String> {
    todos::load_metadata(&vault_path)
}

#[tauri::command]
async fn set_daily_limit(vault_path: String, limit: usize) -> Result<(), String> {
    let mut metadata = todos::load_metadata(&vault_path)?;
    metadata.daily_limit = limit;
    todos::save_metadata(&vault_path, &metadata)
}

#[tauri::command]
async fn archive_completed_todos(
    app: AppHandle,
    vault_path: String,
) -> Result<usize, String> {
    let count = todos::archive_completed_todos(&vault_path)?;
    let _ = app.emit("todos_changed", ());
    Ok(count)
}

#[tauri::command]
async fn load_archived_todos(
    vault_path: String,
    month: String,
) -> Result<Vec<todos::ArchivedTodo>, String> {
    todos::load_archived_todos(&vault_path, &month)
}

#[tauri::command]
async fn list_archive_months(vault_path: String) -> Result<Vec<String>, String> {
    todos::list_archive_months(&vault_path)
}

#[tauri::command]
async fn list_projects(vault_path: String) -> Result<Vec<String>, String> {
    let todos = todos::load_todos(&vault_path)?;

    let projects: std::collections::HashSet<String> = todos
        .iter()
        .flat_map(|t| t.projects.iter().cloned())
        .collect();

    let mut project_list: Vec<String> = projects.into_iter().collect();
    project_list.sort();

    Ok(project_list)
}

#[tauri::command]
async fn list_contexts(vault_path: String) -> Result<Vec<String>, String> {
    let todos = todos::load_todos(&vault_path)?;

    let contexts: std::collections::HashSet<String> = todos
        .iter()
        .flat_map(|t| t.contexts.iter().cloned())
        .collect();

    let mut context_list: Vec<String> = contexts.into_iter().collect();
    context_list.sort();

    Ok(context_list)
}

#[tauri::command]
async fn list_priorities(vault_path: String) -> Result<Vec<String>, String> {
    let todos = todos::load_todos(&vault_path)?;

    let priorities: std::collections::HashSet<String> = todos
        .iter()
        .filter_map(|t| t.priority.clone())
        .collect();

    let mut priority_list: Vec<String> = priorities.into_iter().collect();
    priority_list.sort();

    Ok(priority_list)
}

#[tauri::command]
async fn bulk_update_due_dates(
    app: AppHandle,
    vault_path: String,
    updates: Vec<(usize, Option<String>)>,
) -> Result<(), String> {
    todos::bulk_update_due_dates(&vault_path, updates)?;
    let _ = app.emit("todos_changed", ());
    Ok(())
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
// Ensure .bouldy directory exists
fn ensure_bouldy_dir(vault_path: &str) -> Result<PathBuf, String> {
    let bouldy_dir = Path::new(vault_path).join(".bouldy");
    if !bouldy_dir.exists() {
        fs::create_dir(&bouldy_dir)
            .map_err(|e| format!("Failed to create .bouldy directory: {}", e))?;
    }
    Ok(bouldy_dir)
}

// Parse clean markdown prompt file
fn parse_prompt_content(content: &str) -> Result<PromptContent, String> {
    let lines: Vec<&str> = content.lines().collect();
    
    if lines.is_empty() {
        return Ok(PromptContent {
            title: "Untitled".to_string(),
            content: String::new(),
        });
    }
    
    let title = if lines[0].starts_with("# ") {
        lines[0][2..].trim().to_string()
    } else {
        "Untitled".to_string()
    };
    
    let body_start = if lines[0].starts_with("# ") { 1 } else { 0 };
    let body = lines[body_start..]
        .iter()
        .map(|s| s.to_string())
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string();
    
    Ok(PromptContent {
        title,
        content: body,
    })
}

// Serialize prompt to clean markdown
fn serialize_prompt_content(prompt: &PromptContent) -> String {
    format!("# {}\n\n{}", prompt.title, prompt.content)
}

// Load all metadata from .bouldy/prompt-metadata.json
fn load_all_prompt_stats(vault_path: &str) -> Result<HashMap<String, PromptStats>, String> {
    let bouldy_dir = Path::new(vault_path).join(".bouldy");
    let metadata_file = bouldy_dir.join("prompt-metadata.json");
    
    if !metadata_file.exists() {
        return Ok(HashMap::new());
    }
    
    let content = fs::read_to_string(&metadata_file)
        .map_err(|e| format!("Failed to read prompt metadata: {}", e))?;
    
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse prompt metadata: {}", e))
}

// Save all metadata to .bouldy/prompt-metadata.json
fn save_all_prompt_stats(vault_path: &str, stats: &std::collections::HashMap<String, PromptStats>) -> Result<(), String> {
    let bouldy_dir = ensure_bouldy_dir(vault_path)?;
    let metadata_file = bouldy_dir.join("prompt-metadata.json");
    
    let content = serde_json::to_string_pretty(stats)
        .map_err(|e| format!("Failed to serialize prompt metadata: {}", e))?;
    
    fs::write(&metadata_file, content)
        .map_err(|e| format!("Failed to write prompt metadata: {}", e))
}

// Extract full Prompt from file + metadata
fn extract_prompt_from_file(path: &Path, id: &str, all_stats: &std::collections::HashMap<String, PromptStats>) -> Result<Prompt, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read prompt: {}", e))?;
    
    let prompt_content = parse_prompt_content(&content)?;
    
    let file_metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;
    
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
    
    let stats = all_stats.get(id).cloned().unwrap_or_default();
    
    Ok(Prompt {
        id: id.to_string(),
        title: prompt_content.title,
        content: prompt_content.content,
        tags: stats.tags.unwrap_or_default(),
        category: stats.category,
        variables: stats.variables.unwrap_or_default(),
        last_used: stats.last_used,
        use_count: stats.use_count,
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

    // Load all metadata
    let all_stats = load_all_prompt_stats(&vault_path)?;

    let mut prompts = Vec::new();

    let entries = fs::read_dir(&prompts_dir)
        .map_err(|e| format!("Failed to read prompts directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) == Some("md") {
            let id = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("untitled");
            
            match extract_prompt_from_file(&path, id, &all_stats) {
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
async fn read_prompt(vault_path: String, id: String) -> Result<Prompt, String> {
    let vault = Path::new(&vault_path);
    let prompts_dir = vault.join("prompts");
    let file_path = prompts_dir.join(format!("{}.md", id));

    let all_stats = load_all_prompt_stats(&vault_path)?;
    extract_prompt_from_file(&file_path, &id, &all_stats)
}

#[tauri::command]
async fn write_prompt(
    app: AppHandle,
    vault_path: String,
    id: String,
    input: PromptInput,
) -> Result<Prompt, String> {
    let vault = Path::new(&vault_path);
    let prompts_dir = vault.join("prompts");

    // Create prompts directory if it doesn't exist
    if !prompts_dir.exists() {
        fs::create_dir(&prompts_dir)
            .map_err(|e| format!("Failed to create prompts directory: {}", e))?;
    }

    // Write clean markdown file (just title + content)
    let prompt_content = PromptContent {
        title: input.title,
        content: input.content,
    };
    let file_path = prompts_dir.join(format!("{}.md", id));
    let serialized = serialize_prompt_content(&prompt_content);
    fs::write(&file_path, serialized).map_err(|e| format!("Failed to write prompt: {}", e))?;

    // Update metadata in .bouldy/prompt-metadata.json
    let mut all_stats = load_all_prompt_stats(&vault_path)?;
    all_stats.insert(
        id.clone(),
        PromptStats {
            tags: if input.tags.is_empty() { None } else { Some(input.tags) },
            category: input.category,
            variables: if input.variables.is_empty() { None } else { Some(input.variables) },
            last_used: None,
            use_count: 0,
        },
    );
    save_all_prompt_stats(&vault_path, &all_stats)?;

    // Load and return the full prompt
    let all_stats = load_all_prompt_stats(&vault_path)?;
    let prompt = extract_prompt_from_file(&file_path, &id, &all_stats)?;

    // Emit event after successful save
    let _ = app.emit("prompt:saved", prompt.clone());

    Ok(prompt)
}

#[tauri::command]
async fn delete_prompt(app: AppHandle, vault_path: String, id: String) -> Result<(), String> {
    let vault = Path::new(&vault_path);
    let prompts_dir = vault.join("prompts");
    let file_path = prompts_dir.join(format!("{}.md", id));

    // Delete the prompt file
    fs::remove_file(&file_path).map_err(|e| format!("Failed to delete prompt: {}", e))?;

    // Remove from metadata
    let mut all_stats = load_all_prompt_stats(&vault_path)?;
    all_stats.remove(&id);
    save_all_prompt_stats(&vault_path, &all_stats)?;

    // Emit event after successful deletion
    #[derive(Clone, Serialize)]
    struct PromptDeletedPayload {
        path: String,
        id: String,
    }

    let _ = app.emit(
        "prompt:deleted",
        PromptDeletedPayload {
            path: file_path.to_string_lossy().to_string(),
            id,
        },
    );

    Ok(())
}

#[tauri::command]
async fn track_prompt_usage(_app: AppHandle, vault_path: String, id: String) -> Result<(), String> {
    // Load all metadata
    let mut all_stats = load_all_prompt_stats(&vault_path)?;

    // Update usage tracking for this prompt
    let stats = all_stats.entry(id).or_insert_with(PromptStats::default);
    stats.use_count += 1;
    stats.last_used = Some(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    );

    // Save back
    save_all_prompt_stats(&vault_path, &all_stats)?;

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
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_process::init())
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
            pick_markdown_file,
            import_note,
            load_todos,
            create_todo,
            update_todo,
            delete_todo,
            toggle_todo,
            update_todo_due_date,
            update_todo_metadata,
            reorder_todo,
            get_todo_stats,
            get_todo_metadata,
            set_daily_limit,
            archive_completed_todos,
            load_archived_todos,
            list_archive_months,
            list_projects,
            list_contexts,
            list_priorities,
            bulk_update_due_dates,
            read_pomodoros,
            write_pomodoros,
            migrate_vault_structure,
            start_vault_watcher,
            list_prompts,
            read_prompt,
            write_prompt,
            delete_prompt,
            track_prompt_usage,
            get_saved_theme
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
