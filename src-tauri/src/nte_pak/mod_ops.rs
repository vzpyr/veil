use std::fs;
use std::path::Path;

use crate::archive::sanitize_folder_name;
use crate::symlink::UNCATEGORIZED_DIR_NAME;

use super::COMPANION_EXTENSIONS;
use crate::mod_folder::is_dir_empty_or_hidden;

pub fn toggle_nte_pak_mod(mods_dir: &Path, rel_id: &str, enable: bool) -> Result<bool, String> {
    let mod_dir = mods_dir.join(rel_id);
    if !mod_dir.exists() {
        return Err(format!("Mod folder does not exist: {}", mod_dir.display()));
    }

    let mut stack = vec![mod_dir.clone()];
    let mut files = Vec::new();

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
                if COMPANION_EXTENSIONS.contains(&ext_lower.as_str()) {
                    files.push(path);
                }
            }
        }
    }

    for path in files {
        let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
            continue;
        };
        let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
            continue;
        };
        let Some(parent) = path.parent() else {
            continue;
        };

        if enable {
            if !stem.ends_with("_P") && !stem.ends_with("_p") {
                let new_name = format!("{}_P.{}", stem, ext);
                let _ = fs::rename(&path, parent.join(new_name));
            }
        } else {
            if stem.ends_with("_P") || stem.ends_with("_p") {
                let clean_stem = &stem[..stem.len() - 2];
                let new_name = format!("{}.{}", clean_stem, ext);
                let _ = fs::rename(&path, parent.join(new_name));
            }
        }
    }

    Ok(enable)
}

pub fn delete_nte_pak_mod(mods_dir: &Path, rel_id: &str) -> Result<(), String> {
    let mod_dir = mods_dir.join(rel_id);
    if mod_dir.exists() {
        fs::remove_dir_all(&mod_dir).map_err(|e| e.to_string())?;
    }

    if let Some(parent) = mod_dir.parent()
        && parent != mods_dir
        && is_dir_empty_or_hidden(parent)
    {
        let _ = fs::remove_dir_all(parent);
    }

    Ok(())
}

pub fn move_nte_pak_mod_category(
    mods_dir: &Path,
    mod_rel_path: &str,
    target_category: Option<String>,
) -> Result<String, String> {
    let old_source = mods_dir.join(mod_rel_path);
    if !old_source.exists() {
        return Err(format!(
            "Source mod folder does not exist: {}",
            old_source.display()
        ));
    }

    let mod_folder_name = match old_source.file_name().and_then(|n| n.to_str()) {
        Some(n) => n.to_string(),
        None => return Err("Invalid mod folder name".to_string()),
    };

    let target_cat_name = match target_category.as_deref().map(str::trim) {
        Some(cat) if !cat.is_empty() => {
            let sanitized = sanitize_folder_name(cat);
            if sanitized.eq_ignore_ascii_case("__root__")
                || sanitized.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME)
            {
                UNCATEGORIZED_DIR_NAME.to_string()
            } else {
                sanitized
            }
        }
        _ => UNCATEGORIZED_DIR_NAME.to_string(),
    };

    let new_rel_path = format!("{}/{}", target_cat_name, mod_folder_name);
    let new_source = mods_dir.join(&new_rel_path);
    if old_source == new_source {
        return Ok(new_rel_path);
    }

    if new_source.exists() {
        return Err(format!(
            "Destination mod folder already exists: {}",
            new_source.display()
        ));
    }

    if let Some(parent) = new_source.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    fs::rename(&old_source, &new_source).map_err(|err| err.to_string())?;

    if let Some(old_parent) = old_source.parent()
        && old_parent != mods_dir
        && is_dir_empty_or_hidden(old_parent)
    {
        let _ = fs::remove_dir_all(old_parent);
    }

    Ok(new_rel_path)
}
