export interface GameDefinition {
  id: string;
  name: string;
  gamebanana_game_id: number;
}

export interface GameSettings {
  mods_dir?: string;
  game_dir?: string;
}

export interface AppConfig {
  active_game_id: string;
  auto_categorize: boolean;
  show_nsfw: boolean;
  color_scheme: string;
  auto_check_updates: boolean;
  view_mode: "grid" | "list";
  games: Record<string, GameSettings>;
}

export interface ModItem {
  id: string;
  name: string;
  category?: string;
  folder_path: string;
  enabled: boolean;
  preview_path?: string;
  hashes: string[];
  gamebanana_id?: number;
  version?: string;
  file_id?: number;
  updated_at?: number;
}

export interface ModUpdateInfo {
  available: boolean;
  latestVersion?: string;
  latestFileId?: number;
  latestFileName?: string;
  gamebananaId: number;
}

export interface CategoryItem {
  name: string;
  mod_count: number;
}

export interface ConflictGroup {
  hashes: string[];
  mod_ids: string[];
  mod_names: string[];
}

export type DownloadStatus =
  "queued" | "downloading" | "extracting" | "completed" | "failed";

export interface DownloadProgressPayload {
  key: string;
  downloaded: number;
  total: number;
  speed: string;
  eta: string;
  percentage: number;
}

export interface DownloadStatusPayload {
  key: string;
  status: string;
}

export interface DownloadCompletePayload {
  key: string;
  rel_id: string;
  mod_name: string;
}

export interface DownloadErrorPayload {
  key: string;
  error: string;
}

export interface DownloadQueueItem {
  id: string;
  modName: string;
  fileName: string;
  fileId: number;
  gamebananaId: number;
  version?: string;
  category?: string;
  previewUrl?: string;
  downloadUrl: string;
  status: DownloadStatus;
  progress: DownloadProgressPayload;
  duplicateAction: "replace" | "keep_both";
  error?: string;
}

export interface ModKeybind {
  section: string;
  label: string;
  key: string;
  binding_type: string;
  variable?: string;
  values: number[];
  ini_path: string;
}

export interface ModVariableState {
  variable: string;
  label: string;
  current_value: number;
  possible_values: number[];
}

export interface ModKeybindData {
  keybinds: ModKeybind[];
  variables: ModVariableState[];
}

export interface LoaderRelease {
  tag_name: string;
  download_url: string;
}

export interface NtePakLoaderStatus {
  asi_loader_installed: boolean;
  asi_loader_version?: string;
  asi_loader_dll?: string;
  sig_bypasser_installed: boolean;
  sig_bypasser_version?: string;
  sig_bypasser_subpath?: string;
  occupied_dlls: string[];
}
