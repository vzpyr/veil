# veil roadmap

## phase 1: project scaffolding and foundation

- [x] initialize ultra barebone git repository and gitignore
- [x] setup vite with react 19, typescript, and mantine v7
- [x] setup prettier and formatting configuration
- [x] create design token system in css and mantine theme
- [x] configure tauri v2 backend with modular cargo architecture
- [x] verify phase 1 build, typecheck, and formatting

## phase 2: backend filesystem, symlink engine and mod scanner

- [x] implement extensible game registry (zzz and endfield definitions)
- [x] implement configuration and settings manager in rust
- [x] implement symlink engine with safe deletion and orphaned link pruning
- [x] implement recursive mod scanner with ini hash extractor
- [x] implement category folder operations (create, move, list)
- [x] implement unit tests for scanner and ini hash parser
- [x] verify phase 2 build and tests

## phase 3: archive extraction and conflict engine

- [x] implement pure rust archive extractor for zip and sevenz
- [x] implement root folder wrapping for loose archive files
- [x] implement path traversal sanitization and preview extraction
- [x] implement conflict detection engine for colliding hashes
- [x] expose tauri commands and type definitions
- [x] verify phase 3 build and tests

## phase 4: frontend installed mods view and design system

- [x] implement app shell layout with game switcher and navigation tabs
- [x] implement category sidebar and filter controls
- [x] implement mod cards with preview images, toggle switches, and menus
- [x] implement category management modal (move or create category)
- [x] implement conflict resolution drawer
- [x] implement settings view (mod directory picker, auto categorize toggle)
- [x] verify phase 4 build and typecheck

## phase 5: gamebanana browser and download manager

- [x] implement gamebanana api client (feeds, categories, search, sorting)
- [x] implement mod profile view (carousel screenshots, description, file list)
- [x] implement updates and changelogs view
- [x] implement community comments and nested replies
- [x] implement author profile card
- [x] implement real time download manager with streaming progress and auto extraction
- [x] verify phase 5 build and typecheck

## phase 6: verification, typecheck, build and final polish

- [x] run full format check with prettier
- [x] run typescript typecheck
- [x] run cargo check and tests
- [x] verify code compliance with no comments and no em or en dashes
- [x] create initial git commit with conventional format

## phase 7: download queue and folder naming enhancements

- [x] implement reactive download queue manager with concurrency control
- [x] enforce exact gamebanana mod name for extracted folders
- [x] streamline duplicate version detection and clean replacement

## phase 8: mod keybinds and toggle state editor

- [x] parse 3dmigoto key swap and toggle sections from mod ini files
- [x] implement keybind editing and ini persistence
- [x] inspect and edit persistent toggle states from ini and d3dx_user
- [x] build interactive keybind and toggle drawer in ui

## phase 9: mod update checker and gamebanana mapping

- [x] save dotfile metadata inside downloaded mod folders (.veil.json)
- [x] implement gamebanana api update checker
- [x] display update available indicator badges on mod cards
- [x] allow opening gamebanana details modal directly from update badge

## phase 10: dynamic gamebanana category tree discovery

- [x] discover top level gamebanana categories dynamically per game
- [x] fetch subcategories for root categories with children (character skins, bangboos, etc.)
- [x] group categories in browser dropdown (character skins, ui, misc)
- [x] eliminate hardcoded root_category_id dependencies
