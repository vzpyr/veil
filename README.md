# Veil

Yet another 3DMigoto mod manager

## Features

- Non-destructive mod activation using symlinks between disabled and active folders
- Multi-game support for 3DMigoto and XXMI loaders (Arknights: Endfield, Genshin Impact, Honkai Impact 3rd, Honkai: Star Rail, Wuthering Waves, and Zenless Zone Zero)
- Mod organization with preview images, categories, grid/list view modes, sorting/filtering, multi-select, batch operations, and automatic subfolder detection during extraction
- Integrated GameBanana browser with search, category filtering, sort options, and NSFW toggles
- Built-in download manager with queue and direct archive extraction (.7z, .zip, .rar)
- Automatic mod update tracking against GameBanana and duplicate installation handling (replace or keep both)
- Interactive INI keybind and variable editor with support for live variable toggles (via d3dx_user.ini)
- Mod conflict detection analyzing overlapping hashes across active mods

## Installation

You can download prebuilt application bundles from [Releases](https://github.com/vzpyr/veil/releases).

## Building from Source

### Prerequisites

- Node.js 22+ and npm
- Rust 1.85+ and Cargo
- System dependencies for Tauri (such as WebKitGTK and libsoup on Linux)

### Build

```bash
npm install
npm run tauri build
```

The compiled binary and distribution bundles will be located in `src-tauri/target/release/bundle/`.

## License

MIT
