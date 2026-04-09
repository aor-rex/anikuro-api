import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://aor-rex-anikuro-api.hf.space",
  base: "/docs",
  output: "static",
  integrations: [
    starlight({
      title: "anikuro",
      description: "your anime manga api gateway",
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
          label: "getting started",
          items: [
            { label: "introduction", link: "/manga/introduction/" },
            { label: "quick start", link: "/manga/quick-start/" },
          ],
        },
        {
          label: "manga api",
          collapsed: false,
          items: [
            { label: "manga list", link: "/manga/mangalist/" },
            { label: "manga detail", link: "/manga/singlemanga/" },
            { label: "search", link: "/manga/search/" },
            { label: "installation", link: "/manga/installation/" },
          ],
        },
        {
          label: "anime api",
          collapsed: false,
          items: [
            { label: "anime list", link: "/anime/animelist/" },
            { label: "anime info", link: "/anime/animeinfo/" },
            { label: "anime releases", link: "/anime/animereleases/" },
            { label: "anime streaming", link: "/anime/animestreaming/" },
          ],
        },
        {
          label: "guides",
          items: [
            { label: "api playground", link: "/playground/" },
            { label: "hooks", link: "/manga/hooks/" },
          ],
        },
      ],
    }),
  ],
});
