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

fn detect_zip_single_root(archive_path: &Path) -> Result<Option<String>, String> {
    let file = File::open(archive_path).map_err(|e| e.to_string())?;
    let mut zip = ZipArchive::new(BufReader::new(file)).map_err(|e| e.to_string())?;

    let mut common_root: Option<String> = None;

    for i in 0..zip.len() {
        let entry = zip.by_index(i).map_err(|e| e.to_string())?;
        let raw_name = entry.name().replace('\\', "/");
        let trimmed = raw_name.trim();

        if trimmed.starts_with("__MACOSX/") || trimmed.ends_with(".DS_Store") || trimmed.is_empty()
        {
            continue;
        }

        let parts: Vec<&str> = trimmed.split('/').filter(|p| !p.is_empty()).collect();
        if parts.is_empty() {
            continue;
        }

        if parts.len() == 1 && !entry.is_dir() {
            return Ok(None);
        }

        let root_dir = parts[0].to_string();
        match &common_root {
            None => common_root = Some(root_dir),
            Some(existing) => {
                if existing != &root_dir {
                    return Ok(None);
                }
            }
        }
    }

    Ok(common_root)
}

pub fn extract_zip(
    archive_path: &Path,
    target_parent_dir: &Path,
    default_mod_name: &str,
) -> Result<PathBuf, String> {
    let single_root = detect_zip_single_root(archive_path)?;
    let sanitized_name = sanitize_folder_name(default_mod_name);

    let (extract_target_dir, final_mod_dir) = match single_root {
        Some(root_name) => (
            target_parent_dir.to_path_buf(),
            target_parent_dir.join(&root_name),
        ),
        None => {
            let wrap_dir = target_parent_dir.join(&sanitized_name);
            (wrap_dir.clone(), wrap_dir)
        }
    };

    fs::create_dir_all(&extract_target_dir).map_err(|e| e.to_string())?;

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
            return Err(format!(
                "Unsafe path detected in zip archive: {}",
                entry_name
            ));
        }

        let out_path = extract_target_dir.join(rel_path);

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

    Ok(final_mod_dir)
}

pub fn extract_sevenz(
    archive_path: &Path,
    target_parent_dir: &Path,
    default_mod_name: &str,
) -> Result<PathBuf, String> {
    let sanitized_name = sanitize_folder_name(default_mod_name);
    let temp_dest = target_parent_dir.join(format!(".temp_extract_{}", sanitized_name));
    if temp_dest.exists() {
        let _ = fs::remove_dir_all(&temp_dest);
    }
    fs::create_dir_all(&temp_dest).map_err(|e| e.to_string())?;

    sevenz_rust::decompress_file(archive_path, &temp_dest).map_err(|e| e.to_string())?;

    let entries: Vec<_> = fs::read_dir(&temp_dest)
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            name != "__MACOSX" && name != ".DS_Store"
        })
        .collect();

    let final_dest = if entries.len() == 1 && entries[0].path().is_dir() {
        let single_dir = entries[0].path();
        let folder_name = single_dir
            .file_name()
            .unwrap()
            .to_string_lossy()
            .to_string();
        let dest = target_parent_dir.join(&folder_name);
        if dest.exists() {
            let _ = fs::remove_dir_all(&dest);
        }
        fs::rename(&single_dir, &dest).map_err(|e| e.to_string())?;
        let _ = fs::remove_dir_all(&temp_dest);
        dest
    } else {
        let dest = target_parent_dir.join(&sanitized_name);
        if dest.exists() {
            let _ = fs::remove_dir_all(&dest);
        }
        fs::rename(&temp_dest, &dest).map_err(|e| e.to_string())?;
        dest
    };

    Ok(final_dest)
}

pub fn extract_any_archive(
    archive_path: &Path,
    target_parent_dir: &Path,
    default_mod_name: &str,
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
        "zip" => extract_zip(archive_path, target_parent_dir, default_mod_name),
        "7z" => extract_sevenz(archive_path, target_parent_dir, default_mod_name),
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

        let extracted_dir = extract_zip(&zip_path, &dest_parent, "My Loose Mod").unwrap();
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

        let extracted_dir = extract_zip(&zip_path, &dest_parent, "Fallback Name").unwrap();
        assert_eq!(extracted_dir, dest_parent.join("PreWrappedMod"));
        assert!(extracted_dir.join("mod.ini").exists());
    }
}
