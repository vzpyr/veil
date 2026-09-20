pub mod archive;
pub mod config;
pub mod conflict;
pub mod gamebanana;
pub mod games;
pub mod keybinds;
pub mod nte_pak;
pub mod scanner;
pub mod symlink;

use archive::{extract_any_archive, sanitize_folder_name};
use config::{AppConfig, config_path, read_config, write_config};
use conflict::{ConflictGroup, detect_conflicts};
use gamebanana::{
    CancelRegistry, TempRegistry, clear_temp_artifacts, clear_temp_paths, download_and_install_mod,
};
use games::{GameDefinition, supported_games};
use keybinds::{
    ModKeybindData, parse_mod_keybinds_and_variables, set_d3dx_user_toggle, update_ini_keybind,
};
use nte_pak::{
    LoaderRelease, NtePakLoaderStatus, create_nte_pak_category, delete_nte_pak_category,
    delete_nte_pak_mod, fetch_asi_loader_releases, fetch_sig_bypasser_releases, install_asi_loader,
    install_sig_bypasser, list_nte_pak_categories, move_nte_pak_mod_category,
    nte_pak_loader_status, postprocess_nte_pak_extracted_mod, rename_nte_pak_category,
    resolve_nte_pak_paths, scan_nte_pak_mods, toggle_nte_pak_mod, uninstall_asi_loader,
    uninstall_sig_bypasser,
};
use scanner::{
    CategoryItem, ModItem, cleanup_empty_categories, link_mod, list_categories, move_mod_category,
    set_mod_preview, toggle_mod_status, unlink_mod,
};
use std::path::Path;
use symlink::{
    cleanup_empty_active_dir, disabled_dir, ensure_veil_dirs, prune_orphaned_symlinks,
    resolve_category_dir,
};
use tauri::{AppHandle, State};

#[tauri::command]
fn get_games() -> Vec<GameDefinition> {
    supported_games()
}

#[tauri::command]
fn get_config(app: AppHandle) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    Ok(read_config(&path))
}

#[tauri::command]
fn set_active_game(app: AppHandle, game_id: String) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    let mut config = read_config(&path);
    config.active_game_id = game_id;
    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
fn set_game_mods_dir(
    app: AppHandle,
    game_id: String,
    mods_dir: String,
) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    let mut config = read_config(&path);

    let trimmed = mods_dir.trim().to_string();
    if !trimmed.is_empty() {
        let p = Path::new(&trimmed);
        if game_id == "ntepak" {
            std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
        } else {
            ensure_veil_dirs(p)?;
        }
    }

    let entry = config.games.entry(game_id).or_default();
    entry.mods_dir = if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    };

    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
fn set_nte_pak_game_dir(app: AppHandle, game_dir: String) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    let mut config = read_config(&path);

    let trimmed = game_dir.trim().to_string();
    if trimmed.is_empty() {
        let entry = config.games.entry("ntepak".to_string()).or_default();
        entry.game_dir = None;
        entry.mods_dir = None;
    } else {
        let p = Path::new(&trimmed);
        let (win64_dir, mods_dir) = resolve_nte_pak_paths(p);
        std::fs::create_dir_all(&win64_dir).map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&mods_dir).map_err(|e| e.to_string())?;

        let entry = config.games.entry("ntepak".to_string()).or_default();
        entry.game_dir = Some(trimmed);
        entry.mods_dir = Some(mods_dir.to_string_lossy().to_string());
    }

    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
async fn get_nte_pak_asi_loader_releases() -> Result<Vec<LoaderRelease>, String> {
    fetch_asi_loader_releases().await
}

#[tauri::command]
async fn get_nte_pak_sig_bypasser_releases() -> Result<Vec<LoaderRelease>, String> {
    fetch_sig_bypasser_releases().await
}

#[tauri::command]
fn get_nte_pak_status(game_dir: String) -> Result<NtePakLoaderStatus, String> {
    nte_pak_loader_status(Path::new(&game_dir))
}

#[tauri::command]
async fn install_nte_pak_asi_loader(
    game_dir: String,
    download_url: String,
    version: String,
    dll_name: String,
) -> Result<(), String> {
    install_asi_loader(Path::new(&game_dir), &download_url, &version, &dll_name).await
}

#[tauri::command]
fn uninstall_nte_pak_asi_loader(game_dir: String) -> Result<(), String> {
    uninstall_asi_loader(Path::new(&game_dir))
}

#[tauri::command]
async fn install_nte_pak_sig_bypasser(
    game_dir: String,
    download_url: String,
    version: String,
    subpath: Option<String>,
) -> Result<(), String> {
    install_sig_bypasser(
        Path::new(&game_dir),
        &download_url,
        &version,
        subpath.as_deref(),
    )
    .await
}

#[tauri::command]
fn uninstall_nte_pak_sig_bypasser(game_dir: String) -> Result<(), String> {
    uninstall_sig_bypasser(Path::new(&game_dir))
}

#[tauri::command]
fn set_auto_categorize(app: AppHandle, auto_categorize: bool) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    let mut config = read_config(&path);
    config.auto_categorize = auto_categorize;
    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
fn set_show_nsfw(app: AppHandle, show_nsfw: bool) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    let mut config = read_config(&path);
    config.show_nsfw = show_nsfw;
    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
fn set_color_scheme(app: AppHandle, color_scheme: String) -> Result<AppConfig, String> {
    let scheme = if color_scheme == "light" {
        "light"
    } else {
        "dark"
    };
    let path = config_path(&app)?;
    let mut config = read_config(&path);
    config.color_scheme = scheme.to_string();
    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
fn set_auto_check_updates(app: AppHandle, auto_check_updates: bool) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    let mut config = read_config(&path);
    config.auto_check_updates = auto_check_updates;
    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
fn set_view_mode(app: AppHandle, view_mode: String) -> Result<AppConfig, String> {
    let mode = if view_mode == "list" { "list" } else { "grid" };
    let path = config_path(&app)?;
    let mut config = read_config(&path);
    config.view_mode = mode.to_string();
    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
fn cleanup_on_boot(mods_dir: String, game_id: Option<String>) -> Result<(), String> {
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
fn scan_mods(mods_dir: String, game_id: Option<String>) -> Result<Vec<ModItem>, String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
        return scan_nte_pak_mods(path);
    }
    ensure_veil_dirs(path)?;
    prune_orphaned_symlinks(path)?;
    cleanup_empty_active_dir(path)?;
    scanner::scan_mods(path)
}

#[tauri::command]
fn get_mod_conflicts(
    mods_dir: String,
    game_id: Option<String>,
) -> Result<Vec<ConflictGroup>, String> {
    if game_id.as_deref() == Some("ntepak") {
        return Ok(Vec::new());
    }
    let path = Path::new(&mods_dir);
    ensure_veil_dirs(path)?;
    let mods = scanner::scan_mods(path)?;
    Ok(detect_conflicts(&mods))
}

#[tauri::command]
fn get_categories(mods_dir: String, game_id: Option<String>) -> Result<Vec<CategoryItem>, String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
        return list_nte_pak_categories(path);
    }
    ensure_veil_dirs(path)?;
    list_categories(path)
}

#[tauri::command]
fn toggle_mod(
    mods_dir: String,
    mod_id: String,
    enable: bool,
    game_id: Option<String>,
) -> Result<bool, String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        return toggle_nte_pak_mod(path, &mod_id, enable);
    }
    toggle_mod_status(path, &mod_id, enable)
}

#[tauri::command]
fn move_mod(
    mods_dir: String,
    mod_id: String,
    target_category: Option<String>,
    game_id: Option<String>,
) -> Result<String, String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        return move_nte_pak_mod_category(path, &mod_id, target_category);
    }
    move_mod_category(path, &mod_id, target_category)
}

#[tauri::command]
fn create_category(
    mods_dir: String,
    category_name: String,
    game_id: Option<String>,
) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        return create_nte_pak_category(path, &category_name);
    }
    scanner::create_category(path, &category_name)
}

#[tauri::command]
fn rename_category(
    mods_dir: String,
    old_name: String,
    new_name: String,
    game_id: Option<String>,
) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        return rename_nte_pak_category(path, &old_name, &new_name);
    }
    scanner::rename_category(path, &old_name, &new_name)
}

#[tauri::command]
fn delete_category(
    mods_dir: String,
    category_name: String,
    delete_mods: bool,
    game_id: Option<String>,
) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        return delete_nte_pak_category(path, &category_name, delete_mods);
    }
    scanner::delete_category(path, &category_name, delete_mods)
}

#[tauri::command]
fn delete_mod(mods_dir: String, mod_id: String, game_id: Option<String>) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    if game_id.as_deref() == Some("ntepak") {
        return delete_nte_pak_mod(path, &mod_id);
    }
    scanner::delete_mod(path, &mod_id)
}

#[tauri::command]
fn batch_toggle_mods(
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
    scanner::batch_toggle_mods(path, &mod_ids, enable)
}

#[tauri::command]
fn batch_move_mods(
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
    scanner::batch_move_mods(path, &mod_ids, target_category)
}

#[tauri::command]
fn batch_delete_mods(
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
    scanner::batch_delete_mods(path, &mod_ids)
}

#[tauri::command]
fn cancel_download(
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
fn extract_archive_file(
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
        let cat_name = crate::symlink::effective_category_name(category.as_deref());
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
async fn download_mod(
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
fn get_mod_keybinds(mods_dir: String, mod_id: String) -> Result<ModKeybindData, String> {
    let path = Path::new(&mods_dir);
    ensure_veil_dirs(path)?;
    let mod_dir = disabled_dir(path);
    let mod_folder = mod_dir.join(&mod_id);
    parse_mod_keybinds_and_variables(&mod_folder, path)
}

#[tauri::command]
fn set_mod_keybind(ini_path: String, section: String, new_key: String) -> Result<(), String> {
    update_ini_keybind(Path::new(&ini_path), &section, &new_key)
}

#[tauri::command]
fn set_mod_toggle_state(
    mods_dir: String,
    mod_name: String,
    variable: String,
    new_value: i64,
) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    set_d3dx_user_toggle(path, &mod_name, &variable, new_value)
}

#[tauri::command]
fn link_mod_to_gamebanana(
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
fn set_mod_preview_image(
    mods_dir: String,
    mod_id: String,
    image_bytes: Vec<u8>,
) -> Result<String, String> {
    let path = Path::new(&mods_dir);
    set_mod_preview(path, &mod_id, &image_bytes)
}

#[tauri::command]
fn unlink_mod_from_gamebanana(mods_dir: String, mod_id: String) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    unlink_mod(path, &mod_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(CancelRegistry::default())
        .manage(TempRegistry::default())
        .setup(|app| {
            if let Ok(path) = config_path(app.handle()) {
                let config = read_config(&path);
                for mods_dir in config.games.values().filter_map(|s| s.mods_dir.as_deref()) {
                    clear_temp_artifacts(Path::new(mods_dir));
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_games,
            get_config,
            set_active_game,
            set_game_mods_dir,
            set_nte_pak_game_dir,
            get_nte_pak_asi_loader_releases,
            get_nte_pak_sig_bypasser_releases,
            get_nte_pak_status,
            install_nte_pak_asi_loader,
            uninstall_nte_pak_asi_loader,
            install_nte_pak_sig_bypasser,
            uninstall_nte_pak_sig_bypasser,
            set_auto_categorize,
            set_show_nsfw,
            set_color_scheme,
            set_auto_check_updates,
            set_view_mode,
            cleanup_on_boot,
            scan_mods,
            get_mod_conflicts,
            get_categories,
            toggle_mod,
            move_mod,
            create_category,
            rename_category,
            delete_category,
            delete_mod,
            batch_toggle_mods,
            batch_move_mods,
            batch_delete_mods,
            extract_archive_file,
            download_mod,
            cancel_download,
            get_mod_keybinds,
            set_mod_keybind,
            set_mod_toggle_state,
            link_mod_to_gamebanana,
            unlink_mod_from_gamebanana,
            set_mod_preview_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running veil");
}
