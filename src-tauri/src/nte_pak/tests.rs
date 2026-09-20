use std::fs;
use std::path::PathBuf;

use tempfile::tempdir;

use super::loader::{compute_bytes_sha256, read_loader_metadata, write_loader_metadata};
use super::*;

#[test]
fn test_resolve_nte_pak_paths() {
    let temp = tempdir().unwrap();
    let base = temp.path();

    let (win64_1, mods_1) = resolve_nte_pak_paths(base);
    assert_eq!(
        win64_1,
        base.join("Client/WindowsNoEditor/HT/Binaries/Win64")
    );
    assert_eq!(
        mods_1,
        base.join("Client/WindowsNoEditor/HT/Content/Paks/veil")
    );

    let ht_dir = base.join("Client/WindowsNoEditor/HT");
    fs::create_dir_all(&ht_dir).unwrap();
    let (win64_2, mods_2) = resolve_nte_pak_paths(base);
    assert_eq!(win64_2, ht_dir.join("Binaries/Win64"));
    assert_eq!(mods_2, ht_dir.join("Content/Paks/veil"));
}

#[test]
fn test_postprocess_nte_pak_extracted_mod_error_without_pak() {
    let temp = tempdir().unwrap();
    let mod_dir = temp.path().join("ini_mod");
    fs::create_dir_all(&mod_dir).unwrap();
    fs::write(mod_dir.join("mod.ini"), "test").unwrap();

    let res = postprocess_nte_pak_extracted_mod(&mod_dir);
    assert!(res.is_err());
    assert!(!mod_dir.exists());
}

#[test]
fn test_postprocess_nte_pak_extracted_mod_normalizes_p() {
    let temp = tempdir().unwrap();
    let mod_dir = temp.path().join("pak_mod");
    fs::create_dir_all(&mod_dir).unwrap();
    fs::write(mod_dir.join("Costume_P.pak"), "pak_data").unwrap();
    fs::write(mod_dir.join("Costume_P.ucas"), "ucas_data").unwrap();
    fs::write(mod_dir.join("Costume_P.utoc"), "utoc_data").unwrap();

    let res = postprocess_nte_pak_extracted_mod(&mod_dir);
    assert!(res.is_ok());
    assert!(mod_dir.join("Costume.pak").is_file());
    assert!(mod_dir.join("Costume.ucas").is_file());
    assert!(mod_dir.join("Costume.utoc").is_file());
    assert!(!mod_dir.join("Costume_P.pak").exists());
}

#[test]
fn test_toggle_nte_pak_mod() {
    let temp = tempdir().unwrap();
    let mods_dir = temp.path();
    let rel_id = "Uncategorized/TestMod";
    let mod_dir = mods_dir.join(rel_id);
    fs::create_dir_all(&mod_dir).unwrap();

    fs::write(mod_dir.join("TestMod.pak"), "pak").unwrap();
    fs::write(mod_dir.join("TestMod.ucas"), "ucas").unwrap();

    let enabled_res = toggle_nte_pak_mod(mods_dir, rel_id, true);
    assert!(enabled_res.is_ok());
    assert!(mod_dir.join("TestMod_P.pak").is_file());
    assert!(mod_dir.join("TestMod_P.ucas").is_file());
    assert!(!mod_dir.join("TestMod.pak").exists());

    let disabled_res = toggle_nte_pak_mod(mods_dir, rel_id, false);
    assert!(disabled_res.is_ok());
    assert!(mod_dir.join("TestMod.pak").is_file());
    assert!(mod_dir.join("TestMod.ucas").is_file());
    assert!(!mod_dir.join("TestMod_P.pak").exists());
}

#[test]
fn test_scan_nte_pak_mods() {
    let temp = tempdir().unwrap();
    let mods_dir = temp.path();

    let cat_dir = mods_dir.join("Characters");
    let mod1_dir = cat_dir.join("ModOne");
    fs::create_dir_all(&mod1_dir).unwrap();
    fs::write(mod1_dir.join("ModOne_P.pak"), "pak").unwrap();

    let uncat_dir = mods_dir.join("Uncategorized");
    let mod2_dir = uncat_dir.join("ModTwo");
    fs::create_dir_all(&mod2_dir).unwrap();
    fs::write(mod2_dir.join("ModTwo.pak"), "pak").unwrap();

    let mods = scan_nte_pak_mods(mods_dir).unwrap();
    assert_eq!(mods.len(), 2);

    let m1 = mods.iter().find(|m| m.name == "ModOne").unwrap();
    assert_eq!(m1.category, Some("Characters".to_string()));
    assert!(m1.enabled);

    let m2 = mods.iter().find(|m| m.name == "ModTwo").unwrap();
    assert_eq!(m2.category, None);
    assert!(!m2.enabled);
}

#[test]
fn test_nte_pak_loader_status_and_occupied_dlls() {
    let temp = tempdir().unwrap();
    let base = temp.path();
    let (win64_dir, _) = resolve_nte_pak_paths(base);
    fs::create_dir_all(&win64_dir).unwrap();

    fs::write(win64_dir.join("version.dll"), "optiscaler-binary-bytes").unwrap();

    let status = nte_pak_loader_status(base).unwrap();
    assert!(!status.asi_loader_installed);
    assert_eq!(status.asi_loader_dll, None);
    assert!(status.occupied_dlls.contains(&"version.dll".to_string()));

    let meta = NtePakLoaderMetadata {
        asi_loader_version: Some("v1.0.0".to_string()),
        asi_loader_dll: Some("dinput8.dll".to_string()),
        asi_loader_sha256: Some(compute_bytes_sha256(b"our-asi-bytes")),
        sig_bypasser_version: None,
        sig_bypasser_sha256: None,
        sig_bypasser_subpath: None,
    };
    write_loader_metadata(&win64_dir, &meta).unwrap();
    fs::write(win64_dir.join("dinput8.dll"), b"our-asi-bytes").unwrap();

    let status2 = nte_pak_loader_status(base).unwrap();
    assert!(status2.asi_loader_installed);
    assert_eq!(status2.asi_loader_dll, Some("dinput8.dll".to_string()));
    assert_eq!(status2.asi_loader_version, Some("v1.0.0".to_string()));
    assert!(status2.occupied_dlls.contains(&"version.dll".to_string()));
    assert!(!status2.occupied_dlls.contains(&"dinput8.dll".to_string()));

    let uninstall_res = uninstall_asi_loader(base);
    assert!(uninstall_res.is_ok());
    assert!(!win64_dir.join("dinput8.dll").exists());
    assert!(win64_dir.join("version.dll").is_file());

    let meta_after = read_loader_metadata(&win64_dir);
    assert_eq!(meta_after.asi_loader_dll, None);
    assert_eq!(meta_after.asi_loader_version, None);
    assert_eq!(meta_after.asi_loader_sha256, None);
}

#[test]
fn test_validate_safe_subpath() {
    assert_eq!(validate_safe_subpath("").unwrap(), PathBuf::new());
    assert_eq!(validate_safe_subpath(".").unwrap(), PathBuf::new());
    assert_eq!(
        validate_safe_subpath("plugins").unwrap(),
        PathBuf::from("plugins")
    );
    assert_eq!(
        validate_safe_subpath(r".\OptiScaler\plugins\").unwrap(),
        PathBuf::from("OptiScaler/plugins")
    );
    assert!(validate_safe_subpath("../plugins").is_err());
    assert!(validate_safe_subpath(r"..\..\escape").is_err());
}

#[test]
fn test_sig_bypasser_subpath_status_and_uninstall() {
    let temp = tempdir().unwrap();
    let base = temp.path();
    let (win64_dir, _) = resolve_nte_pak_paths(base);
    fs::create_dir_all(&win64_dir).unwrap();

    let sub_dir = win64_dir.join("OptiScaler/plugins");
    fs::create_dir_all(&sub_dir).unwrap();
    let asi_data = b"asi-plugin-payload";
    fs::write(sub_dir.join("UniversalSigBypasser.asi"), asi_data).unwrap();

    let meta = NtePakLoaderMetadata {
        asi_loader_version: None,
        asi_loader_dll: None,
        asi_loader_sha256: None,
        sig_bypasser_version: Some("v1.2".to_string()),
        sig_bypasser_sha256: Some(compute_bytes_sha256(asi_data)),
        sig_bypasser_subpath: Some("OptiScaler/plugins".to_string()),
    };
    write_loader_metadata(&win64_dir, &meta).unwrap();

    let status = nte_pak_loader_status(base).unwrap();
    assert!(status.sig_bypasser_installed);
    assert_eq!(status.sig_bypasser_version, Some("v1.2".to_string()));
    assert_eq!(
        status.sig_bypasser_subpath,
        Some("OptiScaler/plugins".to_string())
    );

    let uninstall_res = uninstall_sig_bypasser(base);
    assert!(uninstall_res.is_ok());
    assert!(!sub_dir.join("UniversalSigBypasser.asi").exists());

    let status_after = nte_pak_loader_status(base).unwrap();
    assert!(!status_after.sig_bypasser_installed);
    assert_eq!(status_after.sig_bypasser_subpath, None);
}
