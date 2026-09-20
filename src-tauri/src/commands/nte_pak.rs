use crate::config::{AppConfig, config_path, read_config, write_config};
use crate::nte_pak::{
    LoaderRelease, NtePakLoaderStatus, fetch_asi_loader_releases, fetch_sig_bypasser_releases,
    install_asi_loader, install_sig_bypasser, nte_pak_loader_status, resolve_nte_pak_paths,
    uninstall_asi_loader, uninstall_sig_bypasser,
};
use std::path::Path;
use tauri::AppHandle;

#[tauri::command]
pub fn set_nte_pak_game_dir(app: AppHandle, game_dir: String) -> Result<AppConfig, String> {
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
pub async fn get_nte_pak_asi_loader_releases() -> Result<Vec<LoaderRelease>, String> {
    fetch_asi_loader_releases().await
}

#[tauri::command]
pub async fn get_nte_pak_sig_bypasser_releases() -> Result<Vec<LoaderRelease>, String> {
    fetch_sig_bypasser_releases().await
}

#[tauri::command]
pub fn get_nte_pak_status(game_dir: String) -> Result<NtePakLoaderStatus, String> {
    nte_pak_loader_status(Path::new(&game_dir))
}

#[tauri::command]
pub async fn install_nte_pak_asi_loader(
    game_dir: String,
    download_url: String,
    version: String,
    dll_name: String,
) -> Result<(), String> {
    install_asi_loader(Path::new(&game_dir), &download_url, &version, &dll_name).await
}

#[tauri::command]
pub fn uninstall_nte_pak_asi_loader(game_dir: String) -> Result<(), String> {
    uninstall_asi_loader(Path::new(&game_dir))
}

#[tauri::command]
pub async fn install_nte_pak_sig_bypasser(
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
pub fn uninstall_nte_pak_sig_bypasser(game_dir: String) -> Result<(), String> {
    uninstall_sig_bypasser(Path::new(&game_dir))
}
