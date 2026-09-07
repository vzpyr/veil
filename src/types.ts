export interface GameDefinition {
  id: string;
  name: string;
  short_name: string;
  gamebanana_game_id: number;
  root_category_id?: number;
  icon: string;
}

export interface GameSettings {
  mods_dir?: string;
  auto_categorize: boolean;
}

export interface AppConfig {
  active_game_id: string;
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
}

export interface CategoryItem {
  name: string;
  mod_count: number;
}

export interface ConflictGroup {
  hash: string;
  mod_ids: string[];
  mod_names: string[];
}

export interface DownloadProgressPayload {
  key: string;
  downloaded: number;
  total: number;
  speed: string;
  eta: string;
  percentage: number;
}
