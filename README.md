# tva-project

Browser-based image prompt/tag editor built with Nuxt. It loads a local image folder, reads matching `.txt` tag files, lets you edit/filter/reorder tags, and writes changes back through the File System Access API.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000/` in Chrome or Edge. The app depends on browser file-system permissions, so other browsers may only show limited functionality.

## Basic Use

1. Click `Pick` in the configuration panel to choose a config JSON, or skip this and use browser cache.
2. Click `Pick` for the images folder and grant read/write access.
3. Click `Load` to read `.jpg` and `.png` files plus matching `.txt` tag files.
4. Edit tags in the image rows, then use the save, filter, statistics, and batch script controls as needed.
5. Use `Save` to write the current configuration or `Download` to export it.

## Deployment

The app is configured for Vercel through Nuxt/Nitro:

```bash
npm run build
```

The production build creates Vercel output under `.vercel/output`.
