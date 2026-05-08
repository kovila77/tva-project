# TVA Image Tagger

Static Nuxt app for fast local image prompt/tag dataset editing in the browser. It loads a folder into memory, edits matching `.txt` tag files, and exports the edited results.

Vercel deploys `.output/public` as static files using `vercel.json`.

## Functions

- Upload image folders with matching `.txt` prompt files.
- Edit image tags, reorder tags, filter, and highlight tags.
- Undo/redo dataset edits and revert an image to its loaded tags.
- Batch add tags, remove tags by regex, replace tags, and rename visible files.
- Review tag statistics, filter by any tag, rename tags, and remove tags in dataset.
- Preview images with zoom/pan by clicking on it.
- Import/export site config, export edited tag files as ZIP, and export resized visible images with tags.

## Development

### Quick Start

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000/`.
