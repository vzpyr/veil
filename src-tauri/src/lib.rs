pub mod archive;
pub mod config;
pub mod conflict;
pub mod gamebanana;
pub mod games;
pub mod scanner;
pub mod symlink;

use archive::extract_any_archive;
use config::{get_config_path, read_config, write_config, AppConfig, GameSettings};
use conflict::{detect_conflicts, ConflictGroup};
use gamebanana::download_and_install_mod;
use games::{get_supported_games, GameDefinition};
use scanner::{
    create_category, delete_mod, list_categories, move_mod_category, scan_mods, toggle_mod_status,
    CategoryItem, ModItem,
};
use std::path::Path;
use symlink::{ensure_veil_dirs, get_disabled_dir, prune_orphaned_symlinks};
use tauri::AppHandle;

#[tauri::command]
fn get_games() -> Vec<GameDefinition> {
    get_supported_games()
}

#[tauri::command]
fn get_config(app: AppHandle) -> Result<AppConfig, String> {
    let path = get_config_path(&app)?;
    Ok(read_config(&path))
}

#[tauri::command]
fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let path = get_config_path(&app)?;
    write_config(&path, &config)
}

#[tauri::command]
fn set_active_game(app: AppHandle, game_id: String) -> Result<AppConfig, String> {
    let path = get_config_path(&app)?;
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
    let path = get_config_path(&app)?;
    let mut config = read_config(&path);

    let trimmed = mods_dir.trim().to_string();
    if !trimmed.is_empty() {
        let p = Path::new(&trimmed);
        ensure_veil_dirs(p)?;
    }

    let entry = config
        .games
        .entry(game_id)
        .or_insert_with(GameSettings::default);
    entry.mods_dir = if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    };

    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
fn set_game_auto_categorize(
    app: AppHandle,
    game_id: String,
    auto_categorize: bool,
) -> Result<AppConfig, String> {
    let path = get_config_path(&app)?;
    let mut config = read_config(&path);
    let entry = config
        .games
        .entry(game_id)
        .or_insert_with(GameSettings::default);
    entry.auto_categorize = auto_categorize;
    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
fn scan_installed_mods(mods_dir: String) -> Result<Vec<ModItem>, String> {
    let path = Path::new(&mods_dir);
    ensure_veil_dirs(path)?;
    prune_orphaned_symlinks(path)?;
    scan_mods(path)
}

#[tauri::command]
fn get_mod_conflicts(mods_dir: String) -> Result<Vec<ConflictGroup>, String> {
    let path = Path::new(&mods_dir);
    ensure_veil_dirs(path)?;
    let mods = scan_mods(path)?;
    Ok(detect_conflicts(&mods))
}

#[tauri::command]
fn get_categories(mods_dir: String) -> Result<Vec<CategoryItem>, String> {
    let path = Path::new(&mods_dir);
    ensure_veil_dirs(path)?;
    list_categories(path)
}

#[tauri::command]
fn toggle_mod(mods_dir: String, mod_id: String, enable: bool) -> Result<bool, String> {
    let path = Path::new(&mods_dir);
    toggle_mod_status(path, &mod_id, enable)
}

#[tauri::command]
fn move_mod(
    mods_dir: String,
    mod_id: String,
    target_category: Option<String>,
) -> Result<String, String> {
    let path = Path::new(&mods_dir);
    move_mod_category(path, &mod_id, target_category)
}

#[tauri::command]
fn create_new_category(mods_dir: String, category_name: String) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    create_category(path, &category_name)
}

#[tauri::command]
fn delete_installed_mod(mods_dir: String, mod_id: String) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    delete_mod(path, &mod_id)
}

#[tauri::command]
fn prune_symlinks(mods_dir: String) -> Result<usize, String> {
    let path = Path::new(&mods_dir);
    prune_orphaned_symlinks(path)
}

#[tauri::command]
fn extract_archive_file(
    archive_path: String,
    mods_dir: String,
    mod_name: String,
    category: Option<String>,
) -> Result<String, String> {
    let path = Path::new(&mods_dir);
    ensure_veil_dirs(path)?;

    let disabled_dir = get_disabled_dir(path);
    let target_parent_dir = match &category {
        Some(cat) if !cat.trim().is_empty() => {
            let cat_dir = disabled_dir.join(cat.trim().replace(['/', '\\'], ""));
            std::fs::create_dir_all(&cat_dir).map_err(|e| e.to_string())?;
            cat_dir
        }
        _ => disabled_dir.clone(),
    };

    let extracted = extract_any_archive(Path::new(&archive_path), &target_parent_dir, &mod_name)?;
    let rel_id = extracted
        .strip_prefix(&disabled_dir)
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .replace('\\', "/");

    Ok(rel_id)
}

#[tauri::command]
async fn download_mod(
    app: AppHandle,
    download_url: String,
    mods_dir: String,
    mod_name: String,
    category: Option<String>,
    preview_url: Option<String>,
    key: String,
) -> Result<String, String> {
    download_and_install_mod(
        app,
        download_url,
        mods_dir,
        mod_name,
        category,
        preview_url,
        key,
    )
    .await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_games,
            get_config,
            save_config,
            set_active_game,
            set_game_mods_dir,
            set_game_auto_categorize,
            scan_installed_mods,
            get_mod_conflicts,
            get_categories,
            toggle_mod,
            move_mod,
            create_new_category,
            delete_installed_mod,
            prune_symlinks,
            extract_archive_file,
            download_mod,
        ])
        .run(tauri::generate_context!())
        .expect("error while running veil");
}
