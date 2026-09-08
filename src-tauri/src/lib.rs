pub mod archive;
pub mod config;
pub mod conflict;
pub mod gamebanana;
pub mod games;
pub mod keybinds;
pub mod scanner;
pub mod symlink;

use archive::extract_any_archive;
use config::{get_config_path, read_config, write_config, AppConfig, GameSettings};
use conflict::{detect_conflicts, ConflictGroup};
use gamebanana::download_and_install_mod;
use games::{get_supported_games, GameDefinition};
use keybinds::{
    parse_mod_keybinds_and_variables, set_d3dx_user_toggle, update_ini_keybind, ModKeybindData,
};
use scanner::{
    create_category, delete_category, delete_mod, link_mod, list_categories, move_mod_category,
    rename_category, scan_mods, set_mod_preview, toggle_mod_status, unlink_mod, CategoryItem,
    ModItem,
};
use std::path::Path;
use symlink::{
    ensure_veil_dirs, get_disabled_dir, prune_orphaned_symlinks, UNCATEGORIZED_DIR_NAME,
};
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
    duplicate_action: Option<String>,
) -> Result<String, String> {
    let path = Path::new(&mods_dir);
    ensure_veil_dirs(path)?;

    let disabled_dir = get_disabled_dir(path);
    let target_parent_dir = match &category {
        Some(cat) => {
            let sanitized = cat.trim().replace(['/', '\\'], "");
            if sanitized.is_empty()
                || sanitized.eq_ignore_ascii_case("__root__")
                || sanitized.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME)
            {
                let cat_dir = disabled_dir.join(UNCATEGORIZED_DIR_NAME);
                std::fs::create_dir_all(&cat_dir).map_err(|e| e.to_string())?;
                cat_dir
            } else {
                let cat_dir = disabled_dir.join(&sanitized);
                std::fs::create_dir_all(&cat_dir).map_err(|e| e.to_string())?;
                cat_dir
            }
        }
        None => {
            let cat_dir = disabled_dir.join(UNCATEGORIZED_DIR_NAME);
            std::fs::create_dir_all(&cat_dir).map_err(|e| e.to_string())?;
            cat_dir
        }
    };

    let action = duplicate_action.unwrap_or_else(|| "replace".to_string());
    let extracted = extract_any_archive(
        Path::new(&archive_path),
        &target_parent_dir,
        &mod_name,
        &action,
    )?;
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
    duplicate_action: Option<String>,
    item_id: Option<u64>,
    file_id: Option<u64>,
    version: Option<String>,
) -> Result<String, String> {
    download_and_install_mod(
        app,
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
    )
    .await
}

#[tauri::command]
fn get_mod_keybinds(mods_dir: String, mod_id: String) -> Result<ModKeybindData, String> {
    let path = Path::new(&mods_dir);
    ensure_veil_dirs(path)?;
    let disabled_dir = get_disabled_dir(path);
    let mod_folder = disabled_dir.join(&mod_id);
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
fn rename_existing_category(
    mods_dir: String,
    old_name: String,
    new_name: String,
) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    rename_category(path, &old_name, &new_name)
}

#[tauri::command]
fn delete_existing_category(
    mods_dir: String,
    category_name: String,
    delete_mods: bool,
) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    delete_category(path, &category_name, delete_mods)
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
    ensure_veil_dirs(path)?;
    unlink_mod(path, &mod_id)
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
            rename_existing_category,
            delete_existing_category,
            delete_installed_mod,
            prune_symlinks,
            extract_archive_file,
            download_mod,
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
