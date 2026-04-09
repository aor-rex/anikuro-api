---
title: manga detail
description: unlock detailed insights into specific manga and chapters with the manga detail api endpoints.
---

#### endpoint: `/api/manga/:id`

the `/api/manga/:id` endpoint provides detailed information about a specific manga. use the manga id obtained from the manga list endpoint to access manga details.

note: the `:id` is the slug from the manga list response (e.g., `attack-on-titan`).

#### example

```http
get /api/manga/attack-on-titan
```

#### response

```json
{
  "imageUrl": "https://mangabuddy.com/image/attack-on-titan.jpg",
  "name": "Attack On Titan",
  "author": "Isayama Hajime",
  "status": "Ongoing",
  "updated": "Apr 22, 2022",
  "view": "N/A",
  "genres": ["Action", "Adventure"],
  "chapterList": [
    {
      "id": "chapter-139",
      "name": "Chapter 139: Moving Toward That Tree On The Hill",
      "view": "353.2K",
      "createdAt": "Apr 22,22"
    }
  ]
}
```

## get chapter details

#### endpoint: `/api/manga/:id/:ch`

the `/api/manga/:id/:ch` endpoint provides details about a specific chapter of a manga. use the manga id and chapter id obtained from the manga details endpoint to access chapter details.

#### example

```http
get /api/manga/attack-on-titan/chapter-139
```

#### response

```json
{
  "title": "Attack On Titan",
  "currentChapter": "Chapter 139: Moving Toward That Tree On The Hill",
  "chapterListIds": [
    {
      "id": "chapter-139",
      "name": "Chapter 139: Moving Toward That Tree On The Hill"
    },
    {
      "id": "chapter-138",
      "name": "Chapter 138: A Long Dream"
    }
  ],
  "images": [
    {
      "title": "Attack On Titan - Page 1",
      "image": "https://s1.mangabuddy.com/images/attack-on-titan/ch139/page-1.jpg"
    },
    {
      "title": "Attack On Titan - Page 2",
      "image": "https://s1.mangabuddy.com/images/attack-on-titan/ch139/page-2.jpg"
    }
  ]
}
```

## notes

- the `:id` parameter in the endpoint represents the unique path slug for a specific manga (from the manga list response).
- the `:ch` parameter represents the unique path slug for a specific chapter.
- the response provides detailed information about the manga, including its status, genres, and a list of chapters.
- chapter details include the chapter title, list of chapter ids for navigation, and links to individual chapter images.
