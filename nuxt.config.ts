const baseURL = process.env.NODE_ENV === "development" ? "/" : "/tva-project/";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  css: [
    "~/assets/scss/base.scss"
  ],
  devtools: { enabled: false },
  vite: {
    cacheDir: ".vite",
    optimizeDeps: {
      noDiscovery: true
    }
  },
  ssr: false,
  app: {
    baseURL,
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
