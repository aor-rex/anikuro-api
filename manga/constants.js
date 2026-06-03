const MANGA_BASE_URL = process.env.MANGA_BASE_URL || "https://mangak.io";

function toAbsoluteMangaUrl(path = "") {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${MANGA_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

module.exports = {
  MANGA_BASE_URL,
  toAbsoluteMangaUrl,
};
