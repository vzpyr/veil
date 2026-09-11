use crate::scanner::ModItem;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ConflictGroup {
    pub hashes: Vec<String>,
    pub mod_ids: Vec<String>,
    pub mod_names: Vec<String>,
}

pub fn detect_conflicts(mods: &[ModItem]) -> Vec<ConflictGroup> {
    let mut hash_to_mods: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    let mut mod_id_to_name: BTreeMap<String, String> = BTreeMap::new();

    for item in mods {
        if !item.enabled {
            continue;
        }

        mod_id_to_name.insert(item.id.clone(), item.name.clone());

        for hash in &item.hashes {
            hash_to_mods
                .entry(hash.clone())
                .or_default()
                .insert(item.id.clone());
        }
    }

    let mut mod_set_to_hashes: BTreeMap<Vec<String>, BTreeSet<String>> = BTreeMap::new();
    for (hash, mod_ids_set) in hash_to_mods {
        if mod_ids_set.len() > 1 {
            let mod_ids: Vec<String> = mod_ids_set.into_iter().collect();
            mod_set_to_hashes.entry(mod_ids).or_default().insert(hash);
        }
    }

    let mut conflicts = Vec::new();
    for (mod_ids, hashes_set) in mod_set_to_hashes {
        let mod_names: Vec<String> = mod_ids
            .iter()
            .map(|id| {
                mod_id_to_name
                    .get(id)
                    .cloned()
                    .unwrap_or_else(|| id.clone())
            })
            .collect();
        let hashes: Vec<String> = hashes_set.into_iter().collect();

        conflicts.push(ConflictGroup {
            hashes,
            mod_ids,
            mod_names,
        });
    }

    conflicts
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_conflicts() {
        let mod_a = ModItem {
            id: "Jane/A".to_string(),
            name: "Mod A".to_string(),
            category: Some("Jane".to_string()),
            folder_path: "/dummy/a".to_string(),
            enabled: true,
            preview_path: None,
            hashes: vec!["11223344".to_string(), "aabbccdd".to_string()],
            gamebanana_id: None,
            version: None,
            file_id: None,
            updated_at: None,
        };

        let mod_b = ModItem {
            id: "Jane/B".to_string(),
            name: "Mod B".to_string(),
            category: Some("Jane".to_string()),
            folder_path: "/dummy/b".to_string(),
            enabled: true,
            preview_path: None,
            hashes: vec![
                "aabbccdd".to_string(),
                "99887766".to_string(),
                "11223344".to_string(),
            ],
            gamebanana_id: None,
            version: None,
            file_id: None,
            updated_at: None,
        };

        let mod_c_disabled = ModItem {
            id: "Jane/C".to_string(),
            name: "Mod C".to_string(),
            category: Some("Jane".to_string()),
            folder_path: "/dummy/c".to_string(),
            enabled: false,
            preview_path: None,
            hashes: vec!["11223344".to_string()],
            gamebanana_id: None,
            version: None,
            file_id: None,
            updated_at: None,
        };

        let conflicts = detect_conflicts(&[mod_a, mod_b, mod_c_disabled]);
        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].hashes, vec!["11223344", "aabbccdd"]);
        assert_eq!(conflicts[0].mod_names, vec!["Mod A", "Mod B"]);
    }
}
