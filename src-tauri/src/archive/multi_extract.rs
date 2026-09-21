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
        sevenz_rust2::decompress_file(archive_path, temp_extract_dir).map_err(|e| e.to_string())
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

    let archive = match rars::ArchiveReader::read_path(archive_path) {
        Ok(archive) => archive,
        Err(err) => {
            let _ = fs::remove_dir_all(temp_extract_dir);
            return Err(err.to_string());
        }
    };

    let mut cancelled = false;
    let result = archive.extract_to(None, |meta| {
        if is_cancelled() {
            cancelled = true;
            return Err(rars::Error::Cancelled);
        }

        let entry_name = String::from_utf8_lossy(&meta.name).replace('\\', "/");
        let skipped_entry =
            entry_name.starts_with("__MACOSX/") || entry_name.ends_with(".DS_Store");

        if meta.is_directory || skipped_entry {
            return Ok(Box::new(std::io::sink()));
        }

        if !is_safe_path(Path::new(&entry_name)) {
            return Err(std::io::Error::other(format!(
                "Unsafe path detected in rar archive: {}",
                entry_name
            ))
            .into());
        }

        let out_path = temp_extract_dir.join(&entry_name);
        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent)?;
        }
        Ok(Box::new(fs::File::create(&out_path)?))
    });

    if let Err(err) = result {
        let _ = fs::remove_dir_all(temp_extract_dir);
        if cancelled {
            return Err("Download cancelled".to_string());
        }
        return Err(err.to_string());
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
