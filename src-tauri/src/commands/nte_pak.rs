use crate::nte_pak::{
    LoaderRelease, NtePakLoaderStatus, fetch_asi_loader_releases, fetch_sig_bypasser_releases,
    install_asi_loader, install_sig_bypasser, nte_pak_loader_status, uninstall_asi_loader,
    uninstall_sig_bypasser,
};
use std::path::Path;

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
