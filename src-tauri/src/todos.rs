use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TodoItem {
    pub id: usize, // Line number in the file (1-indexed)
    pub title: String,
    pub completed: bool,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    pub priority: Option<String>,  // (A), (B), (C), etc.
    pub projects: Vec<String>,     // +ProjectName tags
    pub contexts: Vec<String>,     // @ContextName tags
    #[serde(rename = "createdDate")]
    pub created_date: Option<String>,  // YYYY-MM-DD
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
}

/// Parse todo.txt file into TodoItem array
pub fn parse_todos(content: &str) -> Result<Vec<TodoItem>, String> {
    if content.trim().is_empty() {
        return Ok(Vec::new());
    }

    let mut todos: Vec<TodoItem> = Vec::new();
    let mut line_num = 0;

    for line in content.lines() {
        line_num += 1;

        if line.trim().is_empty() {
            continue;
        }

        // Parse each line as a todo item
        if let Ok(todo) = parse_todo_line(line.trim(), line_num) {
            todos.push(todo);
        }
    }

    Ok(todos)
}

/// Parse a single todo line
fn parse_todo_line(line: &str, line_num: usize) -> Result<TodoItem, String> {
    let mut content = line.to_string();

    // 1. Check for completion marker
    let completed = content.trim_start().starts_with('x');
    if completed {
        content = content.trim_start()[1..].trim_start().to_string();
    }

    // 2. Extract priority (must be at start after 'x')
    let priority = extract_priority(&content);
    if let Some(ref p) = priority {
        content = content.replace(&format!("({})", p), "").trim().to_string();
    }

    // 3. Extract creation date (first date after priority removed)
    let created_date = extract_created_date(&content);

    // 4. Extract metadata tags
    let due_date = extract_due_date(&content);
    let projects = extract_projects(&content);
    let contexts = extract_contexts(&content);

    // 5. Build clean title (remove all metadata)
    let mut title = content;

    // Remove due date
    if let Some(ref due) = due_date {
        title = title.replace(&format!("due:{}", due), "");
    }

    // Remove creation date
    if let Some(ref created) = created_date {
        title = title.replace(created, "");
    }

    // Remove all project tags
    for project in &projects {
        title = title.replace(&format!("+{}", project), "");
    }

    // Remove all context tags
    for context in &contexts {
        title = title.replace(&format!("@{}", context), "");
    }

    // Clean up extra whitespace
    title = title.split_whitespace().collect::<Vec<_>>().join(" ");

    Ok(TodoItem {
        id: line_num,
        title,
        completed,
        due_date,
        priority,
        projects,
        contexts,
        created_date,
    })
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

/// Extract priority from start of line (e.g., "(A)")
fn extract_priority(content: &str) -> Option<String> {
    let trimmed = content.trim();
    if trimmed.starts_with('(') && trimmed.len() > 2 {
        if let Some(end_pos) = trimmed.find(')') {
            if end_pos == 2 {  // Single letter priority
                let priority = &trimmed[1..2];
                if priority.chars().next().unwrap().is_ascii_uppercase() {
                    return Some(priority.to_string());
                }
            }
        }
    }
    None
}

/// Extract all project tags from line (e.g., "+ProjectName")
fn extract_projects(content: &str) -> Vec<String> {
    content
        .split_whitespace()
        .filter_map(|word| {
            if word.starts_with('+') && word.len() > 1 {
                Some(word[1..].to_string())
            } else {
                None
            }
        })
        .collect()
}

/// Extract all context tags from line (e.g., "@ContextName")
fn extract_contexts(content: &str) -> Vec<String> {
    content
        .split_whitespace()
        .filter_map(|word| {
            if word.starts_with('@') && word.len() > 1 {
                Some(word[1..].to_string())
            } else {
                None
            }
        })
        .collect()
}

/// Extract creation date (first date in line after priority)
fn extract_created_date(content: &str) -> Option<String> {
    // After removing priority, first YYYY-MM-DD is creation date
    use regex::Regex;
    if let Ok(date_regex) = Regex::new(r"\d{4}-\d{2}-\d{2}") {
        date_regex.find(content).map(|m| m.as_str().to_string())
    } else {
        None
    }
}

/// Serialize TodoItem array to todo.txt format
pub fn serialize_todos(todos: &[TodoItem]) -> String {
    let mut result = String::new();

    for todo in todos {
        let mut parts = Vec::new();

        // 1. Completion marker
        if todo.completed {
            parts.push("x".to_string());
        }

        // 2. Priority
        if let Some(ref priority) = todo.priority {
            parts.push(format!("({})", priority));
        }

        // 3. Creation date
        if let Some(ref created) = todo.created_date {
            parts.push(created.clone());
        }

        // 4. Task description
        parts.push(todo.title.clone());

        // 5. Project tags
        for project in &todo.projects {
            parts.push(format!("+{}", project));
        }

        // 6. Context tags
        for context in &todo.contexts {
            parts.push(format!("@{}", context));
        }

        // 7. Due date (extension)
        if let Some(ref due) = todo.due_date {
            parts.push(format!("due:{}", due));
        }

        result.push_str(&parts.join(" "));
        result.push('\n');
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

    for line in content.lines() {
        if line.starts_with('[') {
            // Parse new todo: [2026-01-03] Task title
            if let Some(end_bracket) = line.find(']') {
                let date = line[1..end_bracket].to_string();
                let title = line[end_bracket + 1..].trim().to_string();
                archived_todos.push(ArchivedTodo {
                    title,
                    completed_date: date,
                });
            }
        }
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
