use super::fs_ops::finalize_extracted_content;
use super::path::is_safe_path;
use std::fs::{self, File};
use std::io::{self, BufReader, Read};
use std::path::{Path, PathBuf};
use zip::ZipArchive;

fn is_lzma(method: zip::CompressionMethod) -> bool {
    method == zip::CompressionMethod::LZMA
}

fn read_raw_entry(
    archive: &mut ZipArchive<BufReader<File>>,
    index: usize,
) -> Result<Vec<u8>, String> {
    let mut entry = archive.by_index_raw(index).map_err(|e| e.to_string())?;
    let mut raw = Vec::new();
    entry.read_to_end(&mut raw).map_err(|e| e.to_string())?;
    Ok(raw)
}

fn lzma_props(raw: &[u8]) -> Result<(u8, u32, usize), String> {
    if raw.len() < 9 {
        return Err("Truncated lzma archive entry".to_string());
    }
    let props_size = u16::from_le_bytes([raw[2], raw[3]]) as usize;
    if props_size != 5 || raw.len() < 4 + props_size {
        return Err("Unsupported lzma archive entry header".to_string());
    }
    let props = raw[4];
    let dict_size = u32::from_le_bytes([raw[5], raw[6], raw[7], raw[8]]);
    Ok((props, dict_size, 4 + props_size))
}

fn decode_lzma(raw: &[u8], expected_size: u64) -> Result<Vec<u8>, String> {
    let (props, dict_size, header_end) = lzma_props(raw)?;

    let starts = [header_end + 8, header_end];
    let mut last_error = String::new();
    for start in starts {
        if start >= raw.len() {
            continue;
        }
        let mut reader = match lzma_rust2::LzmaReader::new_with_props(
            &raw[start..],
            expected_size,
            props,
            dict_size,
            None,
        ) {
            Ok(reader) => reader,
            Err(err) => {
                last_error = err.to_string();
                continue;
            }
        };
        let mut out = Vec::new();
        match reader.read_to_end(&mut out) {
            Ok(_) if out.len() as u64 == expected_size => return Ok(out),
            Ok(_) => last_error = "Decompressed lzma entry has unexpected size".to_string(),
            Err(err) => last_error = err.to_string(),
        }
    }

    Err(format!(
        "Failed to decompress lzma archive entry: {}",
        last_error
    ))
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

        let (entry_name, is_dir, is_lzma_entry, expected_size) = {
            let entry = zip.by_index_raw(i).map_err(|e| e.to_string())?;
            (
                entry.name().replace('\\', "/"),
                entry.is_dir(),
                is_lzma(entry.compression()),
                entry.size(),
            )
        };

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

        if is_dir {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
            continue;
        }

        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        if is_lzma_entry {
            let raw = read_raw_entry(&mut zip, i)?;
            let data = decode_lzma(&raw, expected_size)?;
            fs::write(&out_path, data).map_err(|e| e.to_string())?;
        } else {
            let mut entry = zip.by_index(i).map_err(|e| e.to_string())?;
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn fixture(name: &str) -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures")
            .join(name)
    }

    #[test]
    fn extracts_lzma_compressed_zip() {
        let temp = tempdir().unwrap();
        let dest_parent = temp.path().join("mods");
        fs::create_dir_all(&dest_parent).unwrap();

        let extracted = extract_zip(
            &fixture("lzma_zip.zip"),
            &temp.path().join("extract"),
            &dest_parent,
            "Lzma Mod",
            "replace",
            &|| false,
        )
        .unwrap();

        let content = fs::read_to_string(extracted.join("mod.ini")).unwrap();
        assert_eq!(content, "hash = 12345678\n".repeat(20));
    }
}
