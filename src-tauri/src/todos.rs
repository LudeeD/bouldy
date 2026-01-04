use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Subtask {
    pub title: String,
    pub completed: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TodoItem {
    pub id: usize, // Line number in the file (1-indexed)
    pub title: String,
    pub completed: bool,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    pub subtasks: Vec<Subtask>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct TodoStats {
    #[serde(rename = "totalCompleted")]
    pub total_completed: usize,
    #[serde(rename = "currentStreak")]
    pub current_streak: usize,
    #[serde(rename = "longestStreak")]
    pub longest_streak: usize,
    #[serde(rename = "completionsByMonth")]
    pub completions_by_month: HashMap<String, usize>,
    #[serde(rename = "completionsByDay")]
    pub completions_by_day: HashMap<String, usize>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TodoMetadata {
    #[serde(rename = "dailyLimit")]
    pub daily_limit: usize,
    pub stats: TodoStats,
}

impl Default for TodoMetadata {
    fn default() -> Self {
        Self {
            daily_limit: 5,
            stats: TodoStats::default(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ArchivedTodo {
    pub title: String,
    #[serde(rename = "completedDate")]
    pub completed_date: String,
    pub subtasks: Vec<Subtask>,
}

/// Parse todo.txt file into TodoItem array
pub fn parse_todos(content: &str) -> Result<Vec<TodoItem>, String> {
    if content.trim().is_empty() {
        return Ok(Vec::new());
    }

    let mut todos: Vec<TodoItem> = Vec::new();
    let mut current_parent: Option<usize> = None;
    let mut line_num = 0;

     for line in content.lines() {
         line_num += 1;
         if line.trim().is_empty() {
             continue;
         }

         // Check if it's a subtask BEFORE trimming
         if line.starts_with("  - ") || line.starts_with("  x ") {
             // This is a subtask
             if let Some(parent_idx) = current_parent {
                 if let Ok(subtask) = parse_subtask_line(line) {
                     todos[parent_idx].subtasks.push(subtask);
                 }
             }
         } else {
             // This is a todo item
             let trimmed_line = line.trim();
             if let Ok(todo) = parse_todo_line(trimmed_line, line_num) {
                 current_parent = Some(todos.len());
                 todos.push(todo);
             }
         }
     }

    Ok(todos)
}

/// Parse a single todo line
fn parse_todo_line(line: &str, line_num: usize) -> Result<TodoItem, String> {
    let completed = line.starts_with('x');
    let content = if completed {
        &line[1..].trim_start()
    } else {
        line
    };

    // Extract due date if present (e.g., "due:2025-12-25")
    let due_date = extract_due_date(content);

    // Remove due date tag from title
    let title = if let Some(due) = &due_date {
        content
            .replace(&format!("due:{}", due), "")
            .trim()
            .to_string()
    } else {
        content.to_string()
    };

    Ok(TodoItem {
        id: line_num,
        title,
        completed,
        due_date,
        subtasks: Vec::new(),
    })
}

/// Parse a subtask line
fn parse_subtask_line(line: &str) -> Result<Subtask, String> {
    let line = line.trim();

    let completed = line.starts_with('x');
    let content = if completed {
        &line[1..].trim_start()
    } else {
        line
    };

    // Remove the "- " prefix if present
    let title = if let Some(rest) = content.strip_prefix("- ") {
        rest.to_string()
    } else {
        content.to_string()
    };

    Ok(Subtask { title, completed })
}

/// Extract due date from line (e.g., "due:2025-12-25")
fn extract_due_date(content: &str) -> Option<String> {
    content.split_whitespace().find_map(|word| {
        if word.starts_with("due:") {
            Some(word[4..].to_string())
        } else {
            None
        }
    })
}

/// Serialize TodoItem array to todo.txt format
pub fn serialize_todos(todos: &[TodoItem]) -> String {
    let mut result = String::new();

    for todo in todos {
        let completed_prefix = if todo.completed { "x " } else { "" };
        let due_date_tag = todo
            .due_date
            .as_ref()
            .map(|d| format!(" due:{}", d))
            .unwrap_or_default();

        result.push_str(&format!(
            "{}{}{}",
            completed_prefix, todo.title, due_date_tag
        ));
        result.push('\n');

        // Add subtasks
        for subtask in &todo.subtasks {
            let subtask_prefix = if subtask.completed { "x " } else { "" };
            result.push_str(&format!("  {}- {}\n", subtask_prefix, subtask.title));
        }
    }

    result
}

pub fn load_todos(vault_path: &str) -> Result<Vec<TodoItem>, String> {
    let todo_path = Path::new(vault_path).join("todo.txt");

    if !todo_path.exists() {
        return Ok(Vec::new());
    }

    let content =
        fs::read_to_string(&todo_path).map_err(|e| format!("Failed to read todos: {}", e))?;

    parse_todos(&content)
}

pub fn save_todos(vault_path: &str, todos: &[TodoItem]) -> Result<(), String> {
    let todo_path = Path::new(vault_path).join("todo.txt");
    let serialized = serialize_todos(todos);

    fs::write(&todo_path, serialized).map_err(|e| format!("Failed to write todos: {}", e))?;

    Ok(())
}

pub fn find_todo_mut(todos: &mut [TodoItem], id: usize) -> Option<&mut TodoItem> {
    todos.iter_mut().find(|t| t.id == id)
}

pub fn find_subtask_mut(todo: &mut TodoItem, index: usize) -> Option<&mut Subtask> {
    todo.subtasks.get_mut(index)
}

pub fn reorder_todo(vault_path: &str, old_index: usize, new_index: usize) -> Result<(), String> {
    let mut todos = load_todos(vault_path)?;

    if old_index >= todos.len() || new_index >= todos.len() {
        return Err("Invalid index for reordering".to_string());
    }

    if old_index == new_index {
        return Ok(());
    }

    // Remove the todo from old position
    let todo = todos.remove(old_index);

    // Insert at new position
    todos.insert(new_index, todo);

    // Save the reordered todos
    save_todos(vault_path, &todos)?;

    Ok(())
}

// === Metadata and Archive Functions ===

fn get_metadata_path(vault_path: &str) -> std::path::PathBuf {
    Path::new(vault_path).join(".bouldy").join("todo-metadata.json")
}

fn get_archives_dir(vault_path: &str) -> std::path::PathBuf {
    Path::new(vault_path).join(".bouldy").join("archives")
}

pub fn load_metadata(vault_path: &str) -> Result<TodoMetadata, String> {
    let metadata_path = get_metadata_path(vault_path);

    if !metadata_path.exists() {
        return Ok(TodoMetadata::default());
    }

    let content = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse metadata: {}", e))
}

pub fn save_metadata(vault_path: &str, metadata: &TodoMetadata) -> Result<(), String> {
    let metadata_path = get_metadata_path(vault_path);

    // Ensure .bouldy directory exists
    if let Some(parent) = metadata_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create .bouldy directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(metadata)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;

    fs::write(&metadata_path, content)
        .map_err(|e| format!("Failed to write metadata: {}", e))?;

    Ok(())
}

fn get_current_date() -> String {
    use std::time::SystemTime;
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let days = now / 86400;
    let year = 1970 + (days / 365);
    let day_of_year = days % 365;

    // Simple approximation - good enough for our purposes
    let month = (day_of_year / 30) + 1;
    let day = (day_of_year % 30) + 1;

    format!("{:04}-{:02}-{:02}", year, month, day)
}

fn get_current_month() -> String {
    let date = get_current_date();
    date[..7].to_string() // YYYY-MM
}

fn calculate_streak(completions_by_day: &HashMap<String, usize>) -> usize {
    if completions_by_day.is_empty() {
        return 0;
    }

    let today = get_current_date();
    let mut streak = 0;
    let mut current_date = today.clone();

    loop {
        if completions_by_day.contains_key(&current_date) {
            streak += 1;
            // Go to previous day (simplified - just decrement day number)
            let parts: Vec<&str> = current_date.split('-').collect();
            if let (Ok(y), Ok(m), Ok(d)) = (
                parts[0].parse::<i32>(),
                parts[1].parse::<i32>(),
                parts[2].parse::<i32>(),
            ) {
                let prev_day = if d > 1 {
                    format!("{:04}-{:02}-{:02}", y, m, d - 1)
                } else if m > 1 {
                    format!("{:04}-{:02}-30", y, m - 1)
                } else {
                    format!("{:04}-12-30", y - 1)
                };
                current_date = prev_day;
            } else {
                break;
            }
        } else {
            break;
        }
    }

    streak
}

pub fn archive_completed_todos(vault_path: &str) -> Result<usize, String> {
    let todos = load_todos(vault_path)?;
    let mut metadata = load_metadata(vault_path)?;

    let completed_todos: Vec<TodoItem> = todos.iter()
        .filter(|t| t.completed)
        .cloned()
        .collect();

    if completed_todos.is_empty() {
        return Ok(0);
    }

    let count = completed_todos.len();
    let today = get_current_date();
    let current_month = get_current_month();

    // Update stats
    metadata.stats.total_completed += count;
    *metadata.stats.completions_by_day.entry(today.clone()).or_insert(0) += count;
    *metadata.stats.completions_by_month.entry(current_month.clone()).or_insert(0) += count;

    // Calculate streaks
    let current_streak = calculate_streak(&metadata.stats.completions_by_day);
    metadata.stats.current_streak = current_streak;
    if current_streak > metadata.stats.longest_streak {
        metadata.stats.longest_streak = current_streak;
    }

    // Save metadata
    save_metadata(vault_path, &metadata)?;

    // Write to archive file
    let archives_dir = get_archives_dir(vault_path);
    fs::create_dir_all(&archives_dir)
        .map_err(|e| format!("Failed to create archives directory: {}", e))?;

    let archive_file = archives_dir.join(format!("done-{}.txt", current_month));
    let mut archive_content = if archive_file.exists() {
        fs::read_to_string(&archive_file)
            .map_err(|e| format!("Failed to read archive file: {}", e))?
    } else {
        String::new()
    };

    // Append completed todos to archive
    for todo in &completed_todos {
        archive_content.push_str(&format!("[{}] {}\n", today, todo.title));
        for subtask in &todo.subtasks {
            let prefix = if subtask.completed { "x " } else { "" };
            archive_content.push_str(&format!("  {}- {}\n", prefix, subtask.title));
        }
    }

    fs::write(&archive_file, archive_content)
        .map_err(|e| format!("Failed to write archive file: {}", e))?;

    // Remove completed todos from active list
    let remaining_todos: Vec<TodoItem> = todos.into_iter()
        .filter(|t| !t.completed)
        .collect();

    save_todos(vault_path, &remaining_todos)?;

    Ok(count)
}

pub fn load_archived_todos(vault_path: &str, month: &str) -> Result<Vec<ArchivedTodo>, String> {
    let archives_dir = get_archives_dir(vault_path);
    let archive_file = archives_dir.join(format!("done-{}.txt", month));

    if !archive_file.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&archive_file)
        .map_err(|e| format!("Failed to read archive file: {}", e))?;

    let mut archived_todos = Vec::new();
    let mut current_todo: Option<ArchivedTodo> = None;

    for line in content.lines() {
        if line.starts_with('[') {
            // Save previous todo if any
            if let Some(todo) = current_todo.take() {
                archived_todos.push(todo);
            }

            // Parse new todo: [2026-01-03] Task title
            if let Some(end_bracket) = line.find(']') {
                let date = line[1..end_bracket].to_string();
                let title = line[end_bracket + 1..].trim().to_string();
                current_todo = Some(ArchivedTodo {
                    title,
                    completed_date: date,
                    subtasks: Vec::new(),
                });
            }
        } else if line.trim().starts_with("- ") || line.trim().starts_with("x ") {
            // Subtask
            if let Some(ref mut todo) = current_todo {
                let trimmed = line.trim();
                let completed = trimmed.starts_with("x ");
                let title = if completed {
                    trimmed[3..].to_string() // Skip "x - "
                } else {
                    trimmed[2..].to_string() // Skip "- "
                };
                todo.subtasks.push(Subtask { title, completed });
            }
        }
    }

    // Save last todo
    if let Some(todo) = current_todo {
        archived_todos.push(todo);
    }

    Ok(archived_todos)
}

pub fn list_archive_months(vault_path: &str) -> Result<Vec<String>, String> {
    let archives_dir = get_archives_dir(vault_path);

    if !archives_dir.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&archives_dir)
        .map_err(|e| format!("Failed to read archives directory: {}", e))?;

    let mut months = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            if let Some(name) = entry.file_name().to_str() {
                if name.starts_with("done-") && name.ends_with(".txt") {
                    let month = name[5..name.len()-4].to_string(); // Extract YYYY-MM
                    months.push(month);
                }
            }
        }
    }

    months.sort();
    months.reverse(); // Most recent first

    Ok(months)
}

pub fn bulk_update_due_dates(
    vault_path: &str,
    updates: Vec<(usize, Option<String>)>,
) -> Result<(), String> {
    let mut todos = load_todos(vault_path)?;

    for (id, new_due_date) in updates {
        if let Some(todo) = find_todo_mut(&mut todos, id) {
            todo.due_date = new_due_date;
        }
    }

    save_todos(vault_path, &todos)?;
    Ok(())
}
