pub mod archive;
pub mod config;
pub mod conflict;
pub mod gamebanana;
pub mod games;
pub mod keybinds;
pub mod nte_pak;
pub mod scanner;
pub mod symlink;

mod commands;
mod mod_folder;

use commands::effective_mods_dir;
use commands::*;
use config::{config_path, read_config};
use gamebanana::{CancelRegistry, TempRegistry, clear_temp_artifacts};

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
                for (game_id, settings) in &config.games {
                    if let Some(dir) = settings.dir.as_deref() {
                        clear_temp_artifacts(&effective_mods_dir(Some(game_id), dir));
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_games,
            get_config,
            set_active_game,
            set_game_dir,
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
