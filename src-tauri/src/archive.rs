use std::fs::{self, File};
use std::io::{self, BufReader};
use std::path::{Component, Path, PathBuf};
use zip::ZipArchive;

pub fn sanitize_folder_name(name: &str) -> String {
    let mut sanitized = String::new();
    for c in name.chars() {
        if c == '/'
            || c == '\\'
            || c == ':'
            || c == '*'
            || c == '?'
            || c == '"'
            || c == '<'
            || c == '>'
            || c == '|'
        {
            sanitized.push('_');
        } else {
            sanitized.push(c);
        }
    }
    let trimmed = sanitized.trim().trim_matches('.').to_string();
    if trimmed.is_empty() {
        "unnamed_mod".to_string()
    } else {
        trimmed
    }
}

pub fn is_safe_path(path: &Path) -> bool {
    for component in path.components() {
        match component {
            Component::Normal(_) => {}
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => return false,
        }
    }
    true
}

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

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
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

fn move_dir_contents(src: &Path, dst: &Path) -> Result<(), String> {
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
) -> Result<PathBuf, String> {
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

pub fn extract_zip(
    archive_path: &Path,
    target_parent_dir: &Path,
    default_mod_name: &str,
    duplicate_action: &str,
) -> Result<PathBuf, String> {
    let temp_dest = target_parent_dir.join(format!(
        ".temp_extract_{}_{}",
        sanitize_folder_name(default_mod_name),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    ));
    if temp_dest.exists() {
        let _ = fs::remove_dir_all(&temp_dest);
    }
    fs::create_dir_all(&temp_dest).map_err(|e| e.to_string())?;

    let file = File::open(archive_path).map_err(|e| e.to_string())?;
    let mut zip = ZipArchive::new(BufReader::new(file)).map_err(|e| e.to_string())?;

    for i in 0..zip.len() {
        let mut entry = zip.by_index(i).map_err(|e| e.to_string())?;
        let entry_name = entry.name().replace('\\', "/");

        if entry_name.starts_with("__MACOSX/") || entry_name.ends_with(".DS_Store") {
            continue;
        }

        let rel_path = Path::new(&entry_name);
        if !is_safe_path(rel_path) {
            let _ = fs::remove_dir_all(&temp_dest);
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

    finalize_extracted_content(
        &temp_dest,
        target_parent_dir,
        default_mod_name,
        duplicate_action,
    )
}

pub fn extract_sevenz(
    archive_path: &Path,
    target_parent_dir: &Path,
    default_mod_name: &str,
    duplicate_action: &str,
) -> Result<PathBuf, String> {
    let temp_dest = target_parent_dir.join(format!(
        ".temp_extract_{}_{}",
        sanitize_folder_name(default_mod_name),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    ));
    if temp_dest.exists() {
        let _ = fs::remove_dir_all(&temp_dest);
    }
    fs::create_dir_all(&temp_dest).map_err(|e| e.to_string())?;

    sevenz_rust::decompress_file(archive_path, &temp_dest).map_err(|e| e.to_string())?;

    finalize_extracted_content(
        &temp_dest,
        target_parent_dir,
        default_mod_name,
        duplicate_action,
    )
}

pub fn extract_any_archive(
    archive_path: &Path,
    target_parent_dir: &Path,
    default_mod_name: &str,
    duplicate_action: &str,
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
            target_parent_dir,
            default_mod_name,
            duplicate_action,
        ),
        "7z" => extract_sevenz(
            archive_path,
            target_parent_dir,
            default_mod_name,
            duplicate_action,
        ),
        _ => Err(format!("Unsupported archive format: .{}", ext)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
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

        let extracted_dir =
            extract_zip(&zip_path, &dest_parent, "My Loose Mod", "replace").unwrap();
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

        let extracted_dir =
            extract_zip(&zip_path, &dest_parent, "Fallback Name", "replace").unwrap();
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

        let extracted_dir =
            extract_zip(&zip_path, &dest_parent, "Duplicate Mod", "keep_both").unwrap();
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

        let extracted_dir = extract_zip(&zip_path, &dest_parent, "Replace Mod", "replace").unwrap();
        assert_eq!(extracted_dir, dest_parent.join("Replace Mod"));
        assert!(extracted_dir.join("mod.ini").exists());
        assert!(extracted_dir.join("preview.png").exists());
        assert!(!extracted_dir.join("old_obsolete.txt").exists());
    }
}
