use crate::archive::extract_any_archive;
use crate::symlink::{ensure_veil_dirs, get_disabled_dir};
use futures_util::StreamExt;
use reqwest::Client;
use serde::Serialize;
use std::fs::{self, File};
use std::io::{BufWriter, Write};
use std::path::Path;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize)]
pub struct DownloadProgress {
    pub key: String,
    pub downloaded: u64,
    pub total: u64,
    pub speed: String,
    pub eta: String,
    pub percentage: f64,
}

fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

fn format_speed(bytes_per_sec: f64) -> String {
    format!("{}/s", format_bytes(bytes_per_sec as u64))
}

fn format_duration(seconds: u64) -> String {
    let hours = seconds / 3600;
    let minutes = (seconds % 3600) / 60;
    let secs = seconds % 60;

    if hours > 0 {
        format!("{}h {}m {}s", hours, minutes, secs)
    } else if minutes > 0 {
        format!("{}m {}s", minutes, secs)
    } else {
        format!("{}s", secs)
    }
}

pub async fn download_and_install_mod(
    app: AppHandle,
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
) -> Result<String, String> {
    let mods_path = Path::new(&mods_dir);
    ensure_veil_dirs(mods_path)?;

    let disabled_dir = get_disabled_dir(mods_path);
    let target_parent_dir = match &category {
        Some(cat) if !cat.trim().is_empty() => {
            let cat_dir = disabled_dir.join(cat.trim().replace(['/', '\\'], ""));
            fs::create_dir_all(&cat_dir).map_err(|e| e.to_string())?;
            cat_dir
        }
        _ => disabled_dir.clone(),
    };

    let temp_download_dir = mods_path.join(".veil_temp");
    fs::create_dir_all(&temp_download_dir).map_err(|e| e.to_string())?;

    let client = Client::builder()
        .user_agent("VeilModManager/0.1.0")
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
        .and_then(|segments| segments.last())
        .and_then(|name| Path::new(name).extension())
        .and_then(|ext| ext.to_str())
        .unwrap_or("zip");

    let temp_archive_path = temp_download_dir.join(format!("{}.{}", key, ext));
    let total_size = response.content_length().unwrap_or(0);

    let file = File::create(&temp_archive_path).map_err(|e| e.to_string())?;
    let mut writer = BufWriter::new(file);

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut last_emit = Instant::now();
    let start_time = Instant::now();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| {
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

    let _ = app.emit(
        "download-status",
        serde_json::json!({
            "key": key.clone(),
            "status": "extracting"
        }),
    );

    let action = duplicate_action.unwrap_or_else(|| "replace".to_string());
    let extracted_dir =
        match extract_any_archive(&temp_archive_path, &target_parent_dir, &mod_name, &action) {
            Ok(dir) => dir,
            Err(err) => {
                let _ = fs::remove_file(&temp_archive_path);
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
    let _ = fs::remove_file(&temp_archive_path);

    if let Some(img_url) = preview_url {
        if !img_url.is_empty() {
            if let Ok(img_resp) = client.get(&img_url).send().await {
                if img_resp.status().is_success() {
                    if let Ok(img_bytes) = img_resp.bytes().await {
                        let preview_dest = extracted_dir.join("preview.png");
                        let _ = fs::write(preview_dest, img_bytes);
                    }
                }
            }
        }
    }

    let downloaded_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let meta = serde_json::json!({
        "gamebanana_id": item_id,
        "file_id": file_id,
        "version": version,
        "mod_name": mod_name,
        "downloaded_at": downloaded_at
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
        .strip_prefix(&disabled_dir)
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
