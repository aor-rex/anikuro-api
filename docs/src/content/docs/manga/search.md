---
title: search
description: refine your manga discovery with the search api endpoint /api/manga/search/:query.
---

#### endpoint: `/api/manga/search/:query`

the `/api/manga/search/:query` endpoint allows you to search for manga based on a specific query. use this endpoint to discover manga titles related to your search.

#### example

```http
get https://aor-rex-anikuro-api.hf.space/api/manga/search/attack%20on%20titan?page=1
```

#### response

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
    },
    {
      "id": "/manga/attack-on-titan-junior-high",
      "image": "https://mangabuddy.com/image/junior-high.jpg",
      "title": "Attack On Titan: Junior High"
    }
  ],
  "metaData": {
    "totalPages": 39
  }
}
```

### notes

- the `:query` parameter in the endpoint represents the search query. make sure to url-encode the query string properly.
- use the `page` query parameter to navigate through different pages of the search results.
- the response includes a list of manga entries with their respective ids, images, and titles.
- the `metaData` section provides information about the total number of pages available for the search results.
- search results are cached for 3 minutes to improve performance.
