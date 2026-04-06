---
title: quick start
description: get started with anikuro api in just a few simple steps.
---

follow these simple steps to get anikuro api up and running on your local machine:

### 1. clone the repository

open your terminal and run the following command to clone the anikuro api repository:

```bash
git clone https://github.com/aor-rex/anikuro-api
```

### 2. navigate to the manga directory

change your working directory to the manga folder:

```bash
cd manga
```

### 3. install dependencies

install the required dependencies using npm:

```bash
npm install
```

### 4. start the express server

launch the anikuro api server by running the following command:

```bash
npm start
```

this will start the server on port 3000.

## try an endpoint

now that anikuro api is running, let's test it. make a get request to the manga list endpoint:

- **endpoint:**

  ```http
  get http://localhost:3000/api/manga/list
  ```

- **example response:**

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

## response format

the api will respond with data structured as follows:

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

now you're ready to explore and integrate anikuro api into your projects. feel free to use the provided api endpoints to access manga data and enhance your manga-related applications!
