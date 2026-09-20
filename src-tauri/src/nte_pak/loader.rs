use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

pub const KNOWN_DLL_CANDIDATES: [&str; 18] = [
    "version.dll",
    "dinput8.dll",
    "dxgi.dll",
    "dsound.dll",
    "winmm.dll",
    "winhttp.dll",
    "wininet.dll",
    "d3d9.dll",
    "d3d10.dll",
    "d3d11.dll",
    "d3d12.dll",
    "binkw64.dll",
    "bink2w64.dll",
    "xinput1_1.dll",
    "xinput1_2.dll",
    "xinput1_3.dll",
    "xinput1_4.dll",
    "xinput9_1_0.dll",
];

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NtePakLoaderMetadata {
    pub asi_loader_version: Option<String>,
    pub asi_loader_dll: Option<String>,
    pub asi_loader_sha256: Option<String>,
    pub sig_bypasser_version: Option<String>,
    pub sig_bypasser_sha256: Option<String>,
    pub sig_bypasser_subpath: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NtePakLoaderStatus {
    pub asi_loader_installed: bool,
    pub asi_loader_version: Option<String>,
    pub asi_loader_dll: Option<String>,
    pub sig_bypasser_installed: bool,
    pub sig_bypasser_version: Option<String>,
    pub sig_bypasser_subpath: Option<String>,
    pub occupied_dlls: Vec<String>,
}

pub fn resolve_nte_pak_paths(game_dir: &Path) -> (PathBuf, PathBuf) {
    let ht_dir = if game_dir.join("Client/WindowsNoEditor/HT").exists() {
        game_dir.join("Client/WindowsNoEditor/HT")
    } else if game_dir.join("WindowsNoEditor/HT").exists() {
        game_dir.join("WindowsNoEditor/HT")
    } else if game_dir.join("HT").exists() {
        game_dir.join("HT")
    } else if game_dir.join("Binaries/Win64").exists() {
        game_dir.to_path_buf()
    } else {
        game_dir.join("Client/WindowsNoEditor/HT")
    };

    let win64_dir = ht_dir.join("Binaries/Win64");
    let mods_dir = ht_dir.join("Content/Paks/veil");
    (win64_dir, mods_dir)
}

fn loader_metadata_path(win64_dir: &Path) -> PathBuf {
    win64_dir.join(".veil_loader.json")
}

pub(super) fn read_loader_metadata(win64_dir: &Path) -> NtePakLoaderMetadata {
    let path = loader_metadata_path(win64_dir);
    if let Ok(content) = fs::read_to_string(&path)
        && let Ok(meta) = serde_json::from_str::<NtePakLoaderMetadata>(&content)
    {
        return meta;
    }
    NtePakLoaderMetadata::default()
}

pub(super) fn write_loader_metadata(
    win64_dir: &Path,
    meta: &NtePakLoaderMetadata,
) -> Result<(), String> {
    let path = loader_metadata_path(win64_dir);
    let serialized = serde_json::to_string_pretty(meta).map_err(|e| e.to_string())?;
    fs::write(&path, serialized).map_err(|e| e.to_string())?;
    Ok(())
}

pub(super) fn compute_file_sha256(path: &Path) -> Option<String> {
    let bytes = fs::read(path).ok()?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Some(hex::encode(hasher.finalize()))
}

pub(super) fn compute_bytes_sha256(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

pub fn validate_safe_subpath(raw: &str) -> Result<PathBuf, String> {
    let normalized = raw.trim().replace('\\', "/");
    let trimmed = normalized.trim_matches('/');
    if trimmed.is_empty() || trimmed == "." {
        return Ok(PathBuf::new());
    }

    let p = Path::new(trimmed);
    if !crate::archive::is_safe_path(p) {
        return Err(
            "Custom subdirectory path is invalid or attempts to escape the root directory"
                .to_string(),
        );
    }

    let mut sanitized_components = Vec::new();
    for comp in p.components() {
        if let std::path::Component::Normal(c) = comp {
            let s = c.to_string_lossy();
            if s == ".." || s == "." {
                return Err("Path traversal characters are not permitted".to_string());
            }
            sanitized_components.push(s.to_string());
        }
    }

    if sanitized_components.is_empty() {
        Ok(PathBuf::new())
    } else {
        Ok(sanitized_components.iter().collect())
    }
}

pub fn nte_pak_loader_status(game_dir: &Path) -> Result<NtePakLoaderStatus, String> {
    let (win64_dir, _) = resolve_nte_pak_paths(game_dir);
    let mut meta = read_loader_metadata(&win64_dir);

    let mut asi_installed = false;
    let mut asi_dll = None;

    if let Some(ref dll) = meta.asi_loader_dll {
        let dll_path = win64_dir.join(dll);
        if dll_path.is_file() {
            let current_hash = compute_file_sha256(&dll_path);
            if let (Some(expected), Some(actual)) = (&meta.asi_loader_sha256, &current_hash) {
                if expected == actual {
                    asi_installed = true;
                    asi_dll = Some(dll.clone());
                }
            } else if meta.asi_loader_sha256.is_none() {
                asi_installed = true;
                asi_dll = Some(dll.clone());
                meta.asi_loader_sha256 = current_hash;
                let _ = write_loader_metadata(&win64_dir, &meta);
            }
        }
    }

    let mut occupied_dlls = Vec::new();
    for candidate in KNOWN_DLL_CANDIDATES {
        let candidate_path = win64_dir.join(candidate);
        if candidate_path.is_file() {
            let is_our_asi = asi_installed && asi_dll.as_deref() == Some(candidate);
            if !is_our_asi {
                occupied_dlls.push(candidate.to_string());
            }
        }
    }

    let mut sig_installed = false;
    let sig_path = if let Some(ref sub) = meta.sig_bypasser_subpath {
        win64_dir.join(sub).join("UniversalSigBypasser.asi")
    } else {
        let root_asi = win64_dir.join("UniversalSigBypasser.asi");
        let plugins_asi = win64_dir.join("plugins/UniversalSigBypasser.asi");
        let opti_asi = win64_dir.join("OptiScaler/plugins/UniversalSigBypasser.asi");

        if root_asi.is_file() {
            root_asi
        } else if plugins_asi.is_file() {
            plugins_asi
        } else if opti_asi.is_file() {
            opti_asi
        } else {
            root_asi
        }
    };

    if sig_path.is_file() {
        let current_hash = compute_file_sha256(&sig_path);
        if let (Some(expected), Some(actual)) = (&meta.sig_bypasser_sha256, &current_hash) {
            if expected == actual {
                sig_installed = true;
            }
        } else if meta.sig_bypasser_sha256.is_none() && meta.sig_bypasser_version.is_some() {
            sig_installed = true;
            meta.sig_bypasser_sha256 = current_hash;
            let _ = write_loader_metadata(&win64_dir, &meta);
        }
    }

    Ok(NtePakLoaderStatus {
        asi_loader_installed: asi_installed,
        asi_loader_version: if asi_installed {
            meta.asi_loader_version
        } else {
            None
        },
        asi_loader_dll: asi_dll,
        sig_bypasser_installed: sig_installed,
        sig_bypasser_version: if sig_installed {
            meta.sig_bypasser_version
        } else {
            None
        },
        sig_bypasser_subpath: meta.sig_bypasser_subpath,
        occupied_dlls,
    })
}
