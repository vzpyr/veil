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
            id: "arknights-endfield".to_string(),
            name: "Arknights: Endfield".to_string(),
            gamebanana_game_id: 21842,
        },
        GameDefinition {
            id: "genshin-impact".to_string(),
            name: "Genshin Impact".to_string(),
            gamebanana_game_id: 8552,
        },
        GameDefinition {
            id: "honkai-impact-3rd".to_string(),
            name: "Honkai Impact 3rd".to_string(),
            gamebanana_game_id: 10349,
        },
        GameDefinition {
            id: "honkai-star-rail".to_string(),
            name: "Honkai Star Rail".to_string(),
            gamebanana_game_id: 18366,
        },
        GameDefinition {
            id: "neverness-to-everness".to_string(),
            name: "Neverness to Everness (NEMI)".to_string(),
            gamebanana_game_id: 23012,
        },
        GameDefinition {
            id: "neverness-to-everness-pak".to_string(),
            name: "Neverness to Everness (pak)".to_string(),
            gamebanana_game_id: 23012,
        },
        GameDefinition {
            id: "wuthering-waves".to_string(),
            name: "Wuthering Waves".to_string(),
            gamebanana_game_id: 20357,
        },
        GameDefinition {
            id: "zenless-zone-zero".to_string(),
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
        assert_eq!(games.len(), 8);

        for game in &games {
            let found = game_by_id(&game.id).expect("game should be found by id");
            assert_eq!(found.name, game.name);
            assert_eq!(found.gamebanana_game_id, game.gamebanana_game_id);
        }
    }
}
