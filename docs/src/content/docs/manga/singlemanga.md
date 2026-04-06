---
title: manga detail
description: unlock detailed insights into specific manga and chapters with the manga detail api endpoints.
---

#### endpoint: `/api/manga/:id`

the `/api/manga/:id` endpoint provides detailed information about a specific manga. use the manga id obtained from the manga list endpoint to access manga details.

#### example

```http
get http://localhost:3000/api/manga/manga-oa952283
```

#### response

```json
{
  "imageUrl": "https://www.mangakakalot.gg//mangaimage/manga-oa952283.jpg",
  "name": "attack on titan",
  "author": "isayama hajime",
  "status": "ongoing",
  "updated": "apr 22,2022 - 19",
  "view": "105.8M",
  "genres": ["action", "adventure"],
  "chapterList": [
    {
      "id": "chapter-139",
      "path": "/chapter/manga-oa952283/chapter-139",
      "name": "vol.34 chapter 139: moving toward that tree on the hill",
      "view": "353.2K",
      "createdAt": "apr 22,22"
    }
  ]
}
```

## get chapter details

#### endpoint: `/api/manga/:id/:ch`

the `/api/manga/:id/:ch` endpoint provides details about a specific chapter of a manga. use the manga id and chapter id obtained from the manga details endpoint to access chapter details.

#### example

```http
get http://localhost:3000/api/manga/manga-oa952283/chapter-136
```

#### response

```json
{
  "title": "attack on titan",
  "currentChapter": "vol.34 chapter 136: offer your hearts",
  "chapterListIds": [
    {
      "id": "chapter-139",
      "name": "vol.34 chapter 139: moving toward that tree on the hill"
    }
  ],
  "images": [
    {
      "title": "attack on titan vol.34 chapter 136: offer your hearts page 1",
      "image": "https://cm.blazefast.co/7d/9b/7d9b48e08f2f3d39d96ef17ada153901.jpg"
    }
  ]
}
```

## notes

- the `:id` parameter in the endpoint represents the unique identifier for a specific manga, and `:ch` represents the unique identifier for a specific chapter.
- use the manga id and chapter id obtained from the manga list and manga details endpoints to access specific manga and chapter information.
- the response provides detailed information about the manga, including its status, genres, view count, and a list of chapters.
- chapter details include the chapter title, list of chapter ids, and links to individual chapter images.
