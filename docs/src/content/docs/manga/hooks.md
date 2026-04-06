---
title: web hooks for next
description: effortlessly integrate anikuro api into your next.js applications with a set of custom hooks.
---

anikuro api provides a set of custom hooks to simplify the integration into next.js applications. these hooks facilitate the retrieval of manga data for various purposes. here's a detailed documentation for each hook:

## 1. `useMangaList`

### purpose

this hook is designed to fetch a list of manga titles with associated metadata using the `/api/manga/list` endpoint.

### parameters

- `params` (optional): additional parameters to customize the manga list request (e.g., `?category=action&page=1`).

### usage

```jsx
import useMangaList from "path/to/useMangaList";

const ExampleComponent = async () => {
  const params = "?page=1&category=action";
  const mangaListData = await useMangaList(params);
};
```

## 2. `useManga`

### purpose

this hook fetches detailed information about a specific manga using the `/api/manga/:id` endpoint.

### parameters

- `id`: path slug for the desired manga (e.g., `attack-on-titan`).

### usage

```jsx
import useManga from "path/to/useManga";

const ExampleComponent = async () => {
  const mangaId = "attack-on-titan";
  const mangaData = await useManga(mangaId);
};
```

## 3. `useMangaChapter`

### purpose

this hook fetches details about a specific chapter of a manga using the `/api/manga/:id/:ch` endpoint.

### parameters

- `id`: path slug for the manga (e.g., `attack-on-titan`).
- `ch`: path slug for the desired chapter (e.g., `chapter-139`).

### usage

```jsx
import useMangaChapter from "path/to/useMangaChapter";

const ExampleComponent = async () => {
  const mangaId = "attack-on-titan";
  const chapterId = "chapter-139";
  const chapterData = await useMangaChapter(mangaId, chapterId);
};
```

## 4. `useMangaSearch`

### purpose

this hook allows users to search for manga titles using the `/api/manga/search/:query` endpoint.

### parameters

- `query`: the search query string.
- `page` (optional): the page number for pagination.

### usage

```jsx
import useMangaSearch from "path/to/useMangaSearch";

const ExampleComponent = async () => {
  const searchQuery = "attack on titan";
  const searchResults = await useMangaSearch(searchQuery, { page: 1 });
};
```

these custom hooks can be seamlessly integrated into next.js applications, making it easy to retrieve and manage manga data within your components. customize parameters and handle the returned data according to your application's needs.
