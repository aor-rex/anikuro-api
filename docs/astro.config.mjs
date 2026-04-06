import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  site: "https://aor-rex-anikuro-api.hf.space",
  base: "/docs",
  output: "static",
  integrations: [
    starlight({
      title: "Anikuro API",
      description: "Anikuro API Documentation",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/aor-rex/anikuro-api",
        },
      ],
      customCss: ["./src/assets/style.css"],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", link: "/manga/introduction" },
            { label: "Quick Start", link: "/manga/quick-start" },
          ],
        },
        {
          label: "API Reference",
          collapsed: false,
          items: [
            { label: "Manga List", link: "/manga/mangalist" },
            { label: "Manga Detail", link: "/manga/singlemanga" },
            { label: "Search", link: "/manga/search" },
            { label: "Installation", link: "/manga/installation" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Examples", link: "/manga/example" },
            { label: "Hooks", link: "/manga/hooks" },
          ],
        },
      ],
    }),
  ],
});
