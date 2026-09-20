use crate::symlink::{
    UNCATEGORIZED_DIR_NAME, active_dir, create_mod_symlink, disabled_dir, remove_mod_symlink,
    validate_category_name,
};
use std::fs;
use std::path::Path;

use super::CategoryItem;
use crate::mod_folder::is_dir_empty_or_hidden;

pub fn list_categories(mods_dir: &Path) -> Result<Vec<CategoryItem>, String> {
    let disabled_dir = disabled_dir(mods_dir);
    if !disabled_dir.exists() {
        return Ok(Vec::new());
    }

    let mut categories = Vec::new();
    let entries = fs::read_dir(&disabled_dir).map_err(|err| err.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir()
            && let Some(name) = path.file_name().and_then(|n| n.to_str())
        {
            if name.starts_with('.') {
                continue;
            }
            if name.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME) {
                continue;
            }
            let sub_count = fs::read_dir(&path)
                .map(|entries| entries.flatten().filter(|e| e.path().is_dir()).count())
                .unwrap_or(0);

            categories.push(CategoryItem {
                name: name.to_string(),
                mod_count: sub_count,
            });
        }
    }

    categories.sort_by_key(|a| a.name.to_lowercase());
    Ok(categories)
}

pub fn create_category(mods_dir: &Path, category_name: &str) -> Result<(), String> {
    let sanitized = validate_category_name(category_name)?;
    let cat_dir = disabled_dir(mods_dir).join(&sanitized);
    if cat_dir.exists() {
        return Err(format!("Category already exists: {}", sanitized));
    }
    fs::create_dir_all(&cat_dir).map_err(|err| err.to_string())?;
    Ok(())
}

pub fn rename_category(mods_dir: &Path, old_name: &str, new_name: &str) -> Result<(), String> {
    let sanitized_old = validate_category_name(old_name)?;
    let sanitized_new = validate_category_name(new_name)?;

    if sanitized_old == sanitized_new {
        return Ok(());
    }

    let disabled_dir = disabled_dir(mods_dir);
    let active_dir = active_dir(mods_dir);

    let old_cat_dir = disabled_dir.join(&sanitized_old);
    let new_cat_dir = disabled_dir.join(&sanitized_new);

    if !old_cat_dir.exists() {
        return Err(format!("Category does not exist: {}", sanitized_old));
    }

    if new_cat_dir.exists() {
        return Err(format!("Category already exists: {}", sanitized_new));
    }

    let old_active_cat = active_dir.join(&sanitized_old);
    let new_active_cat = active_dir.join(&sanitized_new);

    let mut enabled_mods = Vec::new();
    if old_active_cat.exists()
        && let Ok(entries) = fs::read_dir(&old_active_cat)
    {
        for entry in entries.flatten() {
            if entry.path().symlink_metadata().is_ok()
                && let Some(name) = entry.file_name().to_str()
            {
                enabled_mods.push(name.to_string());
            }
        }
    }

    for mod_name in &enabled_mods {
        let symlink_path = old_active_cat.join(mod_name);
        let _ = remove_mod_symlink(&symlink_path);
    }
    let _ = fs::remove_dir_all(&old_active_cat);

    fs::rename(&old_cat_dir, &new_cat_dir).map_err(|e| e.to_string())?;

    if !enabled_mods.is_empty() {
        fs::create_dir_all(&new_active_cat).map_err(|e| e.to_string())?;
        for mod_name in enabled_mods {
            let target_source = new_cat_dir.join(&mod_name);
            let target_symlink = new_active_cat.join(&mod_name);
            let _ = create_mod_symlink(&target_source, &target_symlink);
        }
    }

    Ok(())
}

pub fn delete_category(
    mods_dir: &Path,
    category_name: &str,
    delete_mods: bool,
) -> Result<(), String> {
    let sanitized = validate_category_name(category_name)?;

    let disabled_dir = disabled_dir(mods_dir);
    let active_dir = active_dir(mods_dir);

    let cat_dir = disabled_dir.join(&sanitized);
    if !cat_dir.exists() {
        return Err(format!("Category does not exist: {}", sanitized));
    }

    let active_cat_dir = active_dir.join(&sanitized);

    if delete_mods {
        if active_cat_dir.exists() {
            if let Ok(entries) = fs::read_dir(&active_cat_dir) {
                for entry in entries.flatten() {
                    let _ = remove_mod_symlink(&entry.path());
                }
            }
            let _ = fs::remove_dir_all(&active_cat_dir);
        }
        fs::remove_dir_all(&cat_dir).map_err(|e| e.to_string())?;
    } else {
        let uncategorized_dir = disabled_dir.join(UNCATEGORIZED_DIR_NAME);
        let active_uncategorized_dir = active_dir.join(UNCATEGORIZED_DIR_NAME);
        fs::create_dir_all(&uncategorized_dir).map_err(|e| e.to_string())?;

        let entries = fs::read_dir(&cat_dir).map_err(|e| e.to_string())?;
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let mod_name = match path.file_name().and_then(|n| n.to_str()) {
                    Some(n) => n.to_string(),
                    None => continue,
                };
                let dest = uncategorized_dir.join(&mod_name);
                if !dest.exists() {
                    let active_symlink = active_cat_dir.join(&mod_name);
                    let was_enabled = active_symlink.symlink_metadata().is_ok();
                    if was_enabled {
                        let _ = remove_mod_symlink(&active_symlink);
                    }
                    if fs::rename(&path, &dest).is_ok() && was_enabled {
                        let _ = fs::create_dir_all(&active_uncategorized_dir);
                        let new_symlink = active_uncategorized_dir.join(&mod_name);
                        let _ = create_mod_symlink(&dest, &new_symlink);
                    }
                }
            }
        }
        let _ = fs::remove_dir_all(&active_cat_dir);
        let _ = fs::remove_dir_all(&cat_dir);
    }

    crate::symlink::cleanup_empty_active_dir(mods_dir)?;
    Ok(())
}

pub fn cleanup_empty_categories(mods_dir: &Path) -> Result<(), String> {
    let disabled_dir = disabled_dir(mods_dir);
    if !disabled_dir.exists() {
        return Ok(());
    }

    let entries = match fs::read_dir(&disabled_dir) {
        Ok(e) => e,
        Err(err) => return Err(err.to_string()),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n,
            None => continue,
        };

        if name.starts_with('.') {
            continue;
        }

        if is_dir_empty_or_hidden(&path) {
            let _ = fs::remove_dir_all(&path);
        }
    }

    Ok(())
}
