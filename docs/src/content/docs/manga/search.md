---
title: search
description: refine your manga discovery with the search api endpoint /api/manga/search/:query.
---

#### endpoint: `/api/manga/search/:query`

the `/api/manga/search/:query` endpoint allows you to search for manga based on a specific query. use this endpoint to discover manga titles related to your search.

#### example

```http
get http://localhost:3000/api/manga/search/attack%20on%20titan?page=1
```

#### response

```json
{
  "mangaList": [
    {
      "id": "manga-oa952283",
      "image": "https://avt.mkklcdnv6temp.com/34/b/1-1583465037.jpg",
      "title": "attack on titan"
    },
    {
      "id": "manga-fv982830",
      "image": "https://avt.mkklcdnv6temp.com/15/y/19-1583499712.jpg",
      "title": "attack on titan anthology"
    },
    {
      "id": "manga-cs980075",
      "image": "https://avt.mkklcdnv6temp.com/15/d/17-1583495808.jpg",
      "title": "attack on titan: junior high"
    }
  ],
  "metaData": {
    "totalPages": 39
  }
}
```

### notes

- the `:query` parameter in the endpoint represents the search query. make sure to encode the query string properly.
- use the `page` query parameter to navigate through different pages of the search results.
- the response includes a list of manga entries with their respective ids, images, and titles.
- the `metaData` section provides information about the total number of pages available for the search results.
