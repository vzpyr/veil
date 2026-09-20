pub fn format_section_label(section_name: &str) -> String {
    let mut clean = section_name.trim();
    if clean.starts_with('[') && clean.ends_with(']') {
        clean = &clean[1..clean.len() - 1];
    }

    let lower = clean.to_ascii_lowercase();
    let stripped = if lower.starts_with("keyswap") {
        &clean[7..]
    } else if lower.starts_with("keytoggle") {
        &clean[9..]
    } else if lower.starts_with("key") {
        &clean[3..]
    } else {
        clean
    };

    let trimmed = stripped.trim_start_matches(['_', '-']).trim();
    if trimmed.is_empty() {
        return clean.to_string();
    }

    let mut result = String::new();
    let mut prev_char: Option<char> = None;
    for c in trimmed.chars() {
        if c == '_' || c == '-' {
            if !result.ends_with(' ') && !result.is_empty() {
                result.push(' ');
            }
        } else if c.is_uppercase() {
            if let Some(prev) = prev_char
                && !prev.is_uppercase()
                && prev != '_'
                && prev != '-'
                && !result.ends_with(' ')
            {
                result.push(' ');
            }
            result.push(c);
        } else {
            result.push(c);
        }
        prev_char = Some(c);
    }
    result.trim().to_string()
}

pub fn strip_comments(line: &str) -> &str {
    let clean = if let Some(idx) = line.find([';', '#']) {
        &line[..idx]
    } else {
        line
    };
    clean.trim()
}
