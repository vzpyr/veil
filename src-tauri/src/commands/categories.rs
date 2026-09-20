use crate::nte_pak::{
    create_nte_pak_category, delete_nte_pak_category, list_nte_pak_categories,
    rename_nte_pak_category,
};
use crate::scanner::CategoryItem;
use crate::symlink::ensure_veil_dirs;

use super::effective_mods_dir;

#[tauri::command]
pub fn get_categories(
    mods_dir: String,
    game_id: Option<String>,
) -> Result<Vec<CategoryItem>, String> {
    let dir = effective_mods_dir(game_id.as_deref(), &mods_dir);
    let path = dir.as_path();
    if game_id.as_deref() == Some("ntepak") {
        std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
        return list_nte_pak_categories(path);
    }
    ensure_veil_dirs(path)?;
    crate::scanner::list_categories(path)
}

#[tauri::command]
pub fn create_category(
    mods_dir: String,
    category_name: String,
    game_id: Option<String>,
) -> Result<(), String> {
    let dir = effective_mods_dir(game_id.as_deref(), &mods_dir);
    let path = dir.as_path();
    if game_id.as_deref() == Some("ntepak") {
        return create_nte_pak_category(path, &category_name);
    }
    crate::scanner::create_category(path, &category_name)
}

#[tauri::command]
pub fn rename_category(
    mods_dir: String,
    old_name: String,
    new_name: String,
    game_id: Option<String>,
) -> Result<(), String> {
    let dir = effective_mods_dir(game_id.as_deref(), &mods_dir);
    let path = dir.as_path();
    if game_id.as_deref() == Some("ntepak") {
        return rename_nte_pak_category(path, &old_name, &new_name);
    }
    crate::scanner::rename_category(path, &old_name, &new_name)
}

#[tauri::command]
pub fn delete_category(
    mods_dir: String,
    category_name: String,
    delete_mods: bool,
    game_id: Option<String>,
) -> Result<(), String> {
    let dir = effective_mods_dir(game_id.as_deref(), &mods_dir);
    let path = dir.as_path();
    if game_id.as_deref() == Some("ntepak") {
        return delete_nte_pak_category(path, &category_name, delete_mods);
    }
    crate::scanner::delete_category(path, &category_name, delete_mods)
}
