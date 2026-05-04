export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  css: ["~/assets/css/image-tagger.css"],
  devtools: { enabled: false },
  vite: {
    optimizeDeps: {
      include: [],
      noDiscovery: true
    }
  },
  nitro: {
    preset: "vercel"
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
