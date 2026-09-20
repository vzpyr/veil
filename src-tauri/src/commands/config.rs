use crate::config::{AppConfig, config_path, read_config, write_config};
use crate::games::{GameDefinition, supported_games};
use crate::symlink::ensure_veil_dirs;
use std::path::Path;
use tauri::AppHandle;

#[tauri::command]
pub fn get_games() -> Vec<GameDefinition> {
    supported_games()
}

#[tauri::command]
pub fn get_config(app: AppHandle) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    Ok(read_config(&path))
}

#[tauri::command]
pub fn set_active_game(app: AppHandle, game_id: String) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    let mut config = read_config(&path);
    config.active_game_id = game_id;
    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
pub fn set_game_dir(app: AppHandle, game_id: String, dir: String) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    let mut config = read_config(&path);

    let trimmed = dir.trim().to_string();
    if !trimmed.is_empty() {
        let p = Path::new(&trimmed);
        if game_id == "ntepak" {
            std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
        } else {
            ensure_veil_dirs(p)?;
        }
    }

    let entry = config.games.entry(game_id).or_default();
    entry.dir = if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    };

    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
pub fn set_auto_categorize(app: AppHandle, auto_categorize: bool) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    let mut config = read_config(&path);
    config.auto_categorize = auto_categorize;
    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
pub fn set_show_nsfw(app: AppHandle, show_nsfw: bool) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    let mut config = read_config(&path);
    config.show_nsfw = show_nsfw;
    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
pub fn set_color_scheme(app: AppHandle, color_scheme: String) -> Result<AppConfig, String> {
    let scheme = match color_scheme.as_str() {
        "dark" => "dark",
        "light" => "light",
        _ => "system",
    };
    let path = config_path(&app)?;
    let mut config = read_config(&path);
    config.color_scheme = scheme.to_string();
    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
pub fn set_auto_check_updates(
    app: AppHandle,
    auto_check_updates: bool,
) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    let mut config = read_config(&path);
    config.auto_check_updates = auto_check_updates;
    write_config(&path, &config)?;
    Ok(config)
}

#[tauri::command]
pub fn set_view_mode(app: AppHandle, view_mode: String) -> Result<AppConfig, String> {
    let mode = if view_mode == "list" { "list" } else { "grid" };
    let path = config_path(&app)?;
    let mut config = read_config(&path);
    config.view_mode = mode.to_string();
    write_config(&path, &config)?;
    Ok(config)
}
