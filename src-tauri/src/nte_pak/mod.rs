mod categories;
mod loader;
mod loader_install;
mod mod_ops;
mod mods;
mod releases;
#[cfg(test)]
mod tests;

pub use categories::{
    create_nte_pak_category, delete_nte_pak_category, list_nte_pak_categories,
    rename_nte_pak_category,
};
pub use loader::{
    KNOWN_DLL_CANDIDATES, NtePakLoaderMetadata, NtePakLoaderStatus, nte_pak_loader_status,
    resolve_nte_pak_paths, validate_safe_subpath,
};
pub use loader_install::{
    install_asi_loader, install_sig_bypasser, uninstall_asi_loader, uninstall_sig_bypasser,
};
pub use mod_ops::{delete_nte_pak_mod, move_nte_pak_mod_category, toggle_nte_pak_mod};
pub use mods::{postprocess_nte_pak_extracted_mod, scan_nte_pak_mods};
pub use releases::{LoaderRelease, fetch_asi_loader_releases, fetch_sig_bypasser_releases};

use std::fs;
use std::path::Path;

const COMPANION_EXTENSIONS: [&str; 4] = ["pak", "ucas", "utoc", "sig"];

fn is_dir_empty_or_hidden(dir: &Path) -> bool {
    match fs::read_dir(dir) {
        Ok(mut entries) => entries.all(|e| {
            if let Ok(entry) = e {
                entry.file_name().to_string_lossy().starts_with('.')
            } else {
                true
            }
        }),
        Err(_) => false,
    }
}
