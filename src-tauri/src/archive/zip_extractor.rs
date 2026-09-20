use super::fs_ops::finalize_extracted_content;
use super::path::is_safe_path;
use std::fs::{self, File};
use std::io::{self, BufReader};
use std::path::{Path, PathBuf};
use zip::ZipArchive;

fn unzip_into(
    archive_path: &Path,
    temp_dest: &Path,
    is_cancelled: &dyn Fn() -> bool,
) -> Result<(), String> {
    let file = File::open(archive_path).map_err(|e| e.to_string())?;
    let mut zip = ZipArchive::new(BufReader::new(file)).map_err(|e| e.to_string())?;

    for i in 0..zip.len() {
        if is_cancelled() {
            return Err("Download cancelled".to_string());
        }

        let mut entry = zip.by_index(i).map_err(|e| e.to_string())?;
        let entry_name = entry.name().replace('\\', "/");

        if entry_name.starts_with("__MACOSX/") || entry_name.ends_with(".DS_Store") {
            continue;
        }

        let rel_path = Path::new(&entry_name);
        if !is_safe_path(rel_path) {
            return Err(format!(
                "Unsafe path detected in zip archive: {}",
                entry_name
            ));
        }

        let out_path = temp_dest.join(rel_path);

        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut outfile = File::create(&out_path).map_err(|e| e.to_string())?;
            io::copy(&mut entry, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub fn extract_zip(
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

    if let Err(err) = unzip_into(archive_path, temp_extract_dir, is_cancelled) {
        let _ = fs::remove_dir_all(temp_extract_dir);
        return Err(err);
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
