use crate::scanner::ModItem;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ConflictGroup {
    pub hash: String,
    pub mod_ids: Vec<String>,
    pub mod_names: Vec<String>,
}

pub fn detect_conflicts(mods: &[ModItem]) -> Vec<ConflictGroup> {
    let mut hash_to_mods: BTreeMap<String, Vec<&ModItem>> = BTreeMap::new();

    for item in mods {
        if !item.enabled {
            continue;
        }

        let mut seen_for_this_mod = BTreeSet::new();
        for hash in &item.hashes {
            if seen_for_this_mod.insert(hash.clone()) {
                hash_to_mods.entry(hash.clone()).or_default().push(item);
            }
        }
    }

    let mut conflicts = Vec::new();
    for (hash, mod_items) in hash_to_mods {
        if mod_items.len() > 1 {
            let mut mod_ids: Vec<String> = mod_items.iter().map(|m| m.id.clone()).collect();
            let mut mod_names: Vec<String> = mod_items.iter().map(|m| m.name.clone()).collect();
            mod_ids.sort();
            mod_ids.dedup();
            mod_names.sort();
            mod_names.dedup();

            conflicts.push(ConflictGroup {
                hash,
                mod_ids,
                mod_names,
            });
        }
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
        };

        let mod_b = ModItem {
            id: "Jane/B".to_string(),
            name: "Mod B".to_string(),
            category: Some("Jane".to_string()),
            folder_path: "/dummy/b".to_string(),
            enabled: true,
            preview_path: None,
            hashes: vec!["aabbccdd".to_string(), "99887766".to_string()],
            gamebanana_id: None,
            version: None,
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
        };

        let conflicts = detect_conflicts(&[mod_a, mod_b, mod_c_disabled]);
        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].hash, "aabbccdd");
        assert_eq!(conflicts[0].mod_names, vec!["Mod A", "Mod B"]);
    }
}
