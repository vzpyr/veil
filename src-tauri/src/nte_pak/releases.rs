use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoaderRelease {
    pub tag_name: String,
    pub download_url: String,
}

fn extract_tags_from_atom(atom_xml: &str) -> Vec<String> {
    let mut tags = Vec::new();
    let marker = "releases/tag/";
    let mut search_pos = 0;

    while let Some(start_idx) = atom_xml[search_pos..].find(marker) {
        let abs_start = search_pos + start_idx + marker.len();
        let rem = &atom_xml[abs_start..];
        let end_idx = rem
            .find('"')
            .or_else(|| rem.find('\''))
            .unwrap_or(rem.len());
        let raw_tag = &rem[..end_idx].trim();
        if !raw_tag.is_empty() && !tags.iter().any(|t| t == raw_tag) {
            tags.push(raw_tag.to_string());
        }
        search_pos = abs_start + end_idx;
    }

    tags
}

pub async fn fetch_asi_loader_releases() -> Result<Vec<LoaderRelease>, String> {
    let client = Client::builder()
        .user_agent("Veil/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let url = "https://github.com/ThirteenAG/Ultimate-ASI-Loader/releases.atom";
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    let body = resp.text().await.map_err(|e| e.to_string())?;

    let tags = extract_tags_from_atom(&body);
    let mut result = Vec::new();

    result.push(LoaderRelease {
        tag_name: "Latest".to_string(),
        download_url:
            "https://github.com/ThirteenAG/Ultimate-ASI-Loader/releases/latest/download/Ultimate-ASI-Loader_x64.zip"
                .to_string(),
    });

    for tag in tags {
        let download_url = format!(
            "https://github.com/ThirteenAG/Ultimate-ASI-Loader/releases/download/{}/Ultimate-ASI-Loader_x64.zip",
            tag
        );
        result.push(LoaderRelease {
            tag_name: tag,
            download_url,
        });
    }

    Ok(result)
}

pub async fn fetch_sig_bypasser_releases() -> Result<Vec<LoaderRelease>, String> {
    let client = Client::builder()
        .user_agent("Veil/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let url = "https://github.com/rm-NoobInCoding/UniversalSigBypasser/releases.atom";
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    let body = resp.text().await.map_err(|e| e.to_string())?;

    let tags = extract_tags_from_atom(&body);
    let mut result = Vec::new();

    result.push(LoaderRelease {
        tag_name: "Latest".to_string(),
        download_url: "https://github.com/rm-NoobInCoding/UniversalSigBypasser/releases/latest"
            .to_string(),
    });

    for tag in tags {
        let clean_tag = tag.trim_start_matches('v');
        let download_url = format!(
            "https://github.com/rm-NoobInCoding/UniversalSigBypasser/releases/download/{}/SigBypasser_v{}.zip",
            tag, clean_tag
        );
        result.push(LoaderRelease {
            tag_name: tag,
            download_url,
        });
    }

    Ok(result)
}
