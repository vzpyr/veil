use std::fs;
use std::path::Path;

use crate::scanner::ModItem;
use crate::symlink::UNCATEGORIZED_DIR_NAME;

use super::COMPANION_EXTENSIONS;

pub fn postprocess_nte_pak_extracted_mod(mod_dir: &Path) -> Result<(), String> {
    let mut has_pak = false;
    let mut files_to_check = Vec::new();
    let mut stack = vec![mod_dir.to_path_buf()];

    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.is_file()
                && let Some(ext) = path.extension().and_then(|e| e.to_str())
            {
                let ext_lower = ext.to_ascii_lowercase();
                if ext_lower == "pak" {
                    has_pak = true;
                }
                if COMPANION_EXTENSIONS.contains(&ext_lower.as_str()) {
                    files_to_check.push(path);
                }
            }
        }
    }

    if !has_pak {
        let _ = fs::remove_dir_all(mod_dir);
        return Err("Archive does not contain any .pak files. 3DMigoto mods are not supported for Neverness to Everness.".to_string());
    }

    for path in files_to_check {
        let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
            continue;
        };
        let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
            continue;
        };

        if stem.ends_with("_P") || stem.ends_with("_p") {
            let clean_stem = &stem[..stem.len() - 2];
            let new_name = format!("{}.{}", clean_stem, ext);
            if let Some(parent) = path.parent() {
                let new_path = parent.join(new_name);
                let _ = fs::rename(&path, &new_path);
            }
        }
    }

    Ok(())
}

fn find_preview_image(dir: &Path) -> Option<String> {
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

fn read_veil_metadata(dir: &Path) -> (Option<u64>, Option<String>, Option<u64>) {
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

fn is_nte_pak_mod_enabled(mod_dir: &Path) -> bool {
    let mut stack = vec![mod_dir.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.is_file()
                && let Some(ext) = path.extension().and_then(|e| e.to_str())
                && ext.eq_ignore_ascii_case("pak")
                && let Some(stem) = path.file_stem().and_then(|s| s.to_str())
                && (stem.ends_with("_P") || stem.ends_with("_p"))
            {
                return true;
            }
        }
    }
    false
}

pub fn scan_nte_pak_mods(mods_dir: &Path) -> Result<Vec<ModItem>, String> {
    if !mods_dir.exists() {
        return Ok(Vec::new());
    }

    let mut mods = Vec::new();
    let entries = fs::read_dir(mods_dir).map_err(|err| err.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let cat_folder_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        if cat_folder_name.starts_with('.')
            || cat_folder_name.eq_ignore_ascii_case("DISABLED_veil")
            || cat_folder_name.eq_ignore_ascii_case("veil")
        {
            continue;
        }

        let is_uncategorized = cat_folder_name.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME);
        let category_opt = if is_uncategorized {
            None
        } else {
            Some(cat_folder_name.clone())
        };

        let sub_entries = match fs::read_dir(&path) {
            Ok(se) => se,
            Err(_) => continue,
        };

        for sub_entry in sub_entries.flatten() {
            let sub_path = sub_entry.path();
            if !sub_path.is_dir() {
                continue;
            }

            let sub_name = match sub_path.file_name().and_then(|n| n.to_str()) {
                Some(n) => n.to_string(),
                None => continue,
            };

            if sub_name.starts_with('.') {
                continue;
            }

            let rel_id = format!("{}/{}", cat_folder_name, sub_name);
            let is_enabled = is_nte_pak_mod_enabled(&sub_path);
            let preview = find_preview_image(&sub_path);
            let (gb_id, ver, fid) = read_veil_metadata(&sub_path);
            let updated_at = sub_path
                .metadata()
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64);

            mods.push(ModItem {
                id: rel_id,
                name: sub_name,
                category: category_opt.clone(),
                folder_path: sub_path.to_string_lossy().to_string(),
                enabled: is_enabled,
                preview_path: preview,
                hashes: Vec::new(),
                gamebanana_id: gb_id,
                version: ver,
                file_id: fid,
                updated_at,
            });
        }
    }

    mods.sort_by_key(|a| a.name.to_lowercase());
    Ok(mods)
}
