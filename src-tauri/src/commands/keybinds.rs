use crate::keybinds::{
    ModKeybindData, parse_mod_keybinds_and_variables, set_d3dx_user_toggle, update_ini_keybind,
};
use crate::symlink::{disabled_dir, ensure_veil_dirs};
use std::path::Path;

#[tauri::command]
pub fn get_mod_keybinds(mods_dir: String, mod_id: String) -> Result<ModKeybindData, String> {
    let path = Path::new(&mods_dir);
    ensure_veil_dirs(path)?;
    let mod_dir = disabled_dir(path);
    let mod_folder = mod_dir.join(&mod_id);
    parse_mod_keybinds_and_variables(&mod_folder, path)
}

#[tauri::command]
pub fn set_mod_keybind(ini_path: String, section: String, new_key: String) -> Result<(), String> {
    update_ini_keybind(Path::new(&ini_path), &section, &new_key)
}

#[tauri::command]
pub fn set_mod_toggle_state(
    mods_dir: String,
    mod_name: String,
    variable: String,
    new_value: i64,
) -> Result<(), String> {
    let path = Path::new(&mods_dir);
    set_d3dx_user_toggle(path, &mod_name, &variable, new_value)
}
