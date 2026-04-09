---
title: manga list
description: fetch a comprehensive list of manga with associated metadata using the GET /api/manga/list endpoint.
---

# Manga List

Fetch a comprehensive list of manga with associated metadata.

## Endpoint

```
GET /api/manga/list
```

## Query Parameters

| Parameter  | Type   | Required | Description                         | Example                   |
| ---------- | ------ | -------- | ----------------------------------- | ------------------------- |
| `page`     | number | No       | Page number (default: 1)            | `?page=2`                 |
| `category` | string | No       | Filter by category (e.g., `action`) | `?category=action`        |
| `type`     | string | No       | Filter by type (e.g., `latest`)     | `?type=latest`            |
| `state`    | string | No       | Filter by state (e.g., `ongoing`)   | `?state=ongoing`          |

## Response

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
      { "id": "adventure", "name": "Adventure" }
    ]
  }
}
```

## Examples

**Browse all manga:**

```bash
curl "http://localhost:7860/api/manga/list"
```

**Filter by category:**

```bash
curl "http://localhost:7860/api/manga/list?category=action"
```

**Paginate:**

```bash
curl "http://localhost:7860/api/manga/list?page=2"
```

## Response Structure

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

## Cache Duration

30 seconds
