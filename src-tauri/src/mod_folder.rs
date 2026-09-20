use std::fs;
use std::path::Path;

pub fn find_preview_image(dir: &Path) -> Option<String> {
    let image_extensions = ["png", "jpg", "jpeg", "webp", "gif"];
    for ext in &image_extensions {
        let preview_file = dir.join(format!("preview.{}", ext));
        if preview_file.is_file() {
            return Some(preview_file.to_string_lossy().to_string());
        }
    }

    let entries = fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file()
            && let Some(stem) = path.file_stem().and_then(|s| s.to_str())
            && stem.to_ascii_lowercase().starts_with("preview")
            && let Some(ext) = path.extension().and_then(|e| e.to_str())
            && image_extensions.iter().any(|e| e.eq_ignore_ascii_case(ext))
        {
            return Some(path.to_string_lossy().to_string());
        }
    }

    None
}

pub fn read_veil_metadata(dir: &Path) -> (Option<u64>, Option<String>, Option<u64>) {
    let dotfile = dir.join(".veil.json");
    if !dotfile.is_file() {
        return (None, None, None);
    }
    let content = match fs::read_to_string(&dotfile) {
        Ok(c) => c,
        Err(_) => return (None, None, None),
    };
    let val: serde_json::Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => return (None, None, None),
    };
    let gb_id = val.get("gamebanana_id").and_then(|v| v.as_u64());
    let version = val
        .get("version")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let file_id = val.get("file_id").and_then(|v| v.as_u64());
    (gb_id, version, file_id)
}

pub fn is_dir_empty_or_hidden(dir: &Path) -> bool {
    match fs::read_dir(dir) {
        Ok(mut entries) => entries.all(|e| {
            if let Ok(entry) = e {
                entry.file_name().to_string_lossy().starts_with('.')
            } else {
                true
            }
        }),
        Err(_) => false,
    }
}
