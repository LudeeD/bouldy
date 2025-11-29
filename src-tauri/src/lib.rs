use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_store::StoreExt;

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
async fn get_vault_path(app: tauri::AppHandle) -> Result<Option<String>, String> {
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
async fn read_todos(vault_path: String) -> Result<String, String> {
    let todo_path = Path::new(&vault_path).join("todo.txt");

    if !todo_path.exists() {
        // Return empty string if file doesn't exist yet
        return Ok(String::new());
    }

    fs::read_to_string(&todo_path).map_err(|e| format!("Failed to read todos: {}", e))
}

#[tauri::command]
async fn write_todos(vault_path: String, content: String) -> Result<(), String> {
    let todo_path = Path::new(&vault_path).join("todo.txt");

    fs::write(&todo_path, content).map_err(|e| format!("Failed to write todos: {}", e))
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
                Err(e) => eprintln!("Failed to parse prompt {}: {}", path.display(), e),
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            select_vault_folder,
            save_vault_path,
            get_vault_path,
            check_vault_exists,
            list_vault_files,
            read_note,
            write_note,
            delete_note,
            read_todos,
            write_todos,
            migrate_vault_structure,
            start_vault_watcher,
            list_prompts,
            read_prompt,
            write_prompt,
            delete_prompt,
            track_prompt_usage
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
