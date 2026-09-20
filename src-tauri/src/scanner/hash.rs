use std::collections::HashSet;
use std::fs;
use std::path::Path;

pub fn extract_hashes_from_ini(content: &str) -> Vec<String> {
    let mut hashes = HashSet::new();
    for raw_line in content.lines() {
        let trimmed = raw_line.trim();
        if trimmed.is_empty() || trimmed.starts_with(';') || trimmed.starts_with('#') {
            continue;
        }

        let clean_line = if let Some(idx) = trimmed.find([';', '#']) {
            trimmed[..idx].trim()
        } else {
            trimmed
        };

        let lower = clean_line.to_ascii_lowercase();
        if lower.starts_with("hash")
            && let Some((_, val)) = lower.split_once('=')
        {
            let hash_val = val.trim().to_string();
            if !hash_val.is_empty() {
                hashes.insert(hash_val);
            }
        }
    }
    let mut result: Vec<String> = hashes.into_iter().collect();
    result.sort();
    result
}

pub(super) fn collect_hashes_from_folder(dir: &Path) -> Vec<String> {
    let mut all_hashes = HashSet::new();
    let mut stack = vec![dir.to_path_buf()];

    while let Some(current_dir) = stack.pop() {
        let entries = match fs::read_dir(&current_dir) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.is_file()
                && let Some(ext) = path.extension()
                && ext.eq_ignore_ascii_case("ini")
                && let Ok(bytes) = fs::read(&path)
            {
                let content = String::from_utf8_lossy(&bytes);
                for hash in extract_hashes_from_ini(&content) {
                    all_hashes.insert(hash);
                }
            }
        }
    }

    let mut result: Vec<String> = all_hashes.into_iter().collect();
    result.sort();
    result
}
