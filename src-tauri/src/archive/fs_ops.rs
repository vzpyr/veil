use super::path::sanitize_folder_name;
use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};

pub fn clean_folder_for_replacement(folder: &Path) -> Result<(), String> {
    if !folder.exists() {
        return Ok(());
    }
    let entries = fs::read_dir(folder).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if file_name.starts_with("preview.") || file_name == ".veil.json" {
            continue;
        }
        if path.is_file() {
            let _ = fs::remove_file(&path);
        } else if path.is_dir() {
            let _ = fs::remove_dir_all(&path);
        }
    }
    Ok(())
}

pub fn resolve_destination_folder(
    target_parent_dir: &Path,
    sanitized_name: &str,
    duplicate_action: &str,
) -> PathBuf {
    let primary = target_parent_dir.join(sanitized_name);
    if duplicate_action == "keep_both" {
        if !primary.exists() {
            return primary;
        }
        let mut i = 1;
        loop {
            let candidate = target_parent_dir.join(format!("{} ({})", sanitized_name, i));
            if !candidate.exists() {
                return candidate;
            }
            i += 1;
        }
    }
    primary
}

pub fn reserve_temp_paths(
    temp_dir: &Path,
    sanitized_name: &str,
    archive_ext: &str,
) -> Result<(PathBuf, PathBuf, File), String> {
    let mut index: u64 = 0;
    loop {
        let stem = if index == 0 {
            sanitized_name.to_string()
        } else {
            format!("{} ({})", sanitized_name, index)
        };
        let archive_path = temp_dir.join(format!("{}.{}", stem, archive_ext));
        let extract_dir = temp_dir.join(&stem);
        match fs::create_dir(&extract_dir) {
            Ok(()) => {}
            Err(err) if err.kind() == io::ErrorKind::AlreadyExists => {
                index += 1;
                continue;
            }
            Err(err) => return Err(err.to_string()),
        }
        match fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&archive_path)
        {
            Ok(file) => return Ok((archive_path, extract_dir, file)),
            Err(err) if err.kind() == io::ErrorKind::AlreadyExists => {
                let _ = fs::remove_dir(&extract_dir);
                index += 1;
            }
            Err(err) => {
                let _ = fs::remove_dir(&extract_dir);
                return Err(err.to_string());
            }
        }
    }
}

pub fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())?.flatten() {
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub fn move_dir_contents(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())?.flatten() {
        let src_path = entry.path();
        let file_name = entry.file_name();
        let dst_path = dst.join(&file_name);

        if dst_path.exists() {
            if dst_path.is_dir() {
                let _ = fs::remove_dir_all(&dst_path);
            } else {
                let _ = fs::remove_file(&dst_path);
            }
        }

        if fs::rename(&src_path, &dst_path).is_err() {
            if src_path.is_dir() {
                copy_dir_recursive(&src_path, &dst_path)?;
                let _ = fs::remove_dir_all(&src_path);
            } else {
                fs::copy(&src_path, &dst_path).map_err(|e| e.to_string())?;
                let _ = fs::remove_file(&src_path);
            }
        }
    }
    Ok(())
}

pub fn finalize_extracted_content(
    temp_extract_dir: &Path,
    target_parent_dir: &Path,
    default_mod_name: &str,
    duplicate_action: &str,
    is_cancelled: &dyn Fn() -> bool,
) -> Result<PathBuf, String> {
    if is_cancelled() {
        return Err("Download cancelled".to_string());
    }

    let sanitized_name = sanitize_folder_name(default_mod_name);
    let final_dest =
        resolve_destination_folder(target_parent_dir, &sanitized_name, duplicate_action);

    if duplicate_action == "replace" && final_dest.exists() {
        clean_folder_for_replacement(&final_dest)?;
    } else {
        fs::create_dir_all(&final_dest).map_err(|e| e.to_string())?;
    }

    let entries: Vec<_> = fs::read_dir(temp_extract_dir)
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            name != "__MACOSX" && name != ".DS_Store"
        })
        .collect();

    let content_source = if entries.len() == 1 && entries[0].path().is_dir() {
        entries[0].path()
    } else {
        temp_extract_dir.to_path_buf()
    };

    move_dir_contents(&content_source, &final_dest)?;
    let _ = fs::remove_dir_all(temp_extract_dir);
    Ok(final_dest)
}
