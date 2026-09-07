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
            root_category_id: Some(30305),
            icon: "ZZ".to_string(),
        },
        GameDefinition {
            id: "endfield".to_string(),
            name: "Arknights: Endfield".to_string(),
            short_name: "EF".to_string(),
            gamebanana_game_id: 21842,
            root_category_id: Some(42770),
            icon: "EF".to_string(),
        },
    ]
}

pub fn get_game_by_id(id: &str) -> Option<GameDefinition> {
    get_supported_games().into_iter().find(|game| game.id == id)
}
