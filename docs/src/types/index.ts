// ============================================================
// Manga API Types
// ============================================================

export interface MangaListResponse {
  mangaList: {
    id: string;
    image: string;
    title: string;
    chapter: string;
    view: string;
    description: string;
  }[];
  metaData: {
    totalStories: number;
    totalPages: number;
    type: { id: string; type: string }[];
    state: { id: string; type: string }[];
    category: { id: string; type: string }[];
  };
}

export interface MangaDetailResponse {
  imageUrl: string;
  name: string;
  author: string;
  status: string;
  updated: string;
  view: string;
  genres: string[];
  chapterList: {
    id: string;
    path: string;
    name: string;
    view: string;
    createdAt: string;
  }[];
}

export interface ChapterResponse {
  title: string;
  currentChapter: string;
  chapterListIds: {
    id: string;
    name: string;
  }[];
  images: {
    title: string;
    image: string;
  }[];
}

export interface SearchResponse {
  mangaList: {
    id: string;
    image: string;
    title: string;
  }[];
  metaData: {
    totalPages: number;
  };
}

// ============================================================
// Anime API Types (placeholder - update when anime API is built)
// ============================================================

export interface AnimeListResponse {
  animeList: {
    id: string;
    image: string;
    title: string;
    episode: string;
    view: string;
    description: string;
  }[];
  metaData: {
    totalTitles: number;
    totalPages: number;
    type: { id: string; type: string }[];
    state: { id: string; type: string }[];
    genre: { id: string; type: string }[];
  };
}

export interface AnimeDetailResponse {
  imageUrl: string;
  name: string;
  author: string;
  status: string;
  updated: string;
  view: string;
  genres: string[];
  episodeList: {
    id: string;
    path: string;
    name: string;
    view: string;
    createdAt: string;
  }[];
}

export interface EpisodeResponse {
  title: string;
  currentEpisode: string;
  episodeListIds: {
    id: string;
    name: string;
  }[];
  videoUrl: string;
  subtitles: {
    language: string;
    url: string;
  }[];
}
