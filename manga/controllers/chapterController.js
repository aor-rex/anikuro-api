const cheerio = require("cheerio");

const chapterController = (req, res) => {
  if (!req.html) {
    return res.status(500).json({ error: "Failed to load chapter" });
  }

  const $ = cheerio.load(req.html);

  // Extract chapter title from alt text of first image
  const firstImageAlt =
    $("#chapter-images .chapter-image img").first().attr("alt") || "";
  const mangaName = firstImageAlt.split(" - ")[0] || "";
  const chapterName = firstImageAlt || "";

  const images = [];

  // Strategy 1: Find comma-separated URL list in HTML
  const urlListMatch = req.html.match(
    /https?:\/\/s\d+\.[^,\s]+\.(?:jpg|jpeg|png|webp)(?:,https?:\/\/s\d+\.[^,\s]+\.(?:jpg|jpeg|png|webp))+/,
  );

  if (urlListMatch) {
    const urls = urlListMatch[0].split(",");
    urls.forEach((url, index) => {
      images.push({
        title: `${mangaName} - Page ${index + 1}`,
        image: url.trim(),
      });
    });
  }

  // Strategy 2: Extract from individual img tags if URL list not found
  if (images.length === 0) {
    $("#chapter-images .chapter-image img").each((index, val) => {
      let imgSrc =
        $(val).attr("data-src") ||
        $(val).attr("src") ||
        $(val).attr("data-lazy-src") ||
        "";
      const alt = $(val).attr("alt") || "";

      // Handle relative URLs
      if (imgSrc && imgSrc.startsWith("/")) {
        imgSrc = `https://mangabuddy.com${imgSrc}`;
      }

      if (imgSrc) {
        images.push({
          title: alt || `${mangaName} - Page ${index + 1}`,
          image: imgSrc,
        });
      }
    });
  }

  // Strategy 3: Look for data-srcset or srcset attributes
  if (images.length === 0) {
    $("#chapter-images .chapter-image").each((index, val) => {
      const srcset = $(val).attr("data-srcset") || $(val).attr("srcset") || "";
      if (srcset) {
        const url = srcset.split(" ")[0];
        if (url) {
          images.push({
            title: `${mangaName} - Page ${index + 1}`,
            image: url,
          });
        }
      }
    });
  }

  // FIX Bug #19: Log warning when no images extracted
  if (images.length === 0) {
    console.warn(
      `[chapterController] No images found for ${req.params.id}/${req.params.ch}`,
    );
  }

  // Extract chapter list for navigation
  const chapterListIds = [];
  $(".chapters .chap-item h4 a").each((index, val) => {
    const href = $(val).attr("href") || "";
    const title = $(val).attr("title") || $(val).text().trim();
    const chapterId = href.split("/").pop();

    if (chapterId) {
      chapterListIds.push({
        id: chapterId,
        name: title,
      });
    }
  });

  res.json({
    title: mangaName,
    currentChapter: chapterName,
    chapterListIds: chapterListIds,
    images: images,
  });
};

module.exports = chapterController;
