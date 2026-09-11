use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModKeybind {
    pub section: String,
    pub label: String,
    pub key: String,
    pub binding_type: String,
    pub variable: Option<String>,
    pub values: Vec<i64>,
    pub ini_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModVariableState {
    pub variable: String,
    pub label: String,
    pub current_value: i64,
    pub possible_values: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModKeybindData {
    pub keybinds: Vec<ModKeybind>,
    pub variables: Vec<ModVariableState>,
}

pub fn format_section_label(section_name: &str) -> String {
    let mut clean = section_name.trim();
    if clean.starts_with('[') && clean.ends_with(']') {
        clean = &clean[1..clean.len() - 1];
    }

    let lower = clean.to_ascii_lowercase();
    let stripped = if lower.starts_with("keyswap") {
        &clean[7..]
    } else if lower.starts_with("keytoggle") {
        &clean[9..]
    } else if lower.starts_with("key") {
        &clean[3..]
    } else {
        clean
    };

    let trimmed = stripped.trim_start_matches(['_', '-']).trim();
    if trimmed.is_empty() {
        return clean.to_string();
    }

    let mut result = String::new();
    let mut prev_char: Option<char> = None;
    for c in trimmed.chars() {
        if c == '_' || c == '-' {
            if !result.ends_with(' ') && !result.is_empty() {
                result.push(' ');
            }
        } else if c.is_uppercase() {
            if let Some(prev) = prev_char {
                if !prev.is_uppercase() && prev != '_' && prev != '-' && !result.ends_with(' ') {
                    result.push(' ');
                }
            }
            result.push(c);
        } else {
            result.push(c);
        }
        prev_char = Some(c);
    }
    result.trim().to_string()
}

pub fn strip_comments(line: &str) -> &str {
    let clean = if let Some(idx) = line.find([';', '#']) {
        &line[..idx]
    } else {
        line
    };
    clean.trim()
}

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
            } else if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext.eq_ignore_ascii_case("ini") {
                        files.push(path);
                    }
                }
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

                if !b_type.eq_ignore_ascii_case("hold") {
                    if let Some(var_name) = section_var {
                        let mut possible = section_vals.to_vec();
                        if b_type.eq_ignore_ascii_case("toggle") && possible.len() == 1 {
                            if !possible.contains(&0) {
                                possible.insert(0, 0);
                            }
                        }
                        if possible.is_empty() {
                            possible = vec![0, 1];
                        }

                        let entry = variables_map.entry(var_name.clone()).or_insert_with(|| {
                            ModVariableState {
                                variable: var_name.clone(),
                                label,
                                current_value: possible.first().copied().unwrap_or(0),
                                possible_values: Vec::new(),
                            }
                        });
                        for v in &possible {
                            if !entry.possible_values.contains(v) {
                                entry.possible_values.push(*v);
                            }
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

                    if !var_name.is_empty() {
                        if let Ok(val) = right_trimmed.parse::<i64>() {
                            constants_defaults.insert(var_name, val);
                        }
                    }
                }
            } else if current_section.to_ascii_lowercase().starts_with("[key") {
                if let Some((left, right)) = clean.split_once('=') {
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

    if has_d3dx_user {
        if let Ok(user_ini_content) = fs::read_to_string(&d3dx_user_path) {
            let user_values = parse_d3dx_user_values(&user_ini_content, &mod_folder_name);
            for (var, val) in user_values {
                if let Some(state) = variables_map.get_mut(&var) {
                    state.current_value = val;
                }
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

        if in_constants {
            if let Some((left, right)) = clean.split_once('=') {
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
            if let Some((left, _)) = clean.split_once('=') {
                if left.trim().eq_ignore_ascii_case("key") {
                    lines[i] = format!("key = {}", new_key);
                    replaced = true;
                    break;
                }
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

pub fn set_d3dx_user_toggle(
    mods_dir: &Path,
    mod_folder_name: &str,
    variable: &str,
    new_value: i64,
) -> Result<(), String> {
    let loader_root = mods_dir.parent().unwrap_or(mods_dir);
    let d3dx_user_path = loader_root.join("d3dx_user.ini");

    let clean_var = if variable.starts_with('$') {
        &variable[1..]
    } else {
        variable
    };

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

    for i in 0..lines.len() {
        let trimmed = lines[i].trim();
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
            if let Some((left, _)) = clean.split_once('=') {
                if left.trim().to_ascii_lowercase() == target_lower {
                    lines[i] = format!("{} = {}", target_key, new_value);
                    updated = true;
                    break;
                }
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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_format_section_label() {
        assert_eq!(format_section_label("[KeySwapOutfit]"), "Outfit");
        assert_eq!(format_section_label("[KeyToggleGlasses]"), "Glasses");
        assert_eq!(format_section_label("Key_Hair_Color"), "Hair Color");
        assert_eq!(format_section_label("[KeyF5]"), "F5");
    }

    #[test]
    fn test_strip_comments() {
        assert_eq!(strip_comments("key = ] ; comment"), "key = ]");
        assert_eq!(strip_comments("key = [ # hash comment"), "key = [");
        assert_eq!(strip_comments("   $swap = 1   "), "$swap = 1");
    }

    #[test]
    fn test_parse_and_update_keybind() {
        let temp = tempdir().unwrap();
        let ini_path = temp.path().join("mod.ini");

        let initial_ini = r#"
[KeySwapOutfit]
key = ]
type = cycle
$swapvar = 0, 1, 2

[KeyToggleGlasses]
key = [
type = toggle
$glasses = 0, 1
"#;
        fs::write(&ini_path, initial_ini).unwrap();

        update_ini_keybind(&ini_path, "[KeySwapOutfit]", "CTRL ALT k").unwrap();

        let updated = fs::read_to_string(&ini_path).unwrap();
        assert!(updated.contains("key = CTRL ALT k"));
        assert!(updated.contains("[KeyToggleGlasses]"));
        assert!(updated.contains("key = ["));
    }

    #[test]
    fn test_set_d3dx_user_toggle() {
        let temp = tempdir().unwrap();
        let mods_dir = temp.path().join("Mods");
        fs::create_dir_all(&mods_dir).unwrap();

        set_d3dx_user_toggle(&mods_dir, "Jane_Doe", "$swapvar", 2).unwrap();

        let d3dx_path = temp.path().join("d3dx_user.ini");
        assert!(d3dx_path.is_file());

        let content = fs::read_to_string(&d3dx_path).unwrap();
        assert!(content.contains("[Constants]"));
        assert!(content.contains("$\\Jane_Doe\\swapvar = 2"));

        set_d3dx_user_toggle(&mods_dir, "Jane_Doe", "$swapvar", 1).unwrap();
        let updated = fs::read_to_string(&d3dx_path).unwrap();
        assert!(updated.contains("$\\Jane_Doe\\swapvar = 1"));
        assert!(!updated.contains("= 2"));
    }

    #[test]
    fn test_parse_mod_keybinds_and_variables_filters_internal_constants() {
        let temp = tempdir().unwrap();
        let mod_dir = temp.path().join("TestMod");
        fs::create_dir_all(&mod_dir).unwrap();

        let ini_content = r#"
[Constants]
global $pass = 0
global $internal_hash_abc = 1
global $mesh_vertex_count = 12345
global $dt = 0
global persist $swapvar = 1

[KeySwapOutfit]
key = ]
type = cycle
$swapvar = 0, 1, 2

[KeyHoldSprint]
key = shift
type = hold
$sprint = 1
"#;
        fs::write(mod_dir.join("mod.ini"), ini_content).unwrap();

        let data = parse_mod_keybinds_and_variables(&mod_dir, temp.path()).unwrap();
        assert_eq!(data.keybinds.len(), 2);
        assert_eq!(data.variables.len(), 1);
        assert_eq!(data.variables[0].variable, "$swapvar");
        assert_eq!(data.variables[0].label, "Outfit");
        assert_eq!(data.variables[0].current_value, 1);
        assert_eq!(data.variables[0].possible_values, vec![0, 1, 2]);
    }
}
