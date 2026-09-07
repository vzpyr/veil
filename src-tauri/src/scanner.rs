use crate::symlink::{create_mod_symlink, get_active_dir, get_disabled_dir, remove_mod_symlink};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModItem {
    pub id: String,
    pub name: String,
    pub category: Option<String>,
    pub folder_path: String,
    pub enabled: bool,
    pub preview_path: Option<String>,
    pub hashes: Vec<String>,
    pub gamebanana_id: Option<u64>,
    pub version: Option<String>,
    pub file_id: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryItem {
    pub name: String,
    pub mod_count: usize,
}

pub fn extract_hashes_from_ini(content: &str) -> Vec<String> {
    let mut hashes = HashSet::new();
    for raw_line in content.lines() {
        let trimmed = raw_line.trim();
        if trimmed.is_empty() || trimmed.starts_with(';') || trimmed.starts_with('#') {
            continue;
        }

        let clean_line = if let Some(idx) = trimmed.find([';', '#']) {
            trimmed[..idx].trim()
        } else {
            trimmed
        };

        let lower = clean_line.to_ascii_lowercase();
        if lower.starts_with("hash") {
            if let Some((_, val)) = lower.split_once('=') {
                let hash_val = val.trim().to_string();
                if !hash_val.is_empty() {
                    hashes.insert(hash_val);
                }
            }
        }
    }
    let mut result: Vec<String> = hashes.into_iter().collect();
    result.sort();
    result
}

fn collect_hashes_from_folder(dir: &Path) -> Vec<String> {
    let mut all_hashes = HashSet::new();
    let mut stack = vec![dir.to_path_buf()];

    while let Some(current_dir) = stack.pop() {
        let entries = match fs::read_dir(&current_dir) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext.eq_ignore_ascii_case("ini") {
                        if let Ok(bytes) = fs::read(&path) {
                            let content = String::from_utf8_lossy(&bytes);
                            for hash in extract_hashes_from_ini(&content) {
                                all_hashes.insert(hash);
                            }
                        }
                    }
                }
            }
        }
    }

    let mut result: Vec<String> = all_hashes.into_iter().collect();
    result.sort();
    result
}

fn find_preview_image(dir: &Path) -> Option<String> {
    let image_extensions = ["png", "jpg", "jpeg", "webp", "gif"];
    for ext in &image_extensions {
        let preview_file = dir.join(format!("preview.{}", ext));
        if preview_file.is_file() {
            return Some(preview_file.to_string_lossy().to_string());
        }
    }

    let entries = fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                if stem.to_ascii_lowercase().starts_with("preview") {
                    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                        if image_extensions.iter().any(|e| e.eq_ignore_ascii_case(ext)) {
                            return Some(path.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }

    None
}

fn read_veil_metadata(dir: &Path) -> (Option<u64>, Option<String>, Option<u64>) {
    let dotfile = dir.join(".veil.json");
    if !dotfile.is_file() {
        return (None, None, None);
    }
    let content = match fs::read_to_string(&dotfile) {
        Ok(c) => c,
        Err(_) => return (None, None, None),
    };
    let val: serde_json::Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => return (None, None, None),
    };
    let gb_id = val.get("gamebanana_id").and_then(|v| v.as_u64());
    let version = val
        .get("version")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let file_id = val.get("file_id").and_then(|v| v.as_u64());
    (gb_id, version, file_id)
}

fn has_direct_ini_or_assets(dir: &Path) -> bool {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return false,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext.eq_ignore_ascii_case("ini")
                    || ext.eq_ignore_ascii_case("dds")
                    || ext.eq_ignore_ascii_case("buf")
                    || ext.eq_ignore_ascii_case("ib")
                    || ext.eq_ignore_ascii_case("vb")
                {
                    return true;
                }
            }
        }
    }
    false
}

fn contains_subdirectories(dir: &Path) -> bool {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return false,
    };

    for entry in entries.flatten() {
        if entry.path().is_dir() {
            return true;
        }
    }
    false
}

pub fn scan_mods(mods_dir: &Path) -> Result<Vec<ModItem>, String> {
    let disabled_dir = get_disabled_dir(mods_dir);
    let active_dir = get_active_dir(mods_dir);

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

        let folder_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        if has_direct_ini_or_assets(&path) || !contains_subdirectories(&path) {
            let rel_id = folder_name.clone();
            let active_symlink = active_dir.join(&rel_id);
            let is_enabled = active_symlink.symlink_metadata().is_ok();
            let preview = find_preview_image(&path);
            let hashes = collect_hashes_from_folder(&path);

            let (gb_id, ver, fid) = read_veil_metadata(&path);
            mods.push(ModItem {
                id: rel_id,
                name: folder_name,
                category: None,
                folder_path: path.to_string_lossy().to_string(),
                enabled: is_enabled,
                preview_path: preview,
                hashes,
                gamebanana_id: gb_id,
                version: ver,
                file_id: fid,
            });
        } else {
            let category_name = folder_name;
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

                let rel_id = format!("{}/{}", category_name, sub_name);
                let active_symlink = active_dir.join(&rel_id);
                let is_enabled = active_symlink.symlink_metadata().is_ok();
                let preview = find_preview_image(&sub_path);
                let hashes = collect_hashes_from_folder(&sub_path);
                let (gb_id, ver, fid) = read_veil_metadata(&sub_path);

                mods.push(ModItem {
                    id: rel_id,
                    name: sub_name,
                    category: Some(category_name.clone()),
                    folder_path: sub_path.to_string_lossy().to_string(),
                    enabled: is_enabled,
                    preview_path: preview,
                    hashes,
                    gamebanana_id: gb_id,
                    version: ver,
                    file_id: fid,
                });
            }
        }
    }

    mods.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(mods)
}

pub fn list_categories(mods_dir: &Path) -> Result<Vec<CategoryItem>, String> {
    let disabled_dir = get_disabled_dir(mods_dir);
    if !disabled_dir.exists() {
        return Ok(Vec::new());
    }

    let mut categories = Vec::new();
    let entries = fs::read_dir(&disabled_dir).map_err(|err| err.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() && !has_direct_ini_or_assets(&path) {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                let sub_count = fs::read_dir(&path)
                    .map(|entries| entries.flatten().filter(|e| e.path().is_dir()).count())
                    .unwrap_or(0);

                categories.push(CategoryItem {
                    name: name.to_string(),
                    mod_count: sub_count,
                });
            }
        }
    }

    categories.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(categories)
}

pub fn create_category(mods_dir: &Path, category_name: &str) -> Result<(), String> {
    let sanitized = category_name.trim().replace(['/', '\\'], "");
    if sanitized.is_empty() {
        return Err("Category name cannot be empty".to_string());
    }
    let cat_dir = get_disabled_dir(mods_dir).join(&sanitized);
    fs::create_dir_all(&cat_dir).map_err(|err| err.to_string())?;
    Ok(())
}

pub fn move_mod_category(
    mods_dir: &Path,
    mod_rel_path: &str,
    target_category: Option<String>,
) -> Result<String, String> {
    let disabled_dir = get_disabled_dir(mods_dir);
    let active_dir = get_active_dir(mods_dir);

    let old_source = disabled_dir.join(mod_rel_path);
    if !old_source.exists() {
        return Err(format!(
            "Mod source path does not exist: {}",
            old_source.display()
        ));
    }

    let mod_folder_name = match old_source.file_name().and_then(|n| n.to_str()) {
        Some(name) => name.to_string(),
        None => return Err("Invalid mod folder name".to_string()),
    };

    let new_rel_path = match &target_category {
        Some(cat) => {
            let sanitized_cat = cat.trim().replace(['/', '\\'], "");
            if sanitized_cat.is_empty() {
                mod_folder_name.clone()
            } else {
                format!("{}/{}", sanitized_cat, mod_folder_name)
            }
        }
        None => mod_folder_name.clone(),
    };

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

    if let Some(old_parent) = old_source.parent() {
        if old_parent != disabled_dir {
            if let Ok(mut remaining) = fs::read_dir(old_parent) {
                if remaining.next().is_none() {
                    let _ = fs::remove_dir(old_parent);
                }
            }
        }
    }

    if was_enabled {
        let new_target = active_dir.join(&new_rel_path);
        create_mod_symlink(&new_source, &new_target)?;
    }

    Ok(new_rel_path)
}

pub fn delete_mod(mods_dir: &Path, mod_rel_path: &str) -> Result<(), String> {
    let disabled_dir = get_disabled_dir(mods_dir);
    let active_dir = get_active_dir(mods_dir);

    let active_link = active_dir.join(mod_rel_path);
    if active_link.symlink_metadata().is_ok() {
        remove_mod_symlink(&active_link)?;
    }

    let source_dir = disabled_dir.join(mod_rel_path);
    if source_dir.exists() {
        fs::remove_dir_all(&source_dir).map_err(|err| err.to_string())?;
    }

    if let Some(parent) = source_dir.parent() {
        if parent != disabled_dir {
            if let Ok(mut remaining) = fs::read_dir(parent) {
                if remaining.next().is_none() {
                    let _ = fs::remove_dir(parent);
                }
            }
        }
    }

    Ok(())
}

pub fn toggle_mod_status(
    mods_dir: &Path,
    mod_rel_path: &str,
    enable: bool,
) -> Result<bool, String> {
    let disabled_dir = get_disabled_dir(mods_dir);
    let active_dir = get_active_dir(mods_dir);

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
    let disabled_dir = get_disabled_dir(mods_dir);
    let mod_folder = disabled_dir.join(mod_rel_path);
    if !mod_folder.is_dir() {
        return Err(format!(
            "Mod folder does not exist: {}",
            mod_folder.display()
        ));
    }
    let downloaded_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let mod_name = mod_folder
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let meta = serde_json::json!({
        "gamebanana_id": gamebanana_id,
        "file_id": file_id,
        "version": version,
        "mod_name": mod_name,
        "downloaded_at": downloaded_at
    });
    fs::write(
        mod_folder.join(".veil.json"),
        serde_json::to_string_pretty(&meta).unwrap_or_default(),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn unlink_mod(mods_dir: &Path, mod_rel_path: &str) -> Result<(), String> {
    let disabled_dir = get_disabled_dir(mods_dir);
    let mod_folder = disabled_dir.join(mod_rel_path);
    let dotfile = mod_folder.join(".veil.json");
    if dotfile.is_file() {
        fs::remove_file(dotfile).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_extract_hashes_from_ini() {
        let ini = r#"
            ; This is a comment
            [TextureOverrideJaneBody]
            hash = a1b2c3d4
            handling = skip

            # Another comment style
            [ShaderOverrideEffect]
            hash = 99887766 ; inline comment
            hash = a1b2c3d4 ; duplicate
        "#;
        let hashes = extract_hashes_from_ini(ini);
        assert_eq!(hashes, vec!["99887766", "a1b2c3d4"]);
    }

    #[test]
    fn test_scan_and_symlink_workflow() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();

        crate::symlink::ensure_veil_dirs(mods_dir).unwrap();

        let mod_a_dir = get_disabled_dir(mods_dir).join("Jane Doe").join("Outfit A");
        fs::create_dir_all(&mod_a_dir).unwrap();
        fs::write(mod_a_dir.join("mod.ini"), "hash = ffeeddcc").unwrap();

        let mod_b_dir = get_disabled_dir(mods_dir).join("CustomHUD");
        fs::create_dir_all(&mod_b_dir).unwrap();
        fs::write(mod_b_dir.join("hud.ini"), "hash = 11223344").unwrap();

        let scanned = scan_mods(mods_dir).unwrap();
        assert_eq!(scanned.len(), 2);

        let hud = scanned.iter().find(|m| m.name == "CustomHUD").unwrap();
        assert_eq!(hud.category, None);
        assert!(!hud.enabled);
        assert_eq!(hud.hashes, vec!["11223344"]);

        let outfit = scanned.iter().find(|m| m.name == "Outfit A").unwrap();
        assert_eq!(outfit.category, Some("Jane Doe".to_string()));
        assert!(!outfit.enabled);
        assert_eq!(outfit.hashes, vec!["ffeeddcc"]);

        let enabled = toggle_mod_status(mods_dir, "Jane Doe/Outfit A", true).unwrap();
        assert!(enabled);

        let rescanned = scan_mods(mods_dir).unwrap();
        let outfit_after = rescanned.iter().find(|m| m.name == "Outfit A").unwrap();
        assert!(outfit_after.enabled);

        let disabled = toggle_mod_status(mods_dir, "Jane Doe/Outfit A", false).unwrap();
        assert!(!disabled);

        let rescanned_again = scan_mods(mods_dir).unwrap();
        let outfit_disabled = rescanned_again
            .iter()
            .find(|m| m.name == "Outfit A")
            .unwrap();
        assert!(!outfit_disabled.enabled);
    }

    #[test]
    fn test_link_and_unlink_mod() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();

        crate::symlink::ensure_veil_dirs(mods_dir).unwrap();

        let mod_dir = get_disabled_dir(mods_dir).join("Nicole Mod");
        fs::create_dir_all(&mod_dir).unwrap();
        fs::write(mod_dir.join("nicole.ini"), "hash = 12345678").unwrap();

        let initial_scan = scan_mods(mods_dir).unwrap();
        assert_eq!(initial_scan[0].gamebanana_id, None);
        assert_eq!(initial_scan[0].version, None);
        assert_eq!(initial_scan[0].file_id, None);

        link_mod(
            mods_dir,
            "Nicole Mod",
            456789,
            Some("2.0.0".to_string()),
            Some(98765),
        )
        .unwrap();

        let linked_scan = scan_mods(mods_dir).unwrap();
        assert_eq!(linked_scan[0].gamebanana_id, Some(456789));
        assert_eq!(linked_scan[0].version, Some("2.0.0".to_string()));
        assert_eq!(linked_scan[0].file_id, Some(98765));

        unlink_mod(mods_dir, "Nicole Mod").unwrap();

        let unlinked_scan = scan_mods(mods_dir).unwrap();
        assert_eq!(unlinked_scan[0].gamebanana_id, None);
        assert_eq!(unlinked_scan[0].version, None);
        assert_eq!(unlinked_scan[0].file_id, None);
    }
}
