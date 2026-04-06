---
title: Anikuro API
emoji: 📚
colorFrom: red
colorTo: blue
sdk: docker
pinned: false
license: mit
---

# Anikuro API

Manga scraping API powered by mangabuddy.com

## Quick Start

### Base URL

```
https://aor-rex-anikuro-api.hf.space
```

### Endpoints

| Path                       | Description                  |
| -------------------------- | ---------------------------- |
| `/api/manga/list`          | Browse manga by genre, page  |
| `/api/manga/:id`           | Manga details + chapter list |
| `/api/manga/:id/:ch`       | Chapter images               |
| `/api/manga/search/:query` | Search manga                 |
| `/docs`                    | API Documentation            |
| `/health`                  | Health check                 |

### Authentication

All API endpoints require an API key in the `x-api-key` header:

```bash
curl -H "x-api-key: YOUR_KEY" https://aor-rex-anikuro-api.hf.space/api/manga/list
```

### Documentation

Full documentation is available at: `https://aor-rex-anikuro-api.hf.space/docs`

## Source

- GitHub: https://github.com/aor-rex/anikuro-api
