use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GameSettings {
    pub mods_dir: Option<String>,
    pub game_dir: Option<String>,
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
    "dark".to_string()
}

fn default_view_mode() -> String {
    "grid".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        let mut games = HashMap::new();
        games.insert("zzz".to_string(), GameSettings::default());
        games.insert("endfield".to_string(), GameSettings::default());
        Self {
            active_game_id: "zzz".to_string(),
            auto_categorize: true,
            show_nsfw: false,
            color_scheme: "dark".to_string(),
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
        assert_eq!(config.color_scheme, "dark");
        assert_eq!(config.view_mode, "grid");
    }

    #[test]
    fn test_read_config_backward_compatibility() {
        let temp = tempdir().unwrap();
        let path = temp.path().join("config.json");
        let raw_json = r#"{
            "active_game_id": "zzz",
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
}
