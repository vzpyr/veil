use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

#[derive(Default)]
pub struct CancelRegistry(Mutex<HashSet<String>>);

impl CancelRegistry {
    pub fn cancel(&self, key: &str) {
        self.0.lock().unwrap().insert(key.to_string());
    }

    pub fn is_cancelled(&self, key: &str) -> bool {
        self.0.lock().unwrap().contains(key)
    }

    pub fn clear(&self, key: &str) {
        self.0.lock().unwrap().remove(key);
    }
}

pub fn clear_temp_artifacts(mods_dir: &Path) {
    let _ = fs::remove_dir_all(mods_dir.join(".veil_temp"));
}

#[derive(Default)]
pub struct TempRegistry(Mutex<HashMap<String, (PathBuf, PathBuf)>>);

impl TempRegistry {
    pub fn register(&self, key: &str, archive_path: PathBuf, extract_dir: PathBuf) {
        self.0
            .lock()
            .unwrap()
            .insert(key.to_string(), (archive_path, extract_dir));
    }

    pub fn take(&self, key: &str) -> Option<(PathBuf, PathBuf)> {
        self.0.lock().unwrap().remove(key)
    }
}

pub(super) struct TempGuard<'a> {
    pub(super) key: &'a str,
    pub(super) registry: &'a TempRegistry,
}

impl Drop for TempGuard<'_> {
    fn drop(&mut self) {
        self.registry.take(self.key);
    }
}

pub fn clear_temp_paths(archive_path: &Path, extract_dir: &Path) {
    let _ = fs::remove_file(archive_path);
    let _ = fs::remove_dir_all(extract_dir);
    if let Some(parent) = archive_path.parent() {
        let _ = fs::remove_dir(parent);
    }
}
