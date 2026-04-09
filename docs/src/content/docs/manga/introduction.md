---
title: introduction
description: welcome to anikuro api, your go-to api for accessing manga and anime data freely.
---

# Welcome to Anikuro API

anikuro api is a unified rest api gateway for both **manga** and **anime** content. it scrapes data from manga and anime websites and serves them as clean, structured json responses.

## features

- **manga api** — browse, search, and read manga chapters
- **anime api** — browse, search, and stream anime episodes
- **caching** — redis-backed response caching (optional)
- **no api key required** — public access to all endpoints

## technology stack

anikuro api leverages a cutting-edge technology stack to ensure seamless functionality and performance. the key technologies used in this api include:

1. **node.js:** the server-side javascript runtime that powers anikuro api, ensuring high-speed and efficient execution of code.

2. **express:** a minimal and flexible node.js web application framework that facilitates the development of robust apis with ease.

3. **web scraping with cheerio:** a fast, flexible, and lightweight jquery-like library for parsing html. cheerio is employed to scrape data efficiently from the manga source.

4. **axios:** a promise-based http client for node.js that simplifies handling asynchronous requests, contributing to anikuro api's responsiveness.

5. **playwright:** a browser automation library used to bypass cloudflare and ddos-guard challenges for anime streaming endpoints.

## source

anikuro api fetches its manga data from the popular manga website, [mangabuddy.com](https://mangabuddy.com/), and anime data from [animepahe.pw](https://animepahe.pw/). these sources are chosen for their extensive collections, providing users with access to a wide variety of titles.

## philosophy

anikuro api operates on the philosophy of empowering users to access manga and anime data freely and conveniently. the api employs web scraping techniques to extract relevant information and reconstructs it into a self-hosted api. this approach enables users to host the api independently, reducing reliance on external sources and providing more control over the data retrieval process.

in summary, anikuro api is a powerful and versatile api designed for manga and anime enthusiasts and developers seeking a seamless solution to access content data. with a robust technology stack, a comprehensive set of features, and a self-hosting philosophy, anikuro api is your gateway to a world of manga and anime information.
