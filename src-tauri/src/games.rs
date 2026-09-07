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
            short_name: "EF".to_string(),
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
            name: "Honkai: Star Rail".to_string(),
            short_name: "HSR".to_string(),
            gamebanana_game_id: 18366,
            root_category_id: None,
            icon: "SR".to_string(),
        },
    ]
}

pub fn get_game_by_id(id: &str) -> Option<GameDefinition> {
    get_supported_games().into_iter().find(|game| game.id == id)
}
