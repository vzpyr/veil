mod categories;
mod hash;
mod mods;

use serde::{Deserialize, Serialize};

pub use categories::{
    cleanup_empty_categories, create_category, delete_category, list_categories, rename_category,
};
pub use hash::extract_hashes_from_ini;
pub use mods::{
    batch_delete_mods, batch_move_mods, batch_toggle_mods, delete_mod, link_mod, move_mod_category,
    scan_mods, set_mod_preview, toggle_mod_status, unlink_mod,
};

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
    pub updated_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryItem {
    pub name: String,
    pub mod_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::symlink::disabled_dir;
    use std::fs;
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

        let mod_a_dir = disabled_dir(mods_dir).join("Jane Doe").join("Outfit A");
        fs::create_dir_all(&mod_a_dir).unwrap();
        fs::write(mod_a_dir.join("mod.ini"), "hash = ffeeddcc").unwrap();

        let mod_b_dir = disabled_dir(mods_dir)
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

        let mod_dir = disabled_dir(mods_dir)
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

        let mod_dir = disabled_dir(mods_dir).join("OldCategory").join("TestMod");
        fs::create_dir_all(&mod_dir).unwrap();
        fs::write(mod_dir.join("test.ini"), "hash = aabbccdd").unwrap();

        toggle_mod_status(mods_dir, "OldCategory/TestMod", true).unwrap();
        let active_symlink = crate::symlink::active_dir(mods_dir)
            .join("OldCategory")
            .join("TestMod");
        assert!(active_symlink.symlink_metadata().is_ok());

        rename_category(mods_dir, "OldCategory", "NewCategory").unwrap();
        let new_mod_dir = disabled_dir(mods_dir).join("NewCategory").join("TestMod");
        assert!(new_mod_dir.exists());

        let new_active_symlink = crate::symlink::active_dir(mods_dir)
            .join("NewCategory")
            .join("TestMod");
        assert!(new_active_symlink.symlink_metadata().is_ok());

        delete_category(mods_dir, "NewCategory", false).unwrap();
        let preserved_mod = disabled_dir(mods_dir)
            .join(crate::symlink::UNCATEGORIZED_DIR_NAME)
            .join("TestMod");
        assert!(preserved_mod.exists());

        let preserved_active = crate::symlink::active_dir(mods_dir)
            .join(crate::symlink::UNCATEGORIZED_DIR_NAME)
            .join("TestMod");
        assert!(preserved_active.symlink_metadata().is_ok());
    }

    #[test]
    fn test_set_mod_preview() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();

        crate::symlink::ensure_veil_dirs(mods_dir).unwrap();
        let mod_dir = disabled_dir(mods_dir)
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
    fn test_scan_skips_hidden_entries() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();

        crate::symlink::ensure_veil_dirs(mods_dir).unwrap();

        let hidden_in_category = disabled_dir(mods_dir)
            .join(".internal_cache")
            .join("stale.ini");
        fs::create_dir_all(hidden_in_category.parent().unwrap()).unwrap();
        fs::write(hidden_in_category, "hash = 11111111").unwrap();

        let cat_dir = disabled_dir(mods_dir).join("Real Category");
        let mod_dir = cat_dir.join("Visible Mod");
        fs::create_dir_all(&mod_dir).unwrap();
        fs::write(mod_dir.join("mod.ini"), "hash = 22222222").unwrap();

        let hidden_sibling = cat_dir.join(".partial_download");
        fs::create_dir_all(&hidden_sibling).unwrap();
        fs::write(hidden_sibling.join("x.ini"), "hash = 33333333").unwrap();

        let scanned = scan_mods(mods_dir).unwrap();
        assert_eq!(scanned.len(), 1);
        assert_eq!(scanned[0].name, "Visible Mod");
        assert_eq!(scanned[0].category, Some("Real Category".to_string()));

        let categories = list_categories(mods_dir).unwrap();
        assert_eq!(categories.len(), 1);
        assert_eq!(categories[0].name, "Real Category");
    }

    #[test]
    fn test_empty_category_preservation() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();

        crate::symlink::ensure_veil_dirs(mods_dir).unwrap();
        create_category(mods_dir, "Dialyn").unwrap();
        assert!(create_category(mods_dir, "Dialyn").is_err());

        let categories = list_categories(mods_dir).unwrap();
        assert_eq!(categories.len(), 1);
        assert_eq!(categories[0].name, "Dialyn");
        assert_eq!(categories[0].mod_count, 0);

        let scanned = scan_mods(mods_dir).unwrap();
        assert_eq!(scanned.len(), 0);

        let categories_after_scan = list_categories(mods_dir).unwrap();
        assert_eq!(categories_after_scan.len(), 1);
        assert_eq!(categories_after_scan[0].name, "Dialyn");
        assert!(disabled_dir(mods_dir).join("Dialyn").exists());
        assert!(
            !disabled_dir(mods_dir)
                .join(crate::symlink::UNCATEGORIZED_DIR_NAME)
                .join("Dialyn")
                .exists()
        );
    }

    #[test]
    fn test_delete_mod_removes_empty_category_and_uncategorized() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();

        let disabled_dir = disabled_dir(mods_dir);
        let custom_cat = disabled_dir.join("Characters");
        let mod_a = custom_cat.join("ModA");
        fs::create_dir_all(&mod_a).unwrap();
        fs::write(mod_a.join("a.ini"), "hash = 11111111").unwrap();

        let uncat_dir = disabled_dir.join(crate::symlink::UNCATEGORIZED_DIR_NAME);
        let mod_b = uncat_dir.join("ModB");
        fs::create_dir_all(&mod_b).unwrap();
        fs::write(mod_b.join("b.ini"), "hash = 22222222").unwrap();

        delete_mod(mods_dir, "Characters/ModA").unwrap();
        assert!(!mod_a.exists());
        assert!(!custom_cat.exists());

        delete_mod(
            mods_dir,
            &format!("{}/ModB", crate::symlink::UNCATEGORIZED_DIR_NAME),
        )
        .unwrap();
        assert!(!mod_b.exists());
        assert!(!uncat_dir.exists());
    }

    #[test]
    fn test_toggle_mod_status_removes_veil_on_last_disable() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();

        let disabled_dir = disabled_dir(mods_dir);
        let active_dir = crate::symlink::active_dir(mods_dir);
        let mod_dir = disabled_dir.join("Weapons").join("Sword");
        fs::create_dir_all(&mod_dir).unwrap();
        fs::write(mod_dir.join("sword.ini"), "hash = 33333333").unwrap();

        let enabled = toggle_mod_status(mods_dir, "Weapons/Sword", true).unwrap();
        assert!(enabled);
        assert!(active_dir.exists());
        assert!(active_dir.join("Weapons").join("Sword").exists());

        let disabled = toggle_mod_status(mods_dir, "Weapons/Sword", false).unwrap();
        assert!(!disabled);
        assert!(!active_dir.exists());
    }

    #[test]
    fn test_cleanup_empty_categories_and_active_dir() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();

        let disabled_dir = disabled_dir(mods_dir);
        let active_dir = crate::symlink::active_dir(mods_dir);

        let empty_cat = disabled_dir.join("EmptyCategory");
        let empty_uncat = disabled_dir.join(crate::symlink::UNCATEGORIZED_DIR_NAME);
        fs::create_dir_all(&empty_cat).unwrap();
        fs::create_dir_all(&empty_uncat).unwrap();

        let empty_active_cat = active_dir.join("EmptyCategory");
        fs::create_dir_all(&empty_active_cat).unwrap();

        cleanup_empty_categories(mods_dir).unwrap();
        crate::symlink::cleanup_empty_active_dir(mods_dir).unwrap();

        assert!(!empty_cat.exists());
        assert!(!empty_uncat.exists());
        assert!(!active_dir.exists());
    }

    #[test]
    fn test_batch_operations() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();

        crate::symlink::ensure_veil_dirs(mods_dir).unwrap();
        let disabled_dir = disabled_dir(mods_dir);

        let mod1_dir = disabled_dir.join("CatA").join("Mod1");
        let mod2_dir = disabled_dir.join("CatA").join("Mod2");
        fs::create_dir_all(&mod1_dir).unwrap();
        fs::create_dir_all(&mod2_dir).unwrap();
        fs::write(mod1_dir.join("mod1.ini"), "hash = 1111").unwrap();
        fs::write(mod2_dir.join("mod2.ini"), "hash = 2222").unwrap();

        let paths = vec!["CatA/Mod1".to_string(), "CatA/Mod2".to_string()];
        batch_toggle_mods(mods_dir, &paths, true).unwrap();

        let scanned = scan_mods(mods_dir).unwrap();
        assert_eq!(scanned.len(), 2);
        assert!(scanned.iter().all(|m| m.enabled));

        batch_move_mods(mods_dir, &paths, Some("CatB".to_string())).unwrap();

        let scanned_moved = scan_mods(mods_dir).unwrap();
        assert_eq!(scanned_moved.len(), 2);
        assert!(
            scanned_moved
                .iter()
                .all(|m| m.category.as_deref() == Some("CatB"))
        );

        let new_paths = vec!["CatB/Mod1".to_string(), "CatB/Mod2".to_string()];
        batch_delete_mods(mods_dir, &new_paths).unwrap();

        let scanned_after_delete = scan_mods(mods_dir).unwrap();
        assert_eq!(scanned_after_delete.len(), 0);
    }
}
