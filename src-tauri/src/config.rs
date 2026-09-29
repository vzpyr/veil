use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct ModPreset {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub mod_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GameSettings {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dir: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub presets: Vec<ModPreset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub active_game_id: String,
    #[serde(default = "default_auto_categorize")]
    pub auto_categorize: bool,
    #[serde(default)]
    pub show_nsfw: bool,
    #[serde(default = "default_color_scheme")]
    pub color_scheme: String,
    #[serde(default)]
    pub auto_check_updates: bool,
    #[serde(default = "default_view_mode")]
    pub view_mode: String,
    pub games: HashMap<String, GameSettings>,
}

fn default_auto_categorize() -> bool {
    true
}

fn default_color_scheme() -> String {
    "system".to_string()
}

fn default_view_mode() -> String {
    "grid".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        let mut games = HashMap::new();
        for game in crate::games::supported_games() {
            games.insert(game.id, GameSettings::default());
        }
        Self {
            active_game_id: "zenless-zone-zero".to_string(),
            auto_categorize: true,
            show_nsfw: false,
            color_scheme: "system".to_string(),
            auto_check_updates: false,
            view_mode: "grid".to_string(),
            games,
        }
    }
}

pub fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app.path().app_config_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&base).map_err(|err| err.to_string())?;
    Ok(base.join("config.json"))
}

pub fn read_config(path: &Path) -> AppConfig {
    if !path.exists() {
        return AppConfig::default();
    }
    match fs::read_to_string(path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => AppConfig::default(),
    }
}

pub fn write_config(path: &Path, config: &AppConfig) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let content = serde_json::to_string_pretty(config).map_err(|err| err.to_string())?;
    fs::write(path, content).map_err(|err| err.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_config_defaults() {
        let config = AppConfig::default();
        assert!(!config.auto_check_updates);
        assert!(config.auto_categorize);
        assert!(!config.show_nsfw);
        assert_eq!(config.color_scheme, "system");
        assert_eq!(config.view_mode, "grid");
    }

    #[test]
    fn test_read_config_backward_compatibility() {
        let temp = tempdir().unwrap();
        let path = temp.path().join("config.json");
        let raw_json = r#"{
            "active_game_id": "zenless-zone-zero",
            "auto_categorize": true,
            "show_nsfw": false,
            "color_scheme": "dark",
            "games": {}
        }"#;
        fs::write(&path, raw_json).unwrap();

        let loaded = read_config(&path);
        assert!(!loaded.auto_check_updates);
        assert_eq!(loaded.view_mode, "grid");
    }

    #[test]
    fn test_write_and_read_config() {
        let temp = tempdir().unwrap();
        let path = temp.path().join("config.json");
        let config = AppConfig {
            auto_check_updates: true,
            view_mode: "list".to_string(),
            ..AppConfig::default()
        };

        write_config(&path, &config).unwrap();
        let loaded = read_config(&path);
        assert!(loaded.auto_check_updates);
        assert_eq!(loaded.view_mode, "list");
    }

    #[test]
    fn test_presets_write_and_read() {
        let temp = tempdir().unwrap();
        let path = temp.path().join("config.json");
        let mut games = HashMap::new();
        games.insert(
            "zenless-zone-zero".to_string(),
            GameSettings {
                dir: Some("/mods".to_string()),
                presets: vec![ModPreset {
                    id: "preset-1".to_string(),
                    name: "Combat Outfit".to_string(),
                    mod_ids: vec!["mod-a".to_string(), "mod-b".to_string()],
                }],
            },
        );
        let config = AppConfig {
            games,
            ..AppConfig::default()
        };

        write_config(&path, &config).unwrap();
        let loaded = read_config(&path);
        let zzz = loaded.games.get("zenless-zone-zero").unwrap();
        assert_eq!(zzz.presets.len(), 1);
        assert_eq!(zzz.presets[0].name, "Combat Outfit");
        assert_eq!(zzz.presets[0].mod_ids, vec!["mod-a", "mod-b"]);
    }
}
