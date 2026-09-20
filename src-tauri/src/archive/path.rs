use std::path::{Component, Path};

const WINDOWS_RESERVED: [&str; 22] = [
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

pub fn sanitize_folder_name(name: &str) -> String {
    let mut sanitized = String::new();
    for c in name.chars() {
        if c == '/'
            || c == '\\'
            || c == ':'
            || c == '*'
            || c == '?'
            || c == '"'
            || c == '<'
            || c == '>'
            || c == '|'
        {
            sanitized.push('_');
        } else {
            sanitized.push(c);
        }
    }
    let trimmed = sanitized.trim().trim_matches('.').to_string();
    if trimmed.is_empty() {
        return "unnamed_mod".to_string();
    }
    let dot = trimmed.find('.').unwrap_or(trimmed.len());
    let stem = &trimmed[..dot];
    if WINDOWS_RESERVED.contains(&stem.to_ascii_uppercase().as_str()) {
        return format!("{}_{}", stem, &trimmed[dot..]);
    }
    trimmed
}

pub fn is_safe_path(path: &Path) -> bool {
    for component in path.components() {
        match component {
            Component::Normal(_) => {}
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => return false,
        }
    }
    true
}
