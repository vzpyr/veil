use crate::conflict::{ConflictGroup, detect_conflicts};
use crate::nte_pak::{
    delete_nte_pak_mod, move_nte_pak_mod_category, scan_nte_pak_mods, toggle_nte_pak_mod,
};
use crate::scanner::{ModItem, cleanup_empty_categories, set_mod_preview};
use crate::symlink::{cleanup_empty_active_dir, ensure_veil_dirs, prune_orphaned_symlinks};
use std::path::Path;

#[tauri::command]
pub fn cleanup_on_boot(mods_dir: String, game_id: Option<String>) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    if !path.exists() {
        return Ok(());
    }
    if game_id.as_deref() == Some("ntepak") {
        return Ok(());
    }
    prune_orphaned_symlinks(path)?;
    cleanup_empty_active_dir(path)?;
    cleanup_empty_categories(path)?;
    Ok(())
}

#[tauri::command]
pub fn scan_mods(mods_dir: String, game_id: Option<String>) -> Result<Vec<ModItem>, String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
        return scan_nte_pak_mods(path);
    }
    ensure_veil_dirs(path)?;
    prune_orphaned_symlinks(path)?;
    cleanup_empty_active_dir(path)?;
    crate::scanner::scan_mods(path)
}

#[tauri::command]
pub fn get_mod_conflicts(
    mods_dir: String,
    game_id: Option<String>,
) -> Result<Vec<ConflictGroup>, String> {
    if game_id.as_deref() == Some("ntepak") {
        return Ok(Vec::new());
    }
    let path = Path::new(&mods_dir);
    ensure_veil_dirs(path)?;
    let mods = crate::scanner::scan_mods(path)?;
    Ok(detect_conflicts(&mods))
}

#[tauri::command]
pub fn toggle_mod(
    mods_dir: String,
    mod_id: String,
    enable: bool,
    game_id: Option<String>,
) -> Result<bool, String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        return toggle_nte_pak_mod(path, &mod_id, enable);
    }
    crate::scanner::toggle_mod_status(path, &mod_id, enable)
}

#[tauri::command]
pub fn move_mod(
    mods_dir: String,
    mod_id: String,
    target_category: Option<String>,
    game_id: Option<String>,
) -> Result<String, String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        return move_nte_pak_mod_category(path, &mod_id, target_category);
    }
    crate::scanner::move_mod_category(path, &mod_id, target_category)
}

#[tauri::command]
pub fn delete_mod(mods_dir: String, mod_id: String, game_id: Option<String>) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        return delete_nte_pak_mod(path, &mod_id);
    }
    crate::scanner::delete_mod(path, &mod_id)
}

#[tauri::command]
pub fn batch_toggle_mods(
    mods_dir: String,
    mod_ids: Vec<String>,
    enable: bool,
    game_id: Option<String>,
) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        for id in &mod_ids {
            toggle_nte_pak_mod(path, id, enable)?;
        }
        return Ok(());
    }
    crate::scanner::batch_toggle_mods(path, &mod_ids, enable)
}

#[tauri::command]
pub fn batch_move_mods(
    mods_dir: String,
    mod_ids: Vec<String>,
    target_category: Option<String>,
    game_id: Option<String>,
) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        for id in &mod_ids {
            move_nte_pak_mod_category(path, id, target_category.clone())?;
        }
        return Ok(());
    }
    crate::scanner::batch_move_mods(path, &mod_ids, target_category)
}

#[tauri::command]
pub fn batch_delete_mods(
    mods_dir: String,
    mod_ids: Vec<String>,
    game_id: Option<String>,
) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        for id in &mod_ids {
            delete_nte_pak_mod(path, id)?;
        }
        return Ok(());
    }
    crate::scanner::batch_delete_mods(path, &mod_ids)
}

#[tauri::command]
pub fn set_mod_preview_image(
    mods_dir: String,
    mod_id: String,
    image_bytes: Vec<u8>,
) -> Result<String, String> {
    let path = Path::new(&mods_dir);
    set_mod_preview(path, &mod_id, &image_bytes)
}
