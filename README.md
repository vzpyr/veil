# Veil

Yet another 3DMigoto (and NTE) mod manager

## Features

- Supports Windows and Linux
- Works with all 3DMigoto-based games (AKEF, GI, HI3, HSR, WUWA, ZZZ) and NTE (pak-based)
- Non-destructive mod activation using symlinks and _P suffix
- Mod organization with images, categories, filters, batch operations, and automatic subfolder handling
- Integrated GameBanana browser for downloading mods with automatic update tracking and handling
- Built-in download manager with queue and direct archive extraction (.7z, .zip, .rar)
- Interactive INI keybind/variable editor with support (via d3dx_user.ini)
- Mod conflict detector using hashes

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
