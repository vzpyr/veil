use crate::symlink::{
    create_mod_symlink, get_active_dir, get_disabled_dir, remove_mod_symlink,
    UNCATEGORIZED_DIR_NAME,
};
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

pub fn scan_mods(mods_dir: &Path) -> Result<Vec<ModItem>, String> {
    let disabled_dir = get_disabled_dir(mods_dir);
    let active_dir = get_active_dir(mods_dir);

    if !disabled_dir.exists() {
        return Ok(Vec::new());
    }

    let uncategorized_dir = disabled_dir.join(UNCATEGORIZED_DIR_NAME);
    let _ = fs::create_dir_all(&uncategorized_dir);

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

            let rel_id = format!("{}/{}", cat_folder_name, sub_name);
            let active_symlink = active_dir.join(&rel_id);
            let is_enabled = active_symlink.symlink_metadata().is_ok();
            let preview = find_preview_image(&sub_path);
            let hashes = collect_hashes_from_folder(&sub_path);
            let (gb_id, ver, fid) = read_veil_metadata(&sub_path);

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
            });
        }
    }

    mods.sort_by_key(|a| a.name.to_lowercase());
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
        if path.is_dir() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME) {
                    continue;
                }
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

    categories.sort_by_key(|a| a.name.to_lowercase());
    Ok(categories)
}

pub fn create_category(mods_dir: &Path, category_name: &str) -> Result<(), String> {
    let sanitized = category_name.trim().replace(['/', '\\'], "");
    if sanitized.is_empty() {
        return Err("Category name cannot be empty".to_string());
    }
    if sanitized.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME) {
        return Err("Cannot use reserved category name 'Uncategorized'".to_string());
    }
    let cat_dir = get_disabled_dir(mods_dir).join(&sanitized);
    fs::create_dir_all(&cat_dir).map_err(|err| err.to_string())?;
    Ok(())
}

pub fn rename_category(mods_dir: &Path, old_name: &str, new_name: &str) -> Result<(), String> {
    let sanitized_old = old_name.trim().replace(['/', '\\'], "");
    let sanitized_new = new_name.trim().replace(['/', '\\'], "");

    if sanitized_old.is_empty() || sanitized_new.is_empty() {
        return Err("Category name cannot be empty".to_string());
    }
    if sanitized_old.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME) {
        return Err("Cannot rename the reserved Uncategorized category".to_string());
    }
    if sanitized_new.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME) {
        return Err("Cannot use reserved category name 'Uncategorized'".to_string());
    }

    if sanitized_old == sanitized_new {
        return Ok(());
    }

    let disabled_dir = get_disabled_dir(mods_dir);
    let active_dir = get_active_dir(mods_dir);

    let old_cat_dir = disabled_dir.join(&sanitized_old);
    let new_cat_dir = disabled_dir.join(&sanitized_new);

    if !old_cat_dir.exists() {
        return Err(format!("Category does not exist: {}", sanitized_old));
    }

    if new_cat_dir.exists() {
        return Err(format!("Category already exists: {}", sanitized_new));
    }

    let old_active_cat = active_dir.join(&sanitized_old);
    let new_active_cat = active_dir.join(&sanitized_new);

    let mut enabled_mods = Vec::new();
    if old_active_cat.exists() {
        if let Ok(entries) = fs::read_dir(&old_active_cat) {
            for entry in entries.flatten() {
                if entry.path().symlink_metadata().is_ok() {
                    if let Some(name) = entry.file_name().to_str() {
                        enabled_mods.push(name.to_string());
                    }
                }
            }
        }
    }

    for mod_name in &enabled_mods {
        let symlink_path = old_active_cat.join(mod_name);
        let _ = remove_mod_symlink(&symlink_path);
    }
    let _ = fs::remove_dir_all(&old_active_cat);

    fs::rename(&old_cat_dir, &new_cat_dir).map_err(|e| e.to_string())?;

    if !enabled_mods.is_empty() {
        fs::create_dir_all(&new_active_cat).map_err(|e| e.to_string())?;
        for mod_name in enabled_mods {
            let target_source = new_cat_dir.join(&mod_name);
            let target_symlink = new_active_cat.join(&mod_name);
            let _ = create_mod_symlink(&target_source, &target_symlink);
        }
    }

    Ok(())
}

pub fn delete_category(
    mods_dir: &Path,
    category_name: &str,
    delete_mods: bool,
) -> Result<(), String> {
    let sanitized = category_name.trim().replace(['/', '\\'], "");
    if sanitized.is_empty() {
        return Err("Category name cannot be empty".to_string());
    }
    if sanitized.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME) {
        return Err("Cannot delete the reserved Uncategorized category".to_string());
    }

    let disabled_dir = get_disabled_dir(mods_dir);
    let active_dir = get_active_dir(mods_dir);

    let cat_dir = disabled_dir.join(&sanitized);
    if !cat_dir.exists() {
        return Err(format!("Category does not exist: {}", sanitized));
    }

    let active_cat_dir = active_dir.join(&sanitized);

    if delete_mods {
        if active_cat_dir.exists() {
            if let Ok(entries) = fs::read_dir(&active_cat_dir) {
                for entry in entries.flatten() {
                    let _ = remove_mod_symlink(&entry.path());
                }
            }
            let _ = fs::remove_dir_all(&active_cat_dir);
        }
        fs::remove_dir_all(&cat_dir).map_err(|e| e.to_string())?;
    } else {
        let uncategorized_dir = disabled_dir.join(UNCATEGORIZED_DIR_NAME);
        let active_uncategorized_dir = active_dir.join(UNCATEGORIZED_DIR_NAME);
        fs::create_dir_all(&uncategorized_dir).map_err(|e| e.to_string())?;

        let entries = fs::read_dir(&cat_dir).map_err(|e| e.to_string())?;
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let mod_name = match path.file_name().and_then(|n| n.to_str()) {
                    Some(n) => n.to_string(),
                    None => continue,
                };
                let dest = uncategorized_dir.join(&mod_name);
                if !dest.exists() {
                    let active_symlink = active_cat_dir.join(&mod_name);
                    let was_enabled = active_symlink.symlink_metadata().is_ok();
                    if was_enabled {
                        let _ = remove_mod_symlink(&active_symlink);
                    }
                    if fs::rename(&path, &dest).is_ok() && was_enabled {
                        let _ = fs::create_dir_all(&active_uncategorized_dir);
                        let new_symlink = active_uncategorized_dir.join(&mod_name);
                        let _ = create_mod_symlink(&dest, &new_symlink);
                    }
                }
            }
        }
        let _ = fs::remove_dir_all(&active_cat_dir);
        let _ = fs::remove_dir_all(&cat_dir);
    }

    Ok(())
}

pub fn set_mod_preview(
    mods_dir: &Path,
    mod_id: &str,
    image_bytes: &[u8],
) -> Result<String, String> {
    let disabled_dir = get_disabled_dir(mods_dir);
    let mod_folder = disabled_dir.join(mod_id);

    if !mod_folder.exists() {
        return Err(format!(
            "Mod folder does not exist: {}",
            mod_folder.display()
        ));
    }

    if let Ok(entries) = fs::read_dir(&mod_folder) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let file_name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_ascii_lowercase();
                if file_name.starts_with("preview.") {
                    let _ = fs::remove_file(&path);
                }
            }
        }
    }

    let target_preview = mod_folder.join("preview.png");
    fs::write(&target_preview, image_bytes).map_err(|e| e.to_string())?;

    Ok(target_preview.to_string_lossy().to_string())
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

    let target_cat_name = match &target_category {
        Some(cat) => {
            let sanitized = cat.trim().replace(['/', '\\'], "");
            if sanitized.is_empty()
                || sanitized.eq_ignore_ascii_case("__root__")
                || sanitized.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME)
            {
                UNCATEGORIZED_DIR_NAME.to_string()
            } else {
                sanitized
            }
        }
        None => UNCATEGORIZED_DIR_NAME.to_string(),
    };

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

    if let Some(old_parent) = old_source.parent() {
        if old_parent != disabled_dir
            && old_parent.file_name().and_then(|n| n.to_str()) != Some(UNCATEGORIZED_DIR_NAME)
        {
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
        if parent != disabled_dir
            && parent.file_name().and_then(|n| n.to_str()) != Some(UNCATEGORIZED_DIR_NAME)
        {
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

        let mod_b_dir = get_disabled_dir(mods_dir)
            .join(crate::symlink::UNCATEGORIZED_DIR_NAME)
            .join("CustomHUD");
        fs::create_dir_all(&mod_b_dir).unwrap();
        fs::write(mod_b_dir.join("hud.ini"), "hash = 11223344").unwrap();

        let scanned = scan_mods(mods_dir).unwrap();
        assert_eq!(scanned.len(), 2);

        let hud = scanned.iter().find(|m| m.name == "CustomHUD").unwrap();
        assert_eq!(hud.category, None);
        assert_eq!(hud.id, "Uncategorized/CustomHUD");
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

        let mod_dir = get_disabled_dir(mods_dir)
            .join(crate::symlink::UNCATEGORIZED_DIR_NAME)
            .join("Nicole Mod");
        fs::create_dir_all(&mod_dir).unwrap();
        fs::write(mod_dir.join("nicole.ini"), "hash = 12345678").unwrap();

        let initial_scan = scan_mods(mods_dir).unwrap();
        assert_eq!(initial_scan[0].gamebanana_id, None);
        assert_eq!(initial_scan[0].version, None);
        assert_eq!(initial_scan[0].file_id, None);

        link_mod(
            mods_dir,
            "Uncategorized/Nicole Mod",
            456789,
            Some("2.0.0".to_string()),
            Some(98765),
        )
        .unwrap();

        let linked_scan = scan_mods(mods_dir).unwrap();
        assert_eq!(linked_scan[0].gamebanana_id, Some(456789));
        assert_eq!(linked_scan[0].version, Some("2.0.0".to_string()));
        assert_eq!(linked_scan[0].file_id, Some(98765));

        unlink_mod(mods_dir, "Uncategorized/Nicole Mod").unwrap();

        let unlinked_scan = scan_mods(mods_dir).unwrap();
        assert_eq!(unlinked_scan[0].gamebanana_id, None);
        assert_eq!(unlinked_scan[0].version, None);
        assert_eq!(unlinked_scan[0].file_id, None);
    }

    #[test]
    fn test_category_rename_and_delete() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();

        crate::symlink::ensure_veil_dirs(mods_dir).unwrap();
        create_category(mods_dir, "OldCategory").unwrap();

        let mod_dir = get_disabled_dir(mods_dir)
            .join("OldCategory")
            .join("TestMod");
        fs::create_dir_all(&mod_dir).unwrap();
        fs::write(mod_dir.join("test.ini"), "hash = aabbccdd").unwrap();

        toggle_mod_status(mods_dir, "OldCategory/TestMod", true).unwrap();
        let active_symlink = crate::symlink::get_active_dir(mods_dir)
            .join("OldCategory")
            .join("TestMod");
        assert!(active_symlink.symlink_metadata().is_ok());

        rename_category(mods_dir, "OldCategory", "NewCategory").unwrap();
        let new_mod_dir = get_disabled_dir(mods_dir)
            .join("NewCategory")
            .join("TestMod");
        assert!(new_mod_dir.exists());

        let new_active_symlink = crate::symlink::get_active_dir(mods_dir)
            .join("NewCategory")
            .join("TestMod");
        assert!(new_active_symlink.symlink_metadata().is_ok());

        delete_category(mods_dir, "NewCategory", false).unwrap();
        let preserved_mod = get_disabled_dir(mods_dir)
            .join(crate::symlink::UNCATEGORIZED_DIR_NAME)
            .join("TestMod");
        assert!(preserved_mod.exists());

        let preserved_active = crate::symlink::get_active_dir(mods_dir)
            .join(crate::symlink::UNCATEGORIZED_DIR_NAME)
            .join("TestMod");
        assert!(preserved_active.symlink_metadata().is_ok());
    }

    #[test]
    fn test_set_mod_preview() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();

        crate::symlink::ensure_veil_dirs(mods_dir).unwrap();
        let mod_dir = get_disabled_dir(mods_dir)
            .join(crate::symlink::UNCATEGORIZED_DIR_NAME)
            .join("PreviewMod");
        fs::create_dir_all(&mod_dir).unwrap();
        fs::write(mod_dir.join("preview.jpg"), b"old").unwrap();

        let dummy_bytes = b"fake_png_data";
        let path = set_mod_preview(mods_dir, "Uncategorized/PreviewMod", dummy_bytes).unwrap();
        assert!(path.ends_with("preview.png"));
        assert!(!mod_dir.join("preview.jpg").exists());
        assert_eq!(fs::read(mod_dir.join("preview.png")).unwrap(), dummy_bytes);
    }

    #[test]
    fn test_empty_category_preservation() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();

        crate::symlink::ensure_veil_dirs(mods_dir).unwrap();
        create_category(mods_dir, "Dialyn").unwrap();

        let categories = list_categories(mods_dir).unwrap();
        assert_eq!(categories.len(), 1);
        assert_eq!(categories[0].name, "Dialyn");
        assert_eq!(categories[0].mod_count, 0);

        let scanned = scan_mods(mods_dir).unwrap();
        assert_eq!(scanned.len(), 0);

        let categories_after_scan = list_categories(mods_dir).unwrap();
        assert_eq!(categories_after_scan.len(), 1);
        assert_eq!(categories_after_scan[0].name, "Dialyn");
        assert!(get_disabled_dir(mods_dir).join("Dialyn").exists());
        assert!(!get_disabled_dir(mods_dir)
            .join(crate::symlink::UNCATEGORIZED_DIR_NAME)
            .join("Dialyn")
            .exists());
    }
}
