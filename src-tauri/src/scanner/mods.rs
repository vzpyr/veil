use crate::symlink::{
    UNCATEGORIZED_DIR_NAME, active_dir, create_mod_symlink, disabled_dir, effective_category_name,
    remove_mod_symlink,
};
use std::fs;
use std::path::Path;

use super::ModItem;
use super::hash::collect_hashes_from_folder;
use crate::mod_folder::{find_preview_image, is_dir_empty_or_hidden, read_veil_metadata};

pub fn postprocess_3dmigoto_extracted_mod(mod_dir: &Path) -> Result<(), String> {
    let mut stack = vec![mod_dir.to_path_buf()];
    let mut has_ini = false;

    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.is_file()
                && let Some(ext) = path.extension().and_then(|e| e.to_str())
                && ext.eq_ignore_ascii_case("ini")
            {
                has_ini = true;
                break;
            }
        }

        if has_ini {
            break;
        }
    }

    if !has_ini {
        let _ = fs::remove_dir_all(mod_dir);
        return Err(
            "Archive does not contain any .ini files. This game only supports 3DMigoto mods."
                .to_string(),
        );
    }

    Ok(())
}

pub fn scan_mods(mods_dir: &Path) -> Result<Vec<ModItem>, String> {
    let disabled_dir = disabled_dir(mods_dir);
    let active_dir = active_dir(mods_dir);

    if !disabled_dir.exists() {
        return Ok(Vec::new());
    }

    let mut mods = Vec::new();
    let entries = fs::read_dir(&disabled_dir).map_err(|err| err.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let cat_folder_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        if cat_folder_name.starts_with('.') {
            continue;
        }

        let is_uncategorized = cat_folder_name.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME);
        let category_opt = if is_uncategorized {
            None
        } else {
            Some(cat_folder_name.clone())
        };

        let sub_entries = match fs::read_dir(&path) {
            Ok(se) => se,
            Err(_) => continue,
        };

        for sub_entry in sub_entries.flatten() {
            let sub_path = sub_entry.path();
            if !sub_path.is_dir() {
                continue;
            }

            let sub_name = match sub_path.file_name().and_then(|n| n.to_str()) {
                Some(n) => n.to_string(),
                None => continue,
            };

            if sub_name.starts_with('.') {
                continue;
            }

            let rel_id = format!("{}/{}", cat_folder_name, sub_name);
            let active_symlink = active_dir.join(&rel_id);
            let is_enabled = active_symlink.symlink_metadata().is_ok();
            let preview = find_preview_image(&sub_path);
            let hashes = collect_hashes_from_folder(&sub_path);
            let (gb_id, ver, fid) = read_veil_metadata(&sub_path);
            let updated_at = sub_path
                .symlink_metadata()
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64);

            mods.push(ModItem {
                id: rel_id,
                name: sub_name,
                category: category_opt.clone(),
                folder_path: sub_path.to_string_lossy().to_string(),
                enabled: is_enabled,
                preview_path: preview,
                hashes,
                gamebanana_id: gb_id,
                version: ver,
                file_id: fid,
                updated_at,
            });
        }
    }

    mods.sort_by_key(|a| a.name.to_lowercase());
    Ok(mods)
}

fn resolve_mod_folder(mods_dir: &Path, mod_id: &str) -> std::path::PathBuf {
    let disabled_dir = disabled_dir(mods_dir);
    let disabled_path = disabled_dir.join(mod_id);
    if disabled_path.exists() {
        disabled_path
    } else {
        mods_dir.join(mod_id)
    }
}

pub fn set_mod_preview(
    mods_dir: &Path,
    mod_id: &str,
    image_bytes: &[u8],
) -> Result<String, String> {
    let mod_folder = resolve_mod_folder(mods_dir, mod_id);

    if !mod_folder.exists() {
        return Err(format!(
            "Mod folder does not exist: {}",
            mod_folder.display()
        ));
    }

    let image_extensions = ["png", "jpg", "jpeg", "webp", "gif"];
    for ext in &image_extensions {
        let old_preview = mod_folder.join(format!("preview.{}", ext));
        if old_preview.is_file() {
            let _ = fs::remove_file(old_preview);
        }
    }

    let dest_path = mod_folder.join("preview.png");
    fs::write(&dest_path, image_bytes).map_err(|err| err.to_string())?;

    Ok(dest_path.to_string_lossy().to_string())
}

pub fn move_mod_category(
    mods_dir: &Path,
    mod_rel_path: &str,
    target_category: Option<String>,
) -> Result<String, String> {
    let disabled_dir = disabled_dir(mods_dir);
    let active_dir = active_dir(mods_dir);

    let old_source = disabled_dir.join(mod_rel_path);
    if !old_source.exists() {
        return Err(format!(
            "Source mod folder does not exist: {}",
            old_source.display()
        ));
    }

    let mod_folder_name = match old_source.file_name().and_then(|n| n.to_str()) {
        Some(n) => n.to_string(),
        None => return Err("Invalid mod folder name".to_string()),
    };

    let target_cat_name = effective_category_name(target_category.as_deref());

    let new_rel_path = format!("{}/{}", target_cat_name, mod_folder_name);
    let new_source = disabled_dir.join(&new_rel_path);
    if old_source == new_source {
        return Ok(new_rel_path);
    }

    if new_source.exists() {
        return Err(format!(
            "Destination mod folder already exists: {}",
            new_source.display()
        ));
    }

    let old_target = active_dir.join(mod_rel_path);
    let was_enabled = old_target.symlink_metadata().is_ok();

    if was_enabled {
        remove_mod_symlink(&old_target)?;
    }

    if let Some(parent) = new_source.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    fs::rename(&old_source, &new_source).map_err(|err| err.to_string())?;

    if let Some(old_parent) = old_source.parent()
        && old_parent != disabled_dir
        && is_dir_empty_or_hidden(old_parent)
    {
        let _ = fs::remove_dir_all(old_parent);
    }

    if was_enabled {
        let new_target = active_dir.join(&new_rel_path);
        create_mod_symlink(&new_source, &new_target)?;
    }

    Ok(new_rel_path)
}

pub fn delete_mod(mods_dir: &Path, mod_rel_path: &str) -> Result<(), String> {
    let disabled_dir = disabled_dir(mods_dir);
    let active_dir = active_dir(mods_dir);

    let active_link = active_dir.join(mod_rel_path);
    if active_link.symlink_metadata().is_ok() {
        remove_mod_symlink(&active_link)?;
        crate::symlink::cleanup_empty_active_dir(mods_dir)?;
    }

    let source_dir = disabled_dir.join(mod_rel_path);
    if source_dir.exists() {
        fs::remove_dir_all(&source_dir).map_err(|err| err.to_string())?;
    }

    if let Some(parent) = source_dir.parent()
        && parent != disabled_dir
        && is_dir_empty_or_hidden(parent)
    {
        let _ = fs::remove_dir_all(parent);
    }

    Ok(())
}

pub fn batch_delete_mods(mods_dir: &Path, mod_rel_paths: &[String]) -> Result<(), String> {
    let mut errors = Vec::new();
    for rel_path in mod_rel_paths {
        if let Err(err) = delete_mod(mods_dir, rel_path) {
            errors.push(format!("{}: {}", rel_path, err));
        }
    }
    if !errors.is_empty() {
        return Err(errors.join(", "));
    }
    Ok(())
}

pub fn batch_toggle_mods(
    mods_dir: &Path,
    mod_rel_paths: &[String],
    enable: bool,
) -> Result<(), String> {
    let mut errors = Vec::new();
    for rel_path in mod_rel_paths {
        if let Err(err) = toggle_mod_status(mods_dir, rel_path, enable) {
            errors.push(format!("{}: {}", rel_path, err));
        }
    }
    if !errors.is_empty() {
        return Err(errors.join(", "));
    }
    Ok(())
}

pub fn batch_move_mods(
    mods_dir: &Path,
    mod_rel_paths: &[String],
    target_category: Option<String>,
) -> Result<(), String> {
    let mut errors = Vec::new();
    for rel_path in mod_rel_paths {
        if let Err(err) = move_mod_category(mods_dir, rel_path, target_category.clone()) {
            errors.push(format!("{}: {}", rel_path, err));
        }
    }
    if !errors.is_empty() {
        return Err(errors.join(", "));
    }
    Ok(())
}

pub fn toggle_mod_status(
    mods_dir: &Path,
    mod_rel_path: &str,
    enable: bool,
) -> Result<bool, String> {
    let disabled_dir = disabled_dir(mods_dir);
    let active_dir = active_dir(mods_dir);

    let source_path = disabled_dir.join(mod_rel_path);
    let target_path = active_dir.join(mod_rel_path);

    if enable {
        if !source_path.exists() {
            return Err(format!(
                "Cannot enable mod because source does not exist: {}",
                source_path.display()
            ));
        }
        create_mod_symlink(&source_path, &target_path)?;
        Ok(true)
    } else {
        remove_mod_symlink(&target_path)?;
        crate::symlink::cleanup_empty_active_dir(mods_dir)?;
        Ok(false)
    }
}

pub fn link_mod(
    mods_dir: &Path,
    mod_rel_path: &str,
    gamebanana_id: u64,
    version: Option<String>,
    file_id: Option<u64>,
) -> Result<(), String> {
    let mod_folder = resolve_mod_folder(mods_dir, mod_rel_path);
    if !mod_folder.is_dir() {
        return Err(format!(
            "Mod folder does not exist: {}",
            mod_folder.display()
        ));
    }
    let meta = serde_json::json!({
        "gamebanana_id": gamebanana_id,
        "file_id": file_id,
        "version": version,
    });
    fs::write(
        mod_folder.join(".veil.json"),
        serde_json::to_string_pretty(&meta).unwrap_or_default(),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn unlink_mod(mods_dir: &Path, mod_rel_path: &str) -> Result<(), String> {
    let mod_folder = resolve_mod_folder(mods_dir, mod_rel_path);
    let dotfile = mod_folder.join(".veil.json");
    if dotfile.is_file() {
        fs::remove_file(dotfile).map_err(|e| e.to_string())?;
    }
    Ok(())
}
