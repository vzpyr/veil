use std::fs;
use std::path::Path;

use super::format::strip_comments;

pub fn set_d3dx_user_toggle(
    mods_dir: &Path,
    mod_folder_name: &str,
    variable: &str,
    new_value: i64,
) -> Result<(), String> {
    let loader_root = mods_dir.parent().unwrap_or(mods_dir);
    let d3dx_user_path = loader_root.join("d3dx_user.ini");

    let clean_var = variable.strip_prefix('$').unwrap_or(variable);

    let target_key = format!("$\\{}\\{}", mod_folder_name, clean_var);
    let target_lower = target_key.to_ascii_lowercase();

    let content = if d3dx_user_path.is_file() {
        fs::read_to_string(&d3dx_user_path).unwrap_or_default()
    } else {
        String::new()
    };

    let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
    let mut constants_found = false;
    let mut constants_end_idx = None;
    let mut updated = false;

    for (i, line) in lines.iter_mut().enumerate() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            if constants_found {
                constants_end_idx = Some(i);
                break;
            }
            if trimmed.eq_ignore_ascii_case("[constants]") {
                constants_found = true;
            }
            continue;
        }

        if constants_found {
            let clean = strip_comments(trimmed);
            if let Some((left, _)) = clean.split_once('=')
                && left.trim().to_ascii_lowercase() == target_lower
            {
                *line = format!("{} = {}", target_key, new_value);
                updated = true;
                break;
            }
        }
    }

    if !updated {
        if constants_found {
            let insert_pos = constants_end_idx.unwrap_or(lines.len());
            lines.insert(insert_pos, format!("{} = {}", target_key, new_value));
        } else {
            if !lines.is_empty() && !lines.last().map(|s| s.is_empty()).unwrap_or(true) {
                lines.push(String::new());
            }
            lines.push("[Constants]".to_string());
            lines.push(format!("{} = {}", target_key, new_value));
        }
    }

    let updated_content = lines.join("\n");
    fs::write(&d3dx_user_path, updated_content).map_err(|e| e.to_string())?;
    Ok(())
}
