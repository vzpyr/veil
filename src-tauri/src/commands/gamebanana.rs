use crate::archive::{extract_any_archive, sanitize_folder_name};
use crate::gamebanana::{CancelRegistry, TempRegistry, clear_temp_paths, download_and_install_mod};
use crate::nte_pak::postprocess_nte_pak_extracted_mod;
use crate::scanner::{link_mod, postprocess_3dmigoto_extracted_mod, unlink_mod};
use crate::symlink::{
    disabled_dir, effective_category_name, ensure_veil_dirs, resolve_category_dir,
};
use std::path::Path;
use tauri::{AppHandle, State};

#[tauri::command]
pub fn cancel_download(
    cancel: State<'_, CancelRegistry>,
    temp: State<'_, TempRegistry>,
    key: String,
) -> Result<(), String> {
    cancel.cancel(&key);

    if let Some((archive_path, extract_dir)) = temp.take(&key) {
        clear_temp_paths(&archive_path, &extract_dir);
    }

    Ok(())
}

#[tauri::command]
pub fn extract_archive_file(
    archive_path: String,
    mods_dir: String,
    mod_name: String,
    category: Option<String>,
    duplicate_action: Option<String>,
    game_id: Option<String>,
) -> Result<String, String> {
    let path = Path::new(&mods_dir);
    let is_nte_pak = game_id.as_deref() == Some("ntepak");
    let base_dir = if is_nte_pak {
        std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
        path.to_path_buf()
    } else {
        ensure_veil_dirs(path)?;
        disabled_dir(path)
    };

    let target_parent_dir = if is_nte_pak {
        let cat_name = effective_category_name(category.as_deref());
        let dir = base_dir.join(cat_name);
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        dir
    } else {
        resolve_category_dir(&base_dir, category.as_deref())?
    };

    let action = duplicate_action.unwrap_or_else(|| "replace".to_string());
    let temp_download_dir = path.join(".veil_temp");
    std::fs::create_dir_all(&temp_download_dir).map_err(|e| e.to_string())?;
    let temp_extract_dir = temp_download_dir.join(sanitize_folder_name(&mod_name));
    let extracted = extract_any_archive(
        Path::new(&archive_path),
        &temp_extract_dir,
        &target_parent_dir,
        &mod_name,
        &action,
        &|| false,
    )?;
    let _ = std::fs::remove_dir_all(&temp_extract_dir);
    if let Some(parent) = temp_extract_dir.parent() {
        let _ = std::fs::remove_dir(parent);
    }

    if is_nte_pak {
        postprocess_nte_pak_extracted_mod(&extracted)?;
    } else {
        postprocess_3dmigoto_extracted_mod(&extracted)?;
    }

    let rel_id = extracted
        .strip_prefix(&base_dir)
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .replace('\\', "/");

    Ok(rel_id)
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn download_mod(
    app: AppHandle,
    cancel: State<'_, CancelRegistry>,
    temp: State<'_, TempRegistry>,
    download_url: String,
    mods_dir: String,
    mod_name: String,
    category: Option<String>,
    preview_url: Option<String>,
    key: String,
    duplicate_action: Option<String>,
    item_id: Option<u64>,
    file_id: Option<u64>,
    version: Option<String>,
    game_id: Option<String>,
) -> Result<String, String> {
    download_and_install_mod(
        app,
        &cancel,
        &temp,
        download_url,
        mods_dir,
        mod_name,
        category,
        preview_url,
        key,
        duplicate_action,
        item_id,
        file_id,
        version,
        game_id,
    )
    .await
}

#[tauri::command]
pub fn link_mod_to_gamebanana(
    mods_dir: String,
    mod_id: String,
    gamebanana_id: u64,
    version: Option<String>,
    file_id: Option<u64>,
) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    ensure_veil_dirs(path)?;
    link_mod(path, &mod_id, gamebanana_id, version, file_id)
}

#[tauri::command]
pub fn unlink_mod_from_gamebanana(mods_dir: String, mod_id: String) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    unlink_mod(path, &mod_id)
}
