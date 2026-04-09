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
  get /api/manga/list
  ```

- **example response:**

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
    type: Array<{ id: string; name: string }>;
    state: Array<{ id: string; name: string }>;
    category: Array<{ id: string; name: string }>;
  };
}
```

now you're ready to explore and integrate anikuro api into your projects. feel free to use the provided api endpoints to access manga data and enhance your manga-related applications!
