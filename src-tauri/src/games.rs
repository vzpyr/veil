use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GameDefinition {
    pub id: String,
    pub name: String,
    pub short_name: String,
    pub gamebanana_game_id: u64,
    pub root_category_id: Option<u64>,
    pub icon: String,
}

pub fn get_supported_games() -> Vec<GameDefinition> {
    vec![
        GameDefinition {
            id: "zzz".to_string(),
            name: "Zenless Zone Zero".to_string(),
            short_name: "ZZZ".to_string(),
            gamebanana_game_id: 19567,
            root_category_id: None,
            icon: "ZZ".to_string(),
        },
        GameDefinition {
            id: "endfield".to_string(),
            name: "Arknights: Endfield".to_string(),
            short_name: "Endfield".to_string(),
            gamebanana_game_id: 21842,
            root_category_id: None,
            icon: "EF".to_string(),
        },
        GameDefinition {
            id: "wuwa".to_string(),
            name: "Wuthering Waves".to_string(),
            short_name: "WuWa".to_string(),
            gamebanana_game_id: 20357,
            root_category_id: None,
            icon: "WW".to_string(),
        },
        GameDefinition {
            id: "genshin".to_string(),
            name: "Genshin Impact".to_string(),
            short_name: "GI".to_string(),
            gamebanana_game_id: 8552,
            root_category_id: None,
            icon: "GI".to_string(),
        },
        GameDefinition {
            id: "starrail".to_string(),
            name: "Honkai Star Rail".to_string(),
            short_name: "HSR".to_string(),
            gamebanana_game_id: 18366,
            root_category_id: None,
            icon: "SR".to_string(),
        },
        GameDefinition {
            id: "hi3".to_string(),
            name: "Honkai Impact 3rd".to_string(),
            short_name: "HI3".to_string(),
            gamebanana_game_id: 10349,
            root_category_id: None,
            icon: "HI3".to_string(),
        },
    ]
}

pub fn get_game_by_id(id: &str) -> Option<GameDefinition> {
    get_supported_games().into_iter().find(|game| game.id == id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_supported_games() {
        let games = get_supported_games();
        assert_eq!(games.len(), 6);
        assert!(get_game_by_id("hi3").is_some());
        let hi3 = get_game_by_id("hi3").unwrap();
        assert_eq!(hi3.name, "Honkai Impact 3rd");
        assert_eq!(hi3.gamebanana_game_id, 10349);
    }
}
