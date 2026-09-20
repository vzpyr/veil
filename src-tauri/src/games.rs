use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GameDefinition {
    pub id: String,
    pub name: String,
    pub gamebanana_game_id: u64,
}

pub fn supported_games() -> Vec<GameDefinition> {
    vec![
        GameDefinition {
            id: "endfield".to_string(),
            name: "Arknights: Endfield".to_string(),
            gamebanana_game_id: 21842,
        },
        GameDefinition {
            id: "genshin".to_string(),
            name: "Genshin Impact".to_string(),
            gamebanana_game_id: 8552,
        },
        GameDefinition {
            id: "hi3".to_string(),
            name: "Honkai Impact 3rd".to_string(),
            gamebanana_game_id: 10349,
        },
        GameDefinition {
            id: "ntepak".to_string(),
            name: "Neverness to Everness (pak)".to_string(),
            gamebanana_game_id: 23012,
        },
        GameDefinition {
            id: "starrail".to_string(),
            name: "Honkai Star Rail".to_string(),
            gamebanana_game_id: 18366,
        },
        GameDefinition {
            id: "wuwa".to_string(),
            name: "Wuthering Waves".to_string(),
            gamebanana_game_id: 20357,
        },
        GameDefinition {
            id: "zzz".to_string(),
            name: "Zenless Zone Zero".to_string(),
            gamebanana_game_id: 19567,
        },
    ]
}

pub fn game_by_id(id: &str) -> Option<GameDefinition> {
    supported_games().into_iter().find(|game| game.id == id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_supported_games() {
        let games = supported_games();
        assert_eq!(games.len(), 7);
        assert!(game_by_id("hi3").is_some());
        assert!(game_by_id("ntepak").is_some());
        let nte_pak = game_by_id("ntepak").unwrap();
        assert_eq!(nte_pak.name, "Neverness to Everness (pak)");
        assert_eq!(nte_pak.gamebanana_game_id, 23012);
        let hi3 = game_by_id("hi3").unwrap();
        assert_eq!(hi3.name, "Honkai Impact 3rd");
        assert_eq!(hi3.gamebanana_game_id, 10349);
    }
}
