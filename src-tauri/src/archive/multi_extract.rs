use super::fs_ops::finalize_extracted_content;
use super::path::is_safe_path;
use std::fs;
use std::path::{Path, PathBuf};

pub fn extract_sevenz(
    archive_path: &Path,
    temp_extract_dir: &Path,
    target_parent_dir: &Path,
    default_mod_name: &str,
    duplicate_action: &str,
    is_cancelled: &dyn Fn() -> bool,
) -> Result<PathBuf, String> {
    if temp_extract_dir.exists() {
        let _ = fs::remove_dir_all(temp_extract_dir);
    }
    fs::create_dir_all(temp_extract_dir).map_err(|e| e.to_string())?;

    if is_cancelled() {
        let _ = fs::remove_dir_all(temp_extract_dir);
        return Err("Download cancelled".to_string());
    }

    if let Err(err) =
        sevenz_rust::decompress_file(archive_path, temp_extract_dir).map_err(|e| e.to_string())
    {
        let _ = fs::remove_dir_all(temp_extract_dir);
        return Err(err);
    }

    if is_cancelled() {
        let _ = fs::remove_dir_all(temp_extract_dir);
        return Err("Download cancelled".to_string());
    }

    match finalize_extracted_content(
        temp_extract_dir,
        target_parent_dir,
        default_mod_name,
        duplicate_action,
        is_cancelled,
    ) {
        Ok(dir) => Ok(dir),
        Err(err) => {
            let _ = fs::remove_dir_all(temp_extract_dir);
            Err(err)
        }
    }
}

pub fn extract_rar(
    archive_path: &Path,
    temp_extract_dir: &Path,
    target_parent_dir: &Path,
    default_mod_name: &str,
    duplicate_action: &str,
    is_cancelled: &dyn Fn() -> bool,
) -> Result<PathBuf, String> {
    if temp_extract_dir.exists() {
        let _ = fs::remove_dir_all(temp_extract_dir);
    }
    fs::create_dir_all(temp_extract_dir).map_err(|e| e.to_string())?;

    if is_cancelled() {
        let _ = fs::remove_dir_all(temp_extract_dir);
        return Err("Download cancelled".to_string());
    }

    let mut archive = unrar::Archive::new(archive_path)
        .open_for_processing()
        .map_err(|e| e.to_string())?;

    loop {
        if is_cancelled() {
            let _ = fs::remove_dir_all(temp_extract_dir);
            return Err("Download cancelled".to_string());
        }

        let result = archive.read_header().map_err(|e| {
            let _ = fs::remove_dir_all(temp_extract_dir);
            e.to_string()
        });

        match result {
            Ok(Some(header)) => {
                let entry_name = header.entry().filename.to_string_lossy().replace('\\', "/");
                let is_dir = header.entry().is_directory();
                let skipped_entry =
                    entry_name.starts_with("__MACOSX/") || entry_name.ends_with(".DS_Store");

                if !is_dir && !skipped_entry && !is_safe_path(Path::new(&entry_name)) {
                    let _ = fs::remove_dir_all(temp_extract_dir);
                    return Err(format!(
                        "Unsafe path detected in rar archive: {}",
                        entry_name
                    ));
                }

                match if is_dir || skipped_entry {
                    header.skip().map_err(|e| e.to_string())
                } else {
                    header
                        .extract_with_base(temp_extract_dir)
                        .map_err(|e| e.to_string())
                } {
                    Ok(next) => archive = next,
                    Err(err) => {
                        let _ = fs::remove_dir_all(temp_extract_dir);
                        return Err(err);
                    }
                }
            }
            Ok(None) => break,
            Err(err) => {
                let _ = fs::remove_dir_all(temp_extract_dir);
                return Err(err);
            }
        }
    }

    if is_cancelled() {
        let _ = fs::remove_dir_all(temp_extract_dir);
        return Err("Download cancelled".to_string());
    }

    match finalize_extracted_content(
        temp_extract_dir,
        target_parent_dir,
        default_mod_name,
        duplicate_action,
        is_cancelled,
    ) {
        Ok(dir) => Ok(dir),
        Err(err) => {
            let _ = fs::remove_dir_all(temp_extract_dir);
            Err(err)
        }
    }
}
