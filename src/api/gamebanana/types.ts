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
