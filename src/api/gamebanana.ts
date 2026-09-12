const API_BASE = "https://gamebanana.com/apiv11/";

const LIST_PAGE_SIZE = 15;

export interface GbCategory {
  _idRow: number;
  _sName: string;
  _nItemCount: number;
  _nCategoryCount?: number;
  _sIconUrl?: string;
}

export interface GbCategoryGroup {
  group: string;
  items: {
    value: string;
    label: string;
  }[];
}

export interface GbSubfeedItem {
  _idRow: number;
  _sName: string;
  _sProfileUrl: string;
  _aPreviewMedia?: {
    _aImages?: {
      _sBaseUrl: string;
      _sFile: string;
      _sFile220?: string;
      _sFile530?: string;
    }[];
  };
  _aSubmitter?: {
    _idRow: number;
    _sName: string;
    _sAvatarUrl?: string;
  };
  _nLikeCount?: number;
  _nViewCount?: number;
  _sDescription?: string;
  _sVersion?: string;
  _aCategory?: {
    _idRow: number;
    _sName: string;
  };
  _sInitialVisibility?: string;
}

export function isGbModNsfw(
  item: Pick<GbSubfeedItem, "_sInitialVisibility">,
): boolean {
  return item._sInitialVisibility === "hide";
}

export interface GbModFile {
  _idRow: number;
  _sFile: string;
  _nFilesize: number;
  _sDownloadUrl: string;
  _sDescription?: string;
  _tsDateAdded: number;
}

export interface GbModProfile {
  _idRow: number;
  _sName: string;
  _sText?: string;
  _aPreviewMedia?: {
    _aImages?: {
      _sBaseUrl: string;
      _sFile: string;
      _sFile530?: string;
    }[];
  };
  _aSubmitter?: {
    _idRow: number;
    _sName: string;
    _sAvatarUrl?: string;
    _nPoints?: number;
  };
  _aFiles?: GbModFile[];
  _aCategory?: {
    _idRow: number;
    _sName: string;
  };
  _sVersion?: string;
  _tsDateAdded?: number;
  _tsDateModified?: number;
  _nLikeCount?: number;
  _nViewCount?: number;
  _nDownloadCount?: number;
}

export interface GbUpdate {
  _idRow: number;
  _sName: string;
  _sVersion?: string;
  _sText?: string;
  _tsDateAdded: number;
  _aChangeLog?: { cat: string; text: string }[];
}

export interface GbPost {
  _idRow: number;
  _sText: string;
  _tsDateAdded: number;
  _aSubmitter?: {
    _idRow: number;
    _sName: string;
    _sAvatarUrl?: string;
  };
  _nPoints?: number;
  _nReplyCount?: number;
}

async function parseGameBananaResponse<T>(res: Response): Promise<T> {
  const rawText = await res.text();
  const braceIndex = rawText.indexOf("{");
  const bracketIndex = rawText.indexOf("[");
  let startIndex = -1;

  if (braceIndex !== -1 && bracketIndex !== -1) {
    startIndex = Math.min(braceIndex, bracketIndex);
  } else if (braceIndex !== -1) {
    startIndex = braceIndex;
  } else if (bracketIndex !== -1) {
    startIndex = bracketIndex;
  }

  const lastBraceIndex = rawText.lastIndexOf("}");
  const lastBracketIndex = rawText.lastIndexOf("]");
  const endIndex = Math.max(lastBraceIndex, lastBracketIndex);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    if (!res.ok) {
      throw new Error(`Failed to fetch data: ${res.statusText}`);
    }
    throw new Error("Invalid response format received from GameBanana");
  }

  const parsed = JSON.parse(rawText.slice(startIndex, endIndex + 1));

  if (!res.ok) {
    const message = parsed._sErrorMessage || res.statusText;
    throw new Error(`Failed to fetch data: ${message}`);
  }

  return parsed as T;
}

export async function fetchCategories(
  rootCatId: number,
): Promise<GbCategory[]> {
  const url = `${API_BASE}Mod/Categories?_idCategoryRow=${rootCatId}&_sSort=a_to_z&_bShowEmpty=false`;
  const res = await fetch(url);
  const data = await parseGameBananaResponse<GbCategory[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function fetchGameCategoryTree(
  gameId: number,
): Promise<GbCategoryGroup[]> {
  const rootUrl = `${API_BASE}Mod/Categories?_idGameRow=${gameId}&_sSort=a_to_z`;
  const res = await fetch(rootUrl);
  const rootCategories = await parseGameBananaResponse<GbCategory[]>(res);
  if (!Array.isArray(rootCategories)) {
    return [];
  }

  const groups: GbCategoryGroup[] = await Promise.all(
    rootCategories.map(async (rootCat) => {
      const subCatCount = rootCat._nCategoryCount || 0;
      if (subCatCount > 0) {
        try {
          const subCats = await fetchCategories(rootCat._idRow);
          const items = [
            {
              value: String(rootCat._idRow),
              label: `All ${rootCat._sName} (${rootCat._nItemCount})`,
            },
            ...subCats.map((sub) => ({
              value: String(sub._idRow),
              label: `${sub._sName} (${sub._nItemCount})`,
            })),
          ];
          return {
            group: rootCat._sName,
            items,
          };
        } catch {
          return {
            group: rootCat._sName,
            items: [
              {
                value: String(rootCat._idRow),
                label: `${rootCat._sName} (${rootCat._nItemCount})`,
              },
            ],
          };
        }
      }

      return {
        group: rootCat._sName,
        items: [
          {
            value: String(rootCat._idRow),
            label: `${rootCat._sName} (${rootCat._nItemCount})`,
          },
        ],
      };
    }),
  );

  return groups;
}

export async function fetchSubfeed(
  gameId: number,
  page: number,
  sort: string,
): Promise<{ records: GbSubfeedItem[]; isLastPage: boolean }> {
  const url = `${API_BASE}Game/${gameId}/Subfeed?_nPage=${page}&_nPerpage=${LIST_PAGE_SIZE}&_sSort=${sort}&_csvModelInclusions=Mod`;
  const res = await fetch(url);
  const data = await parseGameBananaResponse<{
    _aRecords?: GbSubfeedItem[];
    _bIsComplete?: boolean;
  }>(res);
  const records = data._aRecords || [];
  const isLastPage = data._bIsComplete ?? records.length === 0;
  return { records, isLastPage };
}

export async function fetchByCategory(
  catId: number,
  page: number,
  sort: string,
): Promise<{ records: GbSubfeedItem[]; isLastPage: boolean }> {
  const sortParam =
    sort === "default" || !sort ? "" : `&_sSort=${encodeURIComponent(sort)}`;
  const url = `${API_BASE}Mod/Index?_aFilters[Generic_Category]=${catId}&_nPage=${page}&_nPerpage=${LIST_PAGE_SIZE}${sortParam}`;
  const res = await fetch(url);
  const data = await parseGameBananaResponse<{
    _aRecords?: GbSubfeedItem[];
    _bIsComplete?: boolean;
  }>(res);
  const records = data._aRecords || [];
  const isLastPage = data._bIsComplete ?? records.length === 0;
  return { records, isLastPage };
}

export async function searchGameBananaMods(
  gameId: number,
  query: string,
  page: number,
): Promise<{ records: GbSubfeedItem[]; isLastPage: boolean }> {
  const url = `${API_BASE}Util/Search/Results?_idGameRow=${gameId}&_sSearchString=${encodeURIComponent(query)}&_nPage=${page}&_nPerpage=${LIST_PAGE_SIZE}&_sModelName=Mod`;
  const res = await fetch(url);
  const data = await parseGameBananaResponse<{
    _aRecords?: GbSubfeedItem[];
    _bIsComplete?: boolean;
  }>(res);
  const records = data._aRecords || [];
  const isLastPage = data._bIsComplete ?? records.length === 0;
  return { records, isLastPage };
}

export async function fetchModProfile(modId: number): Promise<GbModProfile> {
  const url = `${API_BASE}Mod/${modId}/ProfilePage`;
  const res = await fetch(url);
  return parseGameBananaResponse<GbModProfile>(res);
}

export async function fetchModUpdates(modId: number): Promise<GbUpdate[]> {
  try {
    const url = `${API_BASE}Mod/${modId}/Updates?_nPage=1&_nPerpage=10`;
    const res = await fetch(url);
    const data = await parseGameBananaResponse<{ _aRecords?: GbUpdate[] }>(res);
    return Array.isArray(data._aRecords) ? data._aRecords : [];
  } catch {
    return [];
  }
}

export async function fetchModPosts(
  modId: number,
  page: number,
): Promise<GbPost[]> {
  try {
    const url = `${API_BASE}Mod/${modId}/Posts?_nPage=${page}&_nPerpage=15&_sSort=popular`;
    const res = await fetch(url);
    const data = await parseGameBananaResponse<{ _aRecords?: GbPost[] }>(res);
    return Array.isArray(data._aRecords) ? data._aRecords : [];
  } catch {
    return [];
  }
}

export async function fetchPostReplies(postId: number): Promise<GbPost[]> {
  try {
    const url = `${API_BASE}Post/${postId}/Posts?_nPage=1&_nPerpage=20`;
    const res = await fetch(url);
    const data = await parseGameBananaResponse<{ _aRecords?: GbPost[] }>(res);
    return Array.isArray(data._aRecords) ? data._aRecords : [];
  } catch {
    return [];
  }
}
