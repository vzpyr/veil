pub mod fs_ops;
pub mod multi_extract;
pub mod path;
pub mod zip_extractor;

pub use fs_ops::{
    clean_folder_for_replacement, finalize_extracted_content, move_dir_contents,
    reserve_temp_paths, resolve_destination_folder,
};
pub use multi_extract::{extract_rar, extract_sevenz};
pub use path::{is_safe_path, sanitize_folder_name};
pub use zip_extractor::extract_zip;

use std::path::{Path, PathBuf};

pub fn extract_any_archive(
    archive_path: &Path,
    temp_extract_dir: &Path,
    target_parent_dir: &Path,
    default_mod_name: &str,
    duplicate_action: &str,
    is_cancelled: &dyn Fn() -> bool,
) -> Result<PathBuf, String> {
    if !archive_path.exists() {
        return Err(format!(
            "Archive file does not exist: {}",
            archive_path.display()
        ));
    }

    let ext = archive_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "zip" => extract_zip(
            archive_path,
            temp_extract_dir,
            target_parent_dir,
            default_mod_name,
            duplicate_action,
            is_cancelled,
        ),
        "7z" => extract_sevenz(
            archive_path,
            temp_extract_dir,
            target_parent_dir,
            default_mod_name,
            duplicate_action,
            is_cancelled,
        ),
        "rar" => extract_rar(
            archive_path,
            temp_extract_dir,
            target_parent_dir,
            default_mod_name,
            duplicate_action,
            is_cancelled,
        ),
        _ => Err(format!("Unsupported archive format: .{}", ext)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;
    use tempfile::tempdir;
    use zip::write::SimpleFileOptions;

    #[test]
    fn test_sanitize_folder_name() {
        assert_eq!(sanitize_folder_name("Cool:Mod*Name?"), "Cool_Mod_Name_");
        assert_eq!(sanitize_folder_name("..."), "unnamed_mod");
        assert_eq!(sanitize_folder_name("Jane Doe Outfit"), "Jane Doe Outfit");
    }

    #[test]
    fn test_is_safe_path() {
        assert!(is_safe_path(Path::new("textures/diffuse.dds")));
        assert!(is_safe_path(Path::new("mod.ini")));
        assert!(!is_safe_path(Path::new("../secret.txt")));
        assert!(!is_safe_path(Path::new("/root/danger")));
    }

    #[test]
    fn test_extract_zip_loose_files() {
        let temp = tempdir().unwrap();
        let zip_path = temp.path().join("loose.zip");
        let dest_parent = temp.path().join("mods");
        fs::create_dir_all(&dest_parent).unwrap();

        {
            let file = File::create(&zip_path).unwrap();
            let mut zip = zip::ZipWriter::new(file);
            let options = SimpleFileOptions::default();
            zip.start_file("mod.ini", options).unwrap();
            zip.write_all(b"hash = 12345678\n").unwrap();
            zip.finish().unwrap();
        }

        let extracted_dir = extract_zip(
            &zip_path,
            &temp.path().join("extract"),
            &dest_parent,
            "My Loose Mod",
            "replace",
            &|| false,
        )
        .unwrap();
        assert_eq!(extracted_dir, dest_parent.join("My Loose Mod"));
        assert!(extracted_dir.join("mod.ini").exists());
        let content = fs::read_to_string(extracted_dir.join("mod.ini")).unwrap();
        assert!(content.contains("12345678"));
    }

    #[test]
    fn test_extract_zip_with_root_folder() {
        let temp = tempdir().unwrap();
        let zip_path = temp.path().join("contained.zip");
        let dest_parent = temp.path().join("mods");
        fs::create_dir_all(&dest_parent).unwrap();

        {
            let file = File::create(&zip_path).unwrap();
            let mut zip = zip::ZipWriter::new(file);
            let options = SimpleFileOptions::default();
            zip.start_file("PreWrappedMod/mod.ini", options).unwrap();
            zip.write_all(b"hash = 87654321\n").unwrap();
            zip.finish().unwrap();
        }

        let extracted_dir = extract_zip(
            &zip_path,
            &temp.path().join("extract"),
            &dest_parent,
            "Fallback Name",
            "replace",
            &|| false,
        )
        .unwrap();
        assert_eq!(extracted_dir, dest_parent.join("Fallback Name"));
        assert!(extracted_dir.join("mod.ini").exists());
    }

    #[test]
    fn test_extract_zip_keep_both() {
        let temp = tempdir().unwrap();
        let zip_path = temp.path().join("dup.zip");
        let dest_parent = temp.path().join("mods");
        fs::create_dir_all(&dest_parent).unwrap();

        let existing_mod = dest_parent.join("Duplicate Mod");
        fs::create_dir_all(&existing_mod).unwrap();
        fs::write(existing_mod.join("old.txt"), "old content").unwrap();

        {
            let file = File::create(&zip_path).unwrap();
            let mut zip = zip::ZipWriter::new(file);
            let options = SimpleFileOptions::default();
            zip.start_file("mod.ini", options).unwrap();
            zip.write_all(b"hash = 99999999\n").unwrap();
            zip.finish().unwrap();
        }

        let extracted_dir = extract_zip(
            &zip_path,
            &temp.path().join("extract"),
            &dest_parent,
            "Duplicate Mod",
            "keep_both",
            &|| false,
        )
        .unwrap();
        assert_eq!(extracted_dir, dest_parent.join("Duplicate Mod (1)"));
        assert!(extracted_dir.join("mod.ini").exists());
        assert!(existing_mod.join("old.txt").exists());
    }

    #[test]
    fn test_extract_zip_replace() {
        let temp = tempdir().unwrap();
        let zip_path = temp.path().join("replace.zip");
        let dest_parent = temp.path().join("mods");
        fs::create_dir_all(&dest_parent).unwrap();

        let existing_mod = dest_parent.join("Replace Mod");
        fs::create_dir_all(&existing_mod).unwrap();
        fs::write(existing_mod.join("old_obsolete.txt"), "obsolete").unwrap();
        fs::write(existing_mod.join("preview.png"), "pngbytes").unwrap();

        {
            let file = File::create(&zip_path).unwrap();
            let mut zip = zip::ZipWriter::new(file);
            let options = SimpleFileOptions::default();
            zip.start_file("mod.ini", options).unwrap();
            zip.write_all(b"hash = 11112222\n").unwrap();
            zip.finish().unwrap();
        }

        let extracted_dir = extract_zip(
            &zip_path,
            &temp.path().join("extract"),
            &dest_parent,
            "Replace Mod",
            "replace",
            &|| false,
        )
        .unwrap();
        assert_eq!(extracted_dir, dest_parent.join("Replace Mod"));
        assert!(extracted_dir.join("mod.ini").exists());
        assert!(extracted_dir.join("preview.png").exists());
        assert!(!extracted_dir.join("old_obsolete.txt").exists());
    }

    #[test]
    fn test_sanitize_folder_name_reserved() {
        assert_eq!(sanitize_folder_name("CON"), "CON_");
        assert_eq!(sanitize_folder_name("lpt3"), "lpt3_");
        assert_eq!(sanitize_folder_name("CON.txt"), "CON_.txt");
        assert_eq!(sanitize_folder_name("Console"), "Console");
        assert_eq!(sanitize_folder_name("CON (1)"), "CON (1)");
    }

    #[test]
    fn test_reserve_temp_paths_suffixes_atomically() {
        let temp = tempdir().unwrap();
        let base = temp.path();

        let (archive, extract, _file) = reserve_temp_paths(base, "Nicole", "zip").unwrap();
        assert_eq!(archive.file_name().unwrap(), "Nicole.zip");
        assert_eq!(extract.file_name().unwrap(), "Nicole");

        let (archive_1, extract_1, _file_1) = reserve_temp_paths(base, "Nicole", "zip").unwrap();
        assert_eq!(archive_1.file_name().unwrap(), "Nicole (1).zip");
        assert_eq!(extract_1.file_name().unwrap(), "Nicole (1)");

        let (archive_2, extract_2, _file_2) = reserve_temp_paths(base, "Nicole", "7z").unwrap();
        assert_eq!(archive_2.file_name().unwrap(), "Nicole (2).7z");
        assert_eq!(extract_2.file_name().unwrap(), "Nicole (2)");
    }

    #[test]
    fn test_extract_zip_failure_cleans_temp_dir() {
        let temp = tempdir().unwrap();
        let zip_path = temp.path().join("corrupt.zip");
        fs::write(&zip_path, b"this is not a zip archive").unwrap();
        let dest_parent = temp.path().join("mods");
        fs::create_dir_all(&dest_parent).unwrap();
        let temp_extract = temp.path().join("extract");

        let result = extract_zip(
            &zip_path,
            &temp_extract,
            &dest_parent,
            "Broken Mod",
            "replace",
            &|| false,
        );

        assert!(result.is_err());
        assert!(!temp_extract.exists());
    }

    #[test]
    fn test_extract_zip_cancel_cleans_temp_dir() {
        let temp = tempdir().unwrap();
        let zip_path = temp.path().join("two-files.zip");
        let dest_parent = temp.path().join("mods");
        fs::create_dir_all(&dest_parent).unwrap();

        {
            let file = File::create(&zip_path).unwrap();
            let mut zip = zip::ZipWriter::new(file);
            let options = SimpleFileOptions::default();
            zip.start_file("a.ini", options).unwrap();
            zip.write_all(b"hash = 1").unwrap();
            zip.start_file("b.ini", options).unwrap();
            zip.write_all(b"hash = 2").unwrap();
            zip.finish().unwrap();
        }

        let checks = std::cell::Cell::new(0);
        let is_cancelled = || {
            checks.set(checks.get() + 1);
            checks.get() > 1
        };

        let temp_extract = temp.path().join("extract");
        let result = extract_zip(
            &zip_path,
            &temp_extract,
            &dest_parent,
            "Cancelled Mod",
            "replace",
            &is_cancelled,
        );

        assert!(matches!(result, Err(err) if err.contains("cancelled")));
        assert!(!temp_extract.exists());
        assert!(!dest_parent.join("Cancelled Mod").exists());
    }
}
