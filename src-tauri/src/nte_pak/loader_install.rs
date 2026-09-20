use reqwest::Client;
use std::fs;
use std::io::{Cursor, Read};
use std::path::{Path, PathBuf};
use zip::ZipArchive;

use super::is_dir_empty_or_hidden;
use super::loader::{
    compute_bytes_sha256, compute_file_sha256, read_loader_metadata, resolve_nte_pak_paths,
    validate_safe_subpath, write_loader_metadata,
};

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
