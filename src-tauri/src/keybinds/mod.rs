mod d3dx;
mod format;
mod ini;

use serde::{Deserialize, Serialize};

pub use d3dx::set_d3dx_user_toggle;
pub use format::{format_section_label, strip_comments};
pub use ini::{parse_d3dx_user_values, parse_mod_keybinds_and_variables, update_ini_keybind};

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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
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
