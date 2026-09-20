use std::fs;
use std::path::Path;

use crate::archive::sanitize_folder_name;
use crate::scanner::CategoryItem;
use crate::symlink::UNCATEGORIZED_DIR_NAME;

pub fn list_nte_pak_categories(mods_dir: &Path) -> Result<Vec<CategoryItem>, String> {
    if !mods_dir.exists() {
        return Ok(Vec::new());
    }

    let mut categories = Vec::new();
    let entries = fs::read_dir(mods_dir).map_err(|err| err.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir()
            && let Some(name) = path.file_name().and_then(|n| n.to_str())
        {
            if name.starts_with('.')
                || name.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME)
                || name.eq_ignore_ascii_case("DISABLED_veil")
                || name.eq_ignore_ascii_case("veil")
            {
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

pub fn create_nte_pak_category(mods_dir: &Path, category_name: &str) -> Result<(), String> {
    let trimmed = category_name.trim();
    if trimmed.is_empty() {
        return Err("Category name cannot be empty".to_string());
    }
    let sanitized = sanitize_folder_name(trimmed);
    if sanitized.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME) {
        return Err("Cannot use reserved category name 'Uncategorized'".to_string());
    }
    let cat_dir = mods_dir.join(&sanitized);
    if cat_dir.exists() {
        return Err(format!("Category already exists: {}", sanitized));
    }
    fs::create_dir_all(&cat_dir).map_err(|err| err.to_string())?;
    Ok(())
}

pub fn rename_nte_pak_category(
    mods_dir: &Path,
    old_name: &str,
    new_name: &str,
) -> Result<(), String> {
    let trimmed_old = old_name.trim();
    let trimmed_new = new_name.trim();
    if trimmed_old.is_empty() || trimmed_new.is_empty() {
        return Err("Category name cannot be empty".to_string());
    }
    let sanitized_old = sanitize_folder_name(trimmed_old);
    let sanitized_new = sanitize_folder_name(trimmed_new);
    if sanitized_old.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME)
        || sanitized_new.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME)
    {
        return Err("Cannot rename to or from reserved Uncategorized category".to_string());
    }
    if sanitized_old == sanitized_new {
        return Ok(());
    }
    let old_cat = mods_dir.join(&sanitized_old);
    let new_cat = mods_dir.join(&sanitized_new);
    if !old_cat.exists() {
        return Err(format!("Category does not exist: {}", sanitized_old));
    }
    if new_cat.exists() {
        return Err(format!("Category already exists: {}", sanitized_new));
    }
    fs::rename(&old_cat, &new_cat).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_nte_pak_category(
    mods_dir: &Path,
    category_name: &str,
    delete_mods: bool,
) -> Result<(), String> {
    let trimmed = category_name.trim();
    if trimmed.is_empty() {
        return Err("Category name cannot be empty".to_string());
    }
    let sanitized = sanitize_folder_name(trimmed);
    if sanitized.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME) {
        return Err("Cannot delete the reserved Uncategorized category".to_string());
    }
    let cat_dir = mods_dir.join(&sanitized);
    if !cat_dir.exists() {
        return Err(format!("Category does not exist: {}", sanitized));
    }

    if delete_mods {
        fs::remove_dir_all(&cat_dir).map_err(|e| e.to_string())?;
    } else {
        let uncategorized_dir = mods_dir.join(UNCATEGORIZED_DIR_NAME);
        fs::create_dir_all(&uncategorized_dir).map_err(|e| e.to_string())?;
        let entries = fs::read_dir(&cat_dir).map_err(|e| e.to_string())?;
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir()
                && let Some(mod_name) = path.file_name()
            {
                let dest = uncategorized_dir.join(mod_name);
                if !dest.exists() {
                    let _ = fs::rename(&path, &dest);
                }
            }
        }
        let _ = fs::remove_dir_all(&cat_dir);
    }
    Ok(())
}
