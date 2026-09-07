pub mod config;
pub mod games;
pub mod scanner;
pub mod symlink;

use config::{get_config_path, read_config, write_config, AppConfig, GameSettings};
use games::{get_supported_games, GameDefinition};
use scanner::{
    create_category, delete_mod, list_categories, move_mod_category, scan_mods, toggle_mod_status,
    CategoryItem, ModItem,
};
use std::path::Path;
use symlink::{ensure_veil_dirs, prune_orphaned_symlinks};
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
            get_categories,
            toggle_mod,
            move_mod,
            create_new_category,
            delete_installed_mod,
            prune_symlinks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running veil");
}
