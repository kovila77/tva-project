# TVA Image Tagger

Static Nuxt app for fast local image prompt/tag dataset editing in the browser. It loads a folder into memory, edits matching `.txt` tag files, and exports the edited results without server functions.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000/`.

## Build

```bash
npm run build
```

Vercel deploys `.output/public` as static files using `vercel.json`.

## Functions

- Upload image folders with matching `.txt` prompt files.
- Edit image tags, reorder tags, and mark common/known/highlighted tags.
- Filter by tags or regex, invert filters, and render large datasets in batches.
- Undo/redo dataset edits and revert an image to its loaded tags.
- Batch add tags, remove tags by regex, replace `artist:*` tags, and rename visible files.
- Review tag statistics, filter by any tag, rename tags, and remove tags globally.
- Preview images with zoom/pan.
- Import/export config, export edited tag files as ZIP, and export resized visible images with tags.
