use std::fs::{self, File};
use std::io::{self, BufReader};
use std::path::{Component, Path, PathBuf};
use zip::ZipArchive;

const WINDOWS_RESERVED: [&str; 22] = [
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

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
        return "unnamed_mod".to_string();
    }
    let dot = trimmed.find('.').unwrap_or(trimmed.len());
    let stem = &trimmed[..dot];
    if WINDOWS_RESERVED.contains(&stem.to_ascii_uppercase().as_str()) {
        return format!("{}_{}", stem, &trimmed[dot..]);
    }
    trimmed
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

        let result = archive
            .read_header()
            .map_err(|e| {
                let _ = fs::remove_dir_all(temp_extract_dir);
                e.to_string()
            });

        match result {
            Ok(Some(header)) => {
                let entry_name = header
                    .entry()
                    .filename
                    .to_string_lossy()
                    .replace('\\', "/");
                let is_dir = header.entry().is_directory();
                let skipped_entry = entry_name.starts_with("__MACOSX/")
                    || entry_name.ends_with(".DS_Store");

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
