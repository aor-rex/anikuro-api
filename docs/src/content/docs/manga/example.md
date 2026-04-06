---
title: Anikuro Website Example
description: Experience the Anikuro website example, a dynamic platform crafted with Next.js, Tailwind CSS, and Next UI components. Seamlessly interacting with the Anikuro API, the website offers users a captivating manga reading experience. Explore key features, including the Home Screen with a curated list of manga titles, Manga Details Page showcasing detailed information, Chapter Details Page for immersive reading, and a powerful Search Functionality. Check out the example website at https://aor-rex-anikuro-site.hf.space to navigate the home screen, delve into manga details, read chapters, and effortlessly search for favorite titles. Witness how Anikuro combines technologies to create a user-friendly and engaging manga reading platform.
---

Anikuro has created a user-friendly website using Next.js, Tailwind CSS, and Next UI components. The website interacts with the Anikuro API to provide users with a seamless manga reading experience. Let's explore the main features:

## 1. Home Screen

- The home screen displays a list of manga titles obtained from the `/api/manga/list` endpoint.
- Each manga entry on the home screen includes the manga's cover image, title, and other relevant information.
- Users can click on a manga title to navigate to the manga details page.

![Home Screen](/screenshot/list.png)
## 2. Manga Details Page

- When a user clicks on a manga title, it opens the manga details page, utilizing the `/api/manga/:id` endpoint.
- The manga details page showcases the cover image, title, author, status, genres, view count, and a list of chapters.
- Users can click on a specific chapter to navigate to the chapter details page.

![Detail](/screenshot/detail.png)
## 3. Chapter Details Page

- Upon selecting a chapter, the website uses the `/api/manga/:id/:ch` endpoint to fetch details about the selected chapter.
- The chapter details page presents the chapter title, a list of other chapter titles, and individual images for each page of the chapter.
- Users can navigate through the pages and enjoy reading the manga.

![Chapter](/screenshot/chapter.png)
## 4. Search Functionality

- The website features a search button that allows users to search for manga titles using the `/api/manga/search/:query` endpoint.
- Users can enter a search query, and the website displays a list of manga titles related to the search term.
- Clicking on a search result takes users to the manga details page.

![Search](/screenshot/search.png)
## Example Website

- The Anikuro website is hosted at [https://aor-rex-anikuro-site.hf.space](https://aor-rex-anikuro-site.hf.space).
- Users can explore the home screen, view manga details, read chapters, and search for their favorite manga titles.

This example demonstrates how Anikuro combines the power of Next.js, Tailwind CSS, and the Anikuro API to create a dynamic and engaging manga reading platform.
