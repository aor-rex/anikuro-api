---
title: installation
description: effortlessly set up anikuro api on your local machine with our step-by-step guide.
---

follow these detailed steps to set up the anikuro api on your local machine. this guide assumes you have git, node.js, and npm installed.

## 1. clone the repository

open your terminal and run the following command to clone the anikuro api repository:

```bash
git clone https://github.com/aor-rex/anikuro-api
```

## 2. set up the server

navigate to the manga directory and install dependencies:

```bash
cd manga
npm install
```

#### start the express server

launch the anikuro api server by running:

```bash
npm start
```

this will start the server on port 3000.

## 3. test the api

once the server is running, open your browser and visit:

- anikuro api server is running on [http://localhost:3000](http://localhost:3000).
- try the health check endpoint: [http://localhost:3000/health](http://localhost:3000/health)
- browse the documentation: [http://localhost:3000/](http://localhost:3000/)

feel free to explore the anikuro api to access manga data and enhance your manga-related applications. happy coding!
