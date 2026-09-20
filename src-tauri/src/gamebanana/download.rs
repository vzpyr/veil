use crate::archive::{extract_any_archive, reserve_temp_paths, sanitize_folder_name};
use crate::symlink::{disabled_dir, ensure_veil_dirs, resolve_category_dir};
use futures_util::StreamExt;
use reqwest::Client;
use std::fs;
use std::io::{BufWriter, Write};
use std::path::Path;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

use super::progress::{DownloadProgress, format_duration, format_speed};
use super::temp::{CancelRegistry, TempGuard, TempRegistry, clear_temp_paths};

#[allow(clippy::too_many_arguments)]
pub async fn download_and_install_mod(
    app: AppHandle,
    cancel: &CancelRegistry,
    registry: &TempRegistry,
    download_url: String,
    mods_dir: String,
    mod_name: String,
    category: Option<String>,
    preview_url: Option<String>,
    key: String,
    duplicate_action: Option<String>,
    item_id: Option<u64>,
    file_id: Option<u64>,
    version: Option<String>,
    game_id: Option<String>,
) -> Result<String, String> {
    let mods_path = Path::new(&mods_dir);
    let is_nte_pak = game_id.as_deref() == Some("ntepak");
    let base_dir = if is_nte_pak {
        fs::create_dir_all(mods_path).map_err(|e| e.to_string())?;
        mods_path.to_path_buf()
    } else {
        ensure_veil_dirs(mods_path)?;
        disabled_dir(mods_path)
    };
    cancel.clear(&key);

    let target_parent_dir = if is_nte_pak {
        let cat_name = crate::symlink::effective_category_name(category.as_deref());
        let dir = base_dir.join(cat_name);
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        dir
    } else {
        resolve_category_dir(&base_dir, category.as_deref())?
    };

    let temp_download_dir = mods_path.join(".veil_temp");
    fs::create_dir_all(&temp_download_dir).map_err(|e| e.to_string())?;
    let sanitized_mod_name = sanitize_folder_name(&mod_name);

    let client = Client::builder()
        .user_agent("Veil/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&download_url).send().await.map_err(|e| {
        let err_msg = e.to_string();
        let _ = app.emit(
            "download-error",
            serde_json::json!({
                "key": key.clone(),
                "error": err_msg.clone()
            }),
        );
        err_msg
    })?;

    if !response.status().is_success() {
        let err_msg = format!("Download request failed with status: {}", response.status());
        let _ = app.emit(
            "download-error",
            serde_json::json!({
                "key": key.clone(),
                "error": err_msg.clone()
            }),
        );
        return Err(err_msg);
    }

    let ext = response
        .url()
        .path_segments()
        .and_then(|mut segments| segments.next_back())
        .and_then(|name| Path::new(name).extension())
        .and_then(|ext| ext.to_str())
        .unwrap_or("zip");

    let (temp_archive_path, temp_extract_dir, temp_archive_file) =
        reserve_temp_paths(&temp_download_dir, &sanitized_mod_name, ext)?;
    registry.register(&key, temp_archive_path.clone(), temp_extract_dir.clone());
    let _temp_guard = TempGuard {
        key: &key,
        registry,
    };
    let mut writer = BufWriter::new(temp_archive_file);
    let total_size = response.content_length().unwrap_or(0);

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut last_emit = Instant::now();
    let start_time = Instant::now();

    loop {
        if cancel.is_cancelled(&key) {
            drop(writer);
            clear_temp_paths(&temp_archive_path, &temp_extract_dir);
            return Err("Download cancelled".to_string());
        }

        let Some(chunk_result) = stream.next().await else {
            break;
        };
        let chunk = match chunk_result {
            Ok(chunk) => chunk,
            Err(e) => {
                let err_msg = e.to_string();
                let _ = app.emit(
                    "download-error",
                    serde_json::json!({
                        "key": key.clone(),
                        "error": err_msg.clone()
                    }),
                );
                clear_temp_paths(&temp_archive_path, &temp_extract_dir);
                return Err(err_msg);
            }
        };
        writer.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        if last_emit.elapsed().as_millis() >= 200 || downloaded == total_size {
            let elapsed_secs = start_time.elapsed().as_secs_f64();
            let avg_speed = if elapsed_secs > 0.0 {
                downloaded as f64 / elapsed_secs
            } else {
                0.0
            };

            let remaining_bytes = total_size.saturating_sub(downloaded);
            let eta_secs = if avg_speed > 0.0 {
                (remaining_bytes as f64 / avg_speed) as u64
            } else {
                0
            };

            let percentage = if total_size > 0 {
                (downloaded as f64 / total_size as f64) * 100.0
            } else {
                0.0
            };

            let payload = DownloadProgress {
                key: key.clone(),
                downloaded,
                total: total_size,
                speed: format_speed(avg_speed),
                eta: format_duration(eta_secs),
                percentage,
            };

            let _ = app.emit("download-progress", payload);
            last_emit = Instant::now();
        }
    }

    writer.flush().map_err(|e| e.to_string())?;
    drop(writer);

    if cancel.is_cancelled(&key) {
        clear_temp_paths(&temp_archive_path, &temp_extract_dir);
        return Err("Download cancelled".to_string());
    }

    let _ = app.emit(
        "download-status",
        serde_json::json!({
            "key": key.clone(),
            "status": "extracting"
        }),
    );

    let action = duplicate_action.unwrap_or_else(|| "replace".to_string());
    let extracted_dir = match extract_any_archive(
        &temp_archive_path,
        &temp_extract_dir,
        &target_parent_dir,
        &mod_name,
        &action,
        &|| cancel.is_cancelled(&key),
    ) {
        Ok(dir) => dir,
        Err(err) => {
            clear_temp_paths(&temp_archive_path, &temp_extract_dir);
            let _ = app.emit(
                "download-error",
                serde_json::json!({
                    "key": key.clone(),
                    "error": err.clone()
                }),
            );
            return Err(err);
        }
    };
    clear_temp_paths(&temp_archive_path, &temp_extract_dir);

    if is_nte_pak
        && let Err(err) = crate::nte_pak::postprocess_nte_pak_extracted_mod(&extracted_dir)
    {
        let _ = app.emit(
            "download-error",
            serde_json::json!({
                "key": key.clone(),
                "error": err.clone()
            }),
        );
        return Err(err);
    }

    if let Some(img_url) = preview_url
        && !img_url.is_empty()
        && let Ok(img_resp) = client.get(&img_url).send().await
        && img_resp.status().is_success()
        && let Ok(img_bytes) = img_resp.bytes().await
    {
        let preview_dest = extracted_dir.join("preview.png");
        let _ = fs::write(preview_dest, img_bytes);
    }

    let meta = serde_json::json!({
        "gamebanana_id": item_id,
        "file_id": file_id,
        "version": version,
    });
    let _ = fs::write(
        extracted_dir.join(".veil.json"),
        serde_json::to_string_pretty(&meta).unwrap_or_default(),
    );

    let final_folder_name = extracted_dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&mod_name)
        .to_string();

    let rel_id = extracted_dir
        .strip_prefix(&base_dir)
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .replace('\\', "/");

    let _ = app.emit(
        "download-complete",
        serde_json::json!({
            "key": key,
            "rel_id": rel_id,
            "mod_name": final_folder_name
        }),
    );

    Ok(rel_id)
}
