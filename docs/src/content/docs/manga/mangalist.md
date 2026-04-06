---
title: manga list
description: fetch a comprehensive list of manga with associated metadata using the /api/manga/list endpoint.
---

#### endpoint: `/api/manga/list`

the `/api/manga/list` endpoint provides a list of manga with associated metadata. follow the steps below to make a request and understand the response.

## simple fetch

use your preferred api testing tool or any http client library to make a get request to the following endpoint:

- **method:** get
- **endpoint:** `http://localhost:3000/api/manga/list`

##### example

```http
get http://localhost:3000/api/manga/list
```

##### response

```json
{
  "mangaList": [
    {
      "id": "1manga-oa952283",
      "image": "https://www.mangakakalot.gg//mangaimage/manga-oa952283.jpg",
      "title": "attack on titan",
      "chapter": "chapter-139",
      "view": "105.8M",
      "description": "..."
    }
  ],
  "metaData": {
    "totalStories": 10,
    "totalPages": 100,
    "type": [{ "id": "newest", "type": "Newest" }],
    "state": [{ "id": "Completed", "type": "Completed" }],
    "category": [{ "id": "all", "type": "ALL" }]
  }
}
```

## explore pagination (optional)

##### query parameter: `page`

- to fetch a specific page, use the `page` query parameter.
- example: `http://localhost:3000/api/manga/list?page=2`

## filter by manga category (optional)

##### query parameter: `category`

- filter manga by category using the `category` query parameter.
- possible values: `all`, `action`, `adventure`, `comedy`, `cooking`, `doujinshi`, `drama`, and more.
- example: `http://localhost:3000/api/manga/list?category=action`

## filter by manga type (optional)

##### query parameter: `type`

- filter manga by type using the `type` query parameter.
- possible values: `newest`, `latest`, `topview`.
- example: `http://localhost:3000/api/manga/list?type=newest`

## filter by manga state (optional)

##### query parameter: `state`

- filter manga by state (status) using the `state` query parameter.
- possible values: `all`, `completed`, `ongoing`, `drop`, `unknown`.
- example: `http://localhost:3000/api/manga/list?state=ongoing`

## response structure

```typescript
interface MangaList {
  mangaList: Array<{
    id: string;
    image: string;
    title: string;
    chapter: string;
    view: string;
    description: string;
  }>;
  metaData: {
    totalStories: number;
    totalPages: number;
    type: Array<{ id: string; type: string }>;
    state: Array<{ id: string; type: string }>;
    category: Array<{ id: string; type: string }>;
  };
}
```
