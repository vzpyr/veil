use std::fs;
use std::path::{Path, PathBuf};

pub const DISABLED_DIR_NAME: &str = "DISABLED_veil";
pub const ACTIVE_DIR_NAME: &str = "veil";

pub fn get_disabled_dir(mods_dir: &Path) -> PathBuf {
    mods_dir.join(DISABLED_DIR_NAME)
}

pub fn get_active_dir(mods_dir: &Path) -> PathBuf {
    mods_dir.join(ACTIVE_DIR_NAME)
}

pub fn ensure_veil_dirs(mods_dir: &Path) -> Result<(), String> {
    if !mods_dir.exists() {
        return Err(format!(
            "Mods directory does not exist: {}",
            mods_dir.display()
        ));
    }
    let disabled_dir = get_disabled_dir(mods_dir);
    let active_dir = get_active_dir(mods_dir);
    fs::create_dir_all(&disabled_dir).map_err(|err| err.to_string())?;
    fs::create_dir_all(&active_dir).map_err(|err| err.to_string())?;
    Ok(())
}

pub fn create_mod_symlink(source_path: &Path, target_path: &Path) -> Result<(), String> {
    if !source_path.exists() {
        return Err(format!(
            "Source directory does not exist: {}",
            source_path.display()
        ));
    }

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    if target_path.symlink_metadata().is_ok() {
        remove_mod_symlink(target_path)?;
    }

    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(source_path, target_path).map_err(|err| err.to_string())?;
    }

    #[cfg(windows)]
    {
        std::os::windows::fs::symlink_dir(source_path, target_path)
            .map_err(|err| err.to_string())?;
    }

    #[cfg(not(any(unix, windows)))]
    {
        return Err("Unsupported operating system for symbolic links".to_string());
    }

    Ok(())
}

pub fn remove_mod_symlink(target_path: &Path) -> Result<(), String> {
    let metadata = match target_path.symlink_metadata() {
        Ok(m) => m,
        Err(_) => return Ok(()),
    };

    if !metadata.file_type().is_symlink() {
        return Err(format!(
            "Target path is not a symbolic link: {}",
            target_path.display()
        ));
    }

    #[cfg(unix)]
    {
        fs::remove_file(target_path).map_err(|err| err.to_string())?;
    }

    #[cfg(windows)]
    {
        fs::remove_dir(target_path).map_err(|err| err.to_string())?;
    }

    #[cfg(not(any(unix, windows)))]
    {
        return Err("Unsupported operating system for symbolic links".to_string());
    }

    if let Some(parent) = target_path.parent() {
        if let Ok(mut entries) = fs::read_dir(parent) {
            if entries.next().is_none() {
                let _ = fs::remove_dir(parent);
            }
        }
    }

    Ok(())
}

pub fn is_symlink_valid(link_path: &Path) -> bool {
    match fs::read_link(link_path) {
        Ok(target) => target.exists(),
        Err(_) => false,
    }
}

pub fn prune_orphaned_symlinks(mods_dir: &Path) -> Result<usize, String> {
    let active_dir = get_active_dir(mods_dir);
    if !active_dir.exists() {
        return Ok(0);
    }

    let mut pruned_count = 0;
    prune_dir_recursive(&active_dir, &mut pruned_count)?;
    Ok(pruned_count)
}

fn prune_dir_recursive(current: &Path, count: &mut usize) -> Result<(), String> {
    let entries = match fs::read_dir(current) {
        Ok(e) => e,
        Err(err) => return Err(err.to_string()),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let meta = match path.symlink_metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if meta.file_type().is_symlink() {
            if !is_symlink_valid(&path) {
                let _ = remove_mod_symlink(&path);
                *count += 1;
            }
        } else if meta.is_dir() {
            prune_dir_recursive(&path, count)?;
            if let Ok(mut sub_entries) = fs::read_dir(&path) {
                if sub_entries.next().is_none() {
                    let _ = fs::remove_dir(&path);
                }
            }
        }
    }

    Ok(())
}
