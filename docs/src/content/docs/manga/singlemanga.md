---
title: manga detail
description: unlock detailed insights into specific manga and chapters with the manga detail api endpoints.
---

# Manga Detail

Get detailed information about a specific manga including its chapter list.

## Get Manga Details

```
GET /api/manga/:id
```

### Path Parameters

| Parameter | Type   | Required | Description                              | Example               |
| --------- | ------ | -------- | ---------------------------------------- | --------------------- |
| `id`      | string | Yes      | Manga slug from the manga list response  | `attack-on-titan`     |

### Example

```bash
curl "http://localhost:7860/api/manga/attack-on-titan"
```

### Response

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

---

## Get Chapter Images

```
GET /api/manga/:id/:ch
```

### Path Parameters

| Parameter | Type   | Required | Description                              | Example                          |
| --------- | ------ | -------- | ---------------------------------------- | -------------------------------- |
| `id`      | string | Yes      | Manga slug from the manga list response  | `attack-on-titan`                |
| `ch`      | string | Yes      | Chapter slug from the chapter list       | `chapter-139`                    |

### Example

```bash
curl "http://localhost:7860/api/manga/attack-on-titan/chapter-139"
```

### Response

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

## Notes

- The `:id` parameter represents the unique path slug for a specific manga (from the manga list response).
- The `:ch` parameter represents the unique path slug for a specific chapter.
- The response provides detailed information about the manga, including its status, genres, and a list of chapters.
- Chapter details include the chapter title, list of chapter ids for navigation, and links to individual chapter images.
