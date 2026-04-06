---
title: anikuro website example
description: experience the anikuro website example, a dynamic platform crafted with next.js, tailwind css, and next ui components.
---

anikuro has created a user-friendly website using next.js, tailwind css, and next ui components. the website interacts with the anikuro api to provide users with a seamless manga reading experience. let's explore the main features:

## 1. home screen

- the home screen displays a list of manga titles obtained from the `/api/manga/list` endpoint.
- each manga entry on the home screen includes the manga's cover image, title, and other relevant information.
- users can click on a manga title to navigate to the manga details page.

## 2. manga details page

- when a user clicks on a manga title, it opens the manga details page, utilizing the `/api/manga/:id` endpoint.
- the manga details page showcases the cover image, title, author, status, genres, view count, and a list of chapters.
- users can click on a specific chapter to navigate to the chapter details page.

## 3. chapter details page

- upon selecting a chapter, the website uses the `/api/manga/:id/:ch` endpoint to fetch details about the selected chapter.
- the chapter details page presents the chapter title, a list of other chapter titles, and individual images for each page of the chapter.
- users can navigate through the pages and enjoy reading the manga.

## 4. search functionality

- the website features a search button that allows users to search for manga titles using the `/api/manga/search/:query` endpoint.
- users can enter a search query, and the website displays a list of manga titles related to the search term.
- clicking on a search result takes users to the manga details page.

this example demonstrates how anikuro combines the power of next.js, tailwind css, and the anikuro api to create a dynamic and engaging manga reading platform.
