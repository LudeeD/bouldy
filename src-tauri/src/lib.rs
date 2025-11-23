use tauri_plugin_store::StoreExt;
use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};

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

#[tauri::command]
async fn select_vault_folder(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder = app.dialog()
        .file()
        .blocking_pick_folder();

    match folder {
        Some(path) => Ok(path.to_string()),
        None => Err("No folder selected".to_string())
    }
}

#[tauri::command]
async fn save_vault_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let store = app.store("settings.json")
        .map_err(|e| e.to_string())?;

    store.set("vaultPath", path);
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_vault_path(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let store = app.store("settings.json")
        .map_err(|e| e.to_string())?;

    Ok(store.get("vaultPath").and_then(|v| v.as_str().map(String::from)))
}

#[tauri::command]
async fn check_vault_exists(path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&path).exists())
}

fn validate_path_in_vault(vault_path: &str, file_path: &str) -> Result<PathBuf, String> {
    let vault = Path::new(vault_path).canonicalize()
        .map_err(|e| format!("Invalid vault path: {}", e))?;
    let file = Path::new(file_path).canonicalize()
        .map_err(|e| format!("Invalid file path: {}", e))?;

    if !file.starts_with(&vault) {
        return Err("Path is outside vault".to_string());
    }

    Ok(file)
}

fn extract_title_from_markdown(content: &str) -> String {
    // Try to extract from YAML frontmatter
    if let Some(frontmatter_end) = content.find("---\n") {
        if let Some(second_end) = content[frontmatter_end + 4..].find("---\n") {
            let frontmatter = &content[frontmatter_end + 4..frontmatter_end + 4 + second_end];
            if let Some(title_line) = frontmatter.lines().find(|l| l.starts_with("title:")) {
                let title = title_line.trim_start_matches("title:")
                    .trim()
                    .trim_matches('"')
                    .trim_matches('\'');
                if !title.is_empty() {
                    return title.to_string();
                }
            }
        }
    }

    // Try to extract from first H1 heading
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("# ") {
            return trimmed[2..].trim().to_string();
        }
    }

    // Fall back to first line
    let first_line = content.lines().next().unwrap_or("").trim();
    if first_line.len() > 50 {
        format!("{}...", &first_line[..47])
    } else if !first_line.is_empty() {
        first_line.to_string()
    } else {
        "Untitled".to_string()
    }
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

    let entries = fs::read_dir(read_dir)
        .map_err(|e| format!("Failed to read notes directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) == Some("md") {
            let metadata = fs::metadata(&path)
                .map_err(|e| format!("Failed to read metadata: {}", e))?;

            let modified = metadata.modified()
                .map_err(|e| format!("Failed to get modified time: {}", e))?
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();

            let content = fs::read_to_string(&path)
                .unwrap_or_else(|_| String::new());

            let title = extract_title_from_markdown(&content);

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
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read note: {}", e))?;

    let title = extract_title_from_markdown(&content);

    Ok(NoteMetadata { title, content })
}

#[tauri::command]
async fn write_note(path: String, content: String, title: String) -> Result<Note, String> {
    fs::write(&path, &content)
        .map_err(|e| format!("Failed to write note: {}", e))?;

    let metadata = fs::metadata(&path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;

    let modified = metadata.modified()
        .map_err(|e| format!("Failed to get modified time: {}", e))?
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let path_obj = Path::new(&path);

    Ok(Note {
        path: path.clone(),
        name: path_obj.file_name().unwrap().to_string_lossy().to_string(),
        title,
        modified,
    })
}

#[tauri::command]
async fn delete_note(vault_path: String, path: String) -> Result<(), String> {
    // Validate path is within vault
    validate_path_in_vault(&vault_path, &path)?;

    fs::remove_file(&path)
        .map_err(|e| format!("Failed to delete note: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn read_todos(vault_path: String) -> Result<String, String> {
    let todo_path = Path::new(&vault_path).join("todo.txt");

    if !todo_path.exists() {
        // Return empty string if file doesn't exist yet
        return Ok(String::new());
    }

    fs::read_to_string(&todo_path)
        .map_err(|e| format!("Failed to read todos: {}", e))
}

#[tauri::command]
async fn write_todos(vault_path: String, content: String) -> Result<(), String> {
    let todo_path = Path::new(&vault_path).join("todo.txt");

    fs::write(&todo_path, content)
        .map_err(|e| format!("Failed to write todos: {}", e))
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
        let entries = fs::read_dir(vault)
            .map_err(|e| format!("Failed to read vault directory: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();

            // Only move .md files
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("md") {
                let file_name = path.file_name()
                    .ok_or_else(|| "Failed to get file name".to_string())?;
                let dest_path = notes_dir.join(file_name);

                fs::rename(&path, &dest_path)
                    .map_err(|e| format!("Failed to move file: {}", e))?;
            }
        }
    }

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
            migrate_vault_structure
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
