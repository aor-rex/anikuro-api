---
title: search
description: search for manga titles using the GET /api/manga/search/:query endpoint.
---

# Search Manga

Search for manga titles based on a query string.

## Endpoint

```
GET /api/manga/search/:query
```

## Path Parameters

| Parameter | Type   | Required | Description           | Example               |
| --------- | ------ | -------- | --------------------- | --------------------- |
| `query`   | string | Yes      | Search query (URL-encoded) | `attack%20on%20titan` |

## Query Parameters

| Parameter | Type   | Required | Description                    | Example         |
| --------- | ------ | -------- | ------------------------------ | --------------- |
| `page`    | number | No       | Page number (default: 1)       | `?page=2`       |

## Response

```json
{
  "mangaList": [
    {
      "id": "attack-on-titan",
      "image": "https://mangabuddy.com/image/attack-on-titan.jpg",
      "title": "Attack On Titan"
    },
    {
      "id": "/manga/attack-on-titan-anthology",
      "image": "https://mangabuddy.com/image/anthology.jpg",
      "title": "Attack On Titan Anthology"
    }
  ],
  "metaData": {
    "totalPages": 39
  }
}
```

## Examples

**Search manga:**

```bash
curl "http://localhost:7860/api/manga/search/attack%20on%20titan"
```

**Paginate results:**

```bash
curl "http://localhost:7860/api/manga/search/one+piece?page=2"
```

## Notes

- The `:query` parameter must be URL-encoded.
- Use the `page` query parameter to navigate through search result pages.
- Search results are cached for 3 minutes to improve performance.
