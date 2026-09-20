use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use super::format::{format_section_label, strip_comments};
use super::{ModKeybind, ModKeybindData, ModVariableState};

fn collect_ini_files(dir: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    let mut stack = vec![dir.to_path_buf()];

    while let Some(current) = stack.pop() {
        let entries = match fs::read_dir(&current) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.is_file()
                && let Some(ext) = path.extension()
                && ext.eq_ignore_ascii_case("ini")
            {
                files.push(path);
            }
        }
    }
    files.sort();
    files
}

pub fn parse_mod_keybinds_and_variables(
    mod_folder_path: &Path,
    mods_dir: &Path,
) -> Result<ModKeybindData, String> {
    if !mod_folder_path.exists() {
        return Err(format!(
            "Mod folder does not exist: {}",
            mod_folder_path.display()
        ));
    }

    let ini_files = collect_ini_files(mod_folder_path);
    let mut keybinds = Vec::new();
    let mut variables_map: HashMap<String, ModVariableState> = HashMap::new();

    let mut constants_defaults: HashMap<String, i64> = HashMap::new();

    for ini_path in &ini_files {
        let content = match fs::read_to_string(ini_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let mut current_section = String::new();
        let mut section_key = String::new();
        let mut section_type = String::new();
        let mut section_var: Option<String> = None;
        let mut section_vals = Vec::new();

        let mut in_constants = false;

        let flush_section =
            |current_section: &str,
             section_key: &str,
             section_type: &str,
             section_var: &Option<String>,
             section_vals: &[i64],
             ini_path: &Path,
             keybinds: &mut Vec<ModKeybind>,
             variables_map: &mut HashMap<String, ModVariableState>| {
                if current_section.is_empty() || section_key.is_empty() {
                    return;
                }

                let label = format_section_label(current_section);
                let b_type = if section_type.is_empty() {
                    "cycle".to_string()
                } else {
                    section_type.to_string()
                };

                keybinds.push(ModKeybind {
                    section: current_section.to_string(),
                    label: label.clone(),
                    key: section_key.to_string(),
                    binding_type: b_type.clone(),
                    variable: section_var.clone(),
                    values: section_vals.to_vec(),
                    ini_path: ini_path.to_string_lossy().to_string(),
                });

                if !b_type.eq_ignore_ascii_case("hold")
                    && let Some(var_name) = section_var
                {
                    let mut possible = section_vals.to_vec();
                    if b_type.eq_ignore_ascii_case("toggle")
                        && possible.len() == 1
                        && !possible.contains(&0)
                    {
                        possible.insert(0, 0);
                    }
                    if possible.is_empty() {
                        possible = vec![0, 1];
                    }

                    let entry =
                        variables_map
                            .entry(var_name.clone())
                            .or_insert_with(|| ModVariableState {
                                variable: var_name.clone(),
                                label,
                                current_value: possible.first().copied().unwrap_or(0),
                                possible_values: Vec::new(),
                            });
                    for v in &possible {
                        if !entry.possible_values.contains(v) {
                            entry.possible_values.push(*v);
                        }
                    }
                }
            };

        for line in content.lines() {
            let clean = strip_comments(line);
            if clean.is_empty() {
                continue;
            }

            if clean.starts_with('[') && clean.ends_with(']') {
                flush_section(
                    &current_section,
                    &section_key,
                    &section_type,
                    &section_var,
                    &section_vals,
                    ini_path,
                    &mut keybinds,
                    &mut variables_map,
                );

                current_section = clean.to_string();
                section_key.clear();
                section_type.clear();
                section_var = None;
                section_vals.clear();

                let section_lower = current_section.to_ascii_lowercase();
                in_constants = section_lower == "[constants]";
                continue;
            }

            if in_constants {
                if let Some((left, right)) = clean.split_once('=') {
                    let left_trimmed = left.trim();
                    let right_trimmed = right.trim();

                    let var_name = if let Some(dollar_idx) = left_trimmed.find('$') {
                        left_trimmed[dollar_idx..].trim().to_string()
                    } else {
                        String::new()
                    };

                    if !var_name.is_empty()
                        && let Ok(val) = right_trimmed.parse::<i64>()
                    {
                        constants_defaults.insert(var_name, val);
                    }
                }
            } else if current_section.to_ascii_lowercase().starts_with("[key")
                && let Some((left, right)) = clean.split_once('=')
            {
                let key_name = left.trim().to_ascii_lowercase();
                let val = right.trim();

                if key_name == "key" {
                    section_key = val.to_string();
                } else if key_name == "type" {
                    section_type = val.to_string();
                } else if key_name.starts_with('$') {
                    let var_name = left.trim().to_string();
                    section_var = Some(var_name);
                    let mut vals = Vec::new();
                    for part in val.split(',') {
                        if let Ok(num) = part.trim().parse::<i64>() {
                            vals.push(num);
                        }
                    }
                    if vals.is_empty() {
                        vals = vec![0, 1];
                    }
                    section_vals = vals;
                }
            }
        }

        flush_section(
            &current_section,
            &section_key,
            &section_type,
            &section_var,
            &section_vals,
            ini_path,
            &mut keybinds,
            &mut variables_map,
        );
    }

    for (var_name, default_val) in constants_defaults {
        if let Some(entry) = variables_map.get_mut(&var_name) {
            entry.current_value = default_val;
        }
    }

    let loader_root = mods_dir.parent().unwrap_or(mods_dir);
    let d3dx_user_path = loader_root.join("d3dx_user.ini");
    let has_d3dx_user = d3dx_user_path.is_file();

    let mod_folder_name = mod_folder_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    if has_d3dx_user && let Ok(user_ini_content) = fs::read_to_string(&d3dx_user_path) {
        let user_values = parse_d3dx_user_values(&user_ini_content, &mod_folder_name);
        for (var, val) in user_values {
            if let Some(state) = variables_map.get_mut(&var) {
                state.current_value = val;
            }
        }
    }

    let mut variables: Vec<ModVariableState> = variables_map.into_values().collect();
    for v in &mut variables {
        if v.possible_values.is_empty() {
            v.possible_values = vec![0, 1];
        }
        v.possible_values.sort();
        v.possible_values.dedup();
    }
    variables.sort_by(|a, b| a.label.cmp(&b.label));

    Ok(ModKeybindData {
        keybinds,
        variables,
    })
}

pub fn parse_d3dx_user_values(content: &str, mod_folder_name: &str) -> HashMap<String, i64> {
    let mut results = HashMap::new();
    let mut in_constants = false;
    let target_prefix = format!("$\\{}\\", mod_folder_name.to_ascii_lowercase());

    for line in content.lines() {
        let clean = strip_comments(line);
        if clean.is_empty() {
            continue;
        }

        if clean.starts_with('[') && clean.ends_with(']') {
            let section_lower = clean.to_ascii_lowercase();
            in_constants = section_lower == "[constants]";
            continue;
        }

        if in_constants && let Some((left, right)) = clean.split_once('=') {
            let left_trimmed = left.trim();
            let right_trimmed = right.trim();
            let lower_left = left_trimmed.to_ascii_lowercase();

            if let Ok(val) = right_trimmed.parse::<i64>() {
                if lower_left.starts_with(&target_prefix) {
                    let var_name = format!("${}", &left_trimmed[target_prefix.len()..]);
                    results.insert(var_name, val);
                } else if left_trimmed.starts_with('$') && !left_trimmed.contains('\\') {
                    results.insert(left_trimmed.to_string(), val);
                }
            }
        }
    }
    results
}

pub fn update_ini_keybind(
    ini_path: &Path,
    target_section: &str,
    new_key: &str,
) -> Result<(), String> {
    if !ini_path.is_file() {
        return Err(format!("INI file does not exist: {}", ini_path.display()));
    }

    let content = fs::read_to_string(ini_path).map_err(|e| e.to_string())?;
    let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();

    let mut inside_target = false;
    let mut replaced = false;

    for i in 0..lines.len() {
        let trimmed = lines[i].trim();
        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            if inside_target && !replaced {
                lines.insert(i, format!("key = {}", new_key));
                replaced = true;
                break;
            }
            inside_target = trimmed.eq_ignore_ascii_case(target_section);
            continue;
        }

        if inside_target {
            let clean = strip_comments(trimmed);
            if let Some((left, _)) = clean.split_once('=')
                && left.trim().eq_ignore_ascii_case("key")
            {
                lines[i] = format!("key = {}", new_key);
                replaced = true;
                break;
            }
        }
    }

    if !replaced && inside_target {
        lines.push(format!("key = {}", new_key));
        replaced = true;
    }

    if !replaced {
        return Err(format!(
            "Target section {} was not found in INI file",
            target_section
        ));
    }

    let updated_content = lines.join("\n");
    fs::write(ini_path, updated_content).map_err(|e| e.to_string())?;
    Ok(())
}
