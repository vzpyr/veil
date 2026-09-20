use crate::archive::sanitize_folder_name;
use crate::scanner::{CategoryItem, ModItem};
use crate::symlink::UNCATEGORIZED_DIR_NAME;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Cursor, Read};
use std::path::{Path, PathBuf};
use zip::ZipArchive;

const COMPANION_EXTENSIONS: [&str; 4] = ["pak", "ucas", "utoc", "sig"];

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoaderRelease {
    pub tag_name: String,
    pub download_url: String,
}

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

fn extract_tags_from_atom(atom_xml: &str) -> Vec<String> {
    let mut tags = Vec::new();
    let marker = "releases/tag/";
    let mut search_pos = 0;

    while let Some(start_idx) = atom_xml[search_pos..].find(marker) {
        let abs_start = search_pos + start_idx + marker.len();
        let rem = &atom_xml[abs_start..];
        let end_idx = rem
            .find('"')
            .or_else(|| rem.find('\''))
            .unwrap_or(rem.len());
        let raw_tag = &rem[..end_idx].trim();
        if !raw_tag.is_empty() && !tags.iter().any(|t| t == raw_tag) {
            tags.push(raw_tag.to_string());
        }
        search_pos = abs_start + end_idx;
    }

    tags
}

pub async fn fetch_asi_loader_releases() -> Result<Vec<LoaderRelease>, String> {
    let client = Client::builder()
        .user_agent("Veil/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let url = "https://github.com/ThirteenAG/Ultimate-ASI-Loader/releases.atom";
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    let body = resp.text().await.map_err(|e| e.to_string())?;

    let tags = extract_tags_from_atom(&body);
    let mut result = Vec::new();

    result.push(LoaderRelease {
        tag_name: "Latest".to_string(),
        download_url:
            "https://github.com/ThirteenAG/Ultimate-ASI-Loader/releases/latest/download/Ultimate-ASI-Loader_x64.zip"
                .to_string(),
    });

    for tag in tags {
        let download_url = format!(
            "https://github.com/ThirteenAG/Ultimate-ASI-Loader/releases/download/{}/Ultimate-ASI-Loader_x64.zip",
            tag
        );
        result.push(LoaderRelease {
            tag_name: tag,
            download_url,
        });
    }

    Ok(result)
}

pub async fn fetch_sig_bypasser_releases() -> Result<Vec<LoaderRelease>, String> {
    let client = Client::builder()
        .user_agent("Veil/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let url = "https://github.com/rm-NoobInCoding/UniversalSigBypasser/releases.atom";
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    let body = resp.text().await.map_err(|e| e.to_string())?;

    let tags = extract_tags_from_atom(&body);
    let mut result = Vec::new();

    result.push(LoaderRelease {
        tag_name: "Latest".to_string(),
        download_url: "https://github.com/rm-NoobInCoding/UniversalSigBypasser/releases/latest"
            .to_string(),
    });

    for tag in tags {
        let clean_tag = tag.trim_start_matches('v');
        let download_url = format!(
            "https://github.com/rm-NoobInCoding/UniversalSigBypasser/releases/download/{}/SigBypasser_v{}.zip",
            tag, clean_tag
        );
        result.push(LoaderRelease {
            tag_name: tag,
            download_url,
        });
    }

    Ok(result)
}

fn loader_metadata_path(win64_dir: &Path) -> PathBuf {
    win64_dir.join(".veil_loader.json")
}

fn read_loader_metadata(win64_dir: &Path) -> NtePakLoaderMetadata {
    let path = loader_metadata_path(win64_dir);
    if let Ok(content) = fs::read_to_string(&path)
        && let Ok(meta) = serde_json::from_str::<NtePakLoaderMetadata>(&content)
    {
        return meta;
    }
    NtePakLoaderMetadata::default()
}

fn write_loader_metadata(win64_dir: &Path, meta: &NtePakLoaderMetadata) -> Result<(), String> {
    let path = loader_metadata_path(win64_dir);
    let serialized = serde_json::to_string_pretty(meta).map_err(|e| e.to_string())?;
    fs::write(&path, serialized).map_err(|e| e.to_string())?;
    Ok(())
}

use sha2::{Digest, Sha256};

fn compute_file_sha256(path: &Path) -> Option<String> {
    let bytes = fs::read(path).ok()?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Some(hex::encode(hasher.finalize()))
}

fn compute_bytes_sha256(bytes: &[u8]) -> String {
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

pub async fn install_asi_loader(
    game_dir: &Path,
    download_url: &str,
    version: &str,
    dll_name: &str,
) -> Result<(), String> {
    let (win64_dir, _) = resolve_nte_pak_paths(game_dir);
    fs::create_dir_all(&win64_dir).map_err(|e| e.to_string())?;

    let mut meta = read_loader_metadata(&win64_dir);
    let target_dll_path = win64_dir.join(dll_name);

    if target_dll_path.is_file() {
        let is_our_managed = meta.asi_loader_dll.as_deref() == Some(dll_name)
            && meta.asi_loader_sha256.as_deref()
                == compute_file_sha256(&target_dll_path).as_deref();

        if !is_our_managed {
            return Err(format!(
                "{} already exists and is in use by another tool (such as OptiScaler). Please select a different DLL name.",
                dll_name
            ));
        }
    }

    let client = Client::builder()
        .user_agent("Veil/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(download_url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    let cursor = Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor).map_err(|e| e.to_string())?;

    let mut dll_bytes = Vec::new();
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_ascii_lowercase();
        if name.ends_with(".dll") {
            entry
                .read_to_end(&mut dll_bytes)
                .map_err(|e| e.to_string())?;
            break;
        }
    }

    if dll_bytes.is_empty() {
        return Err("No DLL file found in Ultimate ASI Loader archive".to_string());
    }

    let sha256 = compute_bytes_sha256(&dll_bytes);
    fs::write(&target_dll_path, dll_bytes).map_err(|e| e.to_string())?;

    meta.asi_loader_version = Some(version.to_string());
    meta.asi_loader_dll = Some(dll_name.to_string());
    meta.asi_loader_sha256 = Some(sha256);
    write_loader_metadata(&win64_dir, &meta)?;

    Ok(())
}

pub fn uninstall_asi_loader(game_dir: &Path) -> Result<(), String> {
    let (win64_dir, _) = resolve_nte_pak_paths(game_dir);
    let mut meta = read_loader_metadata(&win64_dir);

    if let Some(ref dll) = meta.asi_loader_dll {
        let dll_path = win64_dir.join(dll);
        if dll_path.is_file() {
            let current_hash = compute_file_sha256(&dll_path);
            let should_remove = match (&meta.asi_loader_sha256, &current_hash) {
                (Some(expected), Some(actual)) => expected == actual,
                (None, _) => true,
                _ => false,
            };

            if should_remove {
                let _ = fs::remove_file(&dll_path);
            }
        }
    }

    meta.asi_loader_version = None;
    meta.asi_loader_dll = None;
    meta.asi_loader_sha256 = None;
    write_loader_metadata(&win64_dir, &meta)?;

    Ok(())
}

pub async fn install_sig_bypasser(
    game_dir: &Path,
    download_url: &str,
    version: &str,
    subpath: Option<&str>,
) -> Result<(), String> {
    let (win64_dir, _) = resolve_nte_pak_paths(game_dir);
    fs::create_dir_all(&win64_dir).map_err(|e| e.to_string())?;

    let client = Client::builder()
        .user_agent("Veil/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let effective_url = if download_url.ends_with(".zip") {
        download_url.to_string()
    } else {
        let tag = if version.eq_ignore_ascii_case("latest") {
            let redirect_client = Client::builder()
                .user_agent("Veil/1.0")
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .map_err(|e| e.to_string())?;
            let latest_resp = redirect_client
                .get("https://github.com/rm-NoobInCoding/UniversalSigBypasser/releases/latest")
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let location = latest_resp
                .headers()
                .get("location")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");
            let marker = "/releases/tag/";
            if let Some(idx) = location.rfind(marker) {
                location[idx + marker.len()..].to_string()
            } else {
                "v1.2".to_string()
            }
        } else {
            version.to_string()
        };

        let expanded_url = format!(
            "https://github.com/rm-NoobInCoding/UniversalSigBypasser/releases/expanded_assets/{}",
            tag
        );
        let expanded_html = client
            .get(&expanded_url)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .text()
            .await
            .map_err(|e| e.to_string())?;

        let marker = "href=\"/rm-NoobInCoding/UniversalSigBypasser/releases/download/";
        if let Some(pos) = expanded_html.find(marker) {
            let start = pos + "href=\"".len();
            let rem = &expanded_html[start..];
            if let Some(end) = rem.find('"') {
                format!("https://github.com{}", &rem[..end])
            } else {
                let clean_tag = tag.trim_start_matches('v');
                format!(
                    "https://github.com/rm-NoobInCoding/UniversalSigBypasser/releases/download/{}/SigBypasser_v{}.zip",
                    tag, clean_tag
                )
            }
        } else {
            let clean_tag = tag.trim_start_matches('v');
            format!(
                "https://github.com/rm-NoobInCoding/UniversalSigBypasser/releases/download/{}/SigBypasser_v{}.zip",
                tag, clean_tag
            )
        }
    };

    let resp = client
        .get(&effective_url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    let cursor = Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor).map_err(|e| e.to_string())?;

    let mut asi_bytes = Vec::new();
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_ascii_lowercase();
        if name.ends_with("universalsigbypasser.asi") || name.ends_with(".asi") {
            entry
                .read_to_end(&mut asi_bytes)
                .map_err(|e| e.to_string())?;
            break;
        }
    }

    if asi_bytes.is_empty() {
        return Err("UniversalSigBypasser.asi not found in archive".to_string());
    }

    let subpath_buf = match subpath {
        Some(s) => validate_safe_subpath(s)?,
        None => PathBuf::new(),
    };

    let target_dir = win64_dir.join(&subpath_buf);
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    let sha256 = compute_bytes_sha256(&asi_bytes);
    let target_asi_path = target_dir.join("UniversalSigBypasser.asi");
    fs::write(&target_asi_path, asi_bytes).map_err(|e| e.to_string())?;

    let mut meta = read_loader_metadata(&win64_dir);
    meta.sig_bypasser_version = Some(version.to_string());
    meta.sig_bypasser_sha256 = Some(sha256);
    meta.sig_bypasser_subpath = if subpath_buf.as_os_str().is_empty() {
        None
    } else {
        Some(subpath_buf.to_string_lossy().replace('\\', "/"))
    };
    write_loader_metadata(&win64_dir, &meta)?;

    Ok(())
}

pub fn uninstall_sig_bypasser(game_dir: &Path) -> Result<(), String> {
    let (win64_dir, _) = resolve_nte_pak_paths(game_dir);
    let mut meta = read_loader_metadata(&win64_dir);

    let asi_path = if let Some(ref sub) = meta.sig_bypasser_subpath {
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

    if asi_path.is_file() {
        let current_hash = compute_file_sha256(&asi_path);
        let should_remove = match (&meta.sig_bypasser_sha256, &current_hash) {
            (Some(expected), Some(actual)) => expected == actual,
            (None, _) => true,
            _ => false,
        };

        if should_remove {
            let _ = fs::remove_file(&asi_path);
            if let Some(parent) = asi_path.parent()
                && parent != win64_dir
                && is_dir_empty_or_hidden(parent)
            {
                let _ = fs::remove_dir_all(parent);
            }
        }
    }

    meta.sig_bypasser_version = None;
    meta.sig_bypasser_sha256 = None;
    meta.sig_bypasser_subpath = None;
    write_loader_metadata(&win64_dir, &meta)?;

    Ok(())
}

pub fn postprocess_nte_pak_extracted_mod(mod_dir: &Path) -> Result<(), String> {
    let mut has_pak = false;
    let mut files_to_check = Vec::new();
    let mut stack = vec![mod_dir.to_path_buf()];

    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.is_file()
                && let Some(ext) = path.extension().and_then(|e| e.to_str())
            {
                let ext_lower = ext.to_ascii_lowercase();
                if ext_lower == "pak" {
                    has_pak = true;
                }
                if COMPANION_EXTENSIONS.contains(&ext_lower.as_str()) {
                    files_to_check.push(path);
                }
            }
        }
    }

    if !has_pak {
        let _ = fs::remove_dir_all(mod_dir);
        return Err("Archive does not contain any .pak files. 3DMigoto mods are not supported for Neverness to Everness.".to_string());
    }

    for path in files_to_check {
        let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
            continue;
        };
        let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
            continue;
        };

        if stem.ends_with("_P") || stem.ends_with("_p") {
            let clean_stem = &stem[..stem.len() - 2];
            let new_name = format!("{}.{}", clean_stem, ext);
            if let Some(parent) = path.parent() {
                let new_path = parent.join(new_name);
                let _ = fs::rename(&path, &new_path);
            }
        }
    }

    Ok(())
}

fn find_preview_image(dir: &Path) -> Option<String> {
    let image_extensions = ["png", "jpg", "jpeg", "webp", "gif"];
    for ext in &image_extensions {
        let preview_file = dir.join(format!("preview.{}", ext));
        if preview_file.is_file() {
            return Some(preview_file.to_string_lossy().to_string());
        }
    }

    let entries = fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file()
            && let Some(stem) = path.file_stem().and_then(|s| s.to_str())
            && stem.to_ascii_lowercase().starts_with("preview")
            && let Some(ext) = path.extension().and_then(|e| e.to_str())
            && image_extensions.iter().any(|e| e.eq_ignore_ascii_case(ext))
        {
            return Some(path.to_string_lossy().to_string());
        }
    }

    None
}

fn read_veil_metadata(dir: &Path) -> (Option<u64>, Option<String>, Option<u64>) {
    let dotfile = dir.join(".veil.json");
    if !dotfile.is_file() {
        return (None, None, None);
    }
    let content = match fs::read_to_string(&dotfile) {
        Ok(c) => c,
        Err(_) => return (None, None, None),
    };
    let val: serde_json::Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => return (None, None, None),
    };
    let gb_id = val.get("gamebanana_id").and_then(|v| v.as_u64());
    let version = val
        .get("version")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let file_id = val.get("file_id").and_then(|v| v.as_u64());
    (gb_id, version, file_id)
}

fn is_nte_pak_mod_enabled(mod_dir: &Path) -> bool {
    let mut stack = vec![mod_dir.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.is_file()
                && let Some(ext) = path.extension().and_then(|e| e.to_str())
                && ext.eq_ignore_ascii_case("pak")
                && let Some(stem) = path.file_stem().and_then(|s| s.to_str())
                && (stem.ends_with("_P") || stem.ends_with("_p"))
            {
                return true;
            }
        }
    }
    false
}

pub fn scan_nte_pak_mods(mods_dir: &Path) -> Result<Vec<ModItem>, String> {
    if !mods_dir.exists() {
        return Ok(Vec::new());
    }

    let mut mods = Vec::new();
    let entries = fs::read_dir(mods_dir).map_err(|err| err.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let cat_folder_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        if cat_folder_name.starts_with('.')
            || cat_folder_name.eq_ignore_ascii_case("DISABLED_veil")
            || cat_folder_name.eq_ignore_ascii_case("veil")
        {
            continue;
        }

        let is_uncategorized = cat_folder_name.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME);
        let category_opt = if is_uncategorized {
            None
        } else {
            Some(cat_folder_name.clone())
        };

        let sub_entries = match fs::read_dir(&path) {
            Ok(se) => se,
            Err(_) => continue,
        };

        for sub_entry in sub_entries.flatten() {
            let sub_path = sub_entry.path();
            if !sub_path.is_dir() {
                continue;
            }

            let sub_name = match sub_path.file_name().and_then(|n| n.to_str()) {
                Some(n) => n.to_string(),
                None => continue,
            };

            if sub_name.starts_with('.') {
                continue;
            }

            let rel_id = format!("{}/{}", cat_folder_name, sub_name);
            let is_enabled = is_nte_pak_mod_enabled(&sub_path);
            let preview = find_preview_image(&sub_path);
            let (gb_id, ver, fid) = read_veil_metadata(&sub_path);
            let updated_at = sub_path
                .metadata()
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64);

            mods.push(ModItem {
                id: rel_id,
                name: sub_name,
                category: category_opt.clone(),
                folder_path: sub_path.to_string_lossy().to_string(),
                enabled: is_enabled,
                preview_path: preview,
                hashes: Vec::new(),
                gamebanana_id: gb_id,
                version: ver,
                file_id: fid,
                updated_at,
            });
        }
    }

    mods.sort_by_key(|a| a.name.to_lowercase());
    Ok(mods)
}

pub fn toggle_nte_pak_mod(mods_dir: &Path, rel_id: &str, enable: bool) -> Result<bool, String> {
    let mod_dir = mods_dir.join(rel_id);
    if !mod_dir.exists() {
        return Err(format!("Mod folder does not exist: {}", mod_dir.display()));
    }

    let mut stack = vec![mod_dir.clone()];
    let mut files = Vec::new();

    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.is_file()
                && let Some(ext) = path.extension().and_then(|e| e.to_str())
            {
                let ext_lower = ext.to_ascii_lowercase();
                if COMPANION_EXTENSIONS.contains(&ext_lower.as_str()) {
                    files.push(path);
                }
            }
        }
    }

    for path in files {
        let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
            continue;
        };
        let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
            continue;
        };
        let Some(parent) = path.parent() else {
            continue;
        };

        if enable {
            if !stem.ends_with("_P") && !stem.ends_with("_p") {
                let new_name = format!("{}_P.{}", stem, ext);
                let _ = fs::rename(&path, parent.join(new_name));
            }
        } else {
            if stem.ends_with("_P") || stem.ends_with("_p") {
                let clean_stem = &stem[..stem.len() - 2];
                let new_name = format!("{}.{}", clean_stem, ext);
                let _ = fs::rename(&path, parent.join(new_name));
            }
        }
    }

    Ok(enable)
}

pub fn delete_nte_pak_mod(mods_dir: &Path, rel_id: &str) -> Result<(), String> {
    let mod_dir = mods_dir.join(rel_id);
    if mod_dir.exists() {
        fs::remove_dir_all(&mod_dir).map_err(|e| e.to_string())?;
    }

    if let Some(parent) = mod_dir.parent()
        && parent != mods_dir
        && is_dir_empty_or_hidden(parent)
    {
        let _ = fs::remove_dir_all(parent);
    }

    Ok(())
}

pub fn move_nte_pak_mod_category(
    mods_dir: &Path,
    mod_rel_path: &str,
    target_category: Option<String>,
) -> Result<String, String> {
    let old_source = mods_dir.join(mod_rel_path);
    if !old_source.exists() {
        return Err(format!(
            "Source mod folder does not exist: {}",
            old_source.display()
        ));
    }

    let mod_folder_name = match old_source.file_name().and_then(|n| n.to_str()) {
        Some(n) => n.to_string(),
        None => return Err("Invalid mod folder name".to_string()),
    };

    let target_cat_name = match target_category.as_deref().map(str::trim) {
        Some(cat) if !cat.is_empty() => {
            let sanitized = sanitize_folder_name(cat);
            if sanitized.eq_ignore_ascii_case("__root__")
                || sanitized.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME)
            {
                UNCATEGORIZED_DIR_NAME.to_string()
            } else {
                sanitized
            }
        }
        _ => UNCATEGORIZED_DIR_NAME.to_string(),
    };

    let new_rel_path = format!("{}/{}", target_cat_name, mod_folder_name);
    let new_source = mods_dir.join(&new_rel_path);
    if old_source == new_source {
        return Ok(new_rel_path);
    }

    if new_source.exists() {
        return Err(format!(
            "Destination mod folder already exists: {}",
            new_source.display()
        ));
    }

    if let Some(parent) = new_source.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    fs::rename(&old_source, &new_source).map_err(|err| err.to_string())?;

    if let Some(old_parent) = old_source.parent()
        && old_parent != mods_dir
        && is_dir_empty_or_hidden(old_parent)
    {
        let _ = fs::remove_dir_all(old_parent);
    }

    Ok(new_rel_path)
}

pub fn list_nte_pak_categories(mods_dir: &Path) -> Result<Vec<CategoryItem>, String> {
    if !mods_dir.exists() {
        return Ok(Vec::new());
    }

    let mut categories = Vec::new();
    let entries = fs::read_dir(mods_dir).map_err(|err| err.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir()
            && let Some(name) = path.file_name().and_then(|n| n.to_str())
        {
            if name.starts_with('.')
                || name.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME)
                || name.eq_ignore_ascii_case("DISABLED_veil")
                || name.eq_ignore_ascii_case("veil")
            {
                continue;
            }
            let sub_count = fs::read_dir(&path)
                .map(|entries| entries.flatten().filter(|e| e.path().is_dir()).count())
                .unwrap_or(0);

            categories.push(CategoryItem {
                name: name.to_string(),
                mod_count: sub_count,
            });
        }
    }

    categories.sort_by_key(|a| a.name.to_lowercase());
    Ok(categories)
}

pub fn create_nte_pak_category(mods_dir: &Path, category_name: &str) -> Result<(), String> {
    let trimmed = category_name.trim();
    if trimmed.is_empty() {
        return Err("Category name cannot be empty".to_string());
    }
    let sanitized = sanitize_folder_name(trimmed);
    if sanitized.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME) {
        return Err("Cannot use reserved category name 'Uncategorized'".to_string());
    }
    let cat_dir = mods_dir.join(&sanitized);
    if cat_dir.exists() {
        return Err(format!("Category already exists: {}", sanitized));
    }
    fs::create_dir_all(&cat_dir).map_err(|err| err.to_string())?;
    Ok(())
}

pub fn rename_nte_pak_category(
    mods_dir: &Path,
    old_name: &str,
    new_name: &str,
) -> Result<(), String> {
    let trimmed_old = old_name.trim();
    let trimmed_new = new_name.trim();
    if trimmed_old.is_empty() || trimmed_new.is_empty() {
        return Err("Category name cannot be empty".to_string());
    }
    let sanitized_old = sanitize_folder_name(trimmed_old);
    let sanitized_new = sanitize_folder_name(trimmed_new);
    if sanitized_old.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME)
        || sanitized_new.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME)
    {
        return Err("Cannot rename to or from reserved Uncategorized category".to_string());
    }
    if sanitized_old == sanitized_new {
        return Ok(());
    }
    let old_cat = mods_dir.join(&sanitized_old);
    let new_cat = mods_dir.join(&sanitized_new);
    if !old_cat.exists() {
        return Err(format!("Category does not exist: {}", sanitized_old));
    }
    if new_cat.exists() {
        return Err(format!("Category already exists: {}", sanitized_new));
    }
    fs::rename(&old_cat, &new_cat).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_nte_pak_category(
    mods_dir: &Path,
    category_name: &str,
    delete_mods: bool,
) -> Result<(), String> {
    let trimmed = category_name.trim();
    if trimmed.is_empty() {
        return Err("Category name cannot be empty".to_string());
    }
    let sanitized = sanitize_folder_name(trimmed);
    if sanitized.eq_ignore_ascii_case(UNCATEGORIZED_DIR_NAME) {
        return Err("Cannot delete the reserved Uncategorized category".to_string());
    }
    let cat_dir = mods_dir.join(&sanitized);
    if !cat_dir.exists() {
        return Err(format!("Category does not exist: {}", sanitized));
    }

    if delete_mods {
        fs::remove_dir_all(&cat_dir).map_err(|e| e.to_string())?;
    } else {
        let uncategorized_dir = mods_dir.join(UNCATEGORIZED_DIR_NAME);
        fs::create_dir_all(&uncategorized_dir).map_err(|e| e.to_string())?;
        let entries = fs::read_dir(&cat_dir).map_err(|e| e.to_string())?;
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir()
                && let Some(mod_name) = path.file_name()
            {
                let dest = uncategorized_dir.join(mod_name);
                if !dest.exists() {
                    let _ = fs::rename(&path, &dest);
                }
            }
        }
        let _ = fs::remove_dir_all(&cat_dir);
    }
    Ok(())
}

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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_resolve_nte_pak_paths() {
        let temp = tempdir().unwrap();
        let base = temp.path();

        let (win64_1, mods_1) = resolve_nte_pak_paths(base);
        assert_eq!(
            win64_1,
            base.join("Client/WindowsNoEditor/HT/Binaries/Win64")
        );
        assert_eq!(
            mods_1,
            base.join("Client/WindowsNoEditor/HT/Content/Paks/veil")
        );

        let ht_dir = base.join("Client/WindowsNoEditor/HT");
        fs::create_dir_all(&ht_dir).unwrap();
        let (win64_2, mods_2) = resolve_nte_pak_paths(base);
        assert_eq!(win64_2, ht_dir.join("Binaries/Win64"));
        assert_eq!(mods_2, ht_dir.join("Content/Paks/veil"));
    }

    #[test]
    fn test_postprocess_nte_pak_extracted_mod_error_without_pak() {
        let temp = tempdir().unwrap();
        let mod_dir = temp.path().join("ini_mod");
        fs::create_dir_all(&mod_dir).unwrap();
        fs::write(mod_dir.join("mod.ini"), "test").unwrap();

        let res = postprocess_nte_pak_extracted_mod(&mod_dir);
        assert!(res.is_err());
        assert!(!mod_dir.exists());
    }

    #[test]
    fn test_postprocess_nte_pak_extracted_mod_normalizes_p() {
        let temp = tempdir().unwrap();
        let mod_dir = temp.path().join("pak_mod");
        fs::create_dir_all(&mod_dir).unwrap();
        fs::write(mod_dir.join("Costume_P.pak"), "pak_data").unwrap();
        fs::write(mod_dir.join("Costume_P.ucas"), "ucas_data").unwrap();
        fs::write(mod_dir.join("Costume_P.utoc"), "utoc_data").unwrap();

        let res = postprocess_nte_pak_extracted_mod(&mod_dir);
        assert!(res.is_ok());
        assert!(mod_dir.join("Costume.pak").is_file());
        assert!(mod_dir.join("Costume.ucas").is_file());
        assert!(mod_dir.join("Costume.utoc").is_file());
        assert!(!mod_dir.join("Costume_P.pak").exists());
    }

    #[test]
    fn test_toggle_nte_pak_mod() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();
        let rel_id = "Uncategorized/TestMod";
        let mod_dir = mods_dir.join(rel_id);
        fs::create_dir_all(&mod_dir).unwrap();

        fs::write(mod_dir.join("TestMod.pak"), "pak").unwrap();
        fs::write(mod_dir.join("TestMod.ucas"), "ucas").unwrap();

        let enabled_res = toggle_nte_pak_mod(mods_dir, rel_id, true);
        assert!(enabled_res.is_ok());
        assert!(mod_dir.join("TestMod_P.pak").is_file());
        assert!(mod_dir.join("TestMod_P.ucas").is_file());
        assert!(!mod_dir.join("TestMod.pak").exists());

        let disabled_res = toggle_nte_pak_mod(mods_dir, rel_id, false);
        assert!(disabled_res.is_ok());
        assert!(mod_dir.join("TestMod.pak").is_file());
        assert!(mod_dir.join("TestMod.ucas").is_file());
        assert!(!mod_dir.join("TestMod_P.pak").exists());
    }

    #[test]
    fn test_scan_nte_pak_mods() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path();

        let cat_dir = mods_dir.join("Characters");
        let mod1_dir = cat_dir.join("ModOne");
        fs::create_dir_all(&mod1_dir).unwrap();
        fs::write(mod1_dir.join("ModOne_P.pak"), "pak").unwrap();

        let uncat_dir = mods_dir.join("Uncategorized");
        let mod2_dir = uncat_dir.join("ModTwo");
        fs::create_dir_all(&mod2_dir).unwrap();
        fs::write(mod2_dir.join("ModTwo.pak"), "pak").unwrap();

        let mods = scan_nte_pak_mods(mods_dir).unwrap();
        assert_eq!(mods.len(), 2);

        let m1 = mods.iter().find(|m| m.name == "ModOne").unwrap();
        assert_eq!(m1.category, Some("Characters".to_string()));
        assert!(m1.enabled);

        let m2 = mods.iter().find(|m| m.name == "ModTwo").unwrap();
        assert_eq!(m2.category, None);
        assert!(!m2.enabled);
    }

    #[test]
    fn test_nte_pak_loader_status_and_occupied_dlls() {
        let temp = tempdir().unwrap();
        let base = temp.path();
        let (win64_dir, _) = resolve_nte_pak_paths(base);
        fs::create_dir_all(&win64_dir).unwrap();

        fs::write(win64_dir.join("version.dll"), "optiscaler-binary-bytes").unwrap();

        let status = nte_pak_loader_status(base).unwrap();
        assert!(!status.asi_loader_installed);
        assert_eq!(status.asi_loader_dll, None);
        assert!(status.occupied_dlls.contains(&"version.dll".to_string()));

        let meta = NtePakLoaderMetadata {
            asi_loader_version: Some("v1.0.0".to_string()),
            asi_loader_dll: Some("dinput8.dll".to_string()),
            asi_loader_sha256: Some(compute_bytes_sha256(b"our-asi-bytes")),
            sig_bypasser_version: None,
            sig_bypasser_sha256: None,
            sig_bypasser_subpath: None,
        };
        write_loader_metadata(&win64_dir, &meta).unwrap();
        fs::write(win64_dir.join("dinput8.dll"), b"our-asi-bytes").unwrap();

        let status2 = nte_pak_loader_status(base).unwrap();
        assert!(status2.asi_loader_installed);
        assert_eq!(status2.asi_loader_dll, Some("dinput8.dll".to_string()));
        assert_eq!(status2.asi_loader_version, Some("v1.0.0".to_string()));
        assert!(status2.occupied_dlls.contains(&"version.dll".to_string()));
        assert!(!status2.occupied_dlls.contains(&"dinput8.dll".to_string()));

        let uninstall_res = uninstall_asi_loader(base);
        assert!(uninstall_res.is_ok());
        assert!(!win64_dir.join("dinput8.dll").exists());
        assert!(win64_dir.join("version.dll").is_file());

        let meta_after = read_loader_metadata(&win64_dir);
        assert_eq!(meta_after.asi_loader_dll, None);
        assert_eq!(meta_after.asi_loader_version, None);
        assert_eq!(meta_after.asi_loader_sha256, None);
    }

    #[test]
    fn test_validate_safe_subpath() {
        assert_eq!(validate_safe_subpath("").unwrap(), PathBuf::new());
        assert_eq!(validate_safe_subpath(".").unwrap(), PathBuf::new());
        assert_eq!(
            validate_safe_subpath("plugins").unwrap(),
            PathBuf::from("plugins")
        );
        assert_eq!(
            validate_safe_subpath(r".\OptiScaler\plugins\").unwrap(),
            PathBuf::from("OptiScaler/plugins")
        );
        assert!(validate_safe_subpath("../plugins").is_err());
        assert!(validate_safe_subpath(r"..\..\escape").is_err());
    }

    #[test]
    fn test_sig_bypasser_subpath_status_and_uninstall() {
        let temp = tempdir().unwrap();
        let base = temp.path();
        let (win64_dir, _) = resolve_nte_pak_paths(base);
        fs::create_dir_all(&win64_dir).unwrap();

        let sub_dir = win64_dir.join("OptiScaler/plugins");
        fs::create_dir_all(&sub_dir).unwrap();
        let asi_data = b"asi-plugin-payload";
        fs::write(sub_dir.join("UniversalSigBypasser.asi"), asi_data).unwrap();

        let meta = NtePakLoaderMetadata {
            asi_loader_version: None,
            asi_loader_dll: None,
            asi_loader_sha256: None,
            sig_bypasser_version: Some("v1.2".to_string()),
            sig_bypasser_sha256: Some(compute_bytes_sha256(asi_data)),
            sig_bypasser_subpath: Some("OptiScaler/plugins".to_string()),
        };
        write_loader_metadata(&win64_dir, &meta).unwrap();

        let status = nte_pak_loader_status(base).unwrap();
        assert!(status.sig_bypasser_installed);
        assert_eq!(status.sig_bypasser_version, Some("v1.2".to_string()));
        assert_eq!(
            status.sig_bypasser_subpath,
            Some("OptiScaler/plugins".to_string())
        );

        let uninstall_res = uninstall_sig_bypasser(base);
        assert!(uninstall_res.is_ok());
        assert!(!sub_dir.join("UniversalSigBypasser.asi").exists());

        let status_after = nte_pak_loader_status(base).unwrap();
        assert!(!status_after.sig_bypasser_installed);
        assert_eq!(status_after.sig_bypasser_subpath, None);
    }
}
