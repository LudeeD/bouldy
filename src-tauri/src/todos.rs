use serde::{Deserialize, Serialize};
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
