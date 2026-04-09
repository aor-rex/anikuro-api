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

navigate to the unified directory and install dependencies:

```bash
cd anikuro-api/unified
npm install
```

#### start the express server

launch the anikuro api server by running:

```bash
npm start
```

this will start the server on port 7860.

## 3. test the api

once the server is running, open your browser and visit:

- anikuro api server is running on [http://localhost:7860](http://localhost:7860).
- try the health check endpoint: [http://localhost:7860/health](http://localhost:7860/health)
- browse the documentation: [http://localhost:7860/docs](http://localhost:7860/docs)
- test endpoints interactively: [http://localhost:7860/docs/playground/](http://localhost:7860/docs/playground/)

feel free to explore the anikuro api to access manga and anime data and enhance your applications. happy coding!
