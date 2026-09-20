pub mod categories;
pub mod config;
pub mod gamebanana;
pub mod keybinds;
pub mod mods;
pub mod nte_pak;

pub use categories::*;
pub use config::*;
pub use gamebanana::*;
pub use keybinds::*;
pub use mods::*;
pub use nte_pak::*;

use std::path::{Path, PathBuf};

pub(crate) fn effective_mods_dir(game_id: Option<&str>, dir: &str) -> PathBuf {
    if game_id == Some("ntepak") {
        crate::nte_pak::resolve_nte_pak_paths(Path::new(dir)).1
    } else {
        PathBuf::from(dir)
    }
}
