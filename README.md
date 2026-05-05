# tva-project

Browser-based image prompt/tag editor built with Nuxt. It uploads a local image folder into memory, reads matching `.txt` tag files, and lets you edit/filter/reorder tags without modifying the source folder.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000/`. Image folders are loaded through a browser folder upload and kept in memory.

## Static Deployment

The app is configured as a static-only Nuxt app for Vercel:

```bash
npm run build
```

The production build generates static files under `.output/public`. Vercel is configured by `vercel.json` to deploy that directory without serverless functions.
