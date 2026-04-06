---
title: manga list
description: fetch a comprehensive list of manga with associated metadata using the /api/manga/list endpoint.
---

#### endpoint: `/api/manga/list`

the `/api/manga/list` endpoint provides a list of manga with associated metadata. follow the steps below to make a request and understand the response.

## simple fetch

use your preferred api testing tool or any http client library to make a get request to the following endpoint:

- **method:** get
- **endpoint:** `https://aor-rex-anikuro-api.hf.space/api/manga/list`

##### example

```http
get https://aor-rex-anikuro-api.hf.space/api/manga/list
```

##### response

```json
{
  "mangaList": [
    {
      "id": "attack-on-titan",
      "image": "https://mangabuddy.com/image/attack-on-titan.jpg",
      "title": "Attack On Titan",
      "chapter": "Chapter 139",
      "view": "105.8M",
      "description": "..."
    }
  ],
  "metaData": {
    "type": [
      { "id": "latest", "name": "Latest" },
      { "id": "updated", "name": "Updated" }
    ],
    "state": [
      { "id": "all", "name": "all" },
      { "id": "completed", "name": "Completed" },
      { "id": "ongoing", "name": "Ongoing" }
    ],
    "category": [
      { "id": "all", "name": "all" },
      { "id": "action", "name": "Action" },
      { "id": "adventure", "name": "Adventure" },
      { "id": "comedy", "name": "Comedy" },
      { "id": "drama", "name": "Drama" },
      { "id": "fantasy", "name": "Fantasy" },
      { "id": "romance", "name": "Romance" }
    ]
  }
}
```

## explore pagination (optional)

##### query parameter: `page`

- to fetch a specific page, use the `page` query parameter.
- example: `https://aor-rex-anikuro-api.hf.space/api/manga/list?page=2`

## filter by manga category (optional)

##### query parameter: `category`

- filter manga by category using the `category` query parameter.
- possible values: `all`, `action`, `adventure`, `comedy`, `drama`, `fantasy`, `romance`, and more.
- example: `https://aor-rex-anikuro-api.hf.space/api/manga/list?category=action`

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
    type: Array<{ id: string; name: string }>;
    state: Array<{ id: string; name: string }>;
    category: Array<{ id: string; name: string }>;
  };
}
```
