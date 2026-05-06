export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  css: [
    "~/assets/css/base.css",
    "~/assets/css/controls.css",
    "~/assets/css/layout.css",
    "~/assets/css/stats.css",
    "~/assets/css/image-rows.css",
    "~/assets/css/viewer.css",
    "~/assets/css/responsive.css"
  ],
  devtools: { enabled: false },
  vite: {
    optimizeDeps: {
      include: [
        "@codemirror/autocomplete",
        "@codemirror/commands",
        "@codemirror/state",
        "@codemirror/view"
      ],
      noDiscovery: true
    }
  },
  ssr: false,
  app: {
    head: {
      htmlAttrs: {
        lang: "en"
      },
      title: "TVA Image Tagger",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: "Browser-based image tag viewer and batch prompt editor."
        }
      ]
    }
  }
});
